import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export type TalentFieldType = "text" | "textarea" | "email" | "phone" | "cpf" | "number" | "select" | "radio" | "checkbox" | "date" | "file";
export type TalentSubmissionStatus = "novo" | "em_analise" | "entrevista" | "aprovado" | "reprovado" | "banco";
export type TalentFieldOption = { label: string; value: string };
export type TalentField = { id: string; formId: string; fieldKey: string; label: string; placeholder: string | null; helpText: string | null; fieldType: TalentFieldType; isRequired: boolean; orderIndex: number; options: TalentFieldOption[]; validationRules: Record<string, unknown> };
export type TalentForm = { id: string; clientId: string; publicSlug: string; title: string; subtitle: string; bannerUrl: string | null; lgpdDisclaimer: string; successTitle: string; successMessage: string; isPublished: boolean; fields: TalentField[]; candidateCount?: number };
export type TalentAttachment = { fieldKey: string; fileName: string; storageKey: string; fileSize: number; mimeType: string };
export type TalentSubmission = { id: string; formId: string; clientId: string; candidateName: string | null; candidateEmail: string | null; candidatePhone: string | null; answers: Record<string, unknown>; attachments: TalentAttachment[]; status: TalentSubmissionStatus; notes: string | null; createdAt: string; updatedAt: string };

