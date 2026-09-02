import { Router } from "express";
import { getSupabaseForRequest, requireAdmin, requireAuth } from "../auth.js";
import { getAuthedSupabase, getSupabase } from "../supabase.js";
import { groupClientAccessByUser } from "../clientAccess.js";
import { notifyUserApproved, notifyUserRejected } from "../lib/notifications.js";
import { normalizeManagedUserStatus } from "../userAccessPolicy.js";

export const userAccessRouter = Router();

// ─── Helper para obter client Supabase com fallback seguro ───────────────────
async function getAdminSupabase(req: any) {
  return getSupabaseForRequest(req) || (await getAuthedSupabase()) || getSupabase();
}

// ─── GET /api/user-access ───────────────────────────────────────────────────
userAccessRouter.get("/user-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }

  let profiles: any[] | null;
  let error: any;
  ({ data: profiles, error } = await sb
    .from("user_profiles")
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .order("email"));

  // Instalações anteriores da dashboard não possuem os campos visuais
  // opcionais bio/avatar_url. A listagem administrativa deve continuar
  // funcional nesses esquemas, retornando os campos essenciais do perfil.
  if (error?.code === "42703") {
    ({ data: profiles, error } = await sb
      .from("user_profiles")
      .select("id, full_name, email, role, status, created_at, updated_at")
      .order("email"));
  }

  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }

  if (!profiles || profiles.length === 0) {
    res.json([]);
    return;
  }

  const profileIds = profiles.map((p: { id: string }) => p.id);
  let accessRows: any[] | null;
  let accessError: any;
  ({ data: accessRows, error: accessError } = await sb
    .from("user_client_access")
    .select("id, user_id, client_id, granted_by, created_at")
    .in("user_id", profileIds));
  if (accessError?.code === "42703") {
    ({ data: accessRows, error: accessError } = await sb
      .from("user_client_access")
      .select("id, user_id, client_id, created_at")
      .in("user_id", profileIds));
  }
  if (accessError) {
    console.error("[user-access] Falha ao consultar acessos:", accessError.code, accessError.message);
    res.status(502).json({ error: accessError.message });
    return;
  }

  const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
  const clientIds = Array.from(new Set((accessRows ?? []).map((row: any) => String(row.client_id || "")).filter(Boolean)));
  const uuidClientIds = clientIds.filter(isUUID);

  let accessClients: any[] | null = [];
  let accessClientsError: any = null;
  if (uuidClientIds.length > 0) {
    ({ data: accessClients, error: accessClientsError } = await sb
      .from("clients")
      .select("id, name, client_group")
      .in("id", uuidClientIds));
    if (accessClientsError?.code === "42703") {
      ({ data: accessClients, error: accessClientsError } = await sb
        .from("clients")
        .select("id, name")
        .in("id", uuidClientIds));
    }
  }

  if (accessClientsError) {
    console.error("[user-access] Falha ao consultar unidades:", accessClientsError.code, accessClientsError.message);
    res.status(502).json({ error: accessClientsError.message });
    return;
  }

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

