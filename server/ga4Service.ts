import jwt from "jsonwebtoken";
import type {
  Ga4CampaignRow,
  Ga4CityRow,
  Ga4DailyRow,
  Ga4KeyEventRow,
  Ga4LandingPageInput,
  Ga4LandingPageRow,
  Ga4Report,
  Ga4SourceRow,
  Ga4Totals,
} from "../shared/google.js";
import { keyEventLabel } from "../shared/google.js";

// Leitura do GA4 pela Data API com conta de serviço. Com a conta do Google Ads vinculada à
// propriedade, as campanhas (custo, cliques, impressões) vêm pela mesma API — sem Google Ads API.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const REPORT_TTL_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RANGE_DAYS = 400;

export class Ga4Error extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

// ─── Configuração ───────────────────────────────────────────────────────────
type ServiceAccount = { client_email: string; private_key: string };

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  const value = raw?.trim();
  if (!value) return null;
  const json = value.startsWith("{") ? value : Buffer.from(value, "base64").toString("utf8");
  try {
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export function isGa4Configured(): boolean {
  return Boolean(parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT_JSON));
}

/** E-mail que o administrador adiciona como Leitor em cada propriedade do GA4. */
export function getGa4ServiceAccountEmail(): string | null {
  return parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT_JSON)?.client_email ?? null;
}

/** O que o relatório precisa saber da Landing Page. */
export type Ga4PropertyRef = { propertyId: string; hostnames: string[] };

// ─── Acesso por unidade ─────────────────────────────────────────────────────
type AccessClaims = { role?: string; allowedClientIds?: string[] } | null | undefined;

/** Id da unidade como fica no banco: a conta da Meta sem o prefixo act_. */
export const normalizeUnitId = (id: string) => id.trim().replace(/^act_/, "");

export function canAccessUnit(unitId: string, claims: AccessClaims): boolean {
  if (!claims || !normalizeUnitId(unitId)) return false;
  const allowed = claims.allowedClientIds ?? [];
  if (claims.role === "admin" || allowed.includes("*")) return true;
  return allowed.some((id) => normalizeUnitId(id) === normalizeUnitId(unitId));
}

// ─── Cadastro de Landing Page ───────────────────────────────────────────────
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Aceita domínio ou URL colada ("https://lp.exemplo.com/oferta") e devolve só o domínio. */
export function normalizeHostname(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  let host = raw;
  try {
    host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  return HOSTNAME.test(host) ? host : null;
}

/** "vidacardpf.com.br" ou "https://vidacardpf.com.br/oferta" → URL https completa; inválido → null. */
export function normalizeSiteUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !normalizeHostname(url.hostname) || url.username || url.password) return null;
  const href = url.toString();
  return href.length <= 300 ? href : null;
}

