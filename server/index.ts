import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import multer from "multer";
import * as XLSX from "xlsx";
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
const JWT_SECRET = process.env.JWT_SECRET || "REDACTED_TEST_SECRET";

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

// ─── Admin credentials (env or defaults) ────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "redacted@example.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_TEST_PASSWORD";

// ─── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  if (payload.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
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
  app.post("/api/auth/login", (req, res) => {
    const { email, password, name } = req.body as { email?: string; password: string; name?: string };

    // Tenta login pelo banco de dados (por nome ou email)
    let dbUser: User | undefined;
    if (name) dbUser = getUserByName(name);
    if (!dbUser && email) dbUser = getUserByEmail(email);

    if (dbUser && dbUser.password === password) {
      const token = signToken({ email: dbUser.email, name: dbUser.name, role: dbUser.role, id: dbUser.id });
      res.json({ token, user: { email: dbUser.email, name: dbUser.name, role: dbUser.role, id: dbUser.id } });
      return;
    }

    // Fallback: credenciais fixas do admin principal
    if ((email === ADMIN_EMAIL || name?.toLowerCase() === "lucas") && password === ADMIN_PASSWORD) {
      const token = signToken({ email: ADMIN_EMAIL, role: "admin", name: "Lucas Dorneles" });
      res.json({ token, user: { email: ADMIN_EMAIL, role: "admin", name: "Lucas Dorneles" } });
      return;
    }

    res.status(401).json({ error: "Credenciais inválidas" });
  });

  // ─── Users (admin only) ──────────────────────────────────────────────────────
  app.get("/api/users", requireAuth, (_req, res) => {
    const users = getAllUsers().map(({ password: _p, ...u }) => u);
    res.json(users);
  });

  app.post("/api/users", requireAuth, (req, res) => {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role?: "admin" | "user" };
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

  app.delete("/api/users/:id", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    deleteUser(id);
    res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const token = req.headers.authorization!.slice(7);
    const payload = verifyToken(token);
    res.json(payload);
  });

  // ─── Clients — List & Create ──────────────────────────────────────────────
  app.get("/api/clients", requireAuth, (_req, res) => {
    const clients = getAllClients();
    res.json(clients);
  });

  app.post("/api/clients", requireAuth, (req, res) => {
    const body = req.body as Partial<ClientInput> & { name: string };
    if (!body.name?.trim()) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const client = createClient(body);
    res.status(201).json(client);
  });

  // ─── Clients — Single ────────────────────────────────────────────────────
  app.get("/api/clients/:id", requireAuth, (req, res) => {
    const client = getClientById(Number(req.params.id));
    if (!client) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const campaigns = getCampaignsByClientId(client.id);
    res.json({ ...client, campaigns });
  });

  app.put("/api/clients/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const updated = updateClient(id, req.body as Partial<ClientInput>);
    res.json(updated);
  });

  app.delete("/api/clients/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!getClientById(id)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    deleteClient(id);
    res.json({ ok: true });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────
  app.post("/api/clients/:clientId/campaigns", requireAuth, (req, res) => {
    const clientId = Number(req.params.clientId);
    if (!getClientById(clientId)) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
    const body = req.body as Partial<CampaignInput> & { name: string };
    if (!body.name?.trim()) { res.status(400).json({ error: "Nome da campanha é obrigatório" }); return; }
    const campaign = createCampaign(clientId, body);
    res.status(201).json(campaign);
  });

  app.put("/api/campaigns/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const updated = updateCampaign(id, req.body as Partial<CampaignInput>);
    if (!updated) { res.status(404).json({ error: "Campanha não encontrada" }); return; }
    res.json(updated);
  });

  app.delete("/api/campaigns/:id", requireAuth, (req, res) => {
    deleteCampaign(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Excel Export ─────────────────────────────────────────────────────────
  app.get("/api/clients/export/excel", requireAuth, (_req, res) => {
    const clients = getAllClients();

    // Aba de clientes
    const clientsSheet = XLSX.utils.json_to_sheet(
      clients.map((c) => ({
        ID: c.id,
        Nome: c.name,
        Cidade: c.city,
        Estado: c.state,
        Status: c.status === "active" ? "Ativo" : "Pausado",
        Plano: c.plan,
        "Data de Início": c.startDate,
        "Orçamento Mensal (R$)": c.monthlyBudget,
        Contato: c.contact,
        Telefone: c.phone,
        Email: c.email,
        "URL da LP": c.lpUrl,
        Observações: c.notes,
      }))
    );

    // Aba de campanhas
    const allCampaigns = clients.flatMap((c) =>
      getCampaignsByClientId(c.id).map((camp) => ({
        "ID Cliente": c.id,
        "Nome do Cliente": c.name,
        "ID Campanha": camp.id,
        "Nome da Campanha": camp.name,
        Plataforma: camp.platform,
        Status: camp.status === "active" ? "Ativa" : "Pausada",
        "Orçamento (R$)": camp.budget,
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
    const feedbackLeads = getAllFeedbackLeads();
    res.json(feedbackLeads);
  });

  app.post("/api/feedback-leads", requireAuth, (req, res) => {
    const body = req.body as Partial<FeedbackLeadInput> & { unit: string; responsible: string; weekStart: string };
    if (!body.unit?.trim() || !body.responsible?.trim() || !body.weekStart) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }
    const feedback = createFeedbackLead({
      unit: body.unit,
      responsible: body.responsible,
      weekStart: body.weekStart,
      totalLeads: Number(body.totalLeads) || 0,
      leadsCard: Number(body.leadsCard) || 0,
      leadsConsultation: Number(body.leadsConsultation) || 0,
      leadsDentistry: Number(body.leadsDentistry) || 0,
      leadsBusinessPJ: Number(body.leadsBusinessPJ) || 0,
      leadsOutOfArea: Number(body.leadsOutOfArea) || 0,
      leadsAnswered: Number(body.leadsAnswered) || 0,
      leadsNoAnswer: Number(body.leadsNoAnswer) || 0,
      salesClosed: Number(body.salesClosed) || 0,
      mainReason: body.mainReason ?? "",
      creativeFeedback: body.creativeFeedback ?? "",
      generalObservations: body.generalObservations ?? "",
      supportNeeded: body.supportNeeded ?? "",
      submittedAt: body.submittedAt ?? new Date().toISOString(),
    });
    res.status(201).json(feedback);
  });

  // ─── Excel Import ─────────────────────────────────────────────────────────
  app.post("/api/clients/import/excel", requireAuth, upload.single("file"), (req, res) => {
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
            name,
            city: String(row["Cidade"] || row["city"] || ""),
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
        } catch (e) {
          errors.push(`Erro ao importar "${name}": ${(e as Error).message}`);
        }
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
