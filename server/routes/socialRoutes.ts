import crypto from "crypto";
import { Router } from "express";
import multer from "multer";
import {
  getSupabaseForRequest,
  listDashboardClientsFromSupabase,
  requireAuth,
  requireSupabaseAdmin,
} from "../auth.js";
import { resolveAuthorizedEvolutionUnit } from "../evolutionUnitAssignment.js";
import { authenticateScheduledTask } from "../manusScheduleAuth.js";
import { validateSocialBulkBatch } from "../socialBulkPolicy.js";
import { validateSocialMediaUpload } from "../socialMediaUploadPolicy.js";
import {
  cancelFacebookNativeSchedule,
  createMetaAuthorizationUrl,
  createMetaOAuthState,
  decryptSocialSecret,
  encryptSocialSecret,
  exchangeMetaAuthorizationCode,
  getMetaOAuthConfig,
  isMetaOAuthConfigured,
  listMetaPageCandidates,
  runScheduledSocialPublishing,
  scheduleFacebookForPost,
  verifyMetaOAuthState,
} from "../socialMetaService.js";
import {
  socialPostStatusForConnection,
  validateSocialPostDraft,
  type SocialPostDraftInput,
} from "../socialPublishingPolicy.js";
import {
  cancelSocialPostSql,
  createSocialPostSql,
  getSocialOAuthSessionSql,
  getSocialPostForProcessingSql,
  getSocialPublishingSettingsSql,
  listSocialMetaConnectionsSql,
  listSocialPostsSql,
  saveSocialOAuthSessionSql,
  updateSocialPostScheduleSql,
  updateSocialPublishingSettingsSql,
  upsertSocialMetaConnectionSql,
} from "../socialPublishingSql.js";
import { storagePut } from "../storage.js";

export const socialRouter = Router();

const socialMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

