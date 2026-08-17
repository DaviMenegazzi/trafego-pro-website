export function validateSocialBulkBatch(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0 || items.length > 10) return "Envie entre uma e dez publicações por lote";
  return null;
}

export function isSocialBulkLocalId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}