export function parseLandingPageInput(body: unknown): Ga4LandingPageInput {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const unitId = normalizeUnitId(String(data.unitId ?? ""));
  if (!/^\d+$/.test(unitId)) throw new Ga4Error(400, "Selecione uma unidade válida.");

  const propertyId = String(data.propertyId ?? "").trim().replace(/^properties\//, "");
  if (/^G-/i.test(propertyId)) {
    throw new Ga4Error(400, "Use o ID da propriedade (só números, em Administrador → Detalhes da propriedade), não o ID de medição G-.");
  }
  if (!/^\d{5,15}$/.test(propertyId)) throw new Ga4Error(400, "O ID da propriedade do GA4 tem só números.");

  const name = String(data.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new Ga4Error(400, "Dê um nome para a Landing Page.");
  if (name.length > 120) throw new Ga4Error(400, "O nome pode ter no máximo 120 caracteres.");

  const rawHosts = Array.isArray(data.hostnames) ? data.hostnames : [];
  if (rawHosts.length > 10) throw new Ga4Error(400, "Informe no máximo 10 domínios.");
  const hostnames: string[] = [];
  for (const item of rawHosts) {
    if (!String(item ?? "").trim()) continue;
    const host = normalizeHostname(String(item));
    if (!host) throw new Ga4Error(400, `Domínio inválido: ${String(item).trim()}`);
    if (!hostnames.includes(host)) hostnames.push(host);
  }
  const rawSiteUrl = String(data.siteUrl ?? "").trim();
  const siteUrl = rawSiteUrl ? normalizeSiteUrl(rawSiteUrl) : null;
  if (rawSiteUrl && !siteUrl) throw new Ga4Error(400, "Endereço da Landing Page inválido. Use algo como vidacard.com.br.");

  return { unitId, propertyId, name, hostnames, siteUrl };
}

// ─── Período ────────────────────────────────────────────────────────────────
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateGa4Range(start: unknown, end: unknown): { start: string; end: string } {
  if (typeof start !== "string" || typeof end !== "string" || !ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    throw new Ga4Error(400, "Informe o período no formato AAAA-MM-DD.");
  }
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    throw new Ga4Error(400, "O início do período precisa ser antes do fim.");
  }
  if ((endMs - startMs) / 86_400_000 > MAX_RANGE_DAYS) {
    throw new Ga4Error(400, `O período pode ter no máximo ${MAX_RANGE_DAYS} dias.`);
  }
  return { start, end };
}

// ─── Token da conta de serviço ──────────────────────────────────────────────
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const account = parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT_JSON);
  if (!account) throw new Ga4Error(503, "A conta de serviço do GA4 não está configurada.");

  const assertion = jwt.sign({ scope: SCOPE }, account.private_key, {
    algorithm: "RS256",
    issuer: account.client_email,
    audience: TOKEN_URL,
    expiresIn: 3600,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !data.access_token) {
    console.error("[ga4] Falha ao obter token da conta de serviço:", response.status, data.error_description ?? "");
    throw new Ga4Error(502, "Não foi possível autenticar no Google com a conta de serviço.");
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000 };
  return cachedToken.value;
}

// ─── Chamadas à Data API ────────────────────────────────────────────────────
type ApiValue = { value?: string };
type ApiRow = { dimensionValues?: ApiValue[]; metricValues?: ApiValue[] };
export type ApiReport = { rows?: ApiRow[]; totals?: ApiRow[]; metadata?: { currencyCode?: string } };

async function callDataApi<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${DATA_API}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string; status?: string } };
  if (response.ok) return data;

  const detail = data.error?.message ?? "";
  console.warn("[ga4] Data API respondeu", response.status, data.error?.status ?? "", detail);
  if (response.status === 403) {
    throw new Ga4Error(403, "A conta de serviço não tem acesso a esta propriedade do GA4. Adicione o e-mail dela como Leitor.");
  }
  if (response.status === 429) {
    throw new Ga4Error(429, "O GA4 limitou as consultas desta propriedade. Tente de novo em alguns minutos.");
  }
  throw new Ga4Error(502, detail ? `O GA4 recusou a consulta: ${detail}` : "O GA4 não respondeu como esperado.");
}

const metric = (name: string) => ({ name });
const dimension = (name: string) => ({ name });
const bySessions = [{ metric: { metricName: "sessions" }, desc: true }];

function hostFilter(hostnames: string[]) {
  return hostnames.length > 0
    ? { dimensionFilter: { filter: { fieldName: "hostName", inListFilter: { values: hostnames, caseSensitive: false } } } }
    : {};
}

/** Período imediatamente anterior, com o mesmo número de dias (para as variações dos cards). */
export function previousRange(start: string, end: string): { start: string; end: string } {
  const day = 86_400_000;
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const days = Math.round((Date.parse(`${end}T00:00:00Z`) - startMs) / day) + 1;
  const prevEnd = new Date(startMs - day);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * day);
  return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
}

const TOTAL_METRICS = ["activeUsers", "newUsers", "sessions", "engagedSessions", "sessionKeyEventRate", "keyEvents", "userEngagementDuration"];

