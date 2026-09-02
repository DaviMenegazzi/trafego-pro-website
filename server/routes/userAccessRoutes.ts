import { Router } from "express";
import { getSupabaseForRequest, requireAdmin, requireAuth } from "../auth.js";
import { getSupabase } from "../supabase.js";
import { groupClientAccessByUser } from "../clientAccess.js";
import { notifyUserApproved, notifyUserRejected } from "../lib/notifications.js";
import { normalizeManagedUserStatus } from "../userAccessPolicy.js";

export const userAccessRouter = Router();


// ─── GET /api/user-access ───────────────────────────────────────────────────
userAccessRouter.get("/user-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
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

// ─── PUT /api/user-access/:id ───────────────────────────────────────────────
userAccessRouter.put("/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { role, full_name, status } = req.body as { role?: string; full_name?: string; status?: string };
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
  let data: any;
  let error: any;
  ({ data, error } = await sb
    .from("user_profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .single());

  // Perfis legados podem não possuir campos visuais opcionais. O status deve
  // continuar atualizável mesmo quando esses campos não existem no esquema.
  if (error?.code === "42703") {
    ({ data, error } = await sb
      .from("user_profiles")
      .update(updates)
      .eq("id", req.params.id)
      .select("id, full_name, email, role, status, created_at, updated_at")
      .single());
  }
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  res.json({
    id: data.id,
    user_email: data.email,
    full_name: data.full_name,
    role: data.role || "none",
    status: data.status || "active",
    bio: data.bio,
    avatar_url: data.avatar_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  });
});

// ─── POST /api/user-access/:id/approve ──────────────────────────────────────
// Aprova um usuário com status 'pending', definindo seu cargo e unidades autorizadas
userAccessRouter.post("/user-access/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  const { role, client_ids } = req.body as { role?: string; client_ids?: string[] };
  const targetRole = role || "viewer";

  // 1. Atualiza o status para 'active' e define o role
  const { data: updatedProfile, error: updateErr } = await sb
    .from("user_profiles")
    .update({
      status: "active",
      role: targetRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .single();

  if (updateErr) {
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

// ─── POST /api/user-access/:id/reject ───────────────────────────────────────
// Recusa ou inativa um cadastro pendente
userAccessRouter.post("/user-access/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("email, full_name")
    .eq("id", req.params.id)
    .maybeSingle();

  const { error } = await sb
    .from("user_profiles")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", req.params.id);

  if (error) {
    res.status(502).json({ error: error.message });
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
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { user_email, full_name, role, bio } = req.body as {
    user_email: string;
    full_name?: string;
    role?: string;
    bio?: string;
  };
  if (!user_email?.trim()) {
    res.status(400).json({ error: "Email é obrigatório" });
    return;
  }
  const { data, error } = await sb
    .from("user_profiles")
    .insert({
      email: user_email.toLowerCase().trim(),
      full_name: full_name || user_email.split("@")[0],
      role: role || "viewer",
      status: "active",
      bio: bio || "",
    })
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Já existe um profile com esse email" });
    } else {
      res.status(502).json({ error: error.message });
    }
    return;
  }
  res.status(201).json({
    id: data.id,
    user_email: data.email,
    full_name: data.full_name,
    role: data.role || "viewer",
    status: data.status || "active",
    bio: data.bio,
    avatar_url: data.avatar_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  });
});

// ─── DELETE /api/user-access/:id ────────────────────────────────────────────
userAccessRouter.delete("/user-access/:id", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { error } = await sb
    .from("user_profiles")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", req.params.id);
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// ─── POST /api/client-access ────────────────────────────────────────────────
userAccessRouter.post("/client-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req) || getSupabase();
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
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
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { error } = await sb.from("user_client_access").delete().eq("id", req.params.id);
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});
