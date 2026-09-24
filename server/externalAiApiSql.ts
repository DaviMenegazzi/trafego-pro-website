import crypto from "crypto";
import { parseExternalAiApiScopes, parseExternalAiApiUnitIds, type ExternalAiApiScope } from "./externalAiApiPolicy.js";
import { getSiteSupabase, unwrap } from "./siteSupabase.js";

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

type TokenRow = {
  id: string;
  owner_user_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes_json: unknown;
  unit_ids_json: unknown;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

const TOKEN_COLUMNS = "id, owner_user_id, name, token_prefix, token_hash, scopes_json, unit_ids_json, expires_at, revoked_at, last_used_at, created_at";

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

/** jsonb chega como array; dados migrados do MySQL podem vir como texto JSON. */
function json(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
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
  const row = unwrap(await getSiteSupabase().from("external_ai_api_tokens").insert({
    id: crypto.randomUUID(),
    owner_user_id: input.ownerUserId,
    name: input.name,
    token_prefix: input.tokenPrefix,
    token_hash: input.tokenHash,
    scopes_json: input.scopes,
    unit_ids_json: input.unitIds,
    expires_at: input.expiresAt.toISOString(),
  }).select(TOKEN_COLUMNS).single());
  return map(row as TokenRow);
}

export async function listExternalAiApiTokensSql(ownerUserId: string): Promise<ExternalAiApiToken[]> {
  const rows = unwrap(await getSiteSupabase().from("external_ai_api_tokens").select(TOKEN_COLUMNS)
    .eq("owner_user_id", ownerUserId).order("created_at", { ascending: false }));
  return (rows as TokenRow[]).map(map);
}

export async function findExternalAiApiTokenByHashSql(tokenHash: string): Promise<ExternalAiApiToken | null> {
  const row = unwrap(await getSiteSupabase().from("external_ai_api_tokens").select(TOKEN_COLUMNS).eq("token_hash", tokenHash).maybeSingle());
  return row ? map(row as TokenRow) : null;
}

export async function revokeExternalAiApiTokenSql(id: string, ownerUserId: string): Promise<boolean> {
  const rows = unwrap(await getSiteSupabase().from("external_ai_api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id).eq("owner_user_id", ownerUserId).is("revoked_at", null).select("id"));
  return (rows ?? []).length > 0;
}

export async function consumeExternalAiApiRateLimitSql(id: string, limit: number): Promise<{ allowed: boolean; count: number }> {
  const result = unwrap(await getSiteSupabase().rpc("consume_external_ai_token_rate", { p_id: id }));
  const count = result == null ? limit + 1 : Number(result);
  return { allowed: count <= limit, count };
}

export async function recordExternalAiApiAuditSql(input: { tokenId: string; method: string; path: string; status: number; outcome: string; ipHash: string | null }): Promise<void> {
  try {
    await getSiteSupabase().from("external_ai_api_audit_logs").insert({
      token_id: input.tokenId,
      request_method: input.method.slice(0, 10),
      request_path: input.path.slice(0, 255),
      http_status: input.status,
      outcome: input.outcome.slice(0, 32),
      remote_ip_hash: input.ipHash,
    });
  } catch {}
}
