import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { groupClientAccessByUser } from "./clientAccess.js";
import { validateMetricsClientSelection } from "./metricsAccess.js";
import {
  getAllClients,
  getClientById,
  getCampaignsByClientId,
  createClient,
  updateClient,
  deleteClient,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getUserByEmail,
  getUserByName,
  getAllUsers,
  createUser,
  updateUserPassword,
  deleteUser,
  getAllFeedbackLeads,
  createFeedbackLead,
  type ClientInput,
  type CampaignInput,
  type Client,
  type Campaign,
  type User,
  type FeedbackLead,
  type FeedbackLeadInput,
} from "./db.js";

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

// ─── Verificação de senha (bcrypt) com migração automática de senhas antigas ──
function checkPassword(plain: string, stored: string, userId: number): boolean {
  if (stored.startsWith("$2")) return bcrypt.compareSync(plain, stored);
  if (stored === plain) {
    try {
      updateUserPassword(userId, bcrypt.hashSync(plain, 10));
    } catch { /* migração best-effort */ }
    return true;
  }
  return false;
}

// ─── Tipos de claims no JWT ─────────────────────────────────────────────────
// Roles reais do sistema (do user_profiles):
//   admin, viewer, client_viewer, designer, cs,
//   account_manager, traffic_manager, copywriter, none
interface JwtClaims {
  email: string;
  name: string;
  role: string;
  id: number;
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
async function fetchUserAccess(supabaseUid: string): Promise<{
  role: string;
  allowedClientIds: string[];
}> {
  const sb = getSupabase();
  if (!sb) {
    return { role: "admin", allowedClientIds: ["*"] };
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
  if (!req.claims || !isAdmin(req.claims)) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}

// ─── Multer (in-memory for Excel upload) ────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export async function startServer({ listen = true }: { listen?: boolean } = {}) {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // ─── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, name, password } = req.body as { email?: string; name?: string; password: string };

    const identifier = email || name;
    if (!identifier || !password) {
      res.status(400).json({ error: "Identificação e senha são obrigatórios" });
      return;
    }

    const isEmail = identifier.includes("@");
    let loginEmail = identifier;

    if (!isEmail) {
      const localUser = getUserByName(identifier);
      if (!localUser) {
        res.status(401).json({ error: "Usuário não encontrado" });
        return;
      }
      loginEmail = localUser.email;
    }

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
        const access = await fetchUserAccess(data.user.id);

        if (!access.role || access.allowedClientIds.length === 0) {
          res.status(403).json({ error: "Sem permissão. Contate o administrador." });
          return;
        }

        // Cria/atualiza no banco local (para consistência)
        let dbUser = getUserByEmail(loginEmail);
        if (!dbUser) {
          dbUser = createUser({
            name: data.user.user_metadata?.name || loginEmail.split("@")[0],
            email: loginEmail,
            password: "[supabase-auth]",
            role: access.role as "admin" | "user",
          });
        }

        const token = signToken({
          email: dbUser.email,
          name: dbUser.name,
          role: access.role,
          id: dbUser.id,
          allowedClientIds: access.allowedClientIds,
        });
        res.json({
          token,
          user: {
            email: dbUser.email,
            name: dbUser.name,
            role: access.role,
            id: dbUser.id,
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

    // Fallback local (sem Supabase)
    console.warn("[auth] Supabase não configurado, usando autenticação local");
    let dbUser = getUserByEmail(loginEmail);
    if (!dbUser) {
      dbUser = createUser({
        name: loginEmail.split("@")[0], email: loginEmail, password, role: "admin",
      });
    }

    if (dbUser && checkPassword(password, dbUser.password, dbUser.id)) {
      const token = signToken({
        email: dbUser.email, name: dbUser.name,
        role: "admin", id: dbUser.id, allowedClientIds: ["*"],
      });
      res.json({
        token, user: {
          email: dbUser.email, name: dbUser.name,
          role: "admin", id: dbUser.id, allowedClientIds: ["*"],
        },
      });
      return;
    }

    res.status(401).json({ error: "Credenciais inválidas" });
  });

  // ─── Auth me ──────────────────────────────────────────────────────────────
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(req.claims);
  });

  // ─── Users (admin only, banco local) ──────────────────────────────────────
  app.get("/api/users", requireAuth, requireAdmin, (_req, res) => {
    const users = getAllUsers().map(({ password: _p, ...u }) => u);
    res.json(users);
  });

