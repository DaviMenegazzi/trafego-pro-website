import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { FormApiKeyRecord, FormSubmissionRecord } from "./formSubmissionPolicy.js";

// ─── MySQL Pool ─────────────────────────────────────────────────────────────

let pool: Pool | null = null;
const DATA_DIR = path.resolve(process.cwd(), "data");
const KEYS_FILE = path.join(DATA_DIR, "form_api_keys.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "form_submissions.json");

function getDbUri(): string | null {
  return process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL || null;
}

function db(): Pool {
  const uri = getDbUri();
  if (!uri) throw new Error("DATABASE_URL não configurada");
  if (!pool) {
    pool = mysql.createPool({
      uri,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
    });
  }
  return pool;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── File-based Fallback: Keys ──────────────────────────────────────────────

interface LocalKeyItem extends FormApiKeyRecord {
  rateWindowStartedAt?: number;
  rateWindowCount?: number;
}

function loadKeysFile(): LocalKeyItem[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(KEYS_FILE)) return [];
    const content = fs.readFileSync(KEYS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[forms] Aviso ao ler chaves locais:", err);
    return [];
  }
}

function saveKeysFile(keys: LocalKeyItem[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
  } catch (err) {
    console.error("[forms] Erro ao salvar chaves locais:", err);
  }
}

// ─── File-based Fallback: Submissions ───────────────────────────────────────

function loadSubmissionsFile(): FormSubmissionRecord[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
    const content = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[forms] Aviso ao ler submissões locais:", err);
    return [];
  }
}

function saveSubmissionsFile(submissions: FormSubmissionRecord[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), "utf-8");
  } catch (err) {
    console.error("[forms] Erro ao salvar submissões locais:", err);
  }
}

// ─── Row Mappers ────────────────────────────────────────────────────────────

type KeyRow = RowDataPacket & {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  client_ids: string;
  allowed_origins: string | null;
  created_by: string;
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
};

