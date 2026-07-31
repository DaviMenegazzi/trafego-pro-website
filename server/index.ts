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
      throw new Error("JWT_SECRET n\u00e3o definido. Defina a vari\u00e1vel de ambiente antes de subir em produ\u00e7\u00e3o.");
    }
    console.warn("[auth] JWT_SECRET ausente \u2014 usando segredo aleat\u00f3rio de desenvolvimento (tokens invalidam ao reiniciar).");
    return crypto.randomBytes(32).toString("hex");
  })();

function signToken(payload: object): string {
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

// ─── Verifica\u00e7\u00e3o de senha (bcrypt) com migra\u00e7\u00e3o autom\u00e1tica de senhas antigas ──
function checkPassword(plain: string, stored: string, userId: number): boolean {
  if (stored.startsWith("$2")) return bcrypt.compareSync(plain, stored);
  if (stored === plain) {
    try {
      updateUserPassword(userId, bcrypt.hashSync(plain, 10));
    } catch { /* migra\u00e7\u00e3o best-effort */ }
    return true;
  }
  return false;
}

// ─── Tipos de claims no JWT ─────────────────────────────────────────────────
interface JwtClaims {
  email: string;
  name: string;
  role: "admin" | "socio" | "gerente";
  id: number;
  allowedClientIds: string[];  // ["*"] = acesso total
  iat: number;
}

// ─── Buscar role do usu\u00e1rio no Supabase (user_profiles) ─────────────────
// Sem necessidade de tabela extra. Usa a tabela user_profiles j\u00e1 existente.
async function fetchUserRole(email: string): Promise<{ role: string }> {
  const sb = getSupabase();
  if (!sb) {
    // Sem Supabase: fallback admin (backwards-compatible)
    return { role: "admin" };
  }

  const { data, error } = await sb
    .from("user_profiles")
    .select("role, status")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !data) {
    console.warn(`[auth] Nenhum profile encontrado para ${email} \u2014 negando acesso`);
    return { role: "" };
  }

  // Se o profile est\u00e1 inativo, bloqueia
  if (data.status === "inactive" || data.status === "blocked") {
    return { role: "" };
  }

  // Se n\u00e3o tem role definida, assume gerente
  const validRoles = ["admin", "socio", "gerente"];
  const role = validRoles.includes(data.role) ? data.role : "gerente";

  return { role };
}

// ─── Helper: checa se admin ─────────────────────────────────────────────────
function isAdmin(claims: JwtClaims): boolean {
  return claims.role === "admin" || claims.allowedClientIds.includes("*");
}

