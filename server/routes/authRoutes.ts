import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getSupabase } from "../supabase.js";
import {
  fetchUserAccess,
  requireAuth,
  signToken,
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_COOKIE_MAX_AGE_MS,
} from "../auth.js";

export const authRouter = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: process.env.NODE_ENV === "test" ? 1000 : 20, // 20 tentativas
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente." },
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
authRouter.post("/login", authRateLimiter, async (req, res) => {
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

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.claims);
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, (_req, res) => {
  res.clearCookie(SUPABASE_ACCESS_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.status(204).end();
});
