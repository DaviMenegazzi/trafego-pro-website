import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { parseExternalAiApiScopes, parseExternalAiApiUnitIds, type ExternalAiApiScope } from "./externalAiApiPolicy.js";

export type ExternalAiApiToken = {
  id: string;
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string;
  scopes: ExternalAiApiScope[];
  unitIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type TokenRow = RowDataPacket & {
  id: string;
  owner_user_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes_json: string;
  unit_ids_json: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  last_used_at: Date | string | null;
  created_at: Date | string;
  rate_window_count: number;
};

let pool: Pool | null = null;
const DATA_DIR = path.resolve(process.cwd(), "data");
const TOKENS_FILE = path.join(DATA_DIR, "external_ai_tokens.json");

function getDbUri(): string | null {
  return process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL || null;
}

function db(): Pool {
  const uri = getDbUri();
  if (!uri) throw new Error("DATABASE_URL não configurada");
  if (!pool) pool = mysql.createPool({ uri, waitForConnections: true, connectionLimit: 5, queueLimit: 0, enableKeepAlive: true });
  return pool;
}

// ─── File-based Storage Fallback ─────────────────────────────────────────────
interface LocalTokenStoreItem {
  id: string;
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string;
  scopes: ExternalAiApiScope[];
  unitIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  rateWindowStartedAt?: number;
  rateWindowCount?: number;
}

function loadTokensFile(): LocalTokenStoreItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(TOKENS_FILE)) return [];
    const content = fs.readFileSync(TOKENS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[external-ai] Aviso ao ler tokens locais:", err);
    return [];
  }
}

function saveTokensFile(tokens: LocalTokenStoreItem[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (err) {
    console.error("[external-ai] Erro ao salvar tokens locais:", err);
  }
}

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function json(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function map(row: TokenRow): ExternalAiApiToken {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    tokenHash: row.token_hash,
    scopes: parseExternalAiApiScopes(json(row.scopes_json)),
    unitIds: parseExternalAiApiUnitIds(json(row.unit_ids_json)),
    expiresAt: iso(row.expires_at)!,
    revokedAt: iso(row.revoked_at),
    lastUsedAt: iso(row.last_used_at),
    createdAt: iso(row.created_at)!,
  };
}

export async function createExternalAiApiTokenSql(input: {
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string;
  scopes: ExternalAiApiScope[];
  unitIds: string[];
  expiresAt: Date;
}): Promise<ExternalAiApiToken> {
  const id = crypto.randomUUID();

  if (!getDbUri()) {
    const tokens = loadTokensFile();
    const token: LocalTokenStoreItem = {
      id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      tokenPrefix: input.tokenPrefix,
      tokenHash: input.tokenHash,
      scopes: input.scopes,
      unitIds: input.unitIds,
      expiresAt: input.expiresAt.toISOString(),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };
    tokens.unshift(token);
    saveTokensFile(tokens);
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = token;
    return res;
  }

  await db().execute(
    "INSERT INTO external_ai_api_tokens (id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, input.ownerUserId, input.name, input.tokenPrefix, input.tokenHash, JSON.stringify(input.scopes), JSON.stringify(input.unitIds), input.expiresAt],
  );
  const token = await getExternalAiApiTokenSql(id, input.ownerUserId);
  if (!token) throw new Error("Token criado, mas não pôde ser lido");
  return token;
}

export async function listExternalAiApiTokensSql(ownerUserId: string): Promise<ExternalAiApiToken[]> {
  if (!getDbUri()) {
    const tokens = loadTokensFile();
    return tokens.map(({ rateWindowCount: _c, rateWindowStartedAt: _s, ...t }) => t);
  }
  const [rows] = await db().query<TokenRow[]>(
    "SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE owner_user_id = ? ORDER BY created_at DESC",
    [ownerUserId],
  );
  return rows.map(map);
}

async function getExternalAiApiTokenSql(id: string, ownerUserId: string): Promise<ExternalAiApiToken | null> {
  if (!getDbUri()) {
    const tokens = loadTokensFile();
    const found = tokens.find((t) => t.id === id);
    if (!found) return null;
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = found;
    return res;
  }
  const [rows] = await db().query<TokenRow[]>(
    "SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE id = ? AND owner_user_id = ? LIMIT 1",
    [id, ownerUserId],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function findExternalAiApiTokenByHashSql(tokenHash: string): Promise<ExternalAiApiToken | null> {
  if (!getDbUri()) {
    const tokens = loadTokensFile();
    const found = tokens.find((t) => t.tokenHash === tokenHash);
    if (!found) return null;
    const { rateWindowCount: _c, rateWindowStartedAt: _s, ...res } = found;
    return res;
  }
  const [rows] = await db().query<TokenRow[]>(
    "SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE token_hash = ? LIMIT 1",
    [tokenHash],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function revokeExternalAiApiTokenSql(id: string, ownerUserId: string): Promise<boolean> {
  if (!getDbUri()) {
    const tokens = loadTokensFile();
    const item = tokens.find((t) => t.id === id);
    if (!item || item.revokedAt) return false;
    item.revokedAt = new Date().toISOString();
    saveTokensFile(tokens);
    return true;
  }
  const [result] = await db().execute<ResultSetHeader>(
    "UPDATE external_ai_api_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND owner_user_id = ? AND revoked_at IS NULL",
    [id, ownerUserId],
  );
  return result.affectedRows > 0;
}

export async function consumeExternalAiApiRateLimitSql(id: string, limit: number): Promise<{ allowed: boolean; count: number }> {
  if (!getDbUri()) {
    const tokens = loadTokensFile();
    const item = tokens.find((t) => t.id === id);
    if (!item) return { allowed: true, count: 1 };
    const now = Date.now();
    if (!item.rateWindowStartedAt || now - item.rateWindowStartedAt > 60_000) {
      item.rateWindowStartedAt = now;
      item.rateWindowCount = 1;
    } else {
      item.rateWindowCount = (item.rateWindowCount || 0) + 1;
    }
    item.lastUsedAt = new Date().toISOString();
    saveTokensFile(tokens);
    return { allowed: (item.rateWindowCount || 1) <= limit, count: item.rateWindowCount || 1 };
  }
  await db().execute(
    "UPDATE external_ai_api_tokens SET rate_window_count = CASE WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN 1 ELSE rate_window_count + 1 END, rate_window_started_at = CASE WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN UTC_TIMESTAMP() ELSE rate_window_started_at END, last_used_at = UTC_TIMESTAMP() WHERE id = ?",
    [id],
  );
  const [rows] = await db().query<(RowDataPacket & { rate_window_count: number })[]>(
    "SELECT rate_window_count FROM external_ai_api_tokens WHERE id = ? LIMIT 1",
    [id],
  );
  const count = Number(rows[0]?.rate_window_count ?? limit + 1);
  return { allowed: count <= limit, count };
}

export async function recordExternalAiApiAuditSql(input: { tokenId: string; method: string; path: string; status: number; outcome: string; ipHash: string | null }): Promise<void> {
  if (!getDbUri()) return;
  try {
    await db().execute(
      "INSERT INTO external_ai_api_audit_logs (token_id, request_method, request_path, http_status, outcome, remote_ip_hash) VALUES (?, ?, ?, ?, ?, ?)",
      [input.tokenId, input.method.slice(0, 10), input.path.slice(0, 255), input.status, input.outcome.slice(0, 32), input.ipHash],
    );
  } catch {}
}