// ─── Auth middleware: valida JWT e injeta req.claims ─────────────────────────
// N\u00e3o bloqueia por role \u2014 apenas garante autentica\u00e7\u00e3o.
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

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // ─── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, name, password } = req.body as { email?: string; name?: string; password: string };

    // Aceita login por email ou por nome de usu\u00e1rio
    const identifier = email || name;
    if (!identifier || !password) {
      res.status(400).json({ error: "Identifica\u00e7\u00e3o e senha s\u00e3o obrigat\u00f3rios" });
      return;
    }

    // Se \u00e9 um nome (sem @), busca o email no banco local
    const isEmail = identifier.includes("@");
    let loginEmail = identifier;

    if (!isEmail) {
      const localUser = getUserByName(identifier);
      if (!localUser) {
        res.status(401).json({ error: "Usu\u00e1rio n\u00e3o encontrado" });
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
          res.status(401).json({ error: "Credenciais inv\u00e1lidas" });
          return;
        }

        // Busca role na tabela user_profiles (j\u00e1 existente, sem tabela nova)
        const profile = await fetchUserRole(loginEmail);

        if (!profile.role) {
          res.status(403).json({ error: "Sem permiss\u00e3o. Contate o administrador." });
          return;
        }

        // Cria/atualiza no banco local (para consist\u00eancia)
        let dbUser = getUserByEmail(loginEmail);
        if (!dbUser) {
          dbUser = createUser({
            name: data.user.user_metadata?.name || loginEmail.split("@")[0],
            email: loginEmail,
            password: "[supabase-auth]",
            role: profile.role as "admin" | "user",
          });
        }

        const token = signToken({
          email: dbUser.email,
          name: dbUser.name,
          role: profile.role,
          id: dbUser.id,
          allowedClientIds: ["*"],
        });
        res.json({
          token,
          user: {
            email: dbUser.email,
            name: dbUser.name,
            role: profile.role,
            id: dbUser.id,
            allowedClientIds: ["*"],
          },
        });
        return;
      } catch (err) {
        console.error("[auth] Erro ao autenticar com Supabase:", err);
        res.status(500).json({ error: "Erro de autentica\u00e7\u00e3o" });
        return;
      }
    }

    // Fallback: se Supabase n\u00e3o estiver configurado, usa banco local
    console.warn("[auth] Supabase n\u00e3o configurado, usando autentica\u00e7\u00e3o local");
    let dbUser = getUserByEmail(loginEmail);
    if (!dbUser) {
      dbUser = createUser({
        name: loginEmail.split("@")[0],
        email: loginEmail,
        password,
        role: "admin",
      });
    }

    if (dbUser && checkPassword(password, dbUser.password, dbUser.id)) {
      const token = signToken({
        email: dbUser.email,
        name: dbUser.name,
        role: "admin",
        id: dbUser.id,
        allowedClientIds: ["*"],
      });
      res.json({
        token,
        user: {
          email: dbUser.email,
          name: dbUser.name,
          role: "admin",
          id: dbUser.id,
          allowedClientIds: ["*"],
        },
      });
      return;
    }

    res.status(401).json({ error: "Credenciais inv\u00e1lidas" });
  });

  // ─── Auth me ──────────────────────────────────────────────────────────────
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(req.claims);
  });

  // ─── Users (admin only) ──────────────────────────────────────────────────
  app.get("/api/users", requireAuth, requireAdmin, (_req, res) => {
    const users = getAllUsers().map(({ password: _p, ...u }) => u);
    res.json(users);
  });

  app.post("/api/users", requireAuth, requireAdmin, (req, res) => {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role?: "admin" | "user" };
    if (!name?.trim() || !password?.trim()) {
      res.status(400).json({ error: "Nome e senha s\u00e3o obrigat\u00f3rios" });
      return;
    }
    if (getUserByName(name)) {
      res.status(409).json({ error: "J\u00e1 existe um usu\u00e1rio com esse nome" });
      return;
    }
    const user = createUser({ name, email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@trafego.pro`, password, role });
    const { password: _p, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    deleteUser(id);
    res.json({ success: true });
  });

  // ─── User Profiles (admin only) via Supabase ─────────────────────────────
  // Lista todos os profiles do Supabase
  app.get("/api/user-access", requireAuth, requireAdmin, async (_req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json([]); return; }
    const { data, error } = await sb
      .from("user_profiles")
      .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
      .order("email");
    if (error) { res.status(502).json({ error: error.message }); return; }
    // Formata para manter compatibilidade com o frontend
    const formatted = (data ?? []).map((p) => ({
      id: p.id,
      user_email: p.email,
      full_name: p.full_name,
      role: p.role || "gerente",
      status: p.status || "active",
      bio: p.bio,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
    res.json(formatted);
  });

  // Atualiza o role de um profile
  app.put("/api/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase n\u00e3o configurado" }); return; }
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
      id: data.id,
      user_email: data.email,
      full_name: data.full_name,
      role: data.role || "gerente",
      status: data.status || "active",
      bio: data.bio,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  });

  // Cria um novo profile (usado quando um admin cadastra um novo usu\u00e1rio)
  app.post("/api/user-access", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase n\u00e3o configurado" }); return; }
    const { user_email, full_name, role, bio } = req.body as {
      user_email: string;
      full_name?: string;
      role?: string;
      bio?: string;
    };
    if (!user_email?.trim()) {
      res.status(400).json({ error: "Email \u00e9 obrigat\u00f3rio" });
      return;
    }
    const { data, error } = await sb
      .from("user_profiles")
      .insert({
        email: user_email.toLowerCase().trim(),
        full_name: full_name || user_email.split("@")[0],
        role: role || "gerente",
        status: "active",
        bio: bio || "",
      })
      .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "J\u00e1 existe um profile com esse email" });
      } else {
        res.status(502).json({ error: error.message });
      }
      return;
    }
    res.status(201).json({
      id: data.id,
      user_email: data.email,
      full_name: data.full_name,
      role: data.role || "gerente",
      status: data.status || "active",
      bio: data.bio,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  });

  // Remove um profile
  app.delete("/api/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.status(503).json({ error: "Supabase n\u00e3o configurado" }); return; }
    // N\u00e3o deleta o profile, apenas marca como inactive
    const { error } = await sb
      .from("user_profiles")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
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
      res.status(400).json({ error: "Nome \u00e9 obrigat\u00f3rio" });
      return;
    }
    const client = createClient(body);
    res.status(201).json(client);
  });

  app.get("/api/clients/:id", requireAuth, (req, res) => {
    const client = getClientById(Number(req.params.id));
    if (!client) { res.status(404).json({ error: "Cliente n\u00e3o encontrado" }); return; }
    const campaigns = getCampaignsByClientId(client.id);
    res.json({ ...client, campaigns });
  });

  app.put("/api/clients/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente n\u00e3o encontrado" }); return; }
    const updated = updateClient(id, req.body as Partial<ClientInput>);
    res.json(updated);
  });

  app.delete("/api/clients/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente n\u00e3o encontrado" }); return; }
    deleteClient(id);
    res.json({ ok: true });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────
  app.post("/api/clients/:clientId/campaigns", requireAuth, requireAdmin, (req, res) => {
    const clientId = Number(req.params.clientId);
    if (!getClientById(clientId)) { res.status(404).json({ error: "Cliente n\u00e3o encontrado" }); return; }
    const body = req.body as Partial<CampaignInput> & { name: string };
    if (!body.name?.trim()) { res.status(400).json({ error: "Nome da campanha \u00e9 obrigat\u00f3rio" }); return; }
    const campaign = createCampaign(clientId, body);
    res.status(201).json(campaign);
  });

  app.put("/api/campaigns/:id", requireAuth, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const updated = updateCampaign(id, req.body as Partial<CampaignInput>);
    if (!updated) { res.status(404).json({ error: "Campanha n\u00e3o encontrada" }); return; }
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
        "Data de In\u00edcio": c.startDate, "Or\u00e7amento Mensal (R$)": c.monthlyBudget,
        Contato: c.contact, Telefone: c.phone, Email: c.email,
        "URL da LP": c.lpUrl, Observa\u00e7\u00f5es: c.notes,
      }))
    );
    const allCampaigns = clients.flatMap((c) =>
      getCampaignsByClientId(c.id).map((camp) => ({
        "ID Cliente": c.id, "Nome do Cliente": c.name, "ID Campanha": camp.id,
        "Nome da Campanha": camp.name, Plataforma: camp.platform,
        Status: camp.status === "active" ? "Ativa" : "Pausada", "Or\u00e7amento (R$)": camp.budget,
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
    let feedbackLeads = getAllFeedbackLeads();
    res.json(feedbackLeads);
  });

  app.post("/api/feedback-leads", requireAuth, (req, res) => {
    const body = req.body as Partial<FeedbackLeadInput> & { unit: string; responsible: string; weekStart: string };
    if (!body.unit?.trim() || !body.responsible?.trim() || !body.weekStart) {
      res.status(400).json({ error: "Campos obrigat\u00f3rios faltando" });
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

  // ─── M\u00e9tricas (Supabase / Meta Ads) ────────────────────────────────────────
  app.get("/api/metrics/status", requireAuth, (_req, res) => {
    res.json({ configured: isSupabaseConfigured() });
  });

  // Lista de clients do Supabase
  app.get("/api/metrics/clients", requireAuth, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, clients: [] }); return; }
    const { data, error } = await sb.from("clients").select("id, name").order("name");
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, clients: data ?? [] });
  });

  // M\u00e9tricas di\u00e1rias
  app.get("/api/metrics/daily", requireAuth, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
    let q = sb.from("vw_meta_ads_daily_summary").select("*");
    if (clientId) q = q.eq("client_id", clientId);
    if (start) q = q.gte("date_start", start);
    if (end) q = q.lte("date_start", end);
    const { data, error } = await q.order("date_start", { ascending: true });
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, rows: data ?? [] });
  });

  // M\u00e9tricas por campanha
  app.get("/api/metrics/campaigns", requireAuth, async (req, res) => {
    const sb = getSupabase();
    if (!sb) { res.json({ configured: false, rows: [] }); return; }
    const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
    const { data, error } = await sb.rpc("fn_campaign_period_summary", {
      p_client_id: clientId ?? null,
      p_date_start: start ?? null,
      p_date_stop: end ?? null,
    });
    if (error) { res.status(502).json({ error: error.message }); return; }
    res.json({ configured: true, rows: data ?? [] });
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
            startDate: String(row["Data de In\u00edcio"] || row["startDate"] || row["start_date"] || ""),
            monthlyBudget: Number(row["Or\u00e7amento Mensal (R$)"] || row["monthlyBudget"] || row["monthly_budget"] || 0),
            contact: String(row["Contato"] || row["contact"] || ""),
            phone: String(row["Telefone"] || row["phone"] || ""),
            email: String(row["Email"] || row["email"] || ""),
            lpUrl: String(row["URL da LP"] || row["lpUrl"] || row["lp_url"] || ""),
            notes: String(row["Observa\u00e7\u00f5es"] || row["notes"] || ""),
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

  const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 4000);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
