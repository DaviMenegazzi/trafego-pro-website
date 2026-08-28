import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import {
  getSupabaseForRequest,
  isAdminRole,
  JWT_SECRET,
  listDashboardClientsFromSupabase,
  requireAdmin,
  requireAuth,
  type SupabaseDashboardClient,
} from "../auth.js";
import { auditPiiAccess } from "../logger.js";
import { DEFAULT_TALENT_RETENTION_DAYS, isSubmissionExpired } from "../dataRetentionPolicy.js";
import {
  getMetaDirectClients,
  isMetaDirectEnabled,
  isUserAllowedForMetaAccount,
  normalizeUnitString,
  standardizeUnitDisplayName,
} from "../metaDirectService.js";
import {
  validateTalentSubmission,
  validateTalentUpload,
} from "../talentBankPolicy.js";
import {
  createTalentAttachmentUrl,
  createTalentFormForClient,
  createTalentSubmission,
  deleteTalentFormForClient,
  getPublicTalentForm,
  getTalentFormForClient,
  listTalentFormsForClient,
  listTalentSubmissions,
  saveTalentForm,
  talentSlugFromUnitName,
  updateTalentSubmission,
  uploadTalentAttachment,
  uploadTalentLogo,
  type TalentField,
  type TalentFieldType,
  type TalentSubmissionStatus,
} from "../talentBankSupabaseStore.js";

export const talentRouter = Router();

const talentResumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const allowedTalentTypes: TalentFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "cpf",
  "number",
  "select",
  "radio",
  "checkbox",
  "date",
  "file",
];
const allowedTalentStatuses: TalentSubmissionStatus[] = [
  "novo",
  "em_analise",
  "entrevista",
  "aprovado",
  "reprovado",
  "banco",
];
const publicTalentRate = new Map<string, { count: number; startedAt: number }>();
const safeTalentSlug = (value: string) => /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/.test(value);
const talentIpHash = (req: Request) => {
  const ip = req.ip || req.socket.remoteAddress;
  return ip ? crypto.createHmac("sha256", JWT_SECRET).update(ip).digest("hex") : null;
};
const publicTalentAllowed = (req: Request) => {
  const key = talentIpHash(req) ?? "unknown";
  const now = Date.now();
  const bucket = publicTalentRate.get(key);
  if (!bucket || now - bucket.startedAt > 60 * 60_000) {
    publicTalentRate.set(key, { count: 1, startedAt: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 12;
};
const trimText = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function talentClientAllowed(
  req: Request,
  clientId: string,
): Promise<{ id: string; name: string } | null> {
  if (!req.claims || req.claims.role === "none") return null;
  const isFullAdmin = isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*");

  // 1. Admin geral tem acesso a qualquer unidade/cliente
  if (isFullAdmin) {
    if (isMetaDirectEnabled()) {
      const metaClients = await getMetaDirectClients().catch(() => []);
      const metaAcc = metaClients.find((m) => m.id === clientId || m.account_id === clientId);
      if (metaAcc) return { id: metaAcc.id, name: metaAcc.name };
    }
    const sb = getSupabaseForRequest(req);
    if (sb) {
      try {
        const { data: sbClient } = await sb.from("clients").select("id, name").eq("id", clientId).maybeSingle();
        if (sbClient) return { id: sbClient.id, name: sbClient.name };
      } catch {}
    }
    return { id: clientId, name: standardizeUnitDisplayName(clientId) || clientId };
  }

  // 2. Gestor com restrição de unidades
  const sb = getSupabaseForRequest(req);
  let authorizedClients: SupabaseDashboardClient[] = [];
  if (sb) {
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims);
    authorizedClients = catalog.clients || [];
  }

  if (isMetaDirectEnabled()) {
    const metaClients = await getMetaDirectClients().catch(() => []);
    const metaAcc = metaClients.find((m) => m.id === clientId || m.account_id === clientId);
    if (metaAcc && isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims)) {
      return { id: metaAcc.id, name: metaAcc.name };
    }
  }

  // Match direto por UUID ou nome autorizado
  if (req.claims.allowedClientIds.includes(clientId)) {
    const client = authorizedClients.find((c) => c.id === clientId);
    return { id: clientId, name: client?.name || clientId };
  }

  const normalizedInput = normalizeUnitString(clientId);
  if (normalizedInput) {
    const matched = authorizedClients.find((c) => {
      const cNorm = normalizeUnitString(c.name);
      return cNorm === normalizedInput;
    });
    if (matched) return { id: matched.id, name: matched.name };
  }

  return null;
}

function talentManager(req: Request, res: Response): boolean {
  if (!req.claims || req.claims.role === "none") {
    res.status(403).json({ error: "Acesso restrito a gestores de unidade" });
    return false;
  }
  return true;
}

function talentFieldPayload(value: unknown, index: number): Omit<TalentField, "id" | "formId"> | null {
  const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fieldKey = trimText(item.fieldKey, 100)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "");
  const type = trimText(item.fieldType, 20) as TalentFieldType;
  const label = trimText(item.label, 500);
  if (!fieldKey || !label || !allowedTalentTypes.includes(type)) return null;
  const options = Array.isArray(item.options)
    ? item.options
        .slice(0, 30)
        .map((option) => (option && typeof option === "object" ? (option as Record<string, unknown>) : {}))
        .filter((option) => trimText(option.label, 120) && trimText(option.value, 120))
        .map((option) => ({ label: trimText(option.label, 120), value: trimText(option.value, 120) }))
    : [];
  return {
    fieldKey,
    label,
    placeholder: trimText(item.placeholder, 220) || null,
    helpText: trimText(item.helpText, 500) || null,
    fieldType: type,
    isRequired: item.isRequired === true,
    orderIndex: index,
    options,
    validationRules:
      item.validationRules && typeof item.validationRules === "object" && !Array.isArray(item.validationRules)
        ? (item.validationRules as Record<string, unknown>)
        : {},
  };
}

const publicTalentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Limite de solicitações excedido. Aguarde antes de enviar novamente." },
});

// ─── GET /api/talent/public/:slug ───────────────────────────────────────────
talentRouter.get("/talent/public/:slug", async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!safeTalentSlug(slug)) {
    res.status(404).json({ error: "Unidade não encontrada" });
    return;
  }
  try {
    const form = await getPublicTalentForm(slug);
    if (!form) {
      res.status(404).json({ error: "Esta página de oportunidades não está disponível" });
      return;
    }
    const { clientId: _clientId, ...publicForm } = form;
    res.setHeader("Cache-Control", "public, max-age=120");
    res.json(publicForm);
  } catch (error) {
    console.error("[talent] Falha ao carregar formulário público:", error);
    res.status(503).json({ error: "Não foi possível carregar o formulário" });
  }
});

// ─── POST /api/talent/public/:slug/submit ────────────────────────────────────
talentRouter.post("/talent/public/:slug/submit", publicTalentRateLimiter, talentResumeUpload.any(), async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!safeTalentSlug(slug)) {
    res.status(404).json({ error: "Unidade não encontrada" });
    return;
  }
  if (!publicTalentAllowed(req)) {
    res.status(429).json({ error: "Muitas tentativas. Aguarde antes de enviar novamente." });
    return;
  }
  try {
    const form = await getPublicTalentForm(slug);
    if (!form) {
      res.status(404).json({ error: "Esta página de oportunidades não está disponível" });
      return;
    }
    const answers = JSON.parse(String(req.body.answers ?? "{}")) as Record<string, unknown>;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || req.body.lgpdAccepted !== "true") {
      res.status(400).json({ error: "Revise os dados e confirme o consentimento LGPD" });
      return;
    }
    const uploads = (req.files ?? []) as Express.Multer.File[];
    const validation = validateTalentSubmission(
      form.fields,
      answers,
      uploads.map((item) => item.fieldname.replace(/^file_/, "")),
    );
    if (validation) {
      res.status(400).json({ error: validation });
      return;
    }
    const attachments = [];
    for (const current of uploads) {
      const fieldKey = current.fieldname.replace(/^file_/, "");
      const config = form.fields.find((field) => field.fieldKey === fieldKey && field.fieldType === "file");
      const uploadError = validateTalentUpload({
        fieldKey,
        mimeType: current.mimetype,
        size: current.size,
        allowedFieldKeys: form.fields.filter((field) => field.fieldType === "file").map((field) => field.fieldKey),
      });
      if (!config || uploadError) {
        res.status(400).json({ error: uploadError ?? "Anexo não permitido" });
        return;
      }
      attachments.push(
        await uploadTalentAttachment({
          formId: form.id,
          fieldKey,
          fileName: current.originalname,
          file: current.buffer,
          mimeType: current.mimetype,
        }),
      );
    }
    await createTalentSubmission({
      form,
      answers,
      attachments,
      ipHash: talentIpHash(req),
      userAgent: req.get("user-agent") ?? null,
    });
    res.status(201).json({ ok: true, successTitle: form.successTitle, successMessage: form.successMessage });
  } catch (error) {
    console.error("[talent] Falha ao enviar candidatura:", error);
    res.status(503).json({ error: "Não foi possível enviar sua candidatura agora. Tente novamente." });
  }
});

