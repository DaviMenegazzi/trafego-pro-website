export type EvolutionOriginPlatform = "meta" | "google_ads" | "mixed" | "unknown";
export type EvolutionOriginEvidence = "verified" | "observed" | "none";

export type EvolutionOrigin = {
  platform: EvolutionOriginPlatform;
  evidence: EvolutionOriginEvidence;
  metaCtwaClid: string | null;
  metaSourceId: string | null;
  metaSourceType: string | null;
  googleClickId: string | null;
  payload: Record<string, string> | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function clean(value: unknown, maxLength = 512): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function normalKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectNamedValues(value: unknown, values: Map<string, string>, depth = 0): void {
  if (depth > 5 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.slice(0, 12).forEach((item) => collectNamedValues(item, values, depth + 1));
    return;
  }
  for (const [key, nested] of Object.entries(asRecord(value))) {
    const text = clean(nested);
    if (text) values.set(normalKey(key), text);
    if (nested && typeof nested === "object") collectNamedValues(nested, values, depth + 1);
  }
}

function take(values: Map<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = values.get(normalKey(key));
    if (value) return value;
  }
  return null;
}

function queryTags(value: string | null): Record<string, string> {
  if (!value || !/^https?:\/\//i.test(value)) return {};
  try {
    const url = new URL(value);
    const keys = ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    return Object.fromEntries(keys.map((key) => [key, clean(url.searchParams.get(key))]).filter((entry): entry is [string, string] => Boolean(entry[1])));
  } catch {
    return {};
  }
}

function safeSourceUrl(value: string | null): string | null {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 512);
  } catch {
    return null;
  }
}

export function extractEvolutionOrigin(...sources: unknown[]): EvolutionOrigin {
  const values = new Map<string, string>();
  sources.forEach((source) => collectNamedValues(source, values));

  const metaCtwaClid = take(values, "ctwa_clid", "ctwaClid");
  const metaSourceId = take(values, "source_id", "sourceId");
  const metaSourceType = take(values, "source_type", "sourceType");
  const sourceUrl = take(values, "source_url", "sourceUrl", "referral_url", "referralUrl");
  const urlTags = queryTags(sourceUrl);
  const googleClickId = take(values, "gclid", "gbraid", "wbraid") ?? urlTags.gclid ?? urlTags.gbraid ?? urlTags.wbraid ?? null;
  const fbClickId = take(values, "fbclid") ?? urlTags.fbclid ?? null;
  const hasMetaSignal = Boolean(metaCtwaClid || metaSourceId || metaSourceType?.toLowerCase() === "ad" || fbClickId);
  const hasGoogleSignal = Boolean(googleClickId);
  const platform: EvolutionOriginPlatform = hasMetaSignal && hasGoogleSignal ? "mixed" : hasMetaSignal ? "meta" : hasGoogleSignal ? "google_ads" : "unknown";
  const evidence: EvolutionOriginEvidence = metaCtwaClid ? "verified" : hasMetaSignal || hasGoogleSignal ? "observed" : "none";

  const payload = Object.fromEntries(Object.entries({
    ctwa_clid: metaCtwaClid,
    meta_source_id: metaSourceId,
    meta_source_type: metaSourceType,
    source_url: safeSourceUrl(sourceUrl),
    gclid: googleClickId,
    fbclid: fbClickId,
    ...urlTags,
  }).filter((entry): entry is [string, string] => Boolean(entry[1])));

  return { platform, evidence, metaCtwaClid, metaSourceId, metaSourceType, googleClickId, payload: Object.keys(payload).length ? payload : null };
}