function bothRanges(start: string, end: string) {
  const previous = previousRange(start, end);
  return [
    { startDate: start, endDate: end, name: "current" },
    { startDate: previous.start, endDate: previous.end, name: "previous" },
  ];
}

export function buildMainReportRequests(start: string, end: string, hostnames: string[]) {
  const filter = hostFilter(hostnames);
  const current = { dateRanges: [{ startDate: start, endDate: end }], ...filter };
  return [
    // Sem dimensões e com dois períodos: o GA4 devolve uma linha por período (dimensão dateRange).
    { dateRanges: bothRanges(start, end), ...filter, metrics: TOTAL_METRICS.map(metric) },
    {
      ...current,
      dimensions: [dimension("date")],
      metrics: ["sessions", "keyEvents"].map(metric),
      orderBys: [{ dimension: { dimensionName: "date" } }],
      keepEmptyRows: true,
      limit: MAX_RANGE_DAYS + 1,
    },
    {
      ...current,
      dimensions: [dimension("hostName"), dimension("landingPage")],
      metrics: ["sessions", "engagedSessions", "keyEvents", "sessionKeyEventRate"].map(metric),
      orderBys: bySessions,
      limit: 50,
    },
    {
      ...current,
      dimensions: [dimension("sessionSourceMedium")],
      metrics: ["sessions", "activeUsers", "keyEvents"].map(metric),
      orderBys: bySessions,
      limit: 25,
    },
    {
      ...current,
      dimensions: [dimension("eventName")],
      metrics: [metric("keyEvents")],
      metricFilter: { filter: { fieldName: "keyEvents", numericFilter: { operation: "GREATER_THAN", value: { int64Value: "0" } } } },
      orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
      limit: 20,
    },
  ];
}

export function buildCityReportRequest(start: string, end: string, hostnames: string[]) {
  return {
    dateRanges: [{ startDate: start, endDate: end }],
    ...hostFilter(hostnames),
    dimensions: [dimension("city")],
    metrics: ["sessions", "keyEvents", "sessionKeyEventRate"].map(metric),
    orderBys: bySessions,
    limit: 15,
  };
}

// Custo vem do Google Ads (por conta, não por LP): esta consulta não leva o filtro de domínio.
export function buildCampaignReportRequest(start: string, end: string) {
  return {
    dateRanges: bothRanges(start, end),
    dimensions: [dimension("sessionGoogleAdsCampaignName")],
    metrics: ["advertiserAdCost", "advertiserAdClicks", "advertiserAdImpressions", "sessions", "keyEvents"].map(metric),
    orderBys: [{ metric: { metricName: "advertiserAdCost" }, desc: true }],
    limit: 200,
  };
}