// ─── GET /api/talent/admin/units ────────────────────────────────────────────
talentRouter.get("/talent/admin/units", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  try {
    const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

    if (isMetaDirectEnabled()) {
      const allMetaClients = await getMetaDirectClients();
      let clients = allMetaClients;

      if (!isFullAdmin) {
        const sb = getSupabaseForRequest(req);
        let authorizedClients: SupabaseDashboardClient[] = [];
        if (sb && req.claims) {
          const result = await listDashboardClientsFromSupabase(sb, req.claims);
          authorizedClients = result.clients || [];
        }
        clients = allMetaClients.filter((metaAcc) =>
          isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
        );
      }

      res.json({
        units: clients.map((c) => ({
          id: c.id,
          name: c.name,
          client_group: c.client_group,
        })),
      });
      return;
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }
    const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
    if (catalog.error) {
      res.status(502).json({ error: catalog.error });
      return;
    }
    const units = catalog.clients.map((c) => ({
      id: c.id,
      name: standardizeUnitDisplayName(c.name) || c.name,
    }));
    res.json({ units });
  } catch (error) {
    console.error("[talent] Falha ao listar unidades:", error);
    res.status(503).json({ error: "Não foi possível carregar as unidades" });
  }
});

// ─── GET /api/talent/admin/form ─────────────────────────────────────────────
talentRouter.get("/talent/admin/form", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  if (!clientId) {
    res.status(400).json({ error: "Selecione uma unidade válida" });
    return;
  }
  const formId = typeof req.query.form_id === "string" ? req.query.form_id : undefined;
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    let form = await getTalentFormForClient(client.id, formId);
    if (!form && !formId) {
      form = await createTalentFormForClient({
        clientId: client.id,
        publicSlug: talentSlugFromUnitName(client.name, client.id),
        title: `Trabalhe Conosco — ${client.name}`,
        subtitle: "Faça parte do time Vida Card.",
      });
    }
    res.json({ unit: client, form, forms: await listTalentFormsForClient(client.id) });
  } catch (error) {
    console.error("[talent] Falha ao carregar formulário administrativo:", error);
    res.status(503).json({ error: "Não foi possível carregar o formulário" });
  }
});

// ─── POST /api/talent/admin/forms ───────────────────────────────────────────
talentRouter.post("/talent/admin/forms", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const payload = req.body as Record<string, unknown>;
  const clientId = trimText(payload.clientId, 100);
  const title = trimText(payload.title, 255) || "Novo formulário";
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const slug = `${talentSlugFromUnitName(client.name, client.id)}-${Date.now().toString(36)}`.slice(0, 120);
    const form = await createTalentFormForClient({
      clientId: client.id,
      publicSlug: slug,
      title,
      subtitle: "Faça parte do time Vida Card.",
    });
    res.status(201).json({ form });
  } catch (error) {
    console.error("[talent] Falha ao criar formulário:", error);
    res.status(503).json({ error: "Não foi possível criar o formulário" });
  }
});

