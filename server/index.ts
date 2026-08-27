import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import * as XLSX from "xlsx";
import multer from "multer";
import { getAuthedSupabase, getSupabase, getSupabaseForAccessToken, isSupabaseConfigured } from "./supabase.js";
import { groupClientAccessByUser, uniqueGrantedClientIds } from "./clientAccess.js";
import { validateMetricsClientSelection } from "./metricsAccess.js";
import { createFeedbackLeadSql, listAllFeedbackLeadsForExportSql, listFeedbackLeadsSql } from "./feedbackSql.js";
import { normalizeEvolutionWebhook, webhookSecretMatches } from "./evolutionWebhook.js";
import {
  findEvolutionLeadIdSupabase,
  getEvolutionAiAutomationSettingsSupabase,
  getEvolutionSummarySupabase,
  listEvolutionEventsSupabase,
  listEvolutionInstancesSupabase,
  listEvolutionCrmStageHistorySupabase,
  listEvolutionLeadsSupabase,
  listEvolutionMessagesSupabase,
  listEvolutionMetaAttributionsSupabase,
  moveEvolutionLeadCrmStageSupabase,
  recordEvolutionEventSupabase,
  updateEvolutionAiAutomationStatusSupabase,
  upsertEvolutionMetaAttributionSupabase,
  updateEvolutionContactNameSupabase,
  updateEvolutionInstanceProfileSupabase,
  updateEvolutionLeadSupabase,
} from "./evolutionSupabaseStore.js";
import { resolveEvolutionMetaAttribution, type MetaOfferRow } from "./evolutionMetaAttribution.js";
import { runDailyEvolutionAiAutomation } from "./evolutionAiAutomation.js";
import { authenticateScheduledTask } from "./manusScheduleAuth.js";
import { isEvolutionAiAutomationRunning } from "../shared/evolutionAiPolicy.js";
import { resolveAuthorizedEvolutionUnit } from "./evolutionUnitAssignment.js";
import { cancelSocialPostSql, createSocialPostSql, getSocialOAuthSessionSql, getSocialPostForProcessingSql, getSocialPublishingSettingsSql, listSocialMetaConnectionsSql, listSocialPostsSql, saveSocialOAuthSessionSql, updateSocialPostScheduleSql, updateSocialPublishingSettingsSql, upsertSocialMetaConnectionSql } from "./socialPublishingSql.js";
import { socialPostStatusForConnection, validateSocialPostDraft, type SocialPostDraftInput } from "./socialPublishingPolicy.js";
import { isSocialBulkLocalId, validateSocialBulkBatch } from "./socialBulkPolicy.js";
import { cancelFacebookNativeSchedule, createMetaAuthorizationUrl, createMetaOAuthState, decryptSocialSecret, encryptSocialSecret, exchangeMetaAuthorizationCode, getMetaOAuthConfig, isMetaOAuthConfigured, listMetaPageCandidates, runScheduledSocialPublishing, scheduleFacebookForPost, verifyMetaOAuthState } from "./socialMetaService.js";
import { storagePut } from "./storage.js";
import { validateSocialMediaUpload } from "./socialMediaUploadPolicy.js";
import { createExternalAiApiToken, EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE, externalAiApiTokenPrefix, hasExternalAiApiScope, hashExternalAiApiToken, isExternalAiApiTokenActive, isExternalAiApiUnitAllowed, resolveExternalAiApiDateRange, validateExternalAiApiTokenDraft, type ExternalAiApiScope } from "./externalAiApiPolicy.js";
import { consumeExternalAiApiRateLimitSql, createExternalAiApiTokenSql, findExternalAiApiTokenByHashSql, listExternalAiApiTokensSql, recordExternalAiApiAuditSql, revokeExternalAiApiTokenSql, type ExternalAiApiToken } from "./externalAiApiSql.js";
import { getExternalAiCrmSummary, getExternalAiLeadSummary, getExternalAiMetrics, getExternalAiUnit, listExternalAiUnits } from "./externalAiApiData.js";
import { createTalentAttachmentUrl, createTalentFormForClient, createTalentSubmission, deleteTalentFormForClient, getPublicTalentForm, getTalentFormForClient, listTalentFormsForClient, listTalentSubmissions, saveTalentForm, talentSlugFromUnitName, updateTalentSubmission, uploadTalentAttachment, uploadTalentLogo, type TalentField, type TalentFieldType, type TalentSubmissionStatus } from "./talentBankSupabaseStore.js";
import { validateTalentSubmission, validateTalentUpload } from "./talentBankPolicy.js";
import {
  isMetaDirectEnabled,
  getMetaDirectClients,
  getMetaDirectDaily,
  getMetaDirectCampaigns,
  getMetaDirectOffers,
  isUserAllowedForMetaAccount,
  normalizeUnitString,
  standardizeUnitDisplayName,
} from "./metaDirectService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Simple JWT-like token (HMAC-SHA256) ────────────────────────────────────
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET não definido. Defina a variável de ambiente antes de subir em produção.");
    }
    console.warn("[auth] JWT_SECRET ausente — usando segredo aleatório de desenvolvimento (tokens invalidam ao reiniciar).");
    return crypto.randomBytes(32).toString("hex");
  })();

export function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

// ─── Tipos de claims no JWT ─────────────────────────────────────────────────
// Roles reais do sistema (do user_profiles):
//   admin, viewer, client_viewer, designer, cs,
//   account_manager, traffic_manager, copywriter, none
interface JwtClaims {
  email: string;
  name: string;
  role: string;
  id: string;
  allowedClientIds: string[];  // ["*"] = acesso total
  iat: number;
}

// ─── Roles que são considerados "admin" no sistema ───────────────────────
function isAdminRole(role: string): boolean {
  return role === "admin";
}

// ─── Roles que têm acesso à equipe (vê clients marketing_pro) ─────────
function isTeamRole(role: string): boolean {
  return ["viewer", "designer", "cs", "account_manager", "traffic_manager", "copywriter"].includes(role);
}

// ─── Busca perfil + acessos do usuário no Supabase ────────────────────────
// Usa user_profiles (role) + user_client_access (clientes permitidos)
// Ambas as tabelas JÁ EXISTEM no Supabase — zero mudança no banco.
async function fetchUserAccess(supabaseUid: string, accessToken?: string): Promise<{
  role: string;
  allowedClientIds: string[];
}> {
  const sb = getSupabaseForAccessToken(accessToken);
  if (!sb) {
    return { role: "", allowedClientIds: [] };
  }

  // 1. Busca role no user_profiles
  const { data: profile, error: profileErr } = await sb
    .from("user_profiles")
    .select("role, status, email, full_name")
    .eq("id", supabaseUid)
    .single();

  if (profileErr || !profile) {
    console.warn(`[auth] Nenhum profile encontrado para uid=${supabaseUid}`);
    return { role: "", allowedClientIds: [] };
  }

  if (profile.status !== "active") {
    console.warn(`[auth] Profile inativo para ${profile.email} (status=${profile.status})`);
    return { role: "", allowedClientIds: [] };
  }

  const role = profile.role || "none";

  // 2. Admin vê tudo
  if (isAdminRole(role)) {
    return { role, allowedClientIds: ["*"] };
  }

  // 3. Roles de equipe (viewer, designer, cs, etc.)
  //    Pelo RLS já filtram marketing_pro, mas o server também filtra
  //    via user_client_access se houver registros, senão vêe tudo.
  if (isTeamRole(role)) {
    const { data: accessRows } = await sb
      .from("user_client_access")
      .select("client_id")
      .eq("user_id", supabaseUid);

    if (accessRows && accessRows.length > 0) {
      const clientIds = accessRows.map((r: { client_id: string }) => r.client_id);
      return { role, allowedClientIds: clientIds };
    }

    // Sem registros em user_client_access = acesso a todos marketing_pro
    return { role, allowedClientIds: ["*"] };
  }

  // 4. client_viewer: só vê o que está em user_client_access
  if (role === "client_viewer") {
    const { data: accessRows } = await sb
      .from("user_client_access")
      .select("client_id")
      .eq("user_id", supabaseUid);

    const clientIds = (accessRows ?? []).map((r: { client_id: string }) => r.client_id);
    return { role, allowedClientIds: clientIds };
  }

  // 5. Role "none" ou desconhecida = sem acesso
  return { role: "none", allowedClientIds: [] };
}

// ─── Helper: checa se admin ─────────────────────────────────────────────────
function isAdmin(claims: JwtClaims): boolean {
  return isAdminRole(claims.role) || claims.allowedClientIds.includes("*");
}

type SupabaseDashboardClient = { id: string; name: string; client_group: string | null };

/**
 * Resolve unidades exclusivamente a partir das tabelas Supabase. Para admins,
 * usa os vínculos existentes em user_client_access como catálogo autorizado;
 * para demais roles, usa os IDs concedidos à própria sessão.
 */
async function listDashboardClientsFromSupabase(
  sb: any,
  claims: JwtClaims,
): Promise<{ clients: SupabaseDashboardClient[]; error?: string }> {
  let clientIds = claims.allowedClientIds.filter((id) => id !== "*");

  if (isAdminRole(claims.role)) {
    const { data: accessRows, error: accessError } = await sb
      .from("user_client_access")
      .select("client_id");
    if (accessError) return { clients: [], error: accessError.message };
    clientIds = uniqueGrantedClientIds(accessRows ?? []);
  }

  if (clientIds.length > 0) {
    const { data, error } = await sb
      .from("clients")
      .select("id, name, client_group")
      .in("id", clientIds)
      .order("name");
    if (error) return { clients: [], error: error.message };
    return { clients: data ?? [] };
  }

  // Roles de equipe sem vínculo individual veem somente as unidades de equipe
  // liberadas pelas próprias regras RLS do Supabase. Nunca há fallback local.
  if (claims.allowedClientIds.includes("*") && !isAdminRole(claims.role)) {
    const { data, error } = await sb
      .from("clients")
      .select("id, name, client_group")
      .eq("client_group", "marketing_pro")
      .order("name");
    if (error) return { clients: [], error: error.message };
    return { clients: data ?? [] };
  }

  return { clients: [] };
}