let client: SupabaseClient | null = null;
function getTalentSupabase(): SupabaseClient {
  const url = process.env.EVOLUTION_SUPABASE_URL;
  const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase de recrutamento não configurado");
  if (!client) client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const allowedTypes: TalentFieldType[] = ["text", "textarea", "email", "phone", "cpf", "number", "select", "radio", "checkbox", "date", "file"];
const statuses: TalentSubmissionStatus[] = ["novo", "em_analise", "entrevista", "aprovado", "reprovado", "banco"];
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const asObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const iso = (value: unknown) => value ? new Date(String(value)).toISOString() : new Date(0).toISOString();
const field = (row: Record<string, unknown>): TalentField => ({ id: String(row.id), formId: String(row.form_id), fieldKey: String(row.field_key), label: String(row.label), placeholder: text(row.placeholder), helpText: text(row.help_text), fieldType: allowedTypes.includes(String(row.field_type) as TalentFieldType) ? String(row.field_type) as TalentFieldType : "text", isRequired: row.is_required === true, orderIndex: Number(row.order_index ?? 0), options: asArray(row.options).map((item) => asObject(item)).filter((item) => typeof item.label === "string" && typeof item.value === "string").map((item) => ({ label: String(item.label), value: String(item.value) })), validationRules: asObject(row.validation_rules) });
const attachment = (value: unknown): TalentAttachment | null => { const item = asObject(value); return typeof item.fieldKey === "string" && typeof item.fileName === "string" && typeof item.storageKey === "string" ? { fieldKey: item.fieldKey, fileName: item.fileName, storageKey: item.storageKey, fileSize: Number(item.fileSize ?? 0), mimeType: String(item.mimeType ?? "") } : null; };
function form(row: Record<string, unknown>, fields: TalentField[]): TalentForm { return { id: String(row.id), clientId: String(row.client_id), publicSlug: String(row.public_slug), title: String(row.title), subtitle: String(row.subtitle), bannerUrl: text(row.banner_url), lgpdDisclaimer: String(row.lgpd_disclaimer), successTitle: String(row.success_title), successMessage: String(row.success_message), isPublished: row.is_published === true, fields: [...fields].sort((a, b) => a.orderIndex - b.orderIndex) }; }
function submission(row: Record<string, unknown>): TalentSubmission { return { id: String(row.id), formId: String(row.form_id), clientId: String(row.client_id), candidateName: text(row.candidate_name), candidateEmail: text(row.candidate_email), candidatePhone: text(row.candidate_phone), answers: asObject(row.answers), attachments: asArray(row.file_attachments).map(attachment).filter((item): item is TalentAttachment => Boolean(item)), status: statuses.includes(String(row.status) as TalentSubmissionStatus) ? String(row.status) as TalentSubmissionStatus : "novo", notes: text(row.notes), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }; }

// ─── Conversão e Mapeamento para UUID no PostgreSQL ──────────────────────────
const KNOWN_UNIT_UUIDS: Record<string, string> = {
  // Canela
  "act_2498975800561890": "53467fc7-51f2-42d1-a2bc-ca0e88e5e217",
  "53467fc7-51f2-42d1-a2bc-ca0e88e5e217": "53467fc7-51f2-42d1-a2bc-ca0e88e5e217",
  // Júlio de Castilhos
  "act_282141710195066": "ca0b6c80-511a-4dab-a58b-26e902c53adf",
  "ca0b6c80-511a-4dab-a58b-26e902c53adf": "ca0b6c80-511a-4dab-a58b-26e902c53adf",
  // Ijuí
  "act_2853331541612919": "6bfbe75b-bcc5-49c7-b775-337c924d23fa",
  "6bfbe75b-bcc5-49c7-b775-337c924d23fa": "6bfbe75b-bcc5-49c7-b775-337c924d23fa",
  // Lajeado
  "act_1372787666543646": "835f3cf3-8a0b-4455-8613-85c3c529ffa7",
  "835f3cf3-8a0b-4455-8613-85c3c529ffa7": "835f3cf3-8a0b-4455-8613-85c3c529ffa7",
  // Tupanciretã
  "act_192733382826302": "a75275fa-2291-40ad-b4b7-d0e22992735c",
  "a75275fa-2291-40ad-b4b7-d0e22992735c": "a75275fa-2291-40ad-b4b7-d0e22992735c",
  // Itaqui
  "act_3662817983996981": "9bbf45f0-74f5-4023-ae26-277dc2eb4c07",
  "9bbf45f0-74f5-4023-ae26-277dc2eb4c07": "9bbf45f0-74f5-4023-ae26-277dc2eb4c07",
  // Caxias do Sul
  "act_827335518078085": "bb4fbefc-d056-4074-b9ca-827a95e7df40",
  "bb4fbefc-d056-4074-b9ca-827a95e7df40": "bb4fbefc-d056-4074-b9ca-827a95e7df40",
  // Belo Horizonte / Barreiro
  "act_343587184793003": "56ee53a7-a5dc-42cd-af4a-1a36e8a08de3",
  "56ee53a7-a5dc-42cd-af4a-1a36e8a08de3": "56ee53a7-a5dc-42cd-af4a-1a36e8a08de3",
  // Essencial
  "act_682248017129697": "95ec94f6-a8e6-4986-a767-278afd7050de",
  "95ec94f6-a8e6-4986-a767-278afd7050de": "95ec94f6-a8e6-4986-a767-278afd7050de",
};

export function toTalentClientUuid(clientId: string): string {
  if (KNOWN_UNIT_UUIDS[clientId]) return KNOWN_UNIT_UUIDS[clientId];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return clientId.toLowerCase();
  }
  const hash = crypto.createHash("sha1").update(`talent_client:${clientId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function talentSlugFromUnitName(name: string, clientId: string): string { const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 95) || "vida-card"; return `${base}-${clientId.slice(0, 8)}`; }

export async function getPublicTalentForm(slug: string): Promise<TalentForm | null> { const sb = getTalentSupabase(); const { data, error } = await sb.from("talent_forms").select("*, talent_form_fields(*)").eq("public_slug", slug).eq("is_published", true).maybeSingle(); if (error) throw new Error(error.message); if (!data) return null; const row = data as Record<string, unknown>; return form(row, asArray(row.talent_form_fields).map((item) => field(asObject(item)))); }

export async function listTalentFormsForClient(clientId: string): Promise<TalentForm[]> {
  const sb = getTalentSupabase();
  const uuid = toTalentClientUuid(clientId);
  const { data: formsData, error } = await sb
    .from("talent_forms")
    .select("*, talent_form_fields(*)")
    .eq("client_id", uuid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: subData } = await sb
    .from("talent_submissions")
    .select("form_id")
    .eq("client_id", uuid);
  const countMap: Record<string, number> = {};
  (subData || []).forEach((row) => {
    const fid = String((row as Record<string, unknown>).form_id);
    countMap[fid] = (countMap[fid] || 0) + 1;
  });

  return (formsData ?? []).map((value) => {
    const row = value as Record<string, unknown>;
    const f = form(row, asArray(row.talent_form_fields).map((item) => field(asObject(item))));
    f.candidateCount = countMap[f.id] || 0;
    return f;
  });
}

export async function getTalentFormForClient(clientId: string, formId?: string): Promise<TalentForm | null> {
  const sb = getTalentSupabase();
  const uuid = toTalentClientUuid(clientId);
  let query = sb.from("talent_forms").select("*, talent_form_fields(*)");
  if (formId) {
    query = query.eq("id", formId);
  } else {
    query = query.eq("client_id", uuid).order("created_at", { ascending: false }).limit(1);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const f = form(row, asArray(row.talent_form_fields).map((item) => field(asObject(item))));

  const { count } = await sb
    .from("talent_submissions")
    .select("*", { count: "exact", head: true })
    .eq("form_id", f.id);
  f.candidateCount = count ?? 0;
  return f;
}

export async function createTalentFormForClient(input: { clientId: string; publicSlug: string; title: string; subtitle: string }): Promise<TalentForm> {
  const sb = getTalentSupabase();
  const uuid = toTalentClientUuid(input.clientId);
  const { data, error } = await sb.from("talent_forms").insert({ client_id: uuid, public_slug: input.publicSlug, title: input.title, subtitle: input.subtitle }).select().single();
  if (error) throw new Error(error.message);
  return form(data as Record<string, unknown>, []);
}

export async function saveTalentForm(input: {
  clientId: string;
  formId: string;
  title: string;
  subtitle: string;
  bannerUrl: string | null;
  lgpdDisclaimer: string;
  successTitle: string;
  successMessage: string;
  publicSlug: string;
  isPublished: boolean;
  fields: Array<Omit<TalentField, "id" | "formId"> & { id?: string }>;
}): Promise<TalentForm> {
  const sb = getTalentSupabase();
  const uuid = toTalentClientUuid(input.clientId);
  const { error: formError } = await sb
    .from("talent_forms")
    .update({
      ...(input.publicSlug ? { public_slug: input.publicSlug } : {}),
      title: input.title,
      subtitle: input.subtitle,
      banner_url: input.bannerUrl,
      lgpd_disclaimer: input.lgpdDisclaimer,
      success_title: input.successTitle,
      success_message: input.successMessage,
      is_published: input.isPublished,
    })
    .eq("id", input.formId);
  if (formError) throw new Error(formError.message);
  const { error: deleteError } = await sb.from("talent_form_fields").delete().eq("form_id", input.formId);
  if (deleteError) throw new Error(deleteError.message);
  if (input.fields.length) {
    const rows = input.fields.map((item, index) => ({
      form_id: input.formId,
      field_key: item.fieldKey,
      label: item.label,
      placeholder: item.placeholder,
      help_text: item.helpText,
      field_type: item.fieldType,
      is_required: item.isRequired,
      order_index: index,
      options: item.options,
      validation_rules: item.validationRules,
    }));
    const { error } = await sb.from("talent_form_fields").insert(rows);
    if (error) throw new Error(error.message);
  }
  const saved = await getTalentFormForClient(uuid, input.formId);
  if (!saved) throw new Error("Formulário não encontrado após salvar");
  return saved;
}

export async function uploadTalentAttachment(input: { formId: string; fieldKey: string; fileName: string; file: Buffer; mimeType: string }): Promise<TalentAttachment> { const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120); const storageKey = `${input.formId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`; const { error } = await getTalentSupabase().storage.from("talent-resumes").upload(storageKey, input.file, { contentType: input.mimeType, upsert: false }); if (error) throw new Error(error.message); return { fieldKey: input.fieldKey, fileName: input.fileName.slice(0, 180), storageKey, fileSize: input.file.byteLength, mimeType: input.mimeType }; }

export async function createTalentSubmission(input: { form: TalentForm; answers: Record<string, unknown>; attachments: TalentAttachment[]; ipHash: string | null; userAgent: string | null }): Promise<TalentSubmission> {
  const byKey = input.answers;
  const fields = input.form.fields;

  // Smart resolution for Name
  const nameField = fields.find((item) => {
    const k = item.fieldKey.toLowerCase();
    const l = item.label.toLowerCase();
    return ["nome", "nome_completo", "name", "full_name", "candidato"].includes(k) ||
      k.includes("nome") || l.includes("nome");
  });
  const nameVal = nameField ? byKey[nameField.fieldKey] : undefined;

  // Smart resolution for Email
  const emailField = fields.find((item) => {
    const k = item.fieldKey.toLowerCase();
    return item.fieldType === "email" || ["email", "e_mail", "mail"].includes(k) || k.includes("email");
  });
  const emailVal = emailField ? byKey[emailField.fieldKey] : undefined;

  // Smart resolution for Phone
  const phoneField = fields.find((item) => {
    const k = item.fieldKey.toLowerCase();
    return item.fieldType === "phone" || ["telefone", "phone", "celular", "whatsapp", "contato"].includes(k) || k.includes("telefone") || k.includes("celular");
  });
  const phoneVal = phoneField ? byKey[phoneField.fieldKey] : undefined;

  const { data, error } = await getTalentSupabase().from("talent_submissions").insert({
    form_id: input.form.id,
    client_id: input.form.clientId,
    candidate_name: nameVal ? String(nameVal).slice(0, 255).trim() || null : null,
    candidate_email: emailVal ? String(emailVal).slice(0, 255).trim() || null : null,
    candidate_phone: phoneVal ? String(phoneVal).slice(0, 50).trim() || null : null,
    answers: input.answers,
    file_attachments: input.attachments,
    lgpd_accepted_at: new Date().toISOString(),
    ip_hash: input.ipHash,
    user_agent: input.userAgent?.slice(0, 1000) ?? null
  }).select().single();
  if (error) throw new Error(error.message);
  return submission(data as Record<string, unknown>);
}

export async function listTalentSubmissions(input: {
  clientId: string;
  formId?: string;
  search?: string;
  status?: string;
  limit?: number;
}): Promise<TalentSubmission[]> {
  const uuid = toTalentClientUuid(input.clientId);
  let query = getTalentSupabase()
    .from("talent_submissions")
    .select("*");
  
  if (input.formId) {
    query = query.eq("form_id", input.formId);
  } else {
    query = query.eq("client_id", uuid);
  }
  
  query = query
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(input.limit ?? 200, 1), 500));

  if (input.status && statuses.includes(input.status as TalentSubmissionStatus)) {
    query = query.eq("status", input.status);
  }
  if (input.search?.trim()) {
    const value = input.search.trim().replace(/[,%()]/g, " ");
    query = query.or(
      `candidate_name.ilike.%${value}%,candidate_email.ilike.%${value}%,candidate_phone.ilike.%${value}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => submission(row as Record<string, unknown>));
}

export async function updateTalentSubmission(input: { id: string; clientId: string; status?: TalentSubmissionStatus; notes?: string | null }): Promise<TalentSubmission | null> {
  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  const { data, error } = await getTalentSupabase().from("talent_submissions").update(patch).eq("id", input.id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data ? submission(data as Record<string, unknown>) : null;
}

export async function createTalentAttachmentUrl(storageKey: string): Promise<string> { const { data, error } = await getTalentSupabase().storage.from("talent-resumes").createSignedUrl(storageKey, 60 * 10); if (error || !data?.signedUrl) throw new Error(error?.message ?? "Não foi possível assinar o currículo"); return data.signedUrl; }

export async function deleteTalentFormForClient(clientId: string, formId: string): Promise<boolean> {
  const sb = getTalentSupabase();
  await sb.from("talent_submissions").delete().eq("form_id", formId);
  await sb.from("talent_form_fields").delete().eq("form_id", formId);
  const { error } = await sb.from("talent_forms").delete().eq("id", formId);
  if (error) throw new Error(error.message);
  return true;
}

export async function uploadTalentLogo(input: {
  clientId: string;
  formId: string;
  fileName: string;
  file: Buffer;
  mimeType: string;
}): Promise<string> {
  const sb = getTalentSupabase();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const storageKey = `logos/${input.clientId}/${input.formId}-${Date.now()}-${safeName}`;

  // 1. Try dedicated public bucket `talent-logos`
  try {
    const { data: buckets } = await sb.storage.listBuckets();
    const hasLogosBucket = buckets?.some((b) => b.name === "talent-logos");
    if (!hasLogosBucket) {
      await sb.storage.createBucket("talent-logos", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
        fileSizeLimit: 5 * 1024 * 1024,
      });
    }
    const { error: uploadErr } = await sb.storage
      .from("talent-logos")
      .upload(storageKey, input.file, { contentType: input.mimeType, upsert: true });
    if (!uploadErr) {
      const { data } = sb.storage.from("talent-logos").getPublicUrl(storageKey);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (err) {
    console.warn("[talent] Falha ao tentar bucket talent-logos:", err);
  }

  // 2. Try updating `talent-resumes` allowed mime types
  try {
    await sb.storage.updateBucket("talent-resumes", {
      public: true,
      allowedMimeTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
        "image/gif",
      ],
    });
    const { error } = await sb.storage
      .from("talent-resumes")
      .upload(storageKey, input.file, { contentType: input.mimeType, upsert: true });
    if (!error) {
      const { data } = sb.storage.from("talent-resumes").getPublicUrl(storageKey);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (err) {
    console.warn("[talent] Falha ao tentar bucket talent-resumes:", err);
  }

  // 3. Ultra-safe Fallback: Base64 data URL
  const base64 = input.file.toString("base64");
  return `data:${input.mimeType};base64,${base64}`;
}