// ─── Normalização ───────────────────────────────────────────────────────────
const num = (values: ApiValue[] | undefined, index: number) => {
  const n = Number(values?.[index]?.value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const dim = (row: ApiRow, index: number) => row.dimensionValues?.[index]?.value ?? "";
const isNotSet = (value: string) => !value || value === "(not set)";
const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

const ga4Date = (value: string) => (/^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value);

type SiteTotals = Omit<Ga4Totals, "adCost" | "adClicks" | "adImpressions">;
type AdTotals = Pick<Ga4Totals, "adCost" | "adClicks" | "adImpressions">;

const EMPTY_SITE_TOTALS: SiteTotals = {
  sessions: 0, users: 0, newUsers: 0, engagedSessions: 0, engagementRate: 0, avgEngagementSeconds: 0, keyEvents: 0, conversionRate: 0,
};

export function normalizeTotals(report: ApiReport | undefined): { current: SiteTotals; previous: SiteTotals } {
  const result = { current: { ...EMPTY_SITE_TOTALS }, previous: { ...EMPTY_SITE_TOTALS } };
  for (const row of report?.rows ?? []) {
    const range = dim(row, 0) === "previous" ? "previous" : "current";
    const m = row.metricValues;
    const users = num(m, 0);
    const sessions = num(m, 2);
    const engagedSessions = num(m, 3);
    result[range] = {
      users,
      newUsers: num(m, 1),
      sessions,
      engagedSessions,
      engagementRate: ratio(engagedSessions, sessions),
      conversionRate: num(m, 4),
      keyEvents: num(m, 5),
      avgEngagementSeconds: ratio(num(m, 6), users),
    };
  }
  return result;
}

export function normalizeDaily(report: ApiReport | undefined): Ga4DailyRow[] {
  const daily = (report?.rows ?? []).map((row) => ({
    date: ga4Date(dim(row, 0)),
    sessions: num(row.metricValues, 0),
    keyEvents: num(row.metricValues, 1),
  }));
  return daily.sort((a, b) => a.date.localeCompare(b.date));
}

export function normalizeKeyEvents(report: ApiReport | undefined): Ga4KeyEventRow[] {
  return (report?.rows ?? [])
    .map((row) => ({ eventName: dim(row, 0), label: keyEventLabel(dim(row, 0)), count: num(row.metricValues, 0) }))
    .filter((row) => row.count > 0);
}

export const NO_LANDING_PAGE = "(sem página de entrada)";

// O GA4 separa "(not set)" de vazio; para quem lê, os dois são "sem página de entrada" e viram uma linha.
export function normalizeLandingPages(report: ApiReport | undefined): Ga4LandingPageRow[] {
  const byPage = new Map<string, Ga4LandingPageRow>();
  for (const row of report?.rows ?? []) {
    const hostName = dim(row, 0);
    const landingPage = isNotSet(dim(row, 1)) ? NO_LANDING_PAGE : dim(row, 1);
    const key = `${hostName}\n${landingPage}`;
    const current = byPage.get(key) ?? { hostName, landingPage, sessions: 0, engagedSessions: 0, keyEvents: 0, convertedSessions: 0 };
    const sessions = num(row.metricValues, 0);
    current.sessions += sessions;
    current.engagedSessions += num(row.metricValues, 1);
    current.keyEvents += num(row.metricValues, 2);
    current.convertedSessions += Math.round(num(row.metricValues, 3) * sessions);
    byPage.set(key, current);
  }
  return Array.from(byPage.values()).sort((a, b) => b.sessions - a.sessions);
}

export const UNKNOWN_CITY = "(cidade não identificada)";

export function normalizeCities(report: ApiReport | undefined): Ga4CityRow[] {
  const byCity = new Map<string, Ga4CityRow>();
  for (const row of report?.rows ?? []) {
    const city = isNotSet(dim(row, 0)) ? UNKNOWN_CITY : dim(row, 0);
    const current = byCity.get(city) ?? { city, sessions: 0, keyEvents: 0, convertedSessions: 0 };
    const sessions = num(row.metricValues, 0);
    current.sessions += sessions;
    current.keyEvents += num(row.metricValues, 1);
    current.convertedSessions += Math.round(num(row.metricValues, 2) * sessions);
    byCity.set(city, current);
  }
  return Array.from(byCity.values()).sort((a, b) => b.sessions - a.sessions);
}

export function normalizeSources(report: ApiReport | undefined): Ga4SourceRow[] {
  return (report?.rows ?? []).map((row) => ({
    sourceMedium: dim(row, 0) || "(não definido)",
    sessions: num(row.metricValues, 0),
    users: num(row.metricValues, 1),
    keyEvents: num(row.metricValues, 2),
  }));
}

// "(not set)" são as sessões que não vieram do Google Ads: ficam fora da lista de campanhas.
// Com dois períodos, a última dimensão diz a qual período a linha pertence.
export function normalizeCampaigns(report: ApiReport | undefined): { campaigns: Ga4CampaignRow[]; previous: AdTotals } {
  const campaigns: Ga4CampaignRow[] = [];
  const previous: AdTotals = { adCost: 0, adClicks: 0, adImpressions: 0 };
  for (const row of report?.rows ?? []) {
    if (isNotSet(dim(row, 0))) continue;
    if (dim(row, 1) === "previous") {
      previous.adCost += num(row.metricValues, 0);
      previous.adClicks += num(row.metricValues, 1);
      previous.adImpressions += num(row.metricValues, 2);
      continue;
    }
    campaigns.push({
      campaign: dim(row, 0),
      cost: num(row.metricValues, 0),
      clicks: num(row.metricValues, 1),
      impressions: num(row.metricValues, 2),
      sessions: num(row.metricValues, 3),
      keyEvents: num(row.metricValues, 4),
    });
  }
  return { campaigns, previous };
}

// ─── Relatório com cache ────────────────────────────────────────────────────
const reportCache = new Map<string, { data: Ga4Report; expiresAt: number }>();
const inFlight = new Map<string, Promise<Ga4Report>>();

export function clearGa4Cache(): void {
  reportCache.clear();
  inFlight.clear();
  cachedToken = null;
}

async function fetchGa4Report(property: Ga4PropertyRef, start: string, end: string): Promise<Ga4Report> {
  const path = `properties/${property.propertyId}`;
  const [main, cityReport, campaignResult] = await Promise.all([
    callDataApi<{ reports?: ApiReport[] }>(`${path}:batchRunReports`, {
      requests: buildMainReportRequests(start, end, property.hostnames),
    }),
    callDataApi<ApiReport>(`${path}:runReport`, buildCityReportRequest(start, end, property.hostnames)),
    callDataApi<ApiReport>(`${path}:runReport`, buildCampaignReportRequest(start, end)).then(
      (report) => ({ report, error: null as string | null }),
      (error: unknown) => ({ report: undefined, error: error instanceof Error ? error.message : "Falha ao consultar campanhas." }),
    ),
  ]);

  const [totalsReport, dailyReport, landingReport, sourceReport, keyEventReport] = main.reports ?? [];
  const totals = normalizeTotals(totalsReport);
  const { campaigns, previous: previousAds } = normalizeCampaigns(campaignResult.report);
  const previous = previousRange(start, end);
  return {
    propertyId: property.propertyId,
    start,
    end,
    previousStart: previous.start,
    previousEnd: previous.end,
    currency: campaignResult.report?.metadata?.currencyCode ?? totalsReport?.metadata?.currencyCode ?? null,
    totals: {
      ...totals.current,
      adCost: campaigns.reduce((sum, row) => sum + row.cost, 0),
      adClicks: campaigns.reduce((sum, row) => sum + row.clicks, 0),
      adImpressions: campaigns.reduce((sum, row) => sum + row.impressions, 0),
    },
    previousTotals: { ...totals.previous, ...previousAds },
    daily: normalizeDaily(dailyReport),
    keyEventsByName: normalizeKeyEvents(keyEventReport),
    landingPages: normalizeLandingPages(landingReport),
    cities: normalizeCities(cityReport),
    sources: normalizeSources(sourceReport),
    campaigns,
    campaignsError: campaignResult.error,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getGa4Report(property: Ga4PropertyRef, start: string, end: string, { fresh = false } = {}): Promise<Ga4Report> {
  const key = `${property.propertyId}|${property.hostnames.join(",")}|${start}|${end}`;
  const cached = reportCache.get(key);
  if (!fresh && cached && Date.now() < cached.expiresAt) return cached.data;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetchGa4Report(property, start, end)
    .then((data) => {
      reportCache.set(key, { data, expiresAt: Date.now() + REPORT_TTL_MS });
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/**
 * Confere, antes de salvar o vínculo, se a conta de serviço enxerga a propriedade (consulta mínima
 * de um dia). Sem credencial configurada não há como conferir: devolve false e o vínculo é salvo.
 */
export async function verifyGa4PropertyAccess(propertyId: string): Promise<boolean> {
  if (!isGa4Configured()) return false;
  const today = new Date().toISOString().slice(0, 10);
  await callDataApi(`properties/${propertyId}:runReport`, {
    dateRanges: [{ startDate: today, endDate: today }],
    metrics: [metric("sessions")],
    limit: 1,
  });
  return true;
}