export function hasUnitAccess(clientId: string | number, claims: Pick<JwtClaims, "role" | "allowedClientIds">): boolean {
  return isAdminRole(claims.role) || claims.allowedClientIds.includes("*") || claims.allowedClientIds.includes(String(clientId));
}

function normalizeRawOfferRow(row: Record<string, any>) {
  const totalSpend = Number(row.spend ?? row.total_spend ?? 0);
  const totalConversas = Number(row.conversations_started ?? row.total_conversas_iniciadas ?? 0);
  const custoPorConversa = row.cost_per_conversation ?? row.custo_por_conversa ?? (totalConversas > 0 ? totalSpend / totalConversas : null);
  const status = row.offer_status;

  let performanceStatus = "Sem classificação";
  if (totalSpend === 0 && totalConversas > 0) performanceStatus = "Residual";
  else if (totalSpend > 0 && totalConversas === 0) performanceStatus = "Sem conversas";
  else if (custoPorConversa != null) {
    const custo = Number(custoPorConversa);
    if (custo < 5) performanceStatus = "Excelente";
    else if (custo < 9) performanceStatus = "Positivo";
    else if (custo < 13) performanceStatus = "Atenção";
    else performanceStatus = "Crítico";
  }

  return {
    ...row,
    total_spend: totalSpend,
    total_conversas_iniciadas: totalConversas,
    total_leads_meta: row.leads_meta ?? row.total_leads_meta ?? 0,
    alcance: row.reach ?? row.alcance ?? 0,
    total_impressions: row.impressions ?? row.total_impressions ?? 0,
    total_clicks: row.clicks ?? row.total_clicks ?? 0,
    total_link_clicks: row.inline_link_clicks ?? row.total_link_clicks ?? 0,
    avg_ctr: row.ctr ?? row.avg_ctr ?? 0,
    avg_cpc: row.cpc ?? row.avg_cpc ?? 0,
    avg_cpm: row.cpm ?? row.avg_cpm ?? 0,
    custo_por_conversa: custoPorConversa,
    status_formatado: status === "ACTIVE" ? "Ativa" : ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(status) ? "Pausada" : status ?? null,
    performance_status: performanceStatus,
  };
}

// ─── Auth middleware: valida JWT e injeta req.claims ─────────────────────────
declare global {
  namespace Express {
    interface Request {
      claims?: JwtClaims;
      externalAiToken?: ExternalAiApiToken;
      externalAiOutcome?: string;
    }
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token) as JwtClaims | null;
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  // Backwards-compatible: JWTs antigos sem allowedClientIds = admin
  if (!payload.allowedClientIds) {
    payload.allowedClientIds = ["*"];
    payload.role = payload.role || "admin";
  }

  req.claims = payload;
  next();
}

// Middleware adicional: exige role admin
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.claims || !isAdminRole(req.claims.role)) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}

const SUPABASE_ACCESS_COOKIE = "tp_supabase_access";
const SUPABASE_COOKIE_MAX_AGE_MS = 50 * 60 * 1000;

function readCookie(req: express.Request, cookieName: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const value = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!value) return undefined;
  try { return decodeURIComponent(value.slice(cookieName.length + 1)); } catch { return undefined; }
}

function getSupabaseForRequest(req: express.Request) {
  return getSupabaseForAccessToken(readCookie(req, SUPABASE_ACCESS_COOKIE));
}

async function requireSupabaseAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.claims || !isAdminRole(req.claims.role)) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || data.user.id !== req.claims.id) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  next();
}

function externalAiIpHash(req: express.Request): string | null {
  const ip = req.ip || req.socket.remoteAddress;
  return ip ? crypto.createHmac("sha256", JWT_SECRET).update(ip).digest("hex") : null;
}

function auditExternalAiRequest(req: express.Request, res: express.Response, tokenId: string): void {
  res.once("finish", () => {
    void recordExternalAiApiAuditSql({ tokenId, method: req.method, path: req.path, status: res.statusCode, outcome: req.externalAiOutcome ?? (res.statusCode < 400 ? "success" : "error"), ipHash: externalAiIpHash(req) }).catch((error) => console.error("[external-ai] Falha de auditoria:", error));
  });
}

function requireExternalAiToken(scope?: ExternalAiApiScope) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Token de API ausente ou inválido" }); return; }
    const rawToken = header.slice(7).trim();
    if (!rawToken.startsWith("tpai_live_") || rawToken.length < 40) { res.status(401).json({ error: "Token de API ausente ou inválido" }); return; }
    try {
      const token = await findExternalAiApiTokenByHashSql(hashExternalAiApiToken(rawToken));
      if (!token || !isExternalAiApiTokenActive(token)) { res.status(401).json({ error: "Token de API ausente ou inválido" }); return; }
      if (scope && !hasExternalAiApiScope(token.scopes, scope)) { req.externalAiOutcome = "scope_denied"; auditExternalAiRequest(req, res, token.id); res.status(403).json({ error: "O token não possui o escopo necessário" }); return; }
      const rate = await consumeExternalAiApiRateLimitSql(token.id, EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE);
      res.setHeader("X-RateLimit-Limit", String(EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE - rate.count)));
      if (!rate.allowed) { req.externalAiOutcome = "rate_limited"; auditExternalAiRequest(req, res, token.id); res.setHeader("Retry-After", "60"); res.status(429).json({ error: "Limite de chamadas excedido" }); return; }
      req.externalAiToken = token;
      auditExternalAiRequest(req, res, token.id);
      next();
    } catch (error) { console.error("[external-ai] Falha de autenticação:", error); res.status(503).json({ error: "A API externa está temporariamente indisponível" }); }
  };
}

function externalAiUnitId(req: express.Request, res: express.Response): string | null {
  const unitId = typeof req.query.unit_id === "string" ? req.query.unit_id.trim() : "";
  if (!/^[0-9a-f-]{36}$|^act_[0-9]+$|^[a-z0-9_-]{3,64}$/i.test(unitId)) {
    res.status(400).json({ error: "Informe um unit_id válido" });
    return null;
  }
  if (!req.externalAiToken || !isExternalAiApiUnitAllowed(req.externalAiToken.unitIds, unitId)) {
    req.externalAiOutcome = "unit_denied";
    res.status(403).json({ error: "O token não possui acesso a esta unidade" });
    return null;
  }
  return unitId;
}

async function persistEvolutionMetaAttribution(event: NonNullable<ReturnType<typeof normalizeEvolutionWebhook>>, eventId: string): Promise<void> {
  if (!event.contactKey || event.origin.platform !== "meta") return;
  const leadId = await findEvolutionLeadIdSupabase(event.instanceName, event.contactKey);
  if (!leadId) return;

  const sourceId = event.origin.metaSourceId;
  let offers: MetaOfferRow[] = [];
  const meta = await getAuthedSupabase();
  if (meta && sourceId) {
    let query = meta.from("vw_meta_ads_offer_ads").select("client_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_id, creative_name").limit(50);
    const sourceType = event.origin.metaSourceType?.toLowerCase();
    if (sourceType === "campaign") query = query.eq("campaign_id", sourceId);
    else if (sourceType === "adset") query = query.eq("adset_id", sourceId);
    else if (sourceType === "creative") query = query.eq("creative_id", sourceId);
    else query = query.eq("ad_id", sourceId);
    const { data, error } = await query;
    if (error) console.warn("[evolution] Não foi possível consultar a referência Meta:", error.message);
    else offers = (data ?? []) as MetaOfferRow[];
  }

  const attribution = resolveEvolutionMetaAttribution(event, leadId, eventId, offers);
  if (attribution) await upsertEvolutionMetaAttributionSupabase(attribution);
}

