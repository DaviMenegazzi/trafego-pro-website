import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// ─── Re-exports de Autenticação e Autorização ───────────────────────────────
export {
  JWT_SECRET,
  signToken,
  verifyToken,
  isAdminRole,
  isTeamRole,
  isAdmin,
  hasUnitAccess,
  fetchUserAccess,
  listDashboardClientsFromSupabase,
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_COOKIE_MAX_AGE_MS,
  readCookie,
  getSupabaseForRequest,
  requireAuth,
  requireAdmin,
  requireSupabaseAdmin,
  type JwtClaims,
  type SupabaseDashboardClient,
} from "./auth.js";

// ─── Roteadores Modulares ───────────────────────────────────────────────────
import { authRouter } from "./routes/authRoutes.js";
import { metricsRouter } from "./routes/metricsRoutes.js";
import { talentRouter } from "./routes/talentRoutes.js";
import { evolutionRouter } from "./routes/evolutionRoutes.js";
import { socialRouter } from "./routes/socialRoutes.js";
import { externalAiRouter } from "./routes/externalAiRoutes.js";
import { feedbackRouter } from "./routes/feedbackRoutes.js";
import { formRouter } from "./routes/formRoutes.js";
import { userAccessRouter } from "./routes/userAccessRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { financialRouter } from "./routes/financialRoutes.js";
import { startDailyMetricsBackupScheduler } from "./dailyMetricsBackupService.js";
import { startEvolutionLiveAiFlushLoop } from "./evolutionLeadStageBuffer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer({ listen = true }: { listen?: boolean } = {}) {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);

  // ─── Cabeçalhos de Segurança HTTP (Helmet) ──────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // GTM/GA4 (index.html) e o que o contêiner do GTM costuma carregar: Google Ads e pixel da Meta.
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://*.googletagmanager.com",
            "https://www.googleadservices.com",
            "https://googleads.g.doubleclick.net",
            "https://connect.facebook.net",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.supabase.co",
            "https://graph.facebook.com",
            "https://*.fbcdn.net",
            "https://*.facebook.com",
            "https://*.trafego.pro",
            "https://*.google-analytics.com",
            "https://*.googletagmanager.com",
            "https://*.g.doubleclick.net",
            "https://www.google.com",
            "https://www.google.com.br",
          ],
          connectSrc: [
            "'self'",
            "https://*.supabase.co",
            "https://graph.facebook.com",
            "https://api.openai.com",
            "https://*.firebaseio.com",
            "wss://*.firebaseio.com",
            "https://*.googleapis.com",
            "https://*.google-analytics.com",
            "https://*.analytics.google.com",
            "https://*.googletagmanager.com",
            "https://*.g.doubleclick.net",
            "https://www.google.com",
            "https://www.facebook.com",
          ],
          frameSrc: ["'self'", "https://www.googletagmanager.com", "https://td.doubleclick.net"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── Rate Limiter Geral para a API ──────────────────────────────────────────
  const apiGeneralRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    limit: process.env.NODE_ENV === "test" ? 5000 : 300, // 300 req/min
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde alguns instantes." },
    skip: (req) => req.path === "/api/evolution/webhook",
  });

  // ─── Rate Limiter Dedicado ao Webhook Evolution ─────────────────────────────
  // Absorve rajadas legítimas da VPS Evolution sem disputar o limite geral.
  const evolutionWebhookRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 50_000 : 10_000, // 10.000 req/min
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas requisições ao webhook Evolution." },
  });

  app.use("/api/evolution/webhook", evolutionWebhookRateLimiter);
  app.use("/api/", apiGeneralRateLimiter);
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));

  // ─── Registro dos Roteadores de Domínio ─────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api", metricsRouter);
  app.use("/api", talentRouter);
  app.use("/api", evolutionRouter);
  app.use("/api", socialRouter);
  app.use("/api", externalAiRouter);
  app.use("/api", feedbackRouter);
  app.use("/api", formRouter);
  app.use("/api", userAccessRouter);
  app.use("/api", healthRouter);
  app.use("/api", financialRouter);

  // ─── Arquivos Estáticos e Fallback (Produção) ───────────────────────────────
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  if (listen) {
    const port = Number(process.env.PORT) || (process.env.NODE_ENV === "production" ? 3000 : 4000);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${port}/`);
      startDailyMetricsBackupScheduler();
      const flushIntervalMinutes = Number(process.env.EVOLUTION_AI_LIVE_FLUSH_INTERVAL_MINUTES) || 15;
      startEvolutionLiveAiFlushLoop(flushIntervalMinutes * 60_000);
    });
  }

  return { app, server };
}

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  startServer().catch(console.error);
}