  app.post("/api/users", requireAuth, requireAdmin, (req, res) => {
    const { name, email, password, role: rawRole } = req.body as { name: string; email: string; password: string; role?: string };
    const role = rawRole === "admin" || rawRole === "user" ? rawRole : undefined;
    if (!name?.trim() || !password?.trim()) {
      res.status(400).json({ error: "Nome e senha são obrigatórios" });
      return;
    }
    if (getUserByName(name)) {
      res.status(409).json({ error: "Já existe um usuário com esse nome" });
      return;
    }
    const user = createUser({ name, email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@trafego.pro`, password, role });
    const { password: _p, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
    deleteUser(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── User Profiles (admin only) via Supabase ─────────────────────────────
  // Lista todos os profiles do Supabase com seus acessos
  app.get("/api/user-access", requireAuth, requireAdmin, async (_req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json([]); return; }

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
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase não configurado" }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase não configurado" }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase não configurado" }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase não configurado" }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase não configurado" }); return; }
    const { error } = await sb
      .from("user_client_access")
      .delete()
      .eq("id", req.params.id);
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ ok: true });
  });

  // ─── Clients ──────────────────────────────────────────────────────────────
  app.get("/api/clients", requireAuth, (_req, res) => {
    const clients = getAllClients();
    res.json(clients);
  });

  app.post("/api/clients", requireAuth, requireAdmin, (req, res) => {
    const body = req.body as Partial<ClientInput> & { name: string };
    if (!body.name?.trim()) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const client = createClient(body);
    res.status(201).json(client);
  });

  app.get("/api/clients/:id", requireAuth, (req, res) => {
    const client = getClientById(Number(req.params.id));
    if (!client) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const campaigns = getCampaignsByClientId(client.id);
    res.json({ ...client, campaigns });
  });

  app.put("/api/clients/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const updated = updateClient(id, req.body as Partial<ClientInput>);
    res.json(updated);
  });

  app.delete("/api/clients/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    deleteClient(id);
    res.json({ ok: true });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────
  app.post("/api/clients/:clientId/campaigns", requireAuth, requireAdmin, (req, res) => {
    const clientId = Number(req.params.clientId);
    if (!getClientById(clientId)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const body = req.body as Partial<CampaignInput> & { name: string };
    if (!body.name?.trim()) { res.status(400).json({ error: "Nome da campanha é obrigatório" }); return; }
    const campaign = createCampaign(clientId, body);
    res.status(201).json(campaign);
  });

  app.put("/api/campaigns/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const updated = updateCampaign(id, req.body as Partial<CampaignInput>);
    if (!updated) { res.status(404).json({ error: "Campanha não encontrada" }); return; }
    res.json(updated);
  });

  app.delete("/api/campaigns/:id", requireAuth, requireAdmin, (req, res) => {
    deleteCampaign(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Excel Export ─────────────────────────────────────────────────────────
  app.get("/api/clients/export/excel", requireAuth, requireAdmin, (_req, res) => {
    const clients = getAllClients();
    const clientsSheet = XLSX.utils.json_to_sheet(
      clients.map((c) => ({
        ID: c.id, Nome: c.name, Cidade: c.city, Estado: c.state,
        Status: c.status === "active" ? "Ativo" : "Pausado", Plano: c.plan,
        "Data de Início": c.startDate, "Orçamento Mensal (R$)": c.monthlyBudget,
        Contato: c.contact, Telefone: c.phone, Email: c.email,
        "URL da LP": c.lpUrl, Observações: c.notes,
      }))
    );
    const allCampaigns = clients.flatMap((c) =>
      getCampaignsByClientId(c.id).map((camp) => ({
        "ID Cliente": c.id, "Nome do Cliente": c.name, "ID Campanha": camp.id,
        "Nome da Campanha": camp.name, Plataforma: camp.platform,
        Status: camp.status === "active" ? "Ativa" : "Pausada", "Orçamento (R$)": camp.budget,
      }))
    );
    const campaignsSheet = XLSX.utils.json_to_sheet(allCampaigns);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, clientsSheet, "Clientes");
    XLSX.utils.book_append_sheet(wb, campaignsSheet, "Campanhas");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"clientes-trafego-pro.xlsx\"");
    res.send(buf);
  });

  // ─── Feedback Leads ──────────────────────────────────────────────────────
  app.get("/api/feedback-leads", requireAuth, (_req, res) => {
    res.json(getAllFeedbackLeads());
  });

  app.post("/api/feedback-leads", requireAuth, (req, res) => {
    const body = req.body as Partial<FeedbackLeadInput> & { unit: string; responsible: string; weekStart: string };
    if (!body.unit?.trim() || !body.responsible?.trim() || !body.weekStart) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }
    const feedback = createFeedbackLead({
      unit: body.unit, responsible: body.responsible, weekStart: body.weekStart,
      totalLeads: Number(body.totalLeads) || 0, leadsCard: Number(body.leadsCard) || 0,
      leadsConsultation: Number(body.leadsConsultation) || 0, leadsDentistry: Number(body.leadsDentistry) || 0,
      leadsBusinessPJ: Number(body.leadsBusinessPJ) || 0, leadsOutOfArea: Number(body.leadsOutOfArea) || 0,
      leadsAnswered: Number(body.leadsAnswered) || 0, leadsNoAnswer: Number(body.leadsNoAnswer) || 0,
      salesClosed: Number(body.salesClosed) || 0, mainReason: body.mainReason ?? "",
      creativeFeedback: body.creativeFeedback ?? "", generalObservations: body.generalObservations ?? "",
      supportNeeded: body.supportNeeded ?? "", submittedAt: body.submittedAt ?? new Date().toISOString(),
    });
    res.status(201).json(feedback);
  });

  // ─── Métricas (Supabase / Meta Ads) ────────────────────────────────────────
  app.get("/api/metrics/status", requireAuth, (_req, res) => {
    res.json({ configured: isSupabaseConfigured() });
  });

  // Lista de clients do Supabase — filtrada por acesso
  app.get("/api/metrics/clients", requireAuth, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, clients: [] }); return; }
    const { data, error } = await sb.from("clients").select("id, name, client_group").order("name");
    if (error) { res.status(502).json({ error: error.message }); return; }

    let clients = data ?? [];

    // Filtra pela permissão do usuário
    if (req.claims && !isAdmin(req.claims)) {
      const allowed = req.claims.allowedClientIds;
      clients = clients.filter((c) => allowed.includes(String(c.id)));
    }

    res.json({ configured: true, clients });
  });

  // Métricas diárias — filtradas por acesso
  app.get("/api/metrics/daily", requireAuth, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
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
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
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
  app.get("/api/metrics/units", requireAuth, async (_req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, units: [] }); return; }
    const { data, error } = await sb.from("clients").select("id, name, client_group").order("name");
    if (error) { res.status(502).json({ error: error.message }); return; }
    const units = (data ?? []).map((c: any) => c.name);
    res.json({ configured: true, units, clients: data ?? [] });
  });

  // ─── Excel Import ─────────────────────────────────────────────────────────
  app.post("/api/clients/import/excel", requireAuth, requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) { res.status(400).json({ error: "Nenhum arquivo enviado" }); return; }
    try {
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      let imported = 0;
      let errors: string[] = [];
      for (const row of rows) {
        const name = String(row["Nome"] || row["name"] || "").trim();
        if (!name) { errors.push(`Linha ignorada: nome vazio`); continue; }
        try {
          createClient({
            name, city: String(row["Cidade"] || row["city"] || ""),
            state: String(row["Estado"] || row["state"] || ""),
            status: String(row["Status"] || row["status"] || "active") === "Ativo" ? "active" : "paused",
            plan: String(row["Plano"] || row["plan"] || ""),
            startDate: String(row["Data de Início"] || row["startDate"] || row["start_date"] || ""),
            monthlyBudget: Number(row["Orçamento Mensal (R$)"] || row["monthlyBudget"] || row["monthly_budget"] || 0),
            contact: String(row["Contato"] || row["contact"] || ""),
            phone: String(row["Telefone"] || row["phone"] || ""),
            email: String(row["Email"] || row["email"] || ""),
            lpUrl: String(row["URL da LP"] || row["lpUrl"] || row["lp_url"] || ""),
            notes: String(row["Observações"] || row["notes"] || ""),
          });
          imported++;
        } catch (e) { errors.push(`Erro ao importar "${name}": ${(e as Error).message}`); }
      }
      res.json({ imported, errors, total: rows.length });
    } catch (e) {
      res.status(400).json({ error: `Erro ao processar planilha: ${(e as Error).message}` });
    }
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