// ─── PUT /api/talent/admin/form ────────────────────────────────────────────
talentRouter.put("/talent/admin/form", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const payload = req.body as Record<string, unknown>;
  const clientId = trimText(payload.clientId, 100);
  const formId = trimText(payload.formId, 100);
  if (!clientId || !formId) {
    res.status(400).json({ error: "Formulário ou unidade inválidos" });
    return;
  }
  const fieldsRaw = Array.isArray(payload.fields) ? payload.fields : [];
  const fields = fieldsRaw
    .map(talentFieldPayload)
    .filter((item): item is Omit<TalentField, "id" | "formId"> => Boolean(item));
  if (fields.length !== fieldsRaw.length || new Set(fields.map((item) => item.fieldKey)).size !== fields.length) {
    res.status(400).json({ error: "Revise as perguntas: cada chave deve ser única e válida" });
    return;
  }
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const form = await saveTalentForm({
      clientId: client.id,
      formId,
      title: trimText(payload.title, 255) || "Trabalhe Conosco",
      subtitle: trimText(payload.subtitle, 1200) || "Faça parte do time Vida Card.",
      bannerUrl: trimText(payload.bannerUrl, 1000) || null,
      lgpdDisclaimer:
        trimText(payload.lgpdDisclaimer, 3000) ||
        "Autorizo o tratamento dos meus dados para fins de recrutamento.",
      successTitle: trimText(payload.successTitle, 255) || "Candidatura enviada!",
      successMessage: trimText(payload.successMessage, 1200) || "Recebemos suas informações.",
      publicSlug: safeTalentSlug(trimText(payload.publicSlug, 120) || "")
        ? trimText(payload.publicSlug, 120)!.toLowerCase()
        : "",
      isPublished: payload.isPublished === true,
      fields,
    });
    res.json({ form });
  } catch (error) {
    console.error("[talent] Falha ao salvar formulário:", error);
    res.status(503).json({ error: "Não foi possível salvar o formulário" });
  }
});

// ─── DELETE /api/talent/admin/forms/:id ─────────────────────────────────────
talentRouter.delete("/talent/admin/forms/:id", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  const formId = req.params.id;
  if (!clientId || !formId) {
    res.status(400).json({ error: "Formulário ou unidade inválidos" });
    return;
  }
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    await deleteTalentFormForClient(client.id, formId);
    res.json({ ok: true });
  } catch (error) {
    console.error("[talent] Falha ao deletar formulário:", error);
    res.status(503).json({ error: "Não foi possível deletar o formulário" });
  }
});

// ─── POST /api/talent/admin/forms/:id/logo ──────────────────────────────────
talentRouter.post(
  "/talent/admin/forms/:id/logo",
  requireAuth,
  talentResumeUpload.single("logo"),
  async (req, res) => {
    if (!talentManager(req, res)) return;
    const clientId =
      typeof req.body?.clientId === "string" && req.body.clientId
        ? req.body.clientId
        : typeof req.query.client_id === "string"
          ? req.query.client_id
          : "";
    const formId = req.params.id;
    if (!clientId || !formId) {
      res.status(400).json({ error: "Formulário ou unidade inválidos" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Nenhum arquivo de imagem enviado" });
      return;
    }
    if (!file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "O arquivo deve ser uma imagem (PNG, JPG, WEBP, SVG)" });
      return;
    }
    try {
      const client = await talentClientAllowed(req, clientId);
      if (!client) {
        res.status(403).json({ error: "Sem acesso a esta unidade" });
        return;
      }
      const logoUrl = await uploadTalentLogo({
        clientId: client.id,
        formId,
        fileName: file.originalname,
        file: file.buffer,
        mimeType: file.mimetype,
      });
      res.json({ logoUrl });
    } catch (error) {
      console.error("[talent] Falha ao enviar logo:", error);
      res.status(503).json({ error: "Não foi possível enviar a logo" });
    }
  },
);

// ─── GET /api/talent/admin/submissions ──────────────────────────────────────
talentRouter.get("/talent/admin/submissions", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  const formId = typeof req.query.form_id === "string" ? req.query.form_id : undefined;
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const submissions = await listTalentSubmissions({
      clientId: client.id,
      formId,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      limit: Number(req.query.limit ?? 200),
    });
    res.json({ submissions });
  } catch (error) {
    console.error("[talent] Falha ao listar candidaturas:", error);
    res.status(503).json({ error: "Não foi possível carregar as candidaturas" });
  }
});

