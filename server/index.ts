import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
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
import { userAccessRouter } from "./routes/userAccessRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { startDailyMetricsBackupScheduler } from "./dailyMetricsBackupService.js";

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
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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
          ],
          connectSrc: ["'self'", "https://*.supabase.co", "https://graph.facebook.com", "https://api.openai.com"],
          frameSrc: ["'self'"],
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
  });

  app.use("/api/", apiGeneralRateLimiter);
  app.use(express.json({ limit: "10mb" }));

  // ─── Registro dos Roteadores de Domínio ─────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api", metricsRouter);
  app.use("/api", talentRouter);
  app.use("/api", evolutionRouter);
  app.use("/api", socialRouter);
  app.use("/api", externalAiRouter);
  app.use("/api", feedbackRouter);
  app.use("/api", userAccessRouter);
  app.use("/api", healthRouter);

  // ─── Arquivos Estáticos e Fallback (Produção) ───────────────────────────────
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
      startDailyMetricsBackupScheduler();
    });
  }

  return { app, server };
}

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  startServer().catch(console.error);
}