// ─── POST /api/scheduled/social-publish ─────────────────────────────────────
socialRouter.post("/scheduled/social-publish", async (req, res) => {
  let taskUid: string | undefined;
  try {
    taskUid = await authenticateScheduledTask(req);
    const settings = await getSocialPublishingSettingsSql();
    if (settings.scheduleCronTaskUid && settings.scheduleCronTaskUid !== taskUid) {
      res.status(403).json({ error: "Tarefa agendada não autorizada" });
      return;
    }
    if (!settings.scheduleCronTaskUid) {
      await updateSocialPublishingSettingsSql({
        scheduleCronTaskUid: taskUid,
        schedulerStatus: "active",
      });
    }
    res.json({ ok: true, summary: await runScheduledSocialPublishing() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[social] Falha no processador agendado:", message);
    res.status(message.includes("autorizado") ? 403 : 500).json({
      error: message,
      context: { path: req.path, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── GET /api/social/overview ───────────────────────────────────────────────
socialRouter.get("/social/overview", requireAuth, requireSupabaseAdmin, async (req, res) => {
  try {
    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (catalog.error) {
      res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
      return;
    }
    const [connections, posts, scheduler] = await Promise.all([
      listSocialMetaConnectionsSql(req.claims!.id),
      listSocialPostsSql(req.claims!.id),
      getSocialPublishingSettingsSql(),
    ]);
    res.json({
      units: catalog.clients,
      connections,
      posts,
      scheduler: { status: scheduler.schedulerStatus, taskUid: scheduler.scheduleCronTaskUid },
      metaConfigured: isMetaOAuthConfigured(),
    });
  } catch (error) {
    console.error("[social] Falha ao carregar calendário:", error);
    res.status(503).json({ error: "Não foi possível carregar o calendário social" });
  }
});

// ─── GET /api/social/meta/connect ───────────────────────────────────────────
socialRouter.get("/social/meta/connect", requireAuth, requireSupabaseAdmin, async (req, res) => {
  try {
    const config = getMetaOAuthConfig();
    res.json({
      authorizationUrl: createMetaAuthorizationUrl(config, createMetaOAuthState(req.claims!.id)),
    });
  } catch (error) {
    res.status(409).json({
      error: error instanceof Error ? error.message : "A conexão Meta não está disponível",
    });
  }
});

// ─── GET /api/social/meta/callback ──────────────────────────────────────────
socialRouter.get("/social/meta/callback", async (req, res) => {
  const {
    state,
    code,
    error: oauthError,
    error_description: errorDescription,
  } = req.query as {
    state?: string;
    code?: string;
    error?: string;
    error_description?: string;
  };
  const verified = state ? verifyMetaOAuthState(state) : null;
  if (!verified) {
    res
      .status(400)
      .send("A autorização Meta expirou ou não é válida. Volte à Central de Publicações e tente novamente.");
    return;
  }
  if (oauthError || !code) {
    res.redirect(
      `/publicacoes?meta_error=${encodeURIComponent(errorDescription || oauthError || "Autorização cancelada")}`,
    );
    return;
  }
  try {
    const config = getMetaOAuthConfig();
    const candidates = await listMetaPageCandidates(await exchangeMetaAuthorizationCode(config, code));
    const sessionId = crypto.randomUUID();
    await saveSocialOAuthSessionSql({
      id: sessionId,
      ownerUserId: verified.ownerUserId,
      candidatesEncrypted: encryptSocialSecret(JSON.stringify(candidates)),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    res.redirect(`/publicacoes?meta_session=${encodeURIComponent(sessionId)}`);
  } catch (error) {
    console.error("[social] Falha no callback Meta:", error);
    res.redirect(
      `/publicacoes?meta_error=${encodeURIComponent("Não foi possível ler as páginas autorizadas pela Meta")}`,
    );
  }
});

// ─── GET /api/social/meta/candidates/:sessionId ─────────────────────────────
socialRouter.get("/social/meta/candidates/:sessionId", requireAuth, requireSupabaseAdmin, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.sessionId)) {
    res.status(400).json({ error: "Sessão de conexão inválida" });
    return;
  }
  try {
    const session = await getSocialOAuthSessionSql(req.params.sessionId, req.claims!.id);
    if (!session) {
      res.status(404).json({ error: "A sessão de conexão expirou. Conecte a Meta novamente." });
      return;
    }
    const candidates = JSON.parse(decryptSocialSecret(session.candidatesEncrypted)) as Array<{
      facebookPageId: string;
      facebookPageName: string;
      instagramAccountId: string | null;
      instagramUsername: string | null;
    }>;
    res.json({ candidates, expiresAt: session.expiresAt });
  } catch {
    res.status(503).json({ error: "Não foi possível carregar as páginas Meta autorizadas" });
  }
});

// ─── POST /api/social/meta/connections ──────────────────────────────────────
socialRouter.post("/social/meta/connections", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const body = req.body as { sessionId?: string; facebookPageId?: string; unitId?: string };
  if (!body.sessionId || !body.facebookPageId) {
    res.status(400).json({ error: "Selecione uma Página Meta e uma unidade" });
    return;
  }
  try {
    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (catalog.error) {
      res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
      return;
    }
    const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
    if (!unit) {
      res.status(403).json({ error: "A conta Meta só pode ser associada a uma unidade autorizada" });
      return;
    }
    const session = await getSocialOAuthSessionSql(body.sessionId, req.claims!.id);
    if (!session) {
      res.status(404).json({ error: "A sessão de conexão expirou. Conecte a Meta novamente." });
      return;
    }
    const candidates = JSON.parse(decryptSocialSecret(session.candidatesEncrypted)) as Array<{
      facebookPageId: string;
      facebookPageName: string;
      instagramAccountId: string | null;
      instagramUsername: string | null;
      pageAccessToken: string;
    }>;
    const candidate = candidates.find((item) => item.facebookPageId === body.facebookPageId);
    if (!candidate) {
      res.status(403).json({ error: "A Página selecionada não pertence à autorização Meta atual" });
      return;
    }
    await upsertSocialMetaConnectionSql({
      id: crypto.randomUUID(),
      ownerUserId: req.claims!.id,
      unitId: unit.id,
      unitName: unit.name,
      facebookPageId: candidate.facebookPageId,
      facebookPageName: candidate.facebookPageName,
      instagramAccountId: candidate.instagramAccountId,
      instagramUsername: candidate.instagramUsername,
      accessTokenEncrypted: encryptSocialSecret(candidate.pageAccessToken),
      grantedScopes:
        "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("[social] Falha ao salvar conexão Meta:", error);
    res.status(503).json({ error: "Não foi possível salvar a conexão Meta" });
  }
});

// ─── POST /api/social/media ─────────────────────────────────────────────────
socialRouter.post(
  "/social/media",
  requireAuth,
  requireSupabaseAdmin,
  (req, res, next) =>
    socialMediaUpload.single("file")(req, res, (error) =>
      error ? res.status(400).json({ error: "Envie um único arquivo de até 50 MB" }) : next(),
    ),
  async (req, res) => {
    const validation = validateSocialMediaUpload(req.file);
    if (typeof validation === "string") {
      res.status(400).json({ error: validation });
      return;
    }
    try {
      const stored = await storagePut(
        `social-media/${req.claims!.id}/${crypto.randomUUID()}.${validation.extension}`,
        req.file!.buffer,
        req.file!.mimetype,
      );
      res.status(201).json({ url: `https://www.trafego.pro${stored.url}`, mediaType: validation.mediaType });
    } catch (error) {
      console.error("[social] Falha no upload de mídia:", error);
      res.status(503).json({ error: "Não foi possível armazenar a mídia selecionada" });
    }
  },
);

// ─── POST /api/social/posts/batch ───────────────────────────────────────────
socialRouter.post("/social/posts/batch", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const body = req.body as {
    items?: Array<Partial<SocialPostDraftInput> & { localId?: string; unitId?: string; connectionId?: string | null }>;
  };
  const items = Array.isArray(body.items) ? body.items : [];
  const batchError = validateSocialBulkBatch(items);
  if (batchError) {
    res.status(400).json({ error: batchError });
    return;
  }
  try {
    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (catalog.error) {
      res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
      return;
    }
    const connections = await listSocialMetaConnectionsSql(req.claims!.id);
    const created = [];
    for (const raw of items) {
      const unit = resolveAuthorizedEvolutionUnit(raw.unitId, catalog.clients);
      if (!unit) {
        res.status(403).json({ error: "Todas as publicações do lote devem pertencer a unidades autorizadas" });
        return;
      }
      const connection = raw.connectionId
        ? connections.find(
            (item) => item.id === raw.connectionId && item.unitId === unit.id && item.connectionStatus === "active",
          ) ?? null
        : null;
      if (raw.connectionId && !connection) {
        res.status(403).json({ error: "A conta Meta selecionada não está ativa para esta unidade" });
        return;
      }
      const wantsSchedule = Boolean(raw.scheduledFor);
      const post = await createSocialPostSql({
        ownerUserId: req.claims!.id,
        clientBatchKey:
          typeof raw.localId === "string" && /^[0-9a-f-]{36}$/i.test(raw.localId) ? raw.localId : null,
        unitId: unit.id,
        unitName: unit.name,
        socialConnectionId: connection?.id ?? null,
        title: raw.title!.trim(),
        caption: raw.caption!.trim(),
        linkUrl: raw.linkUrl?.trim() || null,
        contentFormat: raw.contentFormat!,
        targetFacebook: raw.targetFacebook === true,
        targetInstagram: raw.targetInstagram === true,
        status: socialPostStatusForConnection(connection?.id ?? null, wantsSchedule),
        scheduledFor: raw.scheduledFor ?? null,
        media: raw.media ?? [],
      });
      if (post.targetFacebook && connection && wantsSchedule) {
        const due = await getSocialPostForProcessingSql(post.id);
        if (due) await scheduleFacebookForPost(due);
      }
      created.push(post);
    }
    const allPosts = await listSocialPostsSql(req.claims!.id);
    res.status(201).json({
      posts: created.map((item) => allPosts.find((candidate) => candidate.id === item.id) ?? item),
    });
  } catch (error) {
    console.error("[social] Falha ao criar lote:", error);
    res.status(503).json({ error: "Não foi possível salvar o lote de publicações" });
  }
});

// ─── POST /api/social/posts ─────────────────────────────────────────────────
socialRouter.post("/social/posts", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const body = req.body as Partial<SocialPostDraftInput> & {
    localId?: string;
    unitId?: string;
    connectionId?: string | null;
  };
  const draft: SocialPostDraftInput = {
    title: typeof body.title === "string" ? body.title : "",
    caption: typeof body.caption === "string" ? body.caption : "",
    linkUrl: typeof body.linkUrl === "string" ? body.linkUrl : undefined,
    contentFormat: (body.contentFormat ?? "image") as SocialPostDraftInput["contentFormat"],
    targetFacebook: body.targetFacebook === true,
    targetInstagram: body.targetInstagram === true,
    scheduledFor: typeof body.scheduledFor === "string" ? body.scheduledFor : undefined,
    media: Array.isArray(body.media) ? (body.media as SocialPostDraftInput["media"]) : [],
  };
  const validation = validateSocialPostDraft(draft);
  if (validation) {
    res.status(400).json({ error: validation });
    return;
  }
  try {
    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (catalog.error) {
      res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
      return;
    }
    const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
    if (!unit) {
      res.status(403).json({ error: "A publicação só pode ser vinculada a uma unidade autorizada" });
      return;
    }
    const connections = await listSocialMetaConnectionsSql(req.claims!.id);
    const connection = body.connectionId
      ? connections.find(
          (item) => item.id === body.connectionId && item.unitId === unit.id && item.connectionStatus === "active",
        ) ?? null
      : null;
    if (body.connectionId && !connection) {
      res.status(403).json({ error: "A conta Meta selecionada não está ativa para esta unidade" });
      return;
    }
    const wantsSchedule = Boolean(draft.scheduledFor);
    const post = await createSocialPostSql({
      ownerUserId: req.claims!.id,
      clientBatchKey:
        typeof body.localId === "string" && /^[0-9a-f-]{36}$/i.test(body.localId) ? body.localId : null,
      unitId: unit.id,
      unitName: unit.name,
      socialConnectionId: connection?.id ?? null,
      title: draft.title!.trim(),
      caption: draft.caption!.trim(),
      linkUrl: draft.linkUrl?.trim() || null,
      contentFormat: draft.contentFormat!,
      targetFacebook: draft.targetFacebook!,
      targetInstagram: draft.targetInstagram!,
      status: socialPostStatusForConnection(connection?.id ?? null, wantsSchedule),
      scheduledFor: draft.scheduledFor ?? null,
      media: draft.media!,
    });
    if (post.targetFacebook && connection && wantsSchedule) {
      const due = await getSocialPostForProcessingSql(post.id);
      if (due) await scheduleFacebookForPost(due);
    }
    res.status(201).json({
      post: (await listSocialPostsSql(req.claims!.id)).find((item) => item.id === post.id) ?? post,
    });
  } catch (error) {
    console.error("[social] Falha ao criar publicação:", error);
    res.status(503).json({ error: "Não foi possível salvar a publicação" });
  }
});

// ─── PATCH /api/social/posts/:id ────────────────────────────────────────────
socialRouter.patch("/social/posts/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const scheduledFor = typeof req.body?.scheduledFor === "string" ? req.body.scheduledFor : "";
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || Number.isNaN(new Date(scheduledFor).getTime())) {
    res.status(400).json({ error: "Agendamento inválido" });
    return;
  }
  const updated = await updateSocialPostScheduleSql(req.claims!.id, req.params.id, scheduledFor);
  if (!updated) {
    res.status(409).json({ error: "Este item não pode mais ser editado" });
    return;
  }
  res.json({ ok: true });
});

// ─── DELETE /api/social/posts/:id ───────────────────────────────────────────
socialRouter.delete("/social/posts/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "Publicação inválida" });
    return;
  }
  const post = await getSocialPostForProcessingSql(req.params.id);
  if (post?.facebookPostId) {
    try {
      await cancelFacebookNativeSchedule(post);
    } catch (error) {
      res.status(409).json({
        error: error instanceof Error ? error.message : "Não foi possível cancelar o agendamento no Facebook",
      });
      return;
    }
  }
  const cancelled = await cancelSocialPostSql(req.claims!.id, req.params.id);
  if (!cancelled) {
    res.status(409).json({ error: "Este item não pode mais ser excluído" });
    return;
  }
  res.json({ ok: true });
});
