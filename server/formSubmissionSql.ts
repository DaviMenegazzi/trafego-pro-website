import crypto from "crypto";
import type { FormApiKeyRecord, FormSubmissionRecord } from "./formSubmissionPolicy.js";
import { getSiteSupabase, unwrap } from "./siteSupabase.js";

// Chaves de API e submissões de formulários externos, no Supabase do site
// (tabelas form_api_keys e form_submissions, acesso só com service_role).

const KEY_COLUMNS = "id, name, key_prefix, key_hash, client_ids, allowed_origins, created_by, expires_at, revoked_at, created_at";
const SUBMISSION_COLUMNS = "id, form_key_id, form_name, client_id, fields, metadata, ip_hash, submitted_at";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  client_ids: unknown;
  allowed_origins: unknown;
  created_by: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  form_key_id: string;
  form_name: string;
  client_id: string;
  fields: unknown;
  metadata: unknown;
  ip_hash: string | null;
  submitted_at: string;
};

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

/** Colunas jsonb chegam decodificadas; dados migrados podem vir como texto. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapKeyRow(row: KeyRow): FormApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    clientIds: parseJson<string[]>(row.client_ids, []),
    allowedOrigins: row.allowed_origins ? parseJson<string[] | null>(row.allowed_origins, null) : null,
    createdBy: row.created_by,
    expiresAt: iso(row.expires_at),
    revokedAt: iso(row.revoked_at),
    createdAt: iso(row.created_at)!,
  };
}

function mapSubmissionRow(row: SubmissionRow): FormSubmissionRecord {
  return {
    id: row.id,
    formKeyId: row.form_key_id,
    formName: row.form_name,
    clientId: row.client_id,
    fields: parseJson<Record<string, unknown>>(row.fields, {}),
    metadata: row.metadata ? parseJson<Record<string, unknown> | null>(row.metadata, null) : null,
    ipHash: row.ip_hash,
    submittedAt: iso(row.submitted_at)!,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API KEYS — CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function createFormApiKeySql(input: {
  name: string;
  keyPrefix: string;
  keyHash: string;
  clientIds: string[];
  allowedOrigins: string[] | null;
  createdBy: string;
  expiresAt: Date | null;
}): Promise<FormApiKeyRecord> {
  const row = unwrap(await getSiteSupabase().from("form_api_keys").insert({
    id: crypto.randomUUID(),
    name: input.name,
    key_prefix: input.keyPrefix,
    key_hash: input.keyHash,
    client_ids: input.clientIds,
    allowed_origins: input.allowedOrigins,
    created_by: input.createdBy,
    expires_at: input.expiresAt?.toISOString() ?? null,
  }).select(KEY_COLUMNS).single());
  return mapKeyRow(row as KeyRow);
}

export async function findFormApiKeyByHashSql(keyHash: string): Promise<FormApiKeyRecord | null> {
  const row = unwrap(await getSiteSupabase().from("form_api_keys").select(KEY_COLUMNS).eq("key_hash", keyHash).maybeSingle());
  return row ? mapKeyRow(row as KeyRow) : null;
}

export async function listFormApiKeysSql(): Promise<FormApiKeyRecord[]> {
  const rows = unwrap(await getSiteSupabase().from("form_api_keys").select(KEY_COLUMNS).order("created_at", { ascending: false }));
  return (rows as KeyRow[]).map(mapKeyRow);
}

export async function revokeFormApiKeySql(id: string): Promise<boolean> {
  const rows = unwrap(await getSiteSupabase().from("form_api_keys")
    .update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null).select("id"));
  return (rows ?? []).length > 0;
}

// ─── Rate Limit por Chave (janela atômica de 1 minuto) ──────────────────────

export async function consumeFormRateLimitSql(
  keyId: string,
  limit: number,
): Promise<{ allowed: boolean; count: number }> {
  const result = unwrap(await getSiteSupabase().rpc("consume_form_api_key_rate", { p_id: keyId }));
  const count = result == null ? limit + 1 : Number(result);
  return { allowed: count <= limit, count };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS — CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function createFormSubmissionSql(input: {
  formKeyId: string;
  formName: string;
  clientId: string;
  fields: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  ipHash: string | null;
}): Promise<FormSubmissionRecord> {
  const row = unwrap(await getSiteSupabase().from("form_submissions").insert({
    id: crypto.randomUUID(),
    form_key_id: input.formKeyId,
    form_name: input.formName,
    client_id: input.clientId,
    fields: input.fields,
    metadata: input.metadata,
    ip_hash: input.ipHash,
  }).select(SUBMISSION_COLUMNS).single());
  return mapSubmissionRow(row as SubmissionRow);
}

export async function listFormSubmissionsSql(filters: {
  clientId?: string;
  clientIds?: string[];
  formKeyId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ submissions: FormSubmissionRecord[]; total: number }> {
  const limit = Math.min(filters.limit ?? 100, 500);
  const offset = filters.offset ?? 0;

  let query = getSiteSupabase().from("form_submissions").select(SUBMISSION_COLUMNS, { count: "exact" });
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  else if (filters.clientIds && filters.clientIds.length > 0) query = query.in("client_id", filters.clientIds);
  if (filters.formKeyId) query = query.eq("form_key_id", filters.formKeyId);
  if (filters.from) query = query.gte("submitted_at", new Date(filters.from).toISOString());
  if (filters.to) query = query.lte("submitted_at", new Date(filters.to).toISOString());

  const { data, error, count } = await query.order("submitted_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return { submissions: ((data ?? []) as SubmissionRow[]).map(mapSubmissionRow), total: count ?? 0 };
}

export async function getFormSubmissionSqlById(id: string): Promise<FormSubmissionRecord | null> {
  const row = unwrap(await getSiteSupabase().from("form_submissions").select(SUBMISSION_COLUMNS).eq("id", id).maybeSingle());
  return row ? mapSubmissionRow(row as SubmissionRow) : null;
}

export async function deleteFormSubmissionSql(id: string): Promise<boolean> {
  const rows = unwrap(await getSiteSupabase().from("form_submissions").delete().eq("id", id).select("id"));
  return (rows ?? []).length > 0;
}

// ─── Reset para testes ──────────────────────────────────────────────────────

export function resetFormSqlPoolForTests(): void {}