type SubmissionRow = RowDataPacket & {
  id: string;
  form_key_id: string;
  form_name: string;
  client_id: string;
  fields: string;
  metadata: string | null;
  ip_hash: string | null;
  submitted_at: Date | string;
};

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
  const id = crypto.randomUUID();

  if (!getDbUri()) {
    const keys = loadKeysFile();
    const key: LocalKeyItem = {
      id,
      name: input.name,
      keyPrefix: input.keyPrefix,
      keyHash: input.keyHash,
      clientIds: input.clientIds,
      allowedOrigins: input.allowedOrigins,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt?.toISOString() ?? null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    keys.unshift(key);
    saveKeysFile(keys);
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = key;
    return res;
  }

  await db().execute(
    `INSERT INTO form_api_keys (id, name, key_prefix, key_hash, client_ids, allowed_origins, created_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.keyPrefix,
      input.keyHash,
      JSON.stringify(input.clientIds),
      input.allowedOrigins ? JSON.stringify(input.allowedOrigins) : null,
      input.createdBy,
      input.expiresAt,
    ],
  );
  const key = await getFormApiKeySqlById(id);
  if (!key) throw new Error("Chave criada, mas não pôde ser lida");
  return key;
}

async function getFormApiKeySqlById(id: string): Promise<FormApiKeyRecord | null> {
  if (!getDbUri()) {
    const keys = loadKeysFile();
    const found = keys.find((k) => k.id === id);
    if (!found) return null;
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = found;
    return res;
  }
  const [rows] = await db().query<KeyRow[]>(
    "SELECT id, name, key_prefix, key_hash, client_ids, allowed_origins, created_by, expires_at, revoked_at, created_at FROM form_api_keys WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ? mapKeyRow(rows[0]) : null;
}

export async function findFormApiKeyByHashSql(keyHash: string): Promise<FormApiKeyRecord | null> {
  if (!getDbUri()) {
    const keys = loadKeysFile();
    const found = keys.find((k) => k.keyHash === keyHash);
    if (!found) return null;
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = found;
    return res;
  }
  const [rows] = await db().query<KeyRow[]>(
    "SELECT id, name, key_prefix, key_hash, client_ids, allowed_origins, created_by, expires_at, revoked_at, created_at FROM form_api_keys WHERE key_hash = ? LIMIT 1",
    [keyHash],
  );
  return rows[0] ? mapKeyRow(rows[0]) : null;
}

export async function listFormApiKeysSql(): Promise<FormApiKeyRecord[]> {
  if (!getDbUri()) {
    return loadKeysFile().map(({ rateWindowCount: _c, rateWindowStartedAt: _s, ...k }) => k);
  }
  const [rows] = await db().query<KeyRow[]>(
    "SELECT id, name, key_prefix, key_hash, client_ids, allowed_origins, created_by, expires_at, revoked_at, created_at FROM form_api_keys ORDER BY created_at DESC",
  );
  return rows.map(mapKeyRow);
}

export async function revokeFormApiKeySql(id: string): Promise<boolean> {
  if (!getDbUri()) {
    const keys = loadKeysFile();
    const item = keys.find((k) => k.id === id);
    if (!item || item.revokedAt) return false;
    item.revokedAt = new Date().toISOString();
    saveKeysFile(keys);
    return true;
  }
  const [result] = await db().execute<ResultSetHeader>(
    "UPDATE form_api_keys SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL",
    [id],
  );
  return result.affectedRows > 0;
}

// ─── Rate Limit por Chave ───────────────────────────────────────────────────

export async function consumeFormRateLimitSql(
  keyId: string,
  limit: number,
): Promise<{ allowed: boolean; count: number }> {
  if (!getDbUri()) {
    const keys = loadKeysFile();
    const item = keys.find((k) => k.id === keyId);
    if (!item) return { allowed: true, count: 1 };
    const now = Date.now();
    if (!item.rateWindowStartedAt || now - item.rateWindowStartedAt > 60_000) {
      item.rateWindowStartedAt = now;
      item.rateWindowCount = 1;
    } else {
      item.rateWindowCount = (item.rateWindowCount || 0) + 1;
    }
    saveKeysFile(keys);
    return { allowed: (item.rateWindowCount || 1) <= limit, count: item.rateWindowCount || 1 };
  }

  // MySQL: janela atômica de rate limit (1 minuto)
  await db().execute(
    `UPDATE form_api_keys SET
       rate_window_count = CASE
         WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN 1
         ELSE COALESCE(rate_window_count, 0) + 1
       END,
       rate_window_started_at = CASE
         WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN UTC_TIMESTAMP()
         ELSE rate_window_started_at
       END
     WHERE id = ?`,
    [keyId],
  );
  const [rows] = await db().query<(RowDataPacket & { rate_window_count: number })[]>(
    "SELECT rate_window_count FROM form_api_keys WHERE id = ? LIMIT 1",
    [keyId],
  );
  const count = Number(rows[0]?.rate_window_count ?? limit + 1);
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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (!getDbUri()) {
    const submissions = loadSubmissionsFile();
    const submission: FormSubmissionRecord = {
      id,
      formKeyId: input.formKeyId,
      formName: input.formName,
      clientId: input.clientId,
      fields: input.fields,
      metadata: input.metadata,
      ipHash: input.ipHash,
      submittedAt: now,
    };
    submissions.unshift(submission);
    // Manter no máximo 10.000 submissões no arquivo local
    if (submissions.length > 10_000) submissions.length = 10_000;
    saveSubmissionsFile(submissions);
    return submission;
  }

  await db().execute(
    `INSERT INTO form_submissions (id, form_key_id, form_name, client_id, fields, metadata, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.formKeyId,
      input.formName,
      input.clientId,
      JSON.stringify(input.fields),
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ipHash,
    ],
  );

  return {
    id,
    formKeyId: input.formKeyId,
    formName: input.formName,
    clientId: input.clientId,
    fields: input.fields,
    metadata: input.metadata,
    ipHash: input.ipHash,
    submittedAt: now,
  };
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

  if (!getDbUri()) {
    let data = loadSubmissionsFile();

    if (filters.clientId) {
      data = data.filter((s) => s.clientId === filters.clientId);
    } else if (filters.clientIds && filters.clientIds.length > 0) {
      const set = new Set(filters.clientIds);
      data = data.filter((s) => set.has(s.clientId));
    }
    if (filters.formKeyId) {
      data = data.filter((s) => s.formKeyId === filters.formKeyId);
    }
    if (filters.from) {
      const fromDate = new Date(filters.from);
      data = data.filter((s) => new Date(s.submittedAt) >= fromDate);
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      data = data.filter((s) => new Date(s.submittedAt) <= toDate);
    }

    // Ordenar por data desc
    data.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const total = data.length;
    const submissions = data.slice(offset, offset + limit);
    return { submissions, total };
  }

  // MySQL
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (filters.clientId) {
    clauses.push("client_id = ?");
    values.push(filters.clientId);
  } else if (filters.clientIds && filters.clientIds.length > 0) {
    clauses.push(`client_id IN (${filters.clientIds.map(() => "?").join(",")})`);
    values.push(...filters.clientIds);
  }
  if (filters.formKeyId) {
    clauses.push("form_key_id = ?");
    values.push(filters.formKeyId);
  }
  if (filters.from) {
    clauses.push("submitted_at >= ?");
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push("submitted_at <= ?");
    values.push(filters.to);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  // Count
  const [countRows] = await db().query<(RowDataPacket & { cnt: number })[]>(
    `SELECT COUNT(*) as cnt FROM form_submissions ${where}`,
    values,
  );
  const total = Number(countRows[0]?.cnt ?? 0);

  // Data
  const [rows] = await db().query<SubmissionRow[]>(
    `SELECT id, form_key_id, form_name, client_id, fields, metadata, ip_hash, submitted_at
     FROM form_submissions ${where}
     ORDER BY submitted_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  return { submissions: rows.map(mapSubmissionRow), total };
}

export async function getFormSubmissionSqlById(id: string): Promise<FormSubmissionRecord | null> {
  if (!getDbUri()) {
    const submissions = loadSubmissionsFile();
    return submissions.find((s) => s.id === id) ?? null;
  }
  const [rows] = await db().query<SubmissionRow[]>(
    "SELECT id, form_key_id, form_name, client_id, fields, metadata, ip_hash, submitted_at FROM form_submissions WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ? mapSubmissionRow(rows[0]) : null;
}

export async function deleteFormSubmissionSql(id: string): Promise<boolean> {
  if (!getDbUri()) {
    const submissions = loadSubmissionsFile();
    const idx = submissions.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    submissions.splice(idx, 1);
    saveSubmissionsFile(submissions);
    return true;
  }
  const [result] = await db().execute<ResultSetHeader>(
    "DELETE FROM form_submissions WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

// ─── Reset para testes ──────────────────────────────────────────────────────

export function resetFormSqlPoolForTests(): void {
  pool = null;
}
