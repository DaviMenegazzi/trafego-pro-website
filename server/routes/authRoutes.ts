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

const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: process.env.NODE_ENV === "test" ? 1000 : 10, // 10 solicitações
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas solicitações de cadastro. Aguarde alguns minutos antes de tentar novamente." },
});

// ─── POST /api/auth/register ────────────────────────────────────────────────
// Auto-cadastro público de usuário com aprovação pendente por administrador
authRouter.post("/register", registerRateLimiter, async (req, res) => {
  const { email, password, full_name, requested_unit, reason } = req.body as {
    email?: string;
    password?: string;
    full_name?: string;
    requested_unit?: string;
    reason?: string;
  };

  if (!email || !password || !full_name) {
    res.status(400).json({ error: "Nome completo, e-mail e senha são obrigatórios" });
    return;
  }

  const registerEmail = email.trim().toLowerCase();
  const trimmedName = full_name.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
    res.status(400).json({ error: "Informe um endereço de e-mail válido" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve conter no mínimo 6 caracteres" });
    return;
  }

  if (trimmedName.length < 3) {
    res.status(400).json({ error: "O nome completo deve conter no mínimo 3 caracteres" });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Serviço de autenticação temporariamente indisponível" });
    return;
  }

  try {
    // 1. Verifica se já existe perfil cadastrado com esse email
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id, status")
      .eq("email", registerEmail)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.status === "pending") {
        res.status(409).json({
          error: "Já existe uma solicitação de cadastro pendente de aprovação para este e-mail.",
          status: "pending",
        });
        return;
      }
      res.status(409).json({ error: "Este e-mail já está cadastrado na plataforma." });
      return;
    }

    // 2. Cadastra o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          requested_unit: requested_unit || "",
          reason: reason || "",
        },
      },
    });

    if (authError) {
      console.warn("[auth-register] Erro no Supabase Auth signUp:", authError.message);
      if (authError.message.toLowerCase().includes("already registered")) {
        res.status(409).json({ error: "Este e-mail já possui uma conta no sistema." });
        return;
      }
      res.status(400).json({ error: authError.message });
      return;
    }

    const userId = authData.user?.id;
    const bioText = [
      requested_unit ? `Unidade solicitada: ${requested_unit}` : "",
      reason ? `Justificativa: ${reason}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // 3. Insere ou atualiza o perfil em user_profiles com status 'pending'
    if (userId) {
      await supabase.from("user_profiles").upsert(
        {
          id: userId,
          email: registerEmail,
          full_name: trimmedName,
          role: "viewer",
          status: "pending",
          bio: bioText,
        },
        { onConflict: "id" },
      );
    } else {
      await supabase.from("user_profiles").insert({
        email: registerEmail,
        full_name: trimmedName,
        role: "viewer",
        status: "pending",
        bio: bioText,
      });
    }

    res.status(201).json({
      ok: true,
      message:
        "Cadastro realizado com sucesso! Sua solicitação foi enviada e está aguardando aprovação de um administrador.",
      status: "pending",
    });
  } catch (err) {
    console.error("[auth-register] Falha no processo de cadastro:", err);
    res.status(500).json({ error: "Não foi possível concluir seu cadastro. Tente novamente mais tarde." });
  }
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
        if (access.status === "pending") {
          res.status(403).json({
            error: "Seu cadastro foi realizado com sucesso e está aguardando aprovação de um administrador.",
            status: "pending",
          });
          return;
        }
        if (access.status === "inactive" || access.status === "rejected") {
          res.status(403).json({
            error: "Seu acesso está inativo ou foi recusado pela administração.",
            status: "inactive",
          });
          return;
        }
        res.status(403).json({ error: "Sem permissão de acesso. Contate o administrador." });
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
