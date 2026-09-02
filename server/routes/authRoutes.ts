import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getSupabase } from "../supabase.js";
import {
  fetchUserAccess,
  requireAuth,
  signToken,
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_COOKIE_MAX_AGE_MS,
  APP_TOKEN_COOKIE,
  APP_COOKIE_MAX_AGE_MS,
} from "../auth.js";
import { notifyAdminNewRegistration } from "../lib/notifications.js";
import { buildPendingRegistrationBio } from "../registrationPolicy.js";

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
  const { email, password, full_name, reason } = req.body as {
    email?: string;
    password?: string;
    full_name?: string;
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
    // 1. Cadastra o usuário no Supabase Auth diretamente (elimina SELECT prévio do caminho feliz)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          reason: reason || "",
        },
      },
    });

    if (authError) {
      console.warn("[auth-register] Erro no Supabase Auth signUp:", authError.message);
      if (authError.message.toLowerCase().includes("already registered")) {
        // Consulta status do cadastro existente para responder com mensagem precisa
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("status")
          .eq("email", registerEmail)
          .maybeSingle();

        if (existingProfile?.status === "pending") {
          res.status(409).json({
            error: "Já existe uma solicitação de cadastro pendente de aprovação para este e-mail.",
            status: "pending",
          });
          return;
        }

        res.status(409).json({ error: "Este e-mail já possui uma conta no sistema." });
        return;
      }
      res.status(400).json({ error: authError.message });
      return;
    }

    const userId = authData.user?.id;
    const bioText = buildPendingRegistrationBio(reason);

    // 2. Atualização segura do perfil com status 'pending'
    // Como a trigger do Postgres já criou o perfil no signUp, usamos a sessão do próprio usuário
    // para atualizar a justificativa e os metadados em conformidade com o RLS.
    try {
      const { data: userSign } = await supabase.auth.signInWithPassword({
        email: registerEmail,
        password,
      });

      const authedUserSb = userSign?.session?.access_token
        ? (await import("../supabase.js")).getSupabaseForAccessToken(userSign.session.access_token)
        : null;

      const targetClient = authedUserSb || supabase;
      const { error: profileError } = await targetClient
        .from("user_profiles")
        .update({
          full_name: trimmedName,
          status: "pending",
          role: "viewer",
          ...(bioText ? { bio: bioText } : {}),
        })
        .eq("email", registerEmail);

      if (profileError && profileError.code !== "42501" && profileError.code !== "42703") {
        console.warn("[auth-register] Aviso ao atualizar detalhes do perfil:", profileError.message);
      }
    } catch (err) {
      console.warn("[auth-register] Aviso na sincronização do perfil pós-cadastro:", err);
    }

    // 3. Notificação assíncrona ao administrador (fire-and-forget)
    notifyAdminNewRegistration({
      userId,
      fullName: trimmedName,
      email: registerEmail,
      reason,
    }).catch((err) => console.error("[auth-register] Falha ao notificar admin:", err));

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
  const { email, password, name, identifier } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    identifier?: string;
  };

  const rawIdentifier = (email || name || identifier || "").trim();
  if (!rawIdentifier || !password) {
    res.status(400).json({ error: "Identificação e senha são obrigatórios" });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Supabase não configurado para autenticação" });
    return;
  }

  try {
    let loginEmail = rawIdentifier.toLowerCase();

    // Se o usuário digitou um nome ao invés de email, resolve o email no user_profiles
    if (!loginEmail.includes("@")) {
      const { data: matchedProfile } = await supabase
        .from("user_profiles")
        .select("email")
        .or(`full_name.ilike.%${rawIdentifier}%,email.ilike.${rawIdentifier}%`)
        .maybeSingle();

      if (matchedProfile?.email) {
        loginEmail = matchedProfile.email.toLowerCase().trim();
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error || !data.user) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    // Busca role + acessos usando o UID do Supabase Auth e o email de fallback
    const accessToken = data.session?.access_token;
    const access = await fetchUserAccess(data.user.id, accessToken, undefined, loginEmail);

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

      const isProduction = process.env.NODE_ENV === "production";

      // 1. Seta cookie do Supabase Access Token (HttpOnly + Secure)
      res.cookie(SUPABASE_ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: SUPABASE_COOKIE_MAX_AGE_MS,
        path: "/",
      });

      // 2. Seta cookie HttpOnly com o JWT da aplicação (proteção total contra roubo via XSS)
      res.cookie(APP_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: APP_COOKIE_MAX_AGE_MS,
        path: "/",
      });

      // Retorna token no payload para compatibilidade de transição e dados públicos de exibição
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
    } catch (err) {
      console.error("[auth] Erro ao autenticar com Supabase:", err);
      res.status(500).json({ error: "Erro de autenticação" });
      return;
    }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.claims);
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, (_req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie(SUPABASE_ACCESS_COOKIE, cookieOptions);
  res.clearCookie(APP_TOKEN_COOKIE, cookieOptions);
  res.status(204).end();
});
