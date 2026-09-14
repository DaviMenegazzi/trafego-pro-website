import crypto from "crypto";

// ─── Constantes de Segurança ────────────────────────────────────────────────
export const FORM_API_KEY_PREFIX = "tpf_live_";
export const FORM_API_KEY_RANDOM_BYTES = 32;
export const FORM_RATE_LIMIT_PER_MINUTE = 60;
export const FORM_MAX_FIELDS = 50;
export const FORM_MAX_FIELD_VALUE_LENGTH = 5_000;
export const FORM_MAX_FIELD_KEY_LENGTH = 100;
export const FORM_MAX_BODY_SIZE = 100_000; // 100 KB

// ─── Geração e Hash de API Keys ─────────────────────────────────────────────

/** Gera uma chave de API completa no formato `tpf_live_<random>` */
export function generateFormApiKey(): string {
  const random = crypto.randomBytes(FORM_API_KEY_RANDOM_BYTES).toString("base64url");
  return `${FORM_API_KEY_PREFIX}${random}`;
}

/** Retorna o prefixo visível da chave (primeiros 12 chars) para identificação */
export function formApiKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

/** Hash SHA-256 da chave completa — usado para busca no banco */
export function hashFormApiKey(key: string): string {
  return crypto.createHash("sha256").update(key, "utf-8").digest("hex");
}

/** Hash HMAC-SHA-256 do IP do requisitante para auditoria sem armazenar IP real */
export function hashIp(ip: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface FormApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  clientIds: string[];
  allowedOrigins: string[] | null;
  createdBy: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface FormSubmissionRecord {
  id: string;
  formKeyId: string;
  formName: string;
  clientId: string;
  fields: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  ipHash: string | null;
  submittedAt: string;
}

// ─── Validação de Chaves ────────────────────────────────────────────────────

export function isFormApiKeyActive(key: FormApiKeyRecord): boolean {
  if (key.revokedAt) return false;
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return false;
  return true;
}

export function isFormApiKeyClientAllowed(key: FormApiKeyRecord, clientId: string): boolean {
  if (key.clientIds.includes("*")) return true;
  return key.clientIds.includes(clientId);
}

export function isFormApiKeyOriginAllowed(key: FormApiKeyRecord, origin: string | undefined): boolean {
  // Se não há restrição de origem, qualquer origem é aceita
  if (!key.allowedOrigins || key.allowedOrigins.length === 0) return true;
  if (!origin) return false; // Se tem restrição mas não veio Origin, bloqueia
  return key.allowedOrigins.some((allowed) => {
    const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, "");
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, "");
    return normalizedOrigin === normalizedAllowed;
  });
}

// ─── Validação do Payload de Criação de Chave ───────────────────────────────

export interface FormApiKeyDraft {
  name: string;
  clientIds: string[];
  allowedOrigins: string[] | null;
  expiresAt: Date | null;
}

export function validateFormApiKeyDraft(
  body: Record<string, unknown>,
): { ok: true; value: FormApiKeyDraft } | { ok: false; error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return { ok: false, error: "Nome da chave é obrigatório (máx 100 chars)" };
  }

  const rawClientIds = body.clientIds;
  if (!Array.isArray(rawClientIds) || rawClientIds.length === 0) {
    return { ok: false, error: "clientIds deve ser um array com pelo menos uma unidade" };
  }
  const clientIds = rawClientIds.map((id) => String(id).trim()).filter(Boolean);
  if (clientIds.length === 0) {
    return { ok: false, error: "clientIds contém valores inválidos" };
  }

  let allowedOrigins: string[] | null = null;
  if (body.allowedOrigins != null) {
    if (!Array.isArray(body.allowedOrigins)) {
      return { ok: false, error: "allowedOrigins deve ser um array de URLs ou null" };
    }
    allowedOrigins = (body.allowedOrigins as unknown[])
      .map((o) => String(o).trim())
      .filter(Boolean);
    if (allowedOrigins.length === 0) allowedOrigins = null;
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt != null) {
    const parsed = new Date(String(body.expiresAt));
    if (Number.isNaN(parsed.getTime()) || parsed < new Date()) {
      return { ok: false, error: "expiresAt deve ser uma data futura válida (ISO 8601)" };
    }
    expiresAt = parsed;
  }

  return { ok: true, value: { name, clientIds, allowedOrigins, expiresAt } };
}

