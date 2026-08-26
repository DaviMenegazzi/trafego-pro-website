import crypto from "crypto";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { parseExternalAiApiScopes, parseExternalAiApiUnitIds, type ExternalAiApiScope } from "./externalAiApiPolicy.js";

export type ExternalAiApiToken = { id: string; ownerUserId: string; name: string; tokenPrefix: string; tokenHash: string; scopes: ExternalAiApiScope[]; unitIds: string[]; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };
type TokenRow = RowDataPacket & { id: string; owner_user_id: string; name: string; token_prefix: string; token_hash: string; scopes_json: string; unit_ids_json: string; expires_at: Date | string; revoked_at: Date | string | null; last_used_at: Date | string | null; created_at: Date | string; rate_window_count: number };
let pool: Pool | null = null;

function db(): Pool {
  const uri = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL não configurada");
  if (!pool) pool = mysql.createPool({ uri, waitForConnections: true, connectionLimit: 5, queueLimit: 0, enableKeepAlive: true });
  return pool;
}
function iso(value: Date | string | null): string | null { if (!value) return null; const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toISOString(); }
function json(value: string): unknown[] { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function map(row: TokenRow): ExternalAiApiToken { return { id: row.id, ownerUserId: row.owner_user_id, name: row.name, tokenPrefix: row.token_prefix, tokenHash: row.token_hash, scopes: parseExternalAiApiScopes(json(row.scopes_json)), unitIds: parseExternalAiApiUnitIds(json(row.unit_ids_json)), expiresAt: iso(row.expires_at)!, revokedAt: iso(row.revoked_at), lastUsedAt: iso(row.last_used_at), createdAt: iso(row.created_at)! }; }

export async function createExternalAiApiTokenSql(input: { ownerUserId: string; name: string; tokenPrefix: string; tokenHash: string; scopes: ExternalAiApiScope[]; unitIds: string[]; expiresAt: Date }): Promise<ExternalAiApiToken> {
  const id = crypto.randomUUID();
  await db().execute("INSERT INTO external_ai_api_tokens (id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [id, input.ownerUserId, input.name, input.tokenPrefix, input.tokenHash, JSON.stringify(input.scopes), JSON.stringify(input.unitIds), input.expiresAt]);
  const token = await getExternalAiApiTokenSql(id, input.ownerUserId);
  if (!token) throw new Error("Token criado, mas não pôde ser lido");
  return token;
}

export async function listExternalAiApiTokensSql(ownerUserId: string): Promise<ExternalAiApiToken[]> { const [rows] = await db().query<TokenRow[]>("SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE owner_user_id = ? ORDER BY created_at DESC", [ownerUserId]); return rows.map(map); }
async function getExternalAiApiTokenSql(id: string, ownerUserId: string): Promise<ExternalAiApiToken | null> { const [rows] = await db().query<TokenRow[]>("SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE id = ? AND owner_user_id = ? LIMIT 1", [id, ownerUserId]); return rows[0] ? map(rows[0]) : null; }
export async function findExternalAiApiTokenByHashSql(tokenHash: string): Promise<ExternalAiApiToken | null> { const [rows] = await db().query<TokenRow[]>("SELECT id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at FROM external_ai_api_tokens WHERE token_hash = ? LIMIT 1", [tokenHash]); return rows[0] ? map(rows[0]) : null; }
export async function revokeExternalAiApiTokenSql(id: string, ownerUserId: string): Promise<boolean> { const [result] = await db().execute<ResultSetHeader>("UPDATE external_ai_api_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND owner_user_id = ? AND revoked_at IS NULL", [id, ownerUserId]); return result.affectedRows > 0; }
export async function consumeExternalAiApiRateLimitSql(id: string, limit: number): Promise<{ allowed: boolean; count: number }> { await db().execute("UPDATE external_ai_api_tokens SET rate_window_count = CASE WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN 1 ELSE rate_window_count + 1 END, rate_window_started_at = CASE WHEN rate_window_started_at IS NULL OR rate_window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) THEN UTC_TIMESTAMP() ELSE rate_window_started_at END, last_used_at = UTC_TIMESTAMP() WHERE id = ?", [id]); const [rows] = await db().query<(RowDataPacket & { rate_window_count: number })[]>("SELECT rate_window_count FROM external_ai_api_tokens WHERE id = ? LIMIT 1", [id]); const count = Number(rows[0]?.rate_window_count ?? limit + 1); return { allowed: count <= limit, count }; }
export async function recordExternalAiApiAuditSql(input: { tokenId: string; method: string; path: string; status: number; outcome: string; ipHash: string | null }): Promise<void> { await db().execute("INSERT INTO external_ai_api_audit_logs (token_id, request_method, request_path, http_status, outcome, remote_ip_hash) VALUES (?, ?, ?, ?, ?, ?)", [input.tokenId, input.method.slice(0, 10), input.path.slice(0, 255), input.status, input.outcome.slice(0, 32), input.ipHash]); }