// ─── Helper para inativar usuário respeitando restrições de CHECK constraint ───
async function setProfileInactive(sb: any, id: string): Promise<{ success: boolean; error?: any; statusUsed?: string }> {
  // Lista de valores compatíveis com diferentes check constraints do Postgres
  const candidates = ["inactive", "rejected", "disabled", "blocked", "inativo", "desativado"];

  for (const statusVal of candidates) {
    // 1. Tenta com updated_at
    let res = await sb
      .from("user_profiles")
      .update({ status: statusVal, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status");

    if (res.error?.code === "42703") {
      // Coluna updated_at não existe no schema
      res = await sb
        .from("user_profiles")
        .update({ status: statusVal })
        .eq("id", id)
        .select("id, status");
    }

    if (!res.error) {
      // Remove acessos a clientes para garantir que não haja vazamento de permissão
      await sb.from("user_client_access").delete().eq("user_id", id);
      return { success: true, statusUsed: statusVal };
    }

    // Se o erro NÃO foi check_violation (23514), interrompe
    if (res.error?.code !== "23514") {
      return { success: false, error: res.error };
    }
  }

  // Fallback caso a constraint só aceite 'active'/'pending': revoga cargo definindo 'none'
  let fallbackRes = await sb
    .from("user_profiles")
    .update({ role: "none" })
    .eq("id", id)
    .select("id, status, role");

  if (!fallbackRes.error) {
    await sb.from("user_client_access").delete().eq("user_id", id);
    return { success: true, statusUsed: "role_revoked" };
  }

  return { success: false, error: fallbackRes.error };
}

// ─── PUT /api/user-access/:id ───────────────────────────────────────────────
userAccessRouter.put("/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const sb = await getAdminSupabase(req);
    if (!sb) {
      res.status(503).json({ error: "Serviço de banco de dados indisponível" });
      return;
    }
    const { role, full_name, status } = req.body as { role?: string; full_name?: string; status?: string };

    if (status === "inactive" || status === "disabled" || status === "rejected") {
      const result = await setProfileInactive(sb, req.params.id);
      if (!result.success) {
        res.status(502).json({ error: result.error?.message || "Erro ao desativar usuário" });
        return;
      }
      if (role || full_name) {
        const extraUpdates: Record<string, unknown> = {};
        if (role) extraUpdates.role = role;
        if (full_name !== undefined) extraUpdates.full_name = full_name;
        await sb.from("user_profiles").update(extraUpdates).eq("id", req.params.id);
      }
      res.json({ ok: true, message: "Usuário inativado com sucesso" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (status !== undefined) {
      const normalizedStatus = normalizeManagedUserStatus(status);
      if (!normalizedStatus) {
        res.status(400).json({ error: "Status de usuário inválido" });
        return;
      }
      updates.status = normalizedStatus;
    }
    updates.updated_at = new Date().toISOString();

    let { data, error } = await sb
      .from("user_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("id, full_name, email, role, status")
      .single();

    if (error?.code === "42703") {
      ({ data, error } = await sb
        .from("user_profiles")
        .update(updates)
        .eq("id", req.params.id)
        .select("id, full_name, email, role, status")
        .single());
    }

    if (error) {
      console.error("[user-access-put] Erro ao atualizar perfil:", error.message);
      res.status(502).json({ error: error.message });
      return;
    }
    res.json({
      id: data.id,
      user_email: data.email,
      full_name: data.full_name,
      role: data.role || "none",
      status: data.status || "active",
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha inesperada ao atualizar o status";
    console.error("[user-access] Falha na atualização de status:", message);
    res.status(502).json({ error: message });
  }
});

// ─── POST /api/user-access/:id/approve ──────────────────────────────────────
// Aprova um usuário com status 'pending', definindo seu cargo e unidades autorizadas
userAccessRouter.post("/user-access/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }

  const { role, client_ids } = req.body as { role?: string; client_ids?: string[] };
  const targetRole = role || "viewer";

  // 1. Atualiza o status para 'active' e define o role
  let { data: updatedProfile, error: updateErr } = await sb
    .from("user_profiles")
    .update({
      status: "active",
      role: targetRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select("id, full_name, email, role, status")
    .single();

  if (updateErr?.code === "42703") {
    ({ data: updatedProfile, error: updateErr } = await sb
      .from("user_profiles")
      .update({
        status: "active",
        role: targetRole,
      })
      .eq("id", req.params.id)
      .select("id, full_name, email, role, status")
      .single());
  }

  if (updateErr) {
    console.error("[user-access-approve] Erro ao aprovar:", updateErr.message);
    res.status(502).json({ error: updateErr.message });
    return;
  }

  // 2. Se foram informados client_ids e a role não for admin geral, vincula as unidades
  if (Array.isArray(client_ids) && client_ids.length > 0 && targetRole !== "admin") {
    const records = client_ids.map((cid) => ({
      user_id: req.params.id,
      client_id: cid,
      granted_by: req.claims?.id || req.claims?.email || "admin",
    }));

    try {
      await sb
        .from("user_client_access")
        .upsert(records, { onConflict: "user_id,client_id" });
    } catch (err: any) {
      console.warn("[user-access-approve] Falha ao vincular unidades:", err);
    }
  }

  // Notificação assíncrona ao usuário
  if (updatedProfile?.email) {
    notifyUserApproved({
      email: updatedProfile.email,
      fullName: updatedProfile.full_name || updatedProfile.email,
      role: targetRole,
    }).catch((err) => console.error("[user-access-approve] Falha ao notificar usuário:", err));
  }

  res.json({
    ok: true,
    message: "Usuário aprovado com sucesso!",
    profile: updatedProfile,
  });
});

// ─── POST /api/user-access/:id/reset-password ───────────────────────────────
// Permite ao admin redefinir a senha de qualquer usuário
userAccessRouter.post("/user-access/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  const baseSb = getSupabase();
  if (!sb && !baseSb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  const { new_password } = req.body as { new_password?: string };
  const queryClient = sb || baseSb!;

  const { data: profile } = await queryClient
    .from("user_profiles")
    .select("id, email, full_name")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!profile?.email) {
    res.status(404).json({ error: "Perfil de usuário não encontrado" });
    return;
  }

  const targetPassword = new_password?.trim() || "Trafego@2026";

  // Se houver service key configurada, atualiza diretamente a senha no Supabase Auth
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (serviceKey && baseSb?.auth?.admin) {
    const { error: adminErr } = await baseSb.auth.admin.updateUserById(req.params.id, {
      password: targetPassword,
    });
    if (!adminErr) {
      res.json({
        ok: true,
        message: `Senha redefinida com sucesso para o usuário ${profile.email}!`,
        password: targetPassword,
      });
      return;
    }
  }

  // Fallback: dispara link de redefinição de senha para o e-mail cadastrado
  const { error: resetErr } = await baseSb!.auth.resetPasswordForEmail(profile.email);
  if (resetErr) {
    res.status(502).json({ error: resetErr.message });
    return;
  }

  res.json({
    ok: true,
    message: `E-mail de redefinição de senha enviado para ${profile.email}.`,
    emailSent: true,
  });
});

// ─── POST /api/user-access/:id/reject ───────────────────────────────────────
// Recusa ou inativa um cadastro pendente
userAccessRouter.post("/user-access/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("email, full_name")
    .eq("id", req.params.id)
    .maybeSingle();

  const result = await setProfileInactive(sb, req.params.id);
  if (!result.success) {
    console.error("[user-access-reject] Erro ao recusar:", result.error?.message);
    res.status(502).json({ error: result.error?.message || "Erro ao recusar usuário" });
    return;
  }

  // Notificação assíncrona ao usuário
  if (profile?.email) {
    notifyUserRejected({
      email: profile.email,
      fullName: profile.full_name || profile.email,
    }).catch((err) => console.error("[user-access-reject] Falha ao notificar usuário:", err));
  }

  res.json({ ok: true, message: "Cadastro recusado/inativado com sucesso." });
});

// ─── POST /api/user-access ──────────────────────────────────────────────────
userAccessRouter.post("/user-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  const baseSb = getSupabase();
  if (!sb && !baseSb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  const { user_email, full_name, role, bio, password, client_ids } = req.body as {
    user_email: string;
    full_name?: string;
    role?: string;
    bio?: string;
    password?: string;
    client_ids?: string[];
  };
  if (!user_email?.trim()) {
    res.status(400).json({ error: "Email é obrigatório" });
    return;
  }

  const cleanEmail = user_email.toLowerCase().trim();
  const cleanName = (full_name || cleanEmail.split("@")[0]).trim();
  const targetRole = role || "viewer";
  const userPassword = (password && password.trim().length >= 6)
    ? password.trim()
    : `TrafegoPro@${Math.floor(1000 + Math.random() * 9000)}`;

  let createdProfile: any = null;
  let authUserId: string | undefined;

  // 1. Cadastra o usuário no Supabase Auth
  // No Supabase, o signUp dispara a trigger automática do Postgres (SECURITY DEFINER)
  // que cria imediatamente o registro em user_profiles com o UID correto.
  if (baseSb) {
    const { data: authData, error: authError } = await baseSb.auth.signUp({
      email: cleanEmail,
      password: userPassword,
      options: {
        data: { name: cleanName },
      },
    });

    if (authData?.user?.id) {
      authUserId = authData.user.id;
    } else if (authError) {
      console.warn("[user-access-create] Aviso no Supabase Auth signUp:", authError.message);
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists")
      ) {
        res.status(409).json({
          error:
            "Este e-mail já está registrado na base de autenticação do Supabase (com outra senha). Para registrá-lo com uma nova senha, exclua o usuário no painel do Supabase (Authentication > Users) ou configure a SUPABASE_SERVICE_KEY no .env.",
        });
        return;
      }
    }
  }

  // 2. Se o usuário acabou de ser criado no Auth, fazemos login com a credencial dele
  // para obter um client com o token da própria conta (auth.uid() = authUserId).
  // Isso garante 100% de conformidade com o RLS sem qualquer risco de 42501 (RLS violation)!
  if (baseSb && authUserId) {
    try {
      const { data: signData } = await baseSb.auth.signInWithPassword({
        email: cleanEmail,
        password: userPassword,
      });

      if (signData?.session?.access_token) {
        const authedUserSb = getSupabaseForAccessToken(signData.session.access_token);
        if (authedUserSb) {
          const updates: Record<string, any> = {
            full_name: cleanName,
            role: targetRole,
            status: "active",
            updated_at: new Date().toISOString(),
          };
          if (bio) updates.bio = bio;

          let { data: upProfile, error: upErr } = await authedUserSb
            .from("user_profiles")
            .update(updates)
            .eq("id", authUserId)
            .select("id, full_name, email, role, status")
            .single();

          if (upErr?.code === "42703") {
            delete updates.updated_at;
            delete updates.bio;
            ({ data: upProfile, error: upErr } = await authedUserSb
              .from("user_profiles")
              .update(updates)
              .eq("id", authUserId)
              .select("id, full_name, email, role, status")
              .single());
          }

          if (!upErr && upProfile) {
            createdProfile = upProfile;
          }
        }
      }
    } catch (loginErr) {
      console.warn("[user-access-create] Aviso no login do novo usuário:", loginErr);
    }
  }

  // 3. Se ainda não atualizou (ex: usuário já existia no Auth anteriormente),
  // tenta atualizar usando o client do admin
  if (!createdProfile && sb) {
    const updates: Record<string, any> = {
      full_name: cleanName,
      role: targetRole,
      status: "active",
      updated_at: new Date().toISOString(),
    };
    if (bio) updates.bio = bio;

    let { data: admProfile, error: admErr } = await sb
      .from("user_profiles")
      .update(updates)
      .eq("email", cleanEmail)
      .select("id, full_name, email, role, status")
      .maybeSingle();

    if (admErr?.code === "42703") {
      delete updates.updated_at;
      delete updates.bio;
      ({ data: admProfile, error: admErr } = await sb
        .from("user_profiles")
        .update(updates)
        .eq("email", cleanEmail)
        .select("id, full_name, email, role, status")
        .maybeSingle());
    }

    if (!admErr && admProfile) {
      createdProfile = admProfile;
    }
  }

  // 4. Se o perfil ainda não foi retornado mas foi criado, busca pelo e-mail ou id
  if (!createdProfile) {
    const queryClient = sb || baseSb;
    if (queryClient) {
      const { data: foundProfile } = await queryClient
        .from("user_profiles")
        .select("id, full_name, email, role, status")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (foundProfile) {
        createdProfile = foundProfile;
      }
    }
  }

  if (!createdProfile) {
    res.status(502).json({ error: "Falha ao registrar e ativar o perfil do usuário no banco." });
    return;
  }

  // 5. Se o admin vinculou unidades no cadastro, adiciona em user_client_access
  if (Array.isArray(client_ids) && client_ids.length > 0 && targetRole !== "admin" && sb) {
    const records = client_ids.map((cid) => ({
      user_id: createdProfile.id,
      client_id: cid,
      granted_by: req.claims?.id || req.claims?.email || "admin",
    }));

    try {
      await sb
        .from("user_client_access")
        .upsert(records, { onConflict: "user_id,client_id" });
    } catch (err) {
      console.warn("[user-access-create] Falha ao vincular unidades:", err);
    }
  }

  res.status(201).json({
    id: createdProfile.id,
    user_email: createdProfile.email,
    full_name: createdProfile.full_name,
    role: createdProfile.role || targetRole,
    status: createdProfile.status || "active",
    temporaryPassword: userPassword,
  });
});

// ─── DELETE /api/user-access/:id ────────────────────────────────────────────
userAccessRouter.delete("/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  const result = await setProfileInactive(sb, req.params.id);
  if (!result.success) {
    console.error("[user-access-delete] Erro ao desativar:", result.error?.message);
    res.status(502).json({ error: result.error?.message || "Erro ao desativar usuário" });
    return;
  }
  res.json({ ok: true, message: "Usuário desativado com sucesso" });
});

// ─── DELETE /api/user-access/:id/permanent ──────────────────────────────────
// Exclui o perfil permanentemente e revoga todos os acessos
userAccessRouter.delete("/user-access/:id/permanent", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  const baseSb = getSupabase();
  if (!sb && !baseSb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  const client = sb || baseSb!;
  const userId = req.params.id;

  try {
    // 1. Remove os acessos a franquias/unidades
    await client.from("user_client_access").delete().eq("user_id", userId);

    // 2. Remove o perfil de user_profiles
    const { error: profileErr } = await client.from("user_profiles").delete().eq("id", userId);
    if (profileErr) {
      console.warn("[user-access-permanent-delete] Aviso ao remover perfil:", profileErr.message);
    }

    // 3. Se houver service key configurada, remove também do Supabase Auth
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (serviceKey && baseSb?.auth?.admin) {
      await baseSb.auth.admin.deleteUser(userId).catch((err) => {
        console.warn("[user-access-permanent-delete] Aviso ao deletar auth user:", err);
      });
    }

    res.json({ ok: true, message: "Usuário excluído permanentemente com sucesso" });
  } catch (err: any) {
    console.error("[user-access-permanent-delete] Erro:", err);
    res.status(502).json({ error: err.message || "Erro ao excluir usuário permanentemente" });
  }
});

// ─── POST /api/client-access ────────────────────────────────────────────────
userAccessRouter.post("/client-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  let { user_id, client_id } = req.body as { user_id: string; client_id: string };
  if (!user_id || !client_id) {
    res.status(400).json({ error: "user_id e client_id são obrigatórios" });
    return;
  }

  // Se o frontend passou um email como user_id ou se o ID precisa de resolução
  const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
  if (!isUUID(user_id)) {
    const { data: profile } = await sb
      .from("user_profiles")
      .select("id")
      .ilike("email", user_id.trim())
      .maybeSingle();

    if (profile?.id) {
      user_id = profile.id;
    }
  }

  if (!isUUID(user_id)) {
    res.status(400).json({ error: `Usuário inválido ou não encontrado: ${user_id}` });
    return;
  }

  const { data, error } = await sb
    .from("user_client_access")
    .insert({ user_id, client_id, granted_by: req.claims?.id || req.claims?.email || "admin" })
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

// ─── DELETE /api/client-access/:id ──────────────────────────────────────────
userAccessRouter.delete("/client-access/:id", requireAuth, requireAdmin, async (req, res) => {
  const sb = await getAdminSupabase(req);
  if (!sb) {
    res.status(503).json({ error: "Serviço de banco de dados indisponível" });
    return;
  }
  const { error } = await sb.from("user_client_access").delete().eq("id", req.params.id);
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});
