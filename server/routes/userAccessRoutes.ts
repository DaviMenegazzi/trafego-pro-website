import { Router } from "express";
import { getSupabaseForRequest, requireAdmin, requireAuth } from "../auth.js";
import { groupClientAccessByUser } from "../clientAccess.js";

export const userAccessRouter = Router();

// ─── GET /api/user-access ───────────────────────────────────────────────────
userAccessRouter.get("/user-access", requireAuth, requireAdmin, async (req, res) => {
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  const { data: profiles, error } = await sb
    .from("user_profiles")
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .order("email");

  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }

  if (!profiles || profiles.length === 0) {
    res.json([]);
    return;
  }

  const profileIds = profiles.map((p: { id: string }) => p.id);
  const { data: accessRows, error: accessError } = await sb
    .from("user_client_access")
    .select("id, user_id, client_id, granted_by, created_at")
    .in("user_id", profileIds);
  if (accessError) {
    res.status(502).json({ error: accessError.message });
    return;
  }

  const clientIds = Array.from(new Set((accessRows ?? []).map((row: any) => row.client_id).filter(Boolean)));
  const { data: accessClients, error: accessClientsError } =
    clientIds.length > 0
      ? await sb.from("clients").select("id, name, client_group").in("id", clientIds)
      : { data: [], error: null };
  if (accessClientsError) {
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
  if (status !== undefined) updates.status = status;
  updates.updated_at = new Date().toISOString();
  const { data, error } = await sb
    .from("user_profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, full_name, email, role, status, bio, avatar_url, created_at, updated_at")
    .single();
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
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { user_id, client_id } = req.body as { user_id: string; client_id: string };
  if (!user_id || !client_id) {
    res.status(400).json({ error: "user_id e client_id são obrigatórios" });
    return;
  }
  const { data, error } = await sb
    .from("user_client_access")
    .insert({ user_id, client_id, granted_by: req.claims!.email })
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
