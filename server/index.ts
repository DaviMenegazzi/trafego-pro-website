import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import * as XLSX from "xlsx";
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
    const body = req.body as { displayName?: string; unitName?: string };
    const displayName = body.displayName;
    const unitName = body.unitName;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) { res.status(400).json({ error: "Instância inválida" }); return; }
    if (typeof displayName !== "string" || typeof unitName !== "string") { res.status(400).json({ error: "Identificação da instância inválida" }); return; }
    try {
      const instance = await updateEvolutionInstanceProfileSupabase(instanceName, { displayName, unitName });
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

  // ─── Métricas (Supabase / Meta Ads) ────────────────────────────────────────
  app.get("/api/metrics/status", requireAuth, (_req, res) => {
    res.json({ configured: isSupabaseConfigured() });
  });

  // Lista de clients do Supabase — filtrada por acesso
  app.get("/api/metrics/clients", requireAuth, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const result = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (result.error) { res.status(502).json({ error: result.error }); return; }
    res.json({ configured: true, clients: result.clients });
  });

  // Métricas diárias — filtradas por acesso
  app.get("/api/metrics/daily", requireAuth, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

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

  // Métricas por campanha — filtradas por acesso
  app.get("/api/metrics/campaigns", requireAuth, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };

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
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
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

  // Tenta a RPC fn_offers_by_period se existir, senão fallback para a view
  app.get("/api/metrics/offers-rpc", requireAuth, async (req, res) => {
    const sb = getSupabaseForRequest(req);
    if (!sb) { res.status(401).json({ error: "Sessão Supabase expirada" }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
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

  // ─── Units (lista dinâmica de unidades/clientes do Supabase) ──────────────
  app.get("/api/metrics/units", requireAuth, async (req, res) => {
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