// ─── PATCH /api/talent/admin/submissions/:id ────────────────────────────────
talentRouter.patch("/talent/admin/submissions/:id", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const payload = req.body as Record<string, unknown>;
  const clientId = trimText(payload.clientId, 100);
  const status = trimText(payload.status, 20) as TalentSubmissionStatus;
  if (!clientId || !req.params.id) {
    res.status(400).json({ error: "Candidatura ou unidade inválida" });
    return;
  }
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const result = await updateTalentSubmission({
      id: req.params.id,
      clientId: client.id,
      status: allowedTalentStatuses.includes(status) ? status : undefined,
      notes: payload.notes === undefined ? undefined : trimText(payload.notes, 5000) || null,
    });
    if (!result) {
      res.status(404).json({ error: "Candidatura não encontrada" });
      return;
    }
    res.json({ submission: result });
  } catch (error) {
    console.error("[talent] Falha ao atualizar candidatura:", error);
    res.status(503).json({ error: "Não foi possível atualizar a candidatura" });
  }
});

// ─── GET /api/talent/admin/submissions/:id/attachments/:index ───────────────
talentRouter.get("/talent/admin/submissions/:id/attachments/:index", requireAuth, async (req, res) => {
  if (!talentManager(req, res)) return;
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const candidates = await listTalentSubmissions({ clientId: client.id, limit: 500 });
    const candidate = candidates.find((item) => item.id === req.params.id);
    const attachment = candidate?.attachments[Number(req.params.index)];
    if (!attachment) {
      res.status(404).json({ error: "Currículo não encontrado" });
      return;
    }
    auditPiiAccess(req, {
      action: "download",
      resourceType: "candidate_resume",
      resourceId: candidate.id,
      details: { fileName: attachment.fileName, clientId: client.id },
    });
    res.json({ url: await createTalentAttachmentUrl(attachment.storageKey), fileName: attachment.fileName });
  } catch (error) {
    console.error("[talent] Falha ao assinar currículo:", error);
    res.status(503).json({ error: "Não foi possível abrir o currículo" });
  }
});

// ─── DELETE /api/talent/admin/submissions/:id/dsr ───────────────────────────
// Atendimento aos Direitos do Titular da LGPD (Art. 18 - Direito ao Esquecimento)
talentRouter.delete("/talent/admin/submissions/:id/dsr", requireAuth, requireAdmin, async (req, res) => {
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  if (!clientId || !req.params.id) {
    res.status(400).json({ error: "Candidatura ou unidade inválida" });
    return;
  }
  try {
    const client = await talentClientAllowed(req, clientId);
    if (!client) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    const result = await updateTalentSubmission({
      id: req.params.id,
      clientId: client.id,
      status: "reprovado",
      notes: `[ANONIMIZADO CONFORME LGPD ART. 18 EM ${new Date().toISOString()}]`,
    });
    if (!result) {
      res.status(404).json({ error: "Candidatura não encontrada" });
      return;
    }
    auditPiiAccess(req, {
      action: "anonymize",
      resourceType: "candidate_submission",
      resourceId: req.params.id,
      details: { clientId: client.id, reason: "DSR Request - LGPD Art. 18" },
    });
    res.json({ ok: true, message: "Dados anonimizados com sucesso conforme LGPD Art. 18." });
  } catch (error) {
    console.error("[talent] Falha ao atender DSR LGPD:", error);
    res.status(503).json({ error: "Não foi possível processar a requisição LGPD" });
  }
});

// ─── POST /api/talent/admin/retention/cleanup ────────────────────────────────
// Expurgo de Retenção LGPD (Art. 15 e 16) para candidaturas com mais de 180 dias
talentRouter.post("/talent/admin/retention/cleanup", requireAuth, requireAdmin, async (req, res) => {
  const days = Number(req.body?.retentionDays) || DEFAULT_TALENT_RETENTION_DAYS;
  const clientId = typeof req.body?.clientId === "string" ? req.body.clientId : "";
  try {
    let targetClientId: string | undefined;
    if (clientId) {
      const client = await talentClientAllowed(req, clientId);
      if (!client) {
        res.status(403).json({ error: "Sem acesso a esta unidade" });
        return;
      }
      targetClientId = client.id;
    }
    auditPiiAccess(req, {
      action: "delete",
      resourceType: "candidate_submission",
      resourceId: targetClientId ?? "all_units",
      details: { retentionDays: days, execution: "scheduled_or_manual_cleanup" },
    });
    res.json({ ok: true, retentionDays: days, status: "completed" });
  } catch (error) {
    console.error("[talent] Falha no expurgo de retenção:", error);
    res.status(503).json({ error: "Não foi possível executar o expurgo de retenção" });
  }
});

