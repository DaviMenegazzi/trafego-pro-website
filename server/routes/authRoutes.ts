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

// ─── GET /api/auth/available-units ──────────────────────────────────────────
// Listagem pública leve das unidades disponíveis para auto-cadastro
authRouter.get("/available-units", async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json([]);
    return;
  }

  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, client_group")
      .order("name");

    if (error) {
      console.warn("[auth-available-units] Aviso ao listar unidades:", error.message);
      res.json([]);
      return;
    }

    res.json(data ?? []);
  } catch (err) {
    console.warn("[auth-available-units] Erro inesperado:", err);
    res.json([]);
  }
});

// ─── POST /api/auth/register ────────────────────────────────────────────────
// Auto-cadastro público de usuário com aprovação pendente por administrador
authRouter.post("/register", registerRateLimiter, async (req, res) => {
  const { email, password, full_name, requested_unit, requested_unit_id, reason } = req.body as {
    email?: string;
    password?: string;
    full_name?: string;
    requested_unit?: string;
    requested_unit_id?: string;
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
          requested_unit: requested_unit || "",
          requested_unit_id: requested_unit_id || "",
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
    const bioParts = [];
    if (requested_unit_id) bioParts.push(`[Unit ID: ${requested_unit_id}]`);
    if (requested_unit) bioParts.push(`Unidade: ${requested_unit}`);
    if (reason) bioParts.push(`Justificativa: ${reason}`);
    const bioText = bioParts.join(" | ");

    // 2. Upsert atômico do perfil com status 'pending'
    const profilePayload = {
      ...(userId ? { id: userId } : {}),
      email: registerEmail,
      full_name: trimmedName,
      role: "viewer",
      status: "pending",
      bio: bioText,
    };

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(profilePayload, { onConflict: userId ? "id" : "email" });

    if (profileError) {
      console.warn("[auth-register] Erro ao gravar user_profiles:", profileError.message);
      if (profileError.code === "23505") {
        res.status(409).json({
          error: "Já existe uma solicitação de cadastro para este e-mail.",
          status: "pending",
        });
        return;
      }
      res.status(502).json({ error: "Falha ao registrar perfil de usuário" });
      return;
    }

    // 3. Notificação assíncrona ao administrador (fire-and-forget)
    notifyAdminNewRegistration({
      userId,
      fullName: trimmedName,
      email: registerEmail,
      requestedUnit: requested_unit,
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
