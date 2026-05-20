import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

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

// ─── Mock data ───────────────────────────────────────────────────────────────
const clients = [
  {
    id: 1,
    name: "Vida Card Tupanciretã",
    city: "Tupanciretã",
    state: "RS",
    status: "active",
    plan: "Meta Ads + Google Ads",
    startDate: "2024-03-01",
    monthlyBudget: 2500,
    contact: "Gerente Tupanciretã",
    phone: "(55) 99999-0001",
    email: "tupancireta@vidacard.com.br",
    lpUrl: "/tupancireta",
    notes: "Foco em geração de conversas qualificadas no WhatsApp. Público 25-55 anos.",
    campaigns: [
      { name: "Campanha Família", platform: "Meta Ads", status: "active", budget: 800 },
      { name: "Campanha Individual", platform: "Meta Ads", status: "active", budget: 600 },
      { name: "Pesquisa Marca", platform: "Google Ads", status: "active", budget: 500 },
      { name: "Pesquisa Concorrência", platform: "Google Ads", status: "active", budget: 600 },
    ],
  },
  {
    id: 2,
    name: "Vida Card Júlio de Castilhos",
    city: "Júlio de Castilhos",
    state: "RS",
    status: "active",
    plan: "Meta Ads + Google Ads",
    startDate: "2024-04-01",
    monthlyBudget: 2000,
    contact: "Gerente Júlio de Castilhos",
    phone: "(55) 99999-0002",
    email: "juliodecastilhos@vidacard.com.br",
    lpUrl: "/juliodecastilhos",
    notes: "Praça menor, foco em awareness e conversão direta. Público 30-60 anos.",
    campaigns: [
      { name: "Campanha Família", platform: "Meta Ads", status: "active", budget: 700 },
      { name: "Campanha Individual", platform: "Meta Ads", status: "active", budget: 500 },
      { name: "Pesquisa Marca", platform: "Google Ads", status: "active", budget: 400 },
      { name: "Pesquisa Concorrência", platform: "Google Ads", status: "paused", budget: 400 },
    ],
  },
];

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

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // ─── API Routes ─────────────────────────────────────────────────────────
  // Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = signToken({ email, role: "admin" });
      res.json({ token, user: { email, role: "admin", name: "Lucas Dorneles" } });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Verify token
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const token = req.headers.authorization!.slice(7);
    const payload = verifyToken(token);
    res.json(payload);
  });

  // List clients
  app.get("/api/clients", requireAuth, (_req, res) => {
    res.json(clients.map(({ campaigns: _c, ...c }) => c));
  });

  // Get single client
  app.get("/api/clients/:id", requireAuth, (req, res) => {
    const client = clients.find((c) => c.id === Number(req.params.id));
    if (!client) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }
    res.json(client);
  });

  // ─── Static files (production only) ────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    // Handle client-side routing - serve index.html for all non-API routes
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