export async function startServer({ listen = true }: { listen?: boolean } = {}) {
  const app = express();
  const server = createServer(app);
  const socialMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });
  const talentResumeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5 } });

  app.set("trust proxy", 1);
  app.use(express.json());

  // ─── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body as { email?: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: "Identificação e senha são obrigatórios" });
      return;
    }
    const loginEmail = email.trim().toLowerCase();

    // Tenta autenticar contra o Supabase Auth
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error || !data.user) {
          res.status(401).json({ error: "Credenciais inválidas" });
          return;
        }

        // Busca role + acessos usando o UID do Supabase Auth
        const accessToken = data.session?.access_token;
        const access = await fetchUserAccess(data.user.id, accessToken);

        if (!access.role || access.allowedClientIds.length === 0) {
          res.status(403).json({ error: "Sem permissão. Contate o administrador." });
          return;
        }

        if (!accessToken) {
          res.status(500).json({ error: "Sessão Supabase indisponível" });
          return;
        }

        const userName = data.user.user_metadata?.name || loginEmail.split("@")[0];

        const token = signToken({
          email: loginEmail,
          name: userName,
          role: access.role,
          id: data.user.id,
          allowedClientIds: access.allowedClientIds,
        });
        res.cookie(SUPABASE_ACCESS_COOKIE, accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SUPABASE_COOKIE_MAX_AGE_MS,
          path: "/",
        });
        res.json({
          token,
          user: {
            email: loginEmail,
            name: userName,
            role: access.role,
            id: data.user.id,
            allowedClientIds: access.allowedClientIds,
          },
        });
        return;
      } catch (err) {
        console.error("[auth] Erro ao autenticar com Supabase:", err);
        res.status(500).json({ error: "Erro de autenticação" });
        return;
      }
    }

    res.status(503).json({ error: "Supabase não configurado para autenticação" });
  });

  // ─── Auth me ──────────────────────────────────────────────────────────────
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(req.claims);
  });

  app.post("/api/auth/logout", requireAuth, (_req, res) => {
    res.clearCookie(SUPABASE_ACCESS_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    res.status(204).end();
  });

  // ─── Banco de Talentos Vida Card ──────────────────────────────────────────
  const allowedTalentTypes: TalentFieldType[] = ["text", "textarea", "email", "phone", "cpf", "number", "select", "radio", "checkbox", "date", "file"];
  const allowedTalentStatuses: TalentSubmissionStatus[] = ["novo", "em_analise", "entrevista", "aprovado", "reprovado", "banco"];
  const publicTalentRate = new Map<string, { count: number; startedAt: number }>();
  const safeTalentSlug = (value: string) => /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/.test(value);
  const talentIpHash = (req: express.Request) => { const ip = req.ip || req.socket.remoteAddress; return ip ? crypto.createHmac("sha256", JWT_SECRET).update(ip).digest("hex") : null; };
  const publicTalentAllowed = (req: express.Request) => { const key = talentIpHash(req) ?? "unknown"; const now = Date.now(); const bucket = publicTalentRate.get(key); if (!bucket || now - bucket.startedAt > 60 * 60_000) { publicTalentRate.set(key, { count: 1, startedAt: now }); return true; } bucket.count += 1; return bucket.count <= 12; };
  const trimText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
  async function talentClientAllowed(
    req: express.Request,
    clientId: string,
  ): Promise<{ id: string; name: string } | null> {
    if (!req.claims || req.claims.role === "none") return null;
    const isFullAdmin = isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*");

    // 1. Admin geral tem acesso a qualquer unidade/cliente
    if (isFullAdmin) {
      if (isMetaDirectEnabled()) {
        const metaClients = await getMetaDirectClients().catch(() => []);
        const metaAcc = metaClients.find((m) => m.id === clientId || m.account_id === clientId);
        if (metaAcc) return { id: metaAcc.id, name: metaAcc.name };
      }
      const sb = getSupabaseForRequest(req);
      if (sb) {
        try {
          const { data: sbClient } = await sb.from("clients").select("id, name").eq("id", clientId).maybeSingle();
          if (sbClient) return { id: sbClient.id, name: sbClient.name };
        } catch {}
      }
      return { id: clientId, name: standardizeUnitDisplayName(clientId) || clientId };
    }

    // 2. Gestor com restrição de unidades (ex: Rosângela, Rogério, Bruna, Joice, etc.)
    const sb = getSupabaseForRequest(req);
    let authorizedClients: SupabaseDashboardClient[] = [];
    if (sb) {
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims);
      authorizedClients = catalog.clients || [];
    }

    if (isMetaDirectEnabled()) {
      const metaClients = await getMetaDirectClients().catch(() => []);
      const metaAcc = metaClients.find((m) => m.id === clientId || m.account_id === clientId);
      if (metaAcc && isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims)) {
        return { id: metaAcc.id, name: metaAcc.name };
      }
    }

    // Match direto por UUID ou nome autorizado
    if (req.claims.allowedClientIds.includes(clientId)) {
      const client = authorizedClients.find((c) => c.id === clientId);
      return { id: clientId, name: client?.name || clientId };
    }

    const normalizedInput = normalizeUnitString(clientId);
    if (normalizedInput) {
      const matched = authorizedClients.find((c) => {
        const cNorm = normalizeUnitString(c.name);
        return cNorm === normalizedInput || cNorm.includes(normalizedInput) || normalizedInput.includes(cNorm);
      });
      if (matched) return { id: matched.id, name: matched.name };
    }

    return null;
  }

  function talentManager(req: express.Request, res: express.Response): boolean { if (!req.claims || req.claims.role === "none") { res.status(403).json({ error: "Acesso restrito a gestores de unidade" }); return false; } return true; }
  function talentFieldPayload(value: unknown, index: number): Omit<TalentField, "id" | "formId"> | null { const item = value && typeof value === "object" ? value as Record<string, unknown> : {}; const fieldKey = trimText(item.fieldKey, 100).toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/(^_|_$)/g, ""); const type = trimText(item.fieldType, 20) as TalentFieldType; const label = trimText(item.label, 500); if (!fieldKey || !label || !allowedTalentTypes.includes(type)) return null; const options = Array.isArray(item.options) ? item.options.slice(0, 30).map((option) => option && typeof option === "object" ? option as Record<string, unknown> : {}).filter((option) => trimText(option.label, 120) && trimText(option.value, 120)).map((option) => ({ label: trimText(option.label, 120), value: trimText(option.value, 120) })) : []; return { fieldKey, label, placeholder: trimText(item.placeholder, 220) || null, helpText: trimText(item.helpText, 500) || null, fieldType: type, isRequired: item.isRequired === true, orderIndex: index, options, validationRules: item.validationRules && typeof item.validationRules === "object" && !Array.isArray(item.validationRules) ? item.validationRules as Record<string, unknown> : {} }; }

  app.get("/api/talent/public/:slug", async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    if (!safeTalentSlug(slug)) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
    try { const form = await getPublicTalentForm(slug); if (!form) { res.status(404).json({ error: "Esta página de oportunidades não está disponível" }); return; } const { clientId: _clientId, ...publicForm } = form; res.setHeader("Cache-Control", "public, max-age=120"); res.json(publicForm); }
    catch (error) { console.error("[talent] Falha ao carregar formulário público:", error); res.status(503).json({ error: "Não foi possível carregar o formulário" }); }
  });

  app.post("/api/talent/public/:slug/submit", talentResumeUpload.any(), async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    if (!safeTalentSlug(slug)) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
    if (!publicTalentAllowed(req)) { res.status(429).json({ error: "Muitas tentativas. Aguarde antes de enviar novamente." }); return; }
    try {
      const form = await getPublicTalentForm(slug);
      if (!form) { res.status(404).json({ error: "Esta página de oportunidades não está disponível" }); return; }
      const answers = JSON.parse(String(req.body.answers ?? "{}")) as Record<string, unknown>;
      if (!answers || typeof answers !== "object" || Array.isArray(answers) || req.body.lgpdAccepted !== "true") { res.status(400).json({ error: "Revise os dados e confirme o consentimento LGPD" }); return; }
      const uploads = (req.files ?? []) as Express.Multer.File[];
      const validation = validateTalentSubmission(form.fields, answers, uploads.map((item) => item.fieldname.replace(/^file_/, "")));
      if (validation) { res.status(400).json({ error: validation }); return; }
      const attachments = [];
      for (const current of uploads) {
        const fieldKey = current.fieldname.replace(/^file_/, "");
        const config = form.fields.find((field) => field.fieldKey === fieldKey && field.fieldType === "file");
        const uploadError = validateTalentUpload({ fieldKey, mimeType: current.mimetype, size: current.size, allowedFieldKeys: form.fields.filter((field) => field.fieldType === "file").map((field) => field.fieldKey) });
        if (!config || uploadError) { res.status(400).json({ error: uploadError ?? "Anexo não permitido" }); return; }
        attachments.push(await uploadTalentAttachment({ formId: form.id, fieldKey, fileName: current.originalname, file: current.buffer, mimeType: current.mimetype }));
      }
      await createTalentSubmission({ form, answers, attachments, ipHash: talentIpHash(req), userAgent: req.get("user-agent") ?? null });
      res.status(201).json({ ok: true, successTitle: form.successTitle, successMessage: form.successMessage });
    } catch (error) { console.error("[talent] Falha ao enviar candidatura:", error); res.status(503).json({ error: "Não foi possível enviar sua candidatura agora. Tente novamente." }); }
  });

  app.get("/api/talent/admin/units", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    try {
      const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

      if (isMetaDirectEnabled()) {
        const allMetaClients = await getMetaDirectClients();
        let clients = allMetaClients;

        if (!isFullAdmin) {
          const sb = getSupabaseForRequest(req);
          let authorizedClients: SupabaseDashboardClient[] = [];
          if (sb && req.claims) {
            const result = await listDashboardClientsFromSupabase(sb, req.claims);
            authorizedClients = result.clients || [];
          }
          clients = allMetaClients.filter((metaAcc) =>
            isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
          );
        }

        res.json({
          units: clients.map((c) => ({
            id: c.id,
            name: c.name,
            client_group: c.client_group,
          })),
        });
        return;
      }

      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: catalog.error }); return; }
      const units = catalog.clients.map((c) => ({
        id: c.id,
        name: standardizeUnitDisplayName(c.name) || c.name,
      }));
      res.json({ units });
    } catch (error) {
      console.error("[talent] Falha ao listar unidades:", error);
      res.status(503).json({ error: "Não foi possível carregar as unidades" });
    }
  });

  app.get("/api/talent/admin/form", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
    if (!clientId) { res.status(400).json({ error: "Selecione uma unidade válida" }); return; }
    const formId = typeof req.query.form_id === "string" ? req.query.form_id : undefined;
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      let form = await getTalentFormForClient(client.id, formId);
      if (!form && !formId) form = await createTalentFormForClient({ clientId: client.id, publicSlug: talentSlugFromUnitName(client.name, client.id), title: `Trabalhe Conosco — ${client.name}`, subtitle: "Faça parte do time Vida Card." });
      res.json({ unit: client, form, forms: await listTalentFormsForClient(client.id) });
    } catch (error) {
      console.error("[talent] Falha ao carregar formulário administrativo:", error);
      res.status(503).json({ error: "Não foi possível carregar o formulário" });
    }
  });

  app.post("/api/talent/admin/forms", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const payload = req.body as Record<string, unknown>;
    const clientId = trimText(payload.clientId, 100);
    const title = trimText(payload.title, 255) || "Novo formulário";
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      const slug = `${talentSlugFromUnitName(client.name, client.id)}-${Date.now().toString(36)}`.slice(0, 120);
      const form = await createTalentFormForClient({ clientId: client.id, publicSlug: slug, title, subtitle: "Faça parte do time Vida Card." });
      res.status(201).json({ form });
    } catch (error) {
      console.error("[talent] Falha ao criar formulário:", error);
      res.status(503).json({ error: "Não foi possível criar o formulário" });
    }
  });

  app.put("/api/talent/admin/form", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const payload = req.body as Record<string, unknown>;
    const clientId = trimText(payload.clientId, 100);
    const formId = trimText(payload.formId, 100);
    if (!clientId || !formId) { res.status(400).json({ error: "Formulário ou unidade inválidos" }); return; }
    const fieldsRaw = Array.isArray(payload.fields) ? payload.fields : [];
    const fields = fieldsRaw.map(talentFieldPayload).filter((item): item is Omit<TalentField, "id" | "formId"> => Boolean(item));
    if (fields.length !== fieldsRaw.length || new Set(fields.map((item) => item.fieldKey)).size !== fields.length) {
      res.status(400).json({ error: "Revise as perguntas: cada chave deve ser única e válida" });
      return;
    }
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      const form = await saveTalentForm({
        clientId: client.id,
        formId,
        title: trimText(payload.title, 255) || "Trabalhe Conosco",
        subtitle: trimText(payload.subtitle, 1200) || "Faça parte do time Vida Card.",
        bannerUrl: trimText(payload.bannerUrl, 1000) || null,
        lgpdDisclaimer: trimText(payload.lgpdDisclaimer, 3000) || "Autorizo o tratamento dos meus dados para fins de recrutamento.",
        successTitle: trimText(payload.successTitle, 255) || "Candidatura enviada!",
        successMessage: trimText(payload.successMessage, 1200) || "Recebemos suas informações.",
        publicSlug: safeTalentSlug(trimText(payload.publicSlug, 120) || "") ? trimText(payload.publicSlug, 120)!.toLowerCase() : "",
        isPublished: payload.isPublished === true,
        fields,
      });
      res.json({ form });
    } catch (error) {
      console.error("[talent] Falha ao salvar formulário:", error);
      res.status(503).json({ error: "Não foi possível salvar o formulário" });
    }
  });

  app.delete("/api/talent/admin/forms/:id", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
    const formId = req.params.id;
    if (!clientId || !formId) {
      res.status(400).json({ error: "Formulário ou unidade inválidos" });
      return;
    }
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) {
        res.status(403).json({ error: "Sem acesso a esta unidade" });
        return;
      }
      await deleteTalentFormForClient(client.id, formId);
      res.json({ ok: true });
    } catch (error) {
      console.error("[talent] Falha ao deletar formulário:", error);
      res.status(503).json({ error: "Não foi possível deletar o formulário" });
    }
  });

  app.post("/api/talent/admin/forms/:id/logo", requireAuth, talentResumeUpload.single("logo"), async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId = typeof req.body?.clientId === "string" && req.body.clientId ? req.body.clientId : (typeof req.query.client_id === "string" ? req.query.client_id : "");
    const formId = req.params.id;
    if (!clientId || !formId) {
      res.status(400).json({ error: "Formulário ou unidade inválidos" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Nenhum arquivo de imagem enviado" });
      return;
    }
    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG)" });
      return;
    }
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) {
        res.status(403).json({ error: "Sem acesso a esta unidade" });
        return;
      }
      const logoUrl = await uploadTalentLogo({
        clientId: client.id,
        formId,
        fileName: file.originalname,
        file: file.buffer,
        mimeType: file.mimetype,
      });
      res.json({ logoUrl });
    } catch (error) {
      console.error("[talent] Falha ao enviar logo:", error);
      res.status(503).json({ error: "Não foi possível enviar a logo" });
    }
  });

  app.get("/api/talent/admin/submissions", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
    const formId = typeof req.query.form_id === "string" ? req.query.form_id : undefined;
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      const submissions = await listTalentSubmissions({
        clientId: client.id,
        formId,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        limit: Number(req.query.limit ?? 200),
      });
      res.json({ submissions });
    } catch (error) {
      console.error("[talent] Falha ao listar candidaturas:", error);
      res.status(503).json({ error: "Não foi possível carregar as candidaturas" });
    }
  });

  app.patch("/api/talent/admin/submissions/:id", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const payload = req.body as Record<string, unknown>;
    const clientId = trimText(payload.clientId, 100);
    const status = trimText(payload.status, 20) as TalentSubmissionStatus;
    if (!clientId || !req.params.id) { res.status(400).json({ error: "Candidatura ou unidade inválida" }); return; }
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      const result = await updateTalentSubmission({
        id: req.params.id,
        clientId: client.id,
        status: allowedTalentStatuses.includes(status) ? status : undefined,
        notes: payload.notes === undefined ? undefined : trimText(payload.notes, 5000) || null,
      });
      if (!result) { res.status(404).json({ error: "Candidatura não encontrada" }); return; }
      res.json({ submission: result });
    } catch (error) {
      console.error("[talent] Falha ao atualizar candidatura:", error);
      res.status(503).json({ error: "Não foi possível atualizar a candidatura" });
    }
  });

  app.get("/api/talent/admin/submissions/:id/attachments/:index", requireAuth, async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) { res.status(403).json({ error: "Sem acesso a esta unidade" }); return; }
      const candidates = await listTalentSubmissions({ clientId: client.id, limit: 500 });
      const candidate = candidates.find((item) => item.id === req.params.id);
      const attachment = candidate?.attachments[Number(req.params.index)];
      if (!attachment) { res.status(404).json({ error: "Currículo não encontrado" }); return; }
      res.json({ url: await createTalentAttachmentUrl(attachment.storageKey), fileName: attachment.fileName });
    } catch (error) {
      console.error("[talent] Falha ao assinar currículo:", error);
      res.status(503).json({ error: "Não foi possível abrir o currículo" });
    }
  });

  // ─── Integrações externas de IA: administração (somente admins) ───────────
  app.get("/api/external-ai/tokens", requireAuth, requireSupabaseAdmin, async (req, res) => {
    try {
      let units: Array<{ id: string; name: string; client_group?: string | null }> = [];
      if (isMetaDirectEnabled()) {
        const allMetaClients = await getMetaDirectClients();
        units = allMetaClients.map((c) => ({ id: c.id, name: c.name, client_group: c.client_group }));
      } else {
        const sb = getSupabaseForRequest(req);
        if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
        const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
        if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
        units = catalog.clients;
      }
      const tokens = await listExternalAiApiTokensSql(req.claims!.id);
      res.json({
        scopes: ["metrics:read", "leads:summary:read", "crm:summary:read"],
        rateLimitPerMinute: EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE,
        units,
        tokens: tokens.map(({ tokenHash: _hash, ...token }) => token),
      });
    } catch (error) {
      console.error("[external-ai] Falha ao listar tokens:", error);
      res.status(503).json({ error: "Não foi possível carregar os tokens externos" });
    }
  });

  app.post("/api/external-ai/tokens", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const validated = validateExternalAiApiTokenDraft(req.body as Record<string, unknown>);
    if (!validated.ok) { res.status(400).json({ error: validated.error }); return; }
    try {
      let permitted: Set<string>;
      if (isMetaDirectEnabled()) {
        const allMeta = await getMetaDirectClients();
        permitted = new Set(allMeta.map((c) => c.id));
      } else {
        const sb = getSupabaseForRequest(req);
        if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
        const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
        if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
        permitted = new Set(catalog.clients.map((unit) => unit.id));
      }
      if (!validated.value.unitIds.every((unitId) => permitted.has(unitId))) {
        res.status(403).json({ error: "O token só pode incluir unidades autorizadas" });
        return;
      }
      const rawToken = createExternalAiApiToken();
      const token = await createExternalAiApiTokenSql({
        ownerUserId: req.claims!.id,
        name: validated.value.name,
        tokenPrefix: externalAiApiTokenPrefix(rawToken),
        tokenHash: hashExternalAiApiToken(rawToken),
        scopes: validated.value.scopes,
        unitIds: validated.value.unitIds,
        expiresAt: validated.value.expiresAt,
      });
      const { tokenHash: _hash, ...metadata } = token;
      res.status(201).json({ token: rawToken, metadata });
    } catch (error) {
      console.error("[external-ai] Falha ao criar token:", error);
      res.status(503).json({ error: "Não foi possível criar o token externo" });
    }
  });

  app.delete("/api/external-ai/tokens/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) { res.status(400).json({ error: "Token inválido" }); return; }
    try {
      if (!await revokeExternalAiApiTokenSql(req.params.id, req.claims!.id)) { res.status(404).json({ error: "Token não encontrado ou já revogado" }); return; }
      res.json({ ok: true });
    } catch (error) { console.error("[external-ai] Falha ao revogar token:", error); res.status(503).json({ error: "Não foi possível revogar o token" }); }
  });

  // ─── API externa: apenas agregados, sem PII e sem qualquer escrita ─────────
  app.get("/api/external/v1/units", requireExternalAiToken(), async (req, res) => {
    try { res.json({ apiVersion: "v1", generatedAt: new Date().toISOString(), dataClassification: "aggregated", units: await listExternalAiUnits(req.externalAiToken!.unitIds) }); }
    catch (error) { console.error("[external-ai] Falha ao listar unidades:", error); req.externalAiOutcome = "upstream_error"; res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" }); }
  });

  app.get("/api/external/v1/metrics", requireExternalAiToken("metrics:read"), async (req, res) => {
    const unitId = externalAiUnitId(req, res); if (!unitId) return;
    const period = resolveExternalAiApiDateRange(req.query.start, req.query.end); if (!period.ok) { res.status(400).json({ error: period.error }); return; }
    try { const [unit, metrics] = await Promise.all([getExternalAiUnit(unitId), getExternalAiMetrics(unitId, period.start, period.end)]); res.json({ apiVersion: "v1", generatedAt: new Date().toISOString(), dataClassification: "aggregated", unit, metrics }); }
    catch (error) { console.error("[external-ai] Falha em métricas:", error); req.externalAiOutcome = "upstream_error"; res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" }); }
  });

  app.get("/api/external/v1/leads/summary", requireExternalAiToken("leads:summary:read"), async (req, res) => {
    const unitId = externalAiUnitId(req, res); if (!unitId) return;
    try { const unit = await getExternalAiUnit(unitId); res.json({ apiVersion: "v1", generatedAt: new Date().toISOString(), dataClassification: "aggregated", unit, leads: await getExternalAiLeadSummary(unit.name) }); }
    catch (error) { console.error("[external-ai] Falha em resumo de leads:", error); req.externalAiOutcome = "upstream_error"; res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" }); }
  });

  app.get("/api/external/v1/crm/summary", requireExternalAiToken("crm:summary:read"), async (req, res) => {
    const unitId = externalAiUnitId(req, res); if (!unitId) return;
    try { const unit = await getExternalAiUnit(unitId); res.json({ apiVersion: "v1", generatedAt: new Date().toISOString(), dataClassification: "aggregated", unit, crm: await getExternalAiCrmSummary(unit.name) }); }
    catch (error) { console.error("[external-ai] Falha em resumo CRM:", error); req.externalAiOutcome = "upstream_error"; res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" }); }
  });

  // ─── Evolution — módulo isolado de rastreio ───────────────────────────────
  // Este endpoint é público apenas para a Evolution, autenticada por um segredo
  // exclusivo. Não compartilha dados, rotas ou persistência das métricas atuais.
  app.post("/api/evolution/webhook", async (req, res) => {
    const authorization = req.headers.authorization;
    const receivedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    if (!webhookSecretMatches(receivedSecret, process.env.EVOLUTION_WEBHOOK_SECRET)) {
      res.status(401).json({ error: "Webhook Evolution não autorizado" });
      return;
    }

    const event = normalizeEvolutionWebhook(req.body);
    if (!event) {
      res.status(400).json({ error: "Evento Evolution inválido" });
      return;
    }

    try {
      const result = await recordEvolutionEventSupabase(event);
      if (!result.duplicate) {
        if (event.contactUpdate) {
          try { await updateEvolutionContactNameSupabase(event.instanceName, event.contactUpdate.contactKey, event.contactUpdate.contactName); }
          catch (contactError) { console.warn("[evolution] Falha ao atualizar nome do contato:", contactError); }
        }
        try { await persistEvolutionMetaAttribution(event, result.eventId); }
        catch (attributionError) { console.warn("[evolution] Falha na atribuição Meta:", attributionError); }
      }
      res.status(202).json({ accepted: true, duplicate: result.duplicate });
    } catch (error) {
      console.error("[evolution] Falha ao processar webhook:", error);
      res.status(503).json({ error: "Não foi possível processar o evento Evolution" });
    }
  });

  app.post("/api/scheduled/evolution-ai-daily", async (req, res) => {
    let taskUid: string | undefined;
    try {
      taskUid = await authenticateScheduledTask(req);
      const settings = await getEvolutionAiAutomationSettingsSupabase();
      if (settings.scheduleCronTaskUid && settings.scheduleCronTaskUid !== taskUid) {
        res.status(403).json({ error: "Tarefa agendada não autorizada" });
        return;
      }
      if (!settings.scheduleCronTaskUid) {
        await updateEvolutionAiAutomationStatusSupabase({ scheduleCronTaskUid: taskUid, status: "scheduled" });
      }
      const summary = await runDailyEvolutionAiAutomation();
      res.json({ ok: true, summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[evolution-ai] Falha na rotina diária:", message);
      const status = message.includes("autorizado") || message.includes("task_uid") ? 403 : 500;
      res.status(status).json({
        error: message,
        context: { path: req.path, taskUid: taskUid ?? null },
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/scheduled/social-publish", async (req, res) => {
    let taskUid: string | undefined;
    try {
      taskUid = await authenticateScheduledTask(req);
      const settings = await getSocialPublishingSettingsSql();
      if (settings.scheduleCronTaskUid && settings.scheduleCronTaskUid !== taskUid) { res.status(403).json({ error: "Tarefa agendada não autorizada" }); return; }
      if (!settings.scheduleCronTaskUid) await updateSocialPublishingSettingsSql({ scheduleCronTaskUid: taskUid, schedulerStatus: "active" });
      res.json({ ok: true, summary: await runScheduledSocialPublishing() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[social] Falha no processador agendado:", message);
      res.status(message.includes("autorizado") ? 403 : 500).json({ error: message, context: { path: req.path, taskUid: taskUid ?? null }, timestamp: new Date().toISOString() });
    }
  });

  // ─── Publicações sociais Meta (módulo isolado) ─────────────────────────────
  app.get("/api/social/overview", requireAuth, requireSupabaseAdmin, async (req, res) => {
    try {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
      const [connections, posts, scheduler] = await Promise.all([listSocialMetaConnectionsSql(req.claims!.id), listSocialPostsSql(req.claims!.id), getSocialPublishingSettingsSql()]);
      res.json({ units: catalog.clients, connections, posts, scheduler: { status: scheduler.schedulerStatus, taskUid: scheduler.scheduleCronTaskUid }, metaConfigured: isMetaOAuthConfigured() });
    } catch (error) {
      console.error("[social] Falha ao carregar calendário:", error);
      res.status(503).json({ error: "Não foi possível carregar o calendário social" });
    }
  });

  app.get("/api/social/meta/connect", requireAuth, requireSupabaseAdmin, async (req, res) => {
    try {
      const config = getMetaOAuthConfig();
      res.json({ authorizationUrl: createMetaAuthorizationUrl(config, createMetaOAuthState(req.claims!.id)) });
    } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "A conexão Meta não está disponível" }); }
  });

  app.get("/api/social/meta/callback", async (req, res) => {
    const { state, code, error: oauthError, error_description: errorDescription } = req.query as { state?: string; code?: string; error?: string; error_description?: string };
    const verified = state ? verifyMetaOAuthState(state) : null;
    if (!verified) { res.status(400).send("A autorização Meta expirou ou não é válida. Volte à Central de Publicações e tente novamente."); return; }
    if (oauthError || !code) { res.redirect(`/publicacoes?meta_error=${encodeURIComponent(errorDescription || oauthError || "Autorização cancelada")}`); return; }
    try {
      const config = getMetaOAuthConfig();
      const candidates = await listMetaPageCandidates(await exchangeMetaAuthorizationCode(config, code));
      const sessionId = crypto.randomUUID();
      await saveSocialOAuthSessionSql({ id: sessionId, ownerUserId: verified.ownerUserId, candidatesEncrypted: encryptSocialSecret(JSON.stringify(candidates)), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
      res.redirect(`/publicacoes?meta_session=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      console.error("[social] Falha no callback Meta:", error);
      res.redirect(`/publicacoes?meta_error=${encodeURIComponent("Não foi possível ler as páginas autorizadas pela Meta")}`);
    }
  });

  app.get("/api/social/meta/candidates/:sessionId", requireAuth, requireSupabaseAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.sessionId)) { res.status(400).json({ error: "Sessão de conexão inválida" }); return; }
    try {
      const session = await getSocialOAuthSessionSql(req.params.sessionId, req.claims!.id);
      if (!session) { res.status(404).json({ error: "A sessão de conexão expirou. Conecte a Meta novamente." }); return; }
      const candidates = JSON.parse(decryptSocialSecret(session.candidatesEncrypted)) as Array<{ facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null }>;
      res.json({ candidates, expiresAt: session.expiresAt });
    } catch { res.status(503).json({ error: "Não foi possível carregar as páginas Meta autorizadas" }); }
  });

  app.post("/api/social/meta/connections", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const body = req.body as { sessionId?: string; facebookPageId?: string; unitId?: string };
    if (!body.sessionId || !body.facebookPageId) { res.status(400).json({ error: "Selecione uma Página Meta e uma unidade" }); return; }
    try {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
      const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
      if (!unit) { res.status(403).json({ error: "A conta Meta só pode ser associada a uma unidade autorizada" }); return; }
      const session = await getSocialOAuthSessionSql(body.sessionId, req.claims!.id);
      if (!session) { res.status(404).json({ error: "A sessão de conexão expirou. Conecte a Meta novamente." }); return; }
      const candidates = JSON.parse(decryptSocialSecret(session.candidatesEncrypted)) as Array<{ facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null; pageAccessToken: string }>;
      const candidate = candidates.find((item) => item.facebookPageId === body.facebookPageId);
      if (!candidate) { res.status(403).json({ error: "A Página selecionada não pertence à autorização Meta atual" }); return; }
      await upsertSocialMetaConnectionSql({ id: crypto.randomUUID(), ownerUserId: req.claims!.id, unitId: unit.id, unitName: unit.name, facebookPageId: candidate.facebookPageId, facebookPageName: candidate.facebookPageName, instagramAccountId: candidate.instagramAccountId, instagramUsername: candidate.instagramUsername, accessTokenEncrypted: encryptSocialSecret(candidate.pageAccessToken), grantedScopes: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish" });
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("[social] Falha ao salvar conexão Meta:", error);
      res.status(503).json({ error: "Não foi possível salvar a conexão Meta" });
    }
  });

  app.post("/api/social/media", requireAuth, requireSupabaseAdmin, (req, res, next) => socialMediaUpload.single("file")(req, res, (error) => error ? res.status(400).json({ error: "Envie um único arquivo de até 50 MB" }) : next()), async (req, res) => {
    const validation = validateSocialMediaUpload(req.file);
    if (typeof validation === "string") { res.status(400).json({ error: validation }); return; }
    try {
      const stored = await storagePut(`social-media/${req.claims!.id}/${crypto.randomUUID()}.${validation.extension}`, req.file!.buffer, req.file!.mimetype);
      res.status(201).json({ url: `https://www.trafego.pro${stored.url}`, mediaType: validation.mediaType });
    } catch (error) {
      console.error("[social] Falha no upload de mídia:", error);
      res.status(503).json({ error: "Não foi possível armazenar a mídia selecionada" });
    }
  });

  app.post("/api/social/posts/batch", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const body = req.body as { items?: Array<Partial<SocialPostDraftInput> & { localId?: string; unitId?: string; connectionId?: string | null }> };
    const items = Array.isArray(body.items) ? body.items : [];
    const batchError = validateSocialBulkBatch(items);
    if (batchError) { res.status(400).json({ error: batchError }); return; }
    try {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
      const connections = await listSocialMetaConnectionsSql(req.claims!.id);
      const results: Array<{ localId: string; postId?: string; error?: string }> = [];
      for (const item of items) {
        const localId = typeof item.localId === "string" ? item.localId : "";
        if (!isSocialBulkLocalId(localId)) { results.push({ localId, error: "Identificador local inválido" }); continue; }
        const draft: SocialPostDraftInput = { title: typeof item.title === "string" ? item.title : "", caption: typeof item.caption === "string" ? item.caption : "", linkUrl: typeof item.linkUrl === "string" ? item.linkUrl : undefined, contentFormat: item.contentFormat as SocialPostDraftInput["contentFormat"], targetFacebook: item.targetFacebook === true, targetInstagram: item.targetInstagram === true, scheduledFor: typeof item.scheduledFor === "string" ? item.scheduledFor : undefined, media: Array.isArray(item.media) ? item.media as SocialPostDraftInput["media"] : [] };
        const validation = validateSocialPostDraft(draft);
        if (validation) { results.push({ localId, error: validation }); continue; }
        const unit = resolveAuthorizedEvolutionUnit(item.unitId, catalog.clients);
        if (!unit) { results.push({ localId, error: "Unidade não autorizada" }); continue; }
        const connection = item.connectionId ? connections.find((value) => value.id === item.connectionId && value.unitId === unit.id && value.connectionStatus === "active") ?? null : null;
        if (item.connectionId && !connection) { results.push({ localId, error: "Conta Meta não ativa para esta unidade" }); continue; }
        try {
          const post = await createSocialPostSql({ ownerUserId: req.claims!.id, clientBatchKey: localId, unitId: unit.id, unitName: unit.name, socialConnectionId: connection?.id ?? null, title: draft.title.trim(), caption: draft.caption.trim(), linkUrl: draft.linkUrl?.trim() || null, contentFormat: draft.contentFormat, targetFacebook: draft.targetFacebook, targetInstagram: draft.targetInstagram, status: socialPostStatusForConnection(connection?.id ?? null, Boolean(draft.scheduledFor)), scheduledFor: draft.scheduledFor ?? null, media: draft.media });
          results.push({ localId, postId: post.id });
        } catch { results.push({ localId, error: "Não foi possível gravar esta publicação" }); }
      }
      res.status(results.some((item) => item.error) ? 207 : 201).json({ results });
    } catch (error) {
      console.error("[social] Falha ao inserir lote de publicações:", error);
      res.status(503).json({ error: "Não foi possível processar a fila de publicações" });
    }
  });

  app.post("/api/social/posts", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const body = req.body as Partial<SocialPostDraftInput> & { unitId?: string; connectionId?: string | null; localId?: string };
    const draft: SocialPostDraftInput = {
      title: typeof body.title === "string" ? body.title : "", caption: typeof body.caption === "string" ? body.caption : "",
      linkUrl: typeof body.linkUrl === "string" ? body.linkUrl : undefined, contentFormat: body.contentFormat as SocialPostDraftInput["contentFormat"],
      targetFacebook: body.targetFacebook === true, targetInstagram: body.targetInstagram === true, scheduledFor: typeof body.scheduledFor === "string" ? body.scheduledFor : undefined,
      media: Array.isArray(body.media) ? body.media as SocialPostDraftInput["media"] : [],
    };
    const validation = validateSocialPostDraft(draft);
    if (validation) { res.status(400).json({ error: validation }); return; }
    try {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
      const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
      if (!unit) { res.status(403).json({ error: "A publicação só pode ser vinculada a uma unidade autorizada" }); return; }
      const connections = await listSocialMetaConnectionsSql(req.claims!.id);
      const connection = body.connectionId ? connections.find((item) => item.id === body.connectionId && item.unitId === unit.id && item.connectionStatus === "active") ?? null : null;
      if (body.connectionId && !connection) { res.status(403).json({ error: "A conta Meta selecionada não está ativa para esta unidade" }); return; }
      const wantsSchedule = Boolean(draft.scheduledFor);
      const post = await createSocialPostSql({ ownerUserId: req.claims!.id, clientBatchKey: typeof body.localId === "string" && /^[0-9a-f-]{36}$/i.test(body.localId) ? body.localId : null, unitId: unit.id, unitName: unit.name, socialConnectionId: connection?.id ?? null, title: draft.title.trim(), caption: draft.caption.trim(), linkUrl: draft.linkUrl?.trim() || null, contentFormat: draft.contentFormat, targetFacebook: draft.targetFacebook, targetInstagram: draft.targetInstagram, status: socialPostStatusForConnection(connection?.id ?? null, wantsSchedule), scheduledFor: draft.scheduledFor ?? null, media: draft.media });
      if (post.targetFacebook && connection && wantsSchedule) {
        const due = await getSocialPostForProcessingSql(post.id);
        if (due) await scheduleFacebookForPost(due);
      }
      res.status(201).json({ post: (await listSocialPostsSql(req.claims!.id)).find((item) => item.id === post.id) ?? post });
    } catch (error) {
      console.error("[social] Falha ao criar publicação:", error);
      res.status(503).json({ error: "Não foi possível salvar a publicação" });
    }
  });

  app.patch("/api/social/posts/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const scheduledFor = typeof req.body?.scheduledFor === "string" ? req.body.scheduledFor : "";
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || Number.isNaN(new Date(scheduledFor).getTime())) { res.status(400).json({ error: "Agendamento inválido" }); return; }
    const updated = await updateSocialPostScheduleSql(req.claims!.id, req.params.id, scheduledFor);
    if (!updated) { res.status(409).json({ error: "Este item não pode mais ser editado" }); return; }
    res.json({ ok: true });
  });

  app.delete("/api/social/posts/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) { res.status(400).json({ error: "Publicação inválida" }); return; }
    const post = await getSocialPostForProcessingSql(req.params.id);
    if (post?.facebookPostId) {
      try { await cancelFacebookNativeSchedule(post); }
      catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "Não foi possível cancelar o agendamento no Facebook" }); return; }
    }
    const cancelled = await cancelSocialPostSql(req.claims!.id, req.params.id);
    if (!cancelled) { res.status(409).json({ error: "Este item não pode mais ser excluído" }); return; }
    res.json({ ok: true });
  });

  app.get("/api/evolution/overview", requireAuth, requireSupabaseAdmin, async (_req, res) => {
    try {
      const [summary, instances, events, leads, automation] = await Promise.all([
        getEvolutionSummarySupabase(), listEvolutionInstancesSupabase(), listEvolutionEventsSupabase(), listEvolutionLeadsSupabase(),
        getEvolutionAiAutomationSettingsSupabase(),
      ]);
      res.json({ summary, instances, events, leads, automation });
    } catch (error) {
      console.error("[evolution] Falha ao carregar painel:", error);
      res.status(503).json({ error: "Não foi possível carregar o painel Evolution" });
    }
  });

  app.get("/api/evolution/attributions", requireAuth, requireSupabaseAdmin, async (_req, res) => {
    try { res.json({ rows: await listEvolutionMetaAttributionsSupabase() }); }
    catch (error) {
      console.error("[evolution] Falha ao carregar atribuições Meta:", error);
      res.status(503).json({ error: "Não foi possível carregar atribuições Meta" });
    }
  });

  app.get("/api/evolution/leads/:id/messages", requireAuth, requireSupabaseAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) { res.status(400).json({ error: "Lead inválido" }); return; }
    try { res.json({ rows: await listEvolutionMessagesSupabase(req.params.id) }); }
    catch (error) {
      console.error("[evolution] Falha ao carregar conversas:", error);
      res.status(503).json({ error: "Não foi possível carregar conversas" });
    }
  });

  app.get("/api/evolution/leads/:id/crm-history", requireAuth, requireSupabaseAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) { res.status(400).json({ error: "Lead inválido" }); return; }
    try { res.json({ rows: await listEvolutionCrmStageHistorySupabase(req.params.id) }); }
    catch (error) {
      console.error("[evolution] Falha ao carregar histórico CRM:", error);
      res.status(503).json({ error: "Não foi possível carregar histórico CRM" });
    }
  });

  app.put("/api/evolution/leads/:id/crm-stage", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const id = req.params.id;
    const body = req.body as { instanceName?: string; stage?: string; note?: string };
    const stages = ["lead_not_responded", "lead_responded", "follow_up", "lead_replied", "negotiation", "closed_won", "closed_lost"];
    if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body.instanceName !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(body.instanceName) || !stages.includes(body.stage ?? "")) {
      res.status(400).json({ error: "Movimentação CRM inválida" });
      return;
    }
    try {
      if (isEvolutionAiAutomationRunning(await getEvolutionAiAutomationSettingsSupabase())) {
        res.status(409).json({ error: "A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para mover contatos manualmente." });
        return;
      }
      const moved = await moveEvolutionLeadCrmStageSupabase({
        leadId: id,
        instanceName: body.instanceName,
        toStage: body.stage as "lead_not_responded" | "lead_responded" | "follow_up" | "lead_replied" | "negotiation" | "closed_won" | "closed_lost",
        changedBy: req.claims!.email,
        note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined,
      });
      res.json(moved);
    } catch (error) {
      console.error("[evolution] Falha ao mover CRM:", error);
      res.status(503).json({ error: "Não foi possível mover o lead no CRM" });
    }
  });

  app.put("/api/evolution/instances/:instanceName", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const instanceName = req.params.instanceName;
    const body = req.body as { displayName?: string; unitId?: string };
    const displayName = body.displayName;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) { res.status(400).json({ error: "Instância inválida" }); return; }
    if (typeof displayName !== "string") { res.status(400).json({ error: "Identificação da instância inválida" }); return; }
    try {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) { res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" }); return; }
      const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
      if (!unit) { res.status(403).json({ error: "A instância só pode ser associada a uma unidade autorizada no Supabase" }); return; }
      const instance = await updateEvolutionInstanceProfileSupabase(instanceName, { displayName, unitName: unit.name });
      if (!instance) { res.status(404).json({ error: "Instância não encontrada" }); return; }
      res.json(instance);
    } catch (error) {
      console.error("[evolution] Falha ao atualizar instância:", error);
      res.status(503).json({ error: "Não foi possível atualizar a instância" });
    }
  });

  app.put("/api/evolution/leads/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
    const id = req.params.id;
    const body = req.body as { classification?: string; funnelStage?: string; note?: string };
    const classifications = ["pendente", "lead", "nao_lead"];
    const stages = ["novo", "qualificado", "negociacao", "perdido", "fechado"];
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !classifications.includes(body.classification ?? "") || !stages.includes(body.funnelStage ?? "")) {
      res.status(400).json({ error: "Classificação ou etapa inválida" });
      return;
    }
    try {
      if (isEvolutionAiAutomationRunning(await getEvolutionAiAutomationSettingsSupabase())) {
        res.status(409).json({ error: "A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para alterar classificações manualmente." });
        return;
      }
      const lead = await updateEvolutionLeadSupabase(id, {
        classification: body.classification as "pendente" | "lead" | "nao_lead",
        funnelStage: body.funnelStage as "novo" | "qualificado" | "negociacao" | "perdido" | "fechado",
        note,
        classifiedByEmail: req.claims!.email,
      });
      if (!lead) {
        res.status(404).json({ error: "Lead não encontrado" });
        return;
      }
      res.json(lead);
    } catch (error) {
      console.error("[evolution] Falha ao atualizar lead:", error);
      res.status(503).json({ error: "Não foi possível atualizar o lead" });
    }
  });

  // ─── User Profiles (admin only) via Supabase ─────────────────────────────
  // Lista todos os profiles do Supabase com seus acessos
  app.get("/api/user-access", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }

    const { data: profiles, error } = await sb
      .from("user_profiles")
      .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
      .order("email");

    if (error) { res.status(502).json({ error: error.message }); return; }

    if (!profiles || profiles.length === 0) { res.json([]); return; }

    // Busca os acessos de cada usuário em user_client_access
    const profileIds = profiles.map((p: { id: string }) => p.id);
    const { data: accessRows, error: accessError } = await sb
      .from("user_client_access")
      .select("id, user_id, client_id, granted_by, created_at")
      .in("user_id", profileIds);
    if (accessError) { res.status(502).json({ error: accessError.message }); return; }

    const clientIds = Array.from(new Set((accessRows ?? []).map((row: any) => row.client_id).filter(Boolean)));
    const { data: accessClients, error: accessClientsError } = clientIds.length > 0
      ? await sb.from("clients").select("id, name, client_group").in("id", clientIds)
      : { data: [], error: null };
    if (accessClientsError) { res.status(502).json({ error: accessClientsError.message }); return; }

    const accessByUser = groupClientAccessByUser(accessRows ?? [], accessClients ?? []);

    const formatted = profiles.map((p: any) => ({
      id: p.id,
      user_email: p.email,
      full_name: p.full_name,
      role: p.role || "none",
      status: p.status || "active",
      bio: p.bio,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      updated_at: p.updated_at,
      client_access: accessByUser[p.id] || [],
    }));

    res.json(formatted);
  });

  // Atualiza o role/status de um profile
  app.put("/api/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { role, full_name, status } = req.body as { role?: string; full_name?: string; status?: string };
    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await sb
      .from("user_profiles")
      .update(updates)
      .eq("id", req.params.id)
      .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
      .single();
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({
      id: data.id, user_email: data.email, full_name: data.full_name,
      role: data.role || "none", status: data.status || "active",
      bio: data.bio, avatar_url: data.avatar_url,
      created_at: data.created_at, updated_at: data.updated_at,
    });
  });

  // Cria um novo profile
  app.post("/api/user-access", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { user_email, full_name, role, bio } = req.body as {
      user_email: string; full_name?: string; role?: string; bio?: string;
    };
    if (!user_email?.trim()) {
      res.status(400).json({ error: "Email é obrigatório" });
      return;
    }
    const { data, error } = await sb
      .from("user_profiles")
      .insert({
        email: user_email.toLowerCase().trim(),
        full_name: full_name || user_email.split("@")[0],
        role: role || "viewer",
        status: "active",
        bio: bio || "",
      })
      .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Já existe um profile com esse email" });
      } else {
        res.status(502).json({ error: error.message });
      }
      return;
    }
    res.status(201).json({
      id: data.id, user_email: data.email, full_name: data.full_name,
      role: data.role || "viewer", status: data.status || "active",
      bio: data.bio, avatar_url: data.avatar_url,
      created_at: data.created_at, updated_at: data.updated_at,
    });
  });

  // Desativa um profile (não exclui)
  app.delete("/api/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { error } = await sb
      .from("user_profiles")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ ok: true });
  });

  // ─── Client Access Management (admin only) via user_client_access ────────
  // Concede acesso a um usuário a um client
  app.post("/api/client-access", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { user_id, client_id } = req.body as { user_id: string; client_id: string };
    if (!user_id || !client_id) {
      res.status(400).json({ error: "user_id e client_id são obrigatórios" });
      return;
    }
    const { data, error } = await sb
      .from("user_client_access")
      .insert({ user_id, client_id, granted_by: req.claims!.email })
      .select("id, user_id, client_id, granted_by, created_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Esse usuário já tem acesso a esse cliente" });
      } else {
        res.status(502).json({ error: error.message });
      }
      return;
    }
    res.status(201).json(data);
  });

  // Remove acesso de um usuário a um client
  app.delete("/api/client-access/:id", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { error } = await sb
      .from("user_client_access")
      .delete()
      .eq("id", req.params.id);
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ ok: true });
  });

  // ─── Feedback semanal de leads ───────────────────────────────────────────
  // A consulta e exportação são exclusivas para admins; o envio segue disponível
  // para utilizadores autenticados que tenham acesso à unidade escolhida.
  app.get("/api/feedback-leads/export", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const feedbacks = await listAllFeedbackLeadsForExportSql();
      const rows = feedbacks.map((item) => ({
        "ID": item.id,
        "Unidade": item.unit,
        "Responsável": item.responsible,
        "Semana início": item.weekStart,
        "Semana fim": item.weekEnd,
        "Leads recebidos": item.totalLeads,
        "Leads contatados": item.leadsContacted,
        "Leads respondidos": item.leadsResponded,
        "Leads convertidos": item.leadsConverted,
        "Leads perdidos": item.leadsLost,
        "Leads em negociação": item.leadsInNegotiation,
        "Motivo de perda": item.lossReason,
        "Qualidade dos leads (1-5)": item.leadQuality,
        "Observações": item.observations,
        "Satisfação com a agência (1-5)": item.agencySatisfaction,
        "Comunicação clara": item.communicationClarity,
        "Ajustes para próxima semana": item.agencyAdjustment,
        "Enviado por": item.submittedByEmail,
        "Enviado em": item.submittedAt,
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Feedbacks semanais");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="feedbacks-semanais-completo.xlsx"');
      res.send(buffer);
    } catch (error) {
      console.error("[feedback-leads] Falha ao exportar feedbacks SQL:", error);
      res.status(503).json({ error: "Não foi possível exportar os feedbacks" });
    }
  });

  app.get("/api/feedback-leads", requireAuth, requireAdmin, async (req, res) => {
    try {
      const query = req.query as { unit?: string; weekStart?: string; weekEnd?: string };
      const feedbacks = await listFeedbackLeadsSql({
        unit: typeof query.unit === "string" && query.unit ? query.unit : undefined,
        weekStart: typeof query.weekStart === "string" && query.weekStart ? query.weekStart : undefined,
        weekEnd: typeof query.weekEnd === "string" && query.weekEnd ? query.weekEnd : undefined,
      });
      res.json(feedbacks);
    } catch (error) {
      console.error("[feedback-leads] Falha ao listar feedbacks SQL:", error);
      res.status(503).json({ error: "Não foi possível carregar os feedbacks" });
    }
  });

  app.post("/api/feedback-leads", requireAuth, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const responsible = typeof body.responsible === "string" ? body.responsible.trim() : "";
    const weekStart = typeof body.weekStart === "string" ? body.weekStart : "";
    const weekEnd = typeof body.weekEnd === "string" ? body.weekEnd : "";
    if (!unit || !responsible || !weekStart || !weekEnd) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd) || weekStart > weekEnd) {
      res.status(400).json({ error: "Período semanal inválido" });
      return;
    }

    const countKeys = ["totalLeads", "leadsContacted", "leadsResponded", "leadsConverted", "leadsLost", "leadsInNegotiation"] as const;
    const counts = {} as Record<(typeof countKeys)[number], number>;
    for (const key of countKeys) {
      const value = Number(body[key]);
      if (!Number.isInteger(value) || value < 0) {
        res.status(400).json({ error: "Os volumes de leads devem ser números inteiros não negativos" });
        return;
      }
      counts[key] = value;
    }

    const lossReason = typeof body.lossReason === "string" ? body.lossReason : "";
    const communicationClarity = typeof body.communicationClarity === "string" ? body.communicationClarity : "";
    const leadQuality = Number(body.leadQuality);
    const agencySatisfaction = Number(body.agencySatisfaction);
    if (!["Preço", "Não respondeu", "Não tinha interesse", "Fora do perfil", "Outro"].includes(lossReason)) {
      res.status(400).json({ error: "Motivo de perda inválido" });
      return;
    }
    if (!["Sim", "Parcialmente", "Não"].includes(communicationClarity)) {
      res.status(400).json({ error: "Resposta de comunicação inválida" });
      return;
    }
    if (![1, 2, 3, 4, 5].includes(leadQuality) || ![1, 2, 3, 4, 5].includes(agencySatisfaction)) {
      res.status(400).json({ error: "As avaliações devem estar entre 1 e 5" });
      return;
    }

    if (!isAdmin(req.claims!)) {
      const sb = getSupabaseForRequest(req);
      if (!sb) { res.status(403).json({ error: "Sem acesso a essa unidade" }); return; }
      const { data: client, error } = await sb.from("clients").select("id").eq("name", unit).maybeSingle();
      if (error) { res.status(502).json({ error: "Não foi possível validar a unidade autorizada" }); return; }
      if (!client || !hasUnitAccess(client.id, req.claims!)) { res.status(403).json({ error: "Sem acesso a essa unidade" }); return; }
    }

    const submittedAt = typeof body.submittedAt === "string" ? new Date(body.submittedAt) : new Date();
    if (Number.isNaN(submittedAt.getTime())) { res.status(400).json({ error: "Data de envio inválida" }); return; }

    try {
      const feedback = await createFeedbackLeadSql({
        unit, responsible, weekStart, weekEnd,
        totalLeads: counts.totalLeads, leadsContacted: counts.leadsContacted,
        leadsResponded: counts.leadsResponded, leadsConverted: counts.leadsConverted,
        leadsLost: counts.leadsLost, leadsInNegotiation: counts.leadsInNegotiation,
        lossReason, leadQuality,
        observations: typeof body.observations === "string" ? body.observations.trim() : "",
        agencySatisfaction, communicationClarity,
        agencyAdjustment: typeof body.agencyAdjustment === "string" ? body.agencyAdjustment.trim() : "",
        submittedAt: submittedAt.toISOString(), submittedByUserId: req.claims ? String(req.claims.id) : null,
        submittedByEmail: req.claims?.email ?? "",
      });
      res.status(201).json(feedback);
    } catch (error) {
      console.error("[feedback-leads] Falha ao guardar feedback SQL:", error);
      res.status(503).json({ error: "Não foi possível guardar o feedback" });
    }
  });

  // ─── Helper de Autorização Meta Direct por Usuário ────────────────────────
  async function checkUserHasMetaAccountAccess(req: express.Request, clientId: string): Promise<boolean> {
    if (!req.claims) return false;
    if (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*")) {
      return true;
    }

    const sb = getSupabaseForRequest(req);
    let authorizedClients: SupabaseDashboardClient[] = [];
    if (sb) {
      const result = await listDashboardClientsFromSupabase(sb, req.claims);
      authorizedClients = result.clients || [];
    }

    const allMeta = await getMetaDirectClients();
    const targetAcc = allMeta.find((c) => c.id === clientId || c.account_id === clientId || `act_${c.account_id}` === clientId);
    if (!targetAcc) return false;

    return isUserAllowedForMetaAccount(targetAcc, authorizedClients, req.claims);
  }

  // ─── Métricas (Meta Ads Direct / Supabase) ────────────────────────────────
  app.get("/api/metrics/status", requireAuth, (_req, res) => {
    res.json({ configured: isMetaDirectEnabled() || isSupabaseConfigured() });
  });

  // Lista de clients / unidades
  app.get("/api/metrics/clients", requireAuth, async (req, res) => {
    const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

    if (isMetaDirectEnabled()) {
      try {
        const allMetaClients = await getMetaDirectClients();
        if (isFullAdmin) {
          res.json({ configured: true, clients: allMetaClients });
          return;
        }

        const sb = getSupabaseForRequest(req);
        let authorizedClients: SupabaseDashboardClient[] = [];
        if (sb && req.claims) {
          const result = await listDashboardClientsFromSupabase(sb, req.claims);
          authorizedClients = result.clients || [];
        }

        const filteredClients = allMetaClients.filter((metaAcc) =>
          isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
        );

        res.json({ configured: true, clients: filteredClients });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao listar clientes:", err);
        res.status(502).json({ error: err.message || "Não foi possível carregar as unidades na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const result = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (result.error) { res.status(502).json({ error: result.error }); return; }
    res.json({ configured: true, clients: result.clients });
  });

  // Métricas diárias
  app.get("/api/metrics/daily", requireAuth, async (req, res) => {
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

    if (isMetaDirectEnabled() && clientId) {
      const allowed = await checkUserHasMetaAccountAccess(req, clientId);
      if (!allowed) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
      try {
        const rows = await getMetaDirectDaily(clientId, start, end);
        res.json({ configured: true, rows });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao carregar métricas diárias:", err);
        res.status(502).json({ error: err.message || "Erro ao consultar métricas na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }

    if (clientId && req.claims && !isAdmin(req.claims)) {
      if (!req.claims.allowedClientIds.includes(clientId)) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
    }

    let q = sb.from("vw_meta_ads_daily_summary").select("*");

    if (req.claims && !isAdmin(req.claims)) {
      if (clientId) {
        q = q.eq("client_id", clientId);
      } else {
        q = q.in("client_id", req.claims.allowedClientIds);
      }
    } else if (clientId) {
      q = q.eq("client_id", clientId);
    }

    if (start) q = q.gte("date_start", start);
    if (end) q = q.lte("date_start", end);
    const { data, error } = await q.order("date_start", { ascending: true });
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, rows: data ?? [] });
  });

  // Métricas por campanha
  app.get("/api/metrics/campaigns", requireAuth, async (req, res) => {
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

    if (isMetaDirectEnabled() && clientId) {
      const allowed = await checkUserHasMetaAccountAccess(req, clientId);
      if (!allowed) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
      try {
        const rows = await getMetaDirectCampaigns(clientId, start, end);
        res.json({ configured: true, rows });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao carregar campanhas:", err);
        res.status(502).json({ error: err.message || "Erro ao consultar campanhas na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }

    if (clientId && req.claims && !isAdmin(req.claims)) {
      if (!req.claims.allowedClientIds.includes(clientId)) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
    }

    if (!isAdmin(req.claims!) && !clientId) {
      const allowed = req.claims!.allowedClientIds;
      const allRows: any[] = [];
      for (const cid of allowed) {
        const { data } = await sb.rpc("fn_campaign_period_summary", {
          p_client_id: cid,
          p_date_start: start ?? null,
          p_date_stop: end ?? null,
        });
        if (data) allRows.push(...data);
      }
      res.json({ configured: true, rows: allRows });
      return;
    }

    const { data, error } = await sb.rpc("fn_campaign_period_summary", {
      p_client_id: clientId ?? null,
      p_date_start: start ?? null,
      p_date_stop: end ?? null,
    });
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, rows: data ?? [] });
  });

  // ─── Offers / Anúncios (view vw_meta_ads_offer_ads) ────────────────────────
  app.get("/api/metrics/offers", requireAuth, async (req, res) => {
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

    if (isMetaDirectEnabled() && clientId) {
      const allowed = await checkUserHasMetaAccountAccess(req, clientId);
      if (!allowed) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
      try {
        const rows = await getMetaDirectOffers(clientId, start, end);
        res.json({ configured: true, rows });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao carregar anúncios:", err);
        res.status(502).json({ error: err.message || "Erro ao consultar anúncios na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const selectionError = validateMetricsClientSelection(clientId, req.claims);
    if (selectionError) { res.status(selectionError.status).json({ error: selectionError.error }); return; }
    let q = sb.from("vw_meta_ads_offer_ads").select("*");
    q = q.eq("client_id", clientId);
    if (start) q = q.gte("date_start", start);
    if (end) q = q.lte("date_start", end);
    const { data, error } = await q.order("total_spend", { ascending: false });
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, rows: data ?? [] });
  });

  // Tenta a RPC fn_offers_by_period se existir, senão fallback para a view ou Meta Direct
  app.get("/api/metrics/offers-rpc", requireAuth, async (req, res) => {
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

    if (isMetaDirectEnabled() && clientId) {
      const allowed = await checkUserHasMetaAccountAccess(req, clientId);
      if (!allowed) {
        res.status(403).json({ error: "Sem acesso a essa unidade" });
        return;
      }
      try {
        const rows = await getMetaDirectOffers(clientId, start, end);
        res.json({ configured: true, rows });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao carregar anúncios (rpc):", err);
        res.status(502).json({ error: err.message || "Erro ao consultar anúncios na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const selectionError = validateMetricsClientSelection(clientId, req.claims);
    if (selectionError) { res.status(selectionError.status).json({ error: selectionError.error }); return; }
    const { data, error } = await sb.rpc("fn_offers_by_period", {
      p_client_id: clientId,
      p_date_start: start ?? null,
      p_date_stop: end ?? null,
    });
    if (error) {
      if (error.message?.includes("fn_offers_by_period")) {
        let q = sb.from("vw_meta_ads_offer_ads").select("*");
        q = q.eq("client_id", clientId);
        if (start) q = q.gte("date_start", start);
        if (end) q = q.lte("date_start", end);
        const fallback = await q.order("total_spend", { ascending: false });
        if (!fallback.error) {
          res.json({ configured: true, rows: fallback.data ?? [] });
          return;
        }

        // Compatibilidade durante a atualização da view legada, que ainda pode
        // não expor client_id. A tabela de origem preserva o filtro por unidade.
        let rawQuery = sb.from("meta_ads_offers").select("*").eq("client_id", clientId);
        if (start) rawQuery = rawQuery.gte("date_start", start);
        if (end) rawQuery = rawQuery.lte("date_start", end);
        const rawFallback = await rawQuery.order("spend", { ascending: false });
        if (rawFallback.error) { res.status(502).json({ error: fallback.error.message }); return; }
        res.json({ configured: true, rows: (rawFallback.data ?? []).map(normalizeRawOfferRow) });
        return;
      }
      res.status(502).json({ error: error.message }); return;
    }
    res.json({ configured: true, rows: data ?? [] });
  });

  // ─── Units (lista dinâmica de unidades/clientes) ─────────────────────────
  app.get("/api/metrics/units", requireAuth, async (req, res) => {
    const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

    if (isMetaDirectEnabled()) {
      try {
        const allMetaClients = await getMetaDirectClients();
        let clients = allMetaClients;

        if (!isFullAdmin) {
          const sb = getSupabaseForRequest(req);
          let authorizedClients: SupabaseDashboardClient[] = [];
          if (sb && req.claims) {
            const result = await listDashboardClientsFromSupabase(sb, req.claims);
            authorizedClients = result.clients || [];
          }
          clients = allMetaClients.filter((metaAcc) =>
            isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
          );
        }

        const units = clients.map((c) => c.name);
        res.json({ configured: true, units, clients });
        return;
      } catch (err: any) {
        console.error("[meta-direct] Falha ao listar units:", err);
        res.status(502).json({ error: err.message || "Não foi possível carregar as unidades na Meta" });
        return;
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const result = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (result.error) { res.status(502).json({ error: result.error }); return; }
    const units = result.clients.map((client) => client.name);
    res.json({ configured: true, units, clients: result.clients });
  });

  // ─── Static files (production only) ────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  if (listen) {
    const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 4000);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }

  return { app, server };
}

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  startServer().catch(console.error);
}
