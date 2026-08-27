import crypto from "crypto";

export const EXTERNAL_AI_API_SCOPES = [
  "metrics:read",
  "ads:metrics:read",
  "leads:summary:read",
  "leads:read",
  "crm:summary:read",
  "creatives:read",
  "targets:read",
] as const;
export type ExternalAiApiScope = (typeof EXTERNAL_AI_API_SCOPES)[number];
export const EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tokenPepper(): string {
  return process.env.JWT_SECRET || "external-api-development-pepper";
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

export function isExternalAiApiScope(value: string): value is ExternalAiApiScope {
  return (EXTERNAL_AI_API_SCOPES as readonly string[]).includes(value);
}

export function createExternalAiApiToken(): string {
  return `tpai_live_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashExternalAiApiToken(value: string): string {
  return crypto.createHmac("sha256", tokenPepper()).update(value).digest("hex");
}

export function externalAiApiTokenPrefix(value: string): string {
  return `${value.slice(0, 16)}…`;
}

export function parseExternalAiApiScopes(value: unknown): ExternalAiApiScope[] {
  return Array.from(new Set(strings(value).filter(isExternalAiApiScope)));
}

const UNIT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$|^act_[0-9]+$|^[a-z0-9_-]{3,64}$/i;

export function parseExternalAiApiUnitIds(value: unknown): string[] {
  return Array.from(new Set(strings(value).filter((item) => UNIT_ID_PATTERN.test(item))));
}

export function validateExternalAiApiTokenDraft(input: { name?: unknown; scopes?: unknown; unitIds?: unknown; expiresAt?: unknown }, now = new Date()): { ok: true; value: { name: string; scopes: ExternalAiApiScope[]; unitIds: string[]; expiresAt: Date } } | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const scopes = parseExternalAiApiScopes(input.scopes);
  const unitIds = parseExternalAiApiUnitIds(input.unitIds);
  const expiresAt = typeof input.expiresAt === "string" ? new Date(input.expiresAt) : new Date(NaN);
  if (name.length < 3 || name.length > 120) return { ok: false, error: "Informe um nome entre 3 e 120 caracteres" };
  if (!scopes.length) return { ok: false, error: "Selecione ao menos um escopo de leitura" };
  if (!unitIds.length) return { ok: false, error: "Selecione ao menos uma unidade válida" };
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime() + 60_000) return { ok: false, error: "Defina uma expiração futura" };
  if (expiresAt.getTime() > now.getTime() + 366 * 86_400_000) return { ok: false, error: "A validade máxima é de 366 dias" };
  return { ok: true, value: { name, scopes, unitIds, expiresAt } };
}

export function isExternalAiApiTokenActive(token: { expiresAt: string; revokedAt: string | null }, now = new Date()): boolean {
  return !token.revokedAt && new Date(token.expiresAt).getTime() > now.getTime();
}

export function hasExternalAiApiScope(scopes: ExternalAiApiScope[], required: ExternalAiApiScope): boolean {
  return scopes.includes(required);
}

export function isExternalAiApiUnitAllowed(unitIds: string[], unitId: string): boolean {
  return unitIds.includes(unitId);
}

export function resolveExternalAiApiDateRange(start: unknown, end: unknown, now = new Date()): { ok: true; start: string; end: string } | { ok: false; error: string } {
  const current = now.toISOString().slice(0, 10);
  const fallbackStart = new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const safeStart = start === undefined ? fallbackStart : start;
  const safeEnd = end === undefined ? current : end;
  const valid = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
  if (!valid(safeStart) || !valid(safeEnd) || safeStart > safeEnd) return { ok: false, error: "Informe datas válidas no formato YYYY-MM-DD" };
  if ((Date.parse(`${safeEnd}T00:00:00.000Z`) - Date.parse(`${safeStart}T00:00:00.000Z`)) / 86_400_000 > 366) return { ok: false, error: "O período máximo é de 366 dias" };
  return { ok: true, start: safeStart, end: safeEnd };
}