// ─── Sanitização de Campos do Formulário ────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<\s*(?:img|iframe|object|embed|link|meta|style|form|input|button|select|textarea)\b[^>]*>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

/** Remove tags HTML perigosas, event handlers e protocolos maliciosos */
export function stripDangerousContent(value: string): string {
  let cleaned = value;
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Remove qualquer tag HTML restante (mantém o conteúdo interno)
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");
  // Remove caracteres de controle (exceto newline, tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned.trim();
}

/** Sanitiza um valor individual de campo */
function sanitizeFieldValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    const truncated = value.slice(0, FORM_MAX_FIELD_VALUE_LENGTH);
    return stripDangerousContent(truncated);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeFieldValue);
  }
  if (typeof value === "object") {
    // Objetos aninhados: sanitiza recursivamente mas com profundidade limitada
    return sanitizeFields(value as Record<string, unknown>, 1);
  }
  return String(value).slice(0, FORM_MAX_FIELD_VALUE_LENGTH);
}

/** Sanitiza todos os campos do formulário */
export function sanitizeFields(fields: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 2) return {}; // Limita profundidade de objetos aninhados
  const sanitized: Record<string, unknown> = {};
  const keys = Object.keys(fields).slice(0, FORM_MAX_FIELDS);
  for (const key of keys) {
    const cleanKey = key.slice(0, FORM_MAX_FIELD_KEY_LENGTH).replace(/[^\w\s\-_.@àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ]/g, "");
    if (!cleanKey) continue;
    sanitized[cleanKey] = sanitizeFieldValue(fields[key]);
  }
  return sanitized;
}

/** Sanitiza campos de metadata (utm, source_url, etc.) */
export function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = metadata as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  const allowedMetaKeys = [
    "source_url", "utm_source", "utm_medium", "utm_campaign",
    "utm_term", "utm_content", "referrer", "page_url", "user_agent",
  ];
  for (const key of allowedMetaKeys) {
    if (key in raw && typeof raw[key] === "string") {
      sanitized[key] = stripDangerousContent(String(raw[key]).slice(0, 2000));
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

// ─── Validação do Payload de Submissão ──────────────────────────────────────

export interface ValidatedSubmission {
  clientId: string;
  fields: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export function validateSubmissionPayload(
  body: unknown,
): { ok: true; value: ValidatedSubmission } | { ok: false; error: string; status?: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body deve ser um objeto JSON", status: 400 };
  }

  const raw = body as Record<string, unknown>;

  // Verificar tamanho do body serializado
  const bodySize = JSON.stringify(raw).length;
  if (bodySize > FORM_MAX_BODY_SIZE) {
    return { ok: false, error: `Payload excede o tamanho máximo (${Math.round(FORM_MAX_BODY_SIZE / 1024)} KB)`, status: 413 };
  }

  // clientId obrigatório
  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  if (!clientId) {
    return { ok: false, error: "clientId é obrigatório" };
  }
  if (!/^[0-9a-f-]{36}$|^act_[0-9]+$|^[a-z0-9_-]{3,64}$/i.test(clientId)) {
    return { ok: false, error: "clientId inválido" };
  }

  // fields obrigatório
  if (!raw.fields || typeof raw.fields !== "object" || Array.isArray(raw.fields)) {
    return { ok: false, error: "fields deve ser um objeto com os dados do formulário" };
  }
  const fieldKeys = Object.keys(raw.fields as Record<string, unknown>);
  if (fieldKeys.length === 0) {
    return { ok: false, error: "fields não pode estar vazio" };
  }
  if (fieldKeys.length > FORM_MAX_FIELDS) {
    return { ok: false, error: `Máximo de ${FORM_MAX_FIELDS} campos permitido` };
  }

  // Sanitizar
  const fields = sanitizeFields(raw.fields as Record<string, unknown>);
  const metadata = sanitizeMetadata(raw.metadata);

  return { ok: true, value: { clientId, fields, metadata } };
}
