import "./env.js";
import { resilientFetch } from "./resilientFetch.js";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de cache em memória para métricas
export const CLIENTS_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutos para lista de clientes/contas
export const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos de cooldown em rate limit

export type MetaDashboardClient = {
  id: string;
  name: string;
  client_group: string | null;
  account_id: string;
  status: number;
};

export type MetaDailyRow = {
  date_start: string;
  date_stop?: string;
  client_id: string;
  total_spend: number;
  total_conversas_iniciadas: number;
  total_messaging_connections: number;
  total_leads_meta: number;
  total_impressions: number;
  total_clicks: number;
  total_primeiras_respostas?: number;
  total_conversas_respondidas?: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  custo_por_conversa: number;
  reach?: number;
  frequency?: number;
  avg_frequency?: number;
};

export type MetaCampaignRow = {
  campaign_id: string;
  campaign_name: string;
  status: string;
  total_spend: number;
  total_conversas_iniciadas: number;
  custo_por_conversa: number | null;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
};

export type MetaOfferRow = {
  id: string;
  account_id: string;
  date_start: string | null;
  date_stop: string | null;
  synced_at: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string;
  ad_name: string;
  creative_id: string | null;
  creative_name: string | null;
  offer_name: string | null;
  offer_status: string | null;
  status_formatado: string;
  performance_status: string;
  performance_reason: string | null;
  ad_image_url: string | null;
  total_spend: number;
  total_conversas_iniciadas: number;
  total_messaging_connections: number;
  total_leads_meta: number;
  alcance: number;
  total_impressions: number;
  total_clicks: number;
  total_link_clicks: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  custo_por_conversa: number | null;
  cpl_meta: number | null;
  frequency: number;
};

// ─── Cache em Memória & In-Flight Request Coalescing ─────────────────────────
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();
let lastKnownClientsSnapshot: MetaDashboardClient[] | null = null;
let metaRateLimitSuspendedUntil = 0;

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearMetaCache(): void {
  memoryCache.clear();
  inFlightPromises.clear();
}

/**
 * Agrupa requisições simultâneas com a mesma chave em uma única Promise em andamento.
 */
export async function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightPromises.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

export function getLastKnownClients(): MetaDashboardClient[] | null {
  return lastKnownClientsSnapshot;
}

// ─── Rate Limit & Circuit Breaker ───────────────────────────────────────────
export class MetaRateLimitError extends Error {
  readonly isRateLimit = true;
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS) {
    super(message);
    this.name = "MetaRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function isMetaRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err instanceof MetaRateLimitError || err.isRateLimit) return true;

  const msg = String(err.message || err.error?.message || err).toLowerCase();
  const code = Number(err.code || err.error?.code || 0);
  const subcode = Number(err.error_subcode || err.error?.error_subcode || 0);

  return (
    code === 17 ||
    code === 80004 ||
    code === 613 ||
    code === 4 ||
    code === 32 ||
    subcode === 2446079 ||
    msg.includes("too many calls") ||
    msg.includes("wait a bit and try again") ||
    msg.includes("rate limit") ||
    msg.includes("request limit reached") ||
    msg.includes("calls to this api have exceeded") ||
    msg.includes("reduce the amount of data")
  );
}

export function triggerMetaRateLimitCooldown(
  reason?: string,
  cooldownMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS,
): void {
  metaRateLimitSuspendedUntil = Date.now() + cooldownMs;
  console.warn(
    `[meta-direct] Meta Graph API Rate Limit acionado (${reason || "Muitas chamadas simultâneas"}). Suspendendo chamadas diretas por ${Math.round(
      cooldownMs / 1000,
    )}s e ativando fallback no Supabase.`,
  );
}

export function isMetaDirectSuspended(): boolean {
  return Date.now() < metaRateLimitSuspendedUntil;
}

export function getMetaDirectSuspensionRemainingMs(): number {
  return Math.max(0, metaRateLimitSuspendedUntil - Date.now());
}

export function clearMetaRateLimitCooldown(): void {
  metaRateLimitSuspendedUntil = 0;
}

// ─── Token & Config ──────────────────────────────────────────────────────────
export function getMetaDirectToken(): string | null {
  // META_ADS_VALIDATION_TOKEN é o token Meta de leitura já validado e usado
  // pela dashboard. META_DIRECT_TOKEN permanece como substituição explícita
  // caso seja necessário separar os acessos no futuro.
  return process.env.META_DIRECT_TOKEN || process.env.META_ADS_VALIDATION_TOKEN || null;
}

export function isMetaDirectEnabled(): boolean {
  return Boolean(getMetaDirectToken());
}

export function isMetaDirectActive(): boolean {
  return isMetaDirectEnabled() && !isMetaDirectSuspended();
}

export function normalizeAccountId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

// ─── Action Parsers ──────────────────────────────────────────────────────────
type MetaAction = { action_type: string; value: string | number };

export function parseMetaActions(actions?: MetaAction[]) {
  if (!Array.isArray(actions)) {
    return {
      conversasIniciadas: 0,
      messagingConnections: 0,
      leadsMeta: 0,
      linkClicks: 0,
      firstReply: 0,
    };
  }

  let conversasIniciadas = 0;
  let messagingConnections = 0;
  let leadsMeta = 0;
  let linkClicks = 0;
  let firstReply = 0;

  for (const a of actions) {
    const val = Number(a.value || 0);
    const type = a.action_type;

    if (type === "onsite_conversion.messaging_conversation_started_7d") {
      conversasIniciadas += val;
    } else if (type === "onsite_conversion.total_messaging_connection") {
      messagingConnections += val;
    } else if (type === "onsite_conversion.messaging_first_reply") {
      firstReply += val;
    } else if (type === "lead" || type === "offsite_conversion.fb_pixel_lead" || type === "onsite_conversion.lead_grouped") {
      leadsMeta += val;
    } else if (type === "link_click") {
      linkClicks += val;
    }
  }

  // Fallback: se não tiver conversas_started específicas mas tiver messaging_connections
  if (conversasIniciadas === 0 && messagingConnections > 0) {
    conversasIniciadas = messagingConnections;
  }

  return { conversasIniciadas, messagingConnections, leadsMeta, linkClicks, firstReply };
}

export function calculatePerformanceStatus(spend: number, conversas: number): { status: string; reason: string | null } {
  if (spend > 0 && conversas === 0) {
    return { status: "Sem conversas", reason: "Houve investimento, mas nenhuma conversa foi iniciada no período." };
  }
  if (spend === 0 && conversas > 0) {
    return { status: "Residual", reason: "Oferta sem investimento atual, mas que ainda possui conversas registradas no período." };
  }
  if (conversas === 0 && spend === 0) {
    return { status: "Sem classificação", reason: "Dados insuficientes para classificar a performance." };
  }

  const cpl = spend / conversas;
  if (cpl < 5) {
    return { status: "Excelente", reason: "Custo por conversa abaixo de R$ 5,00." };
  }
  if (cpl <= 9) {
    return { status: "Positivo", reason: "Custo por conversa entre R$ 5,00 e R$ 9,00, com bom resultado e espaço para otimização." };
  }
  if (cpl <= 13) {
    return { status: "Atenção", reason: "Custo por conversa entre R$ 9,00 e R$ 13,00. Precisa ser acompanhada." };
  }
  return { status: "Crítico", reason: "Custo por conversa acima de R$ 13,00." };
}

export function normalizeUnitString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/vida\s*card/gi, "")
    .replace(/[-–—/|]/g, " ")
    .replace(/tupacireta/g, "tupancireta")
    .replace(/castilho\b/g, "castilhos")
    .replace(/\s+/g, " ")
    .trim();
}

export function standardizeUnitDisplayName(rawName: string): string {
  if (!rawName) return "";
  const cleaned = rawName
    .replace(/^CA\s*\d+\s*-\s*/i, "")
    .replace(/\|\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = cleaned.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (lower.includes("ijui")) return "Vida Card Ijuí";
  if (lower.includes("castilho")) return "Vida Card Júlio de Castilhos";
  if (lower.includes("tupan") || lower.includes("tupac")) return "Vida Card Tupanciretã";
  if (lower.includes("canela")) return "Vida Card Canela";
  if (lower.includes("lajeado")) return "Vida Card Lajeado";
  if (lower.includes("santa maria")) return "Vida Card Santa Maria";
  if (lower.includes("passo fundo")) return "Vida Card Passo Fundo";
  if (lower.includes("bento")) return "Vida Card Bento Gonçalves";
  if (lower.includes("alegrete")) return "Vida Card Alegrete";
  if (lower.includes("caxias")) return "Vida Card Caxias do Sul";
  if (lower.includes("uruguaiana")) return "Vida Card Uruguaiana";
  if (lower.includes("santo angelo")) return "Vida Card Santo Ângelo";
  if (lower.includes("itaqui")) return "Vida Card Itaqui";
  if (lower.includes("barreiro") || (lower.includes("bh") && lower.includes("card"))) return "Vida Card BH Barreiro";

  return cleaned;
}

export function isUserAllowedForMetaAccount(
  metaAcc: { id: string; name: string; account_id?: string },
  authorizedClients: { id: string | number; name: string }[],
  claims?: { role?: string; allowedClientIds?: string[] } | null,
): boolean {
  if (!claims) return false;
  if (claims.role === "admin" || (claims.allowedClientIds && claims.allowedClientIds.includes("*"))) {
    return true;
  }

  const allowedIds = claims.allowedClientIds || [];
  if (
    allowedIds.includes(metaAcc.id) ||
    (metaAcc.account_id && allowedIds.includes(metaAcc.account_id)) ||
    (metaAcc.account_id && allowedIds.includes(`act_${metaAcc.account_id}`))
  ) {
    return true;
  }

  const metaStd = standardizeUnitDisplayName(metaAcc.name);
  const metaNorm = normalizeUnitString(metaAcc.name);
  if (!metaNorm && !metaStd) return false;

  for (const authClient of authorizedClients) {
    if (allowedIds.includes(String(authClient.id))) {
      const authStd = standardizeUnitDisplayName(authClient.name);
      const authNorm = normalizeUnitString(authClient.name);

      if (
        (metaStd && authStd && metaStd === authStd) ||
        (metaNorm && authNorm && metaNorm === authNorm)
      ) {
        return true;
      }
    }
  }

  return false;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Lista todas as contas de anúncio às quais o token tem acesso.
 * Agrupa chamadas simultâneas (coalescing) e utiliza cache ampliado.
 */
async function fetchMetaDirectClients(): Promise<MetaDashboardClient[]> {
  const token = getMetaDirectToken();
  if (!token) return [];

  const cacheKey = "meta:clients:all";
  const cached = getCached<MetaDashboardClient[]>(cacheKey);
  if (cached) return cached;

  if (isMetaDirectSuspended()) {
    if (lastKnownClientsSnapshot && lastKnownClientsSnapshot.length > 0) {
      return lastKnownClientsSnapshot;
    }
    throw new MetaRateLimitError(
      "Integração Meta temporariamente suspensa por limite de requisições da Meta (cooldown ativo)",
    );
  }

  return dedupeInFlight(cacheKey, async () => {
    // Dupla verificação no cache após adquirir a trava in-flight
    const doubleCheck = getCached<MetaDashboardClient[]>(cacheKey);
    if (doubleCheck) return doubleCheck;

    try {
      let allAccounts: any[] = [];
      let nextUrl: string | null = `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,account_id,account_status,amount_spent&limit=100&access_token=${encodeURIComponent(token)}`;

      while (nextUrl) {
        const res: Response = await resilientFetch(nextUrl);
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || "Falha ao consultar contas de anúncio na Meta";
          if (isMetaRateLimitError(errData.error || errMsg)) {
            triggerMetaRateLimitCooldown(errMsg);
            if (lastKnownClientsSnapshot && lastKnownClientsSnapshot.length > 0) {
              return lastKnownClientsSnapshot;
            }
            throw new MetaRateLimitError(errMsg);
          }
          throw new Error(errMsg);
        }
        const data: any = await res.json();
        if (data.error && isMetaRateLimitError(data.error)) {
          triggerMetaRateLimitCooldown(data.error.message);
          if (lastKnownClientsSnapshot && lastKnownClientsSnapshot.length > 0) {
            return lastKnownClientsSnapshot;
          }
          throw new MetaRateLimitError(data.error.message);
        }
        if (Array.isArray(data.data)) {
          allAccounts = allAccounts.concat(data.data);
        }
        nextUrl = data.paging?.next || null;
      }

      // Deduplicação inteligente de contas (ex: contas reservas/antigas sem gasto)
      const dedupMap = new Map<string, { client: MetaDashboardClient; amountSpent: number }>();

      for (const acc of allAccounts) {
        if (!acc.name) continue;
        const isVidaCard = acc.name.toLowerCase().includes("vida card");
        const standardizedName = isVidaCard ? standardizeUnitDisplayName(acc.name) : acc.name.trim();
        const key = standardizedName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const spent = Number(acc.amount_spent ?? 0);

        const clientObj: MetaDashboardClient = {
          id: acc.id,
          name: standardizedName,
          client_group: isVidaCard ? "Vida Card" : "Outros Clientes",
          account_id: acc.account_id,
          status: Number(acc.account_status ?? 1),
        };

        const existing = dedupMap.get(key);
        if (!existing || spent > existing.amountSpent) {
          dedupMap.set(key, { client: clientObj, amountSpent: spent });
        }
      }

      const clients: MetaDashboardClient[] = Array.from(dedupMap.values())
        .map((item) => item.client)
        .sort((a, b) => {
          if (a.client_group === "Vida Card" && b.client_group !== "Vida Card") return -1;
          if (a.client_group !== "Vida Card" && b.client_group === "Vida Card") return 1;
          return a.name.localeCompare(b.name);
        });

      setCached(cacheKey, clients, CLIENTS_CACHE_TTL_MS);
      lastKnownClientsSnapshot = clients;
      return clients;
    } catch (err: any) {
      if (isMetaRateLimitError(err)) {
        triggerMetaRateLimitCooldown(err.message);
        if (lastKnownClientsSnapshot && lastKnownClientsSnapshot.length > 0) {
          return lastKnownClientsSnapshot;
        }
      }
      throw err;
    }
  });
}

export async function getMetaDirectClients(): Promise<MetaDashboardClient[]> {
  return fetchMetaDirectClients();
}

/**
 * Métricas Diárias da Conta para o Período com agrupamento in-flight e circuit breaker.
 */
export async function getMetaDirectDaily(
  accountId: string,
  start?: string,
  end?: string,
): Promise<MetaDailyRow[]> {
  const token = getMetaDirectToken();
  if (!token || !accountId) return [];

  const actId = normalizeAccountId(accountId);
  const cacheKey = `meta:daily:${actId}:${start ?? "all"}:${end ?? "all"}`;
  const cached = getCached<MetaDailyRow[]>(cacheKey);
  if (cached) return cached;

  if (isMetaDirectSuspended()) {
    throw new MetaRateLimitError("Meta Direct temporariamente suspenso por rate limit");
  }

  return dedupeInFlight(cacheKey, async () => {
    const doubleCheck = getCached<MetaDailyRow[]>(cacheKey);
    if (doubleCheck) return doubleCheck;

    let timeFilter = "";
    if (start && end) {
      timeFilter = `&time_range=${encodeURIComponent(JSON.stringify({ since: start, until: end }))}`;
    } else {
      timeFilter = `&date_preset=last_30d`;
    }

    const url = `${GRAPH_API_BASE}/${actId}/insights?time_increment=1${timeFilter}&fields=date_start,date_stop,spend,impressions,clicks,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type&limit=100&access_token=${encodeURIComponent(token)}`;

    try {
      const res = await resilientFetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Falha ao consultar métricas diárias na Meta";
        if (isMetaRateLimitError(errData.error || errMsg)) {
          triggerMetaRateLimitCooldown(errMsg);
          throw new MetaRateLimitError(errMsg);
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.error && isMetaRateLimitError(data.error)) {
        triggerMetaRateLimitCooldown(data.error.message);
        throw new MetaRateLimitError(data.error.message);
      }

      const rawList: any[] = Array.isArray(data.data) ? data.data : [];

      const rows: MetaDailyRow[] = rawList.map((item) => {
        const spend = Number(item.spend || 0);
        const impressions = Number(item.impressions || 0);
        const clicks = Number(item.clicks || 0);
        const reach = Number(item.reach || 0);
        const frequency = Number(item.frequency || 0);
        const ctr = Number(item.ctr || (impressions > 0 ? (clicks / impressions) * 100 : 0));
        const cpc = Number(item.cpc || (clicks > 0 ? spend / clicks : 0));
        const cpm = Number(item.cpm || (impressions > 0 ? (spend / impressions) * 1000 : 0));

        const actions = parseMetaActions(item.actions);
        const custoPorConversa = actions.conversasIniciadas > 0 ? spend / actions.conversasIniciadas : 0;

        return {
          date_start: item.date_start,
          date_stop: item.date_stop,
          client_id: actId,
          total_spend: spend,
          total_conversas_iniciadas: actions.conversasIniciadas,
          total_messaging_connections: actions.messagingConnections,
          total_leads_meta: actions.leadsMeta,
          total_impressions: impressions,
          total_clicks: clicks,
          avg_ctr: ctr,
          avg_cpc: cpc,
          avg_cpm: cpm,
          custo_por_conversa: custoPorConversa,
          reach,
          frequency,
        };
      });

      // Ordena cronologicamente
      rows.sort((a, b) => a.date_start.localeCompare(b.date_start));

      setCached(cacheKey, rows, CACHE_TTL_MS);
      return rows;
    } catch (err: any) {
      if (isMetaRateLimitError(err)) {
        triggerMetaRateLimitCooldown(err.message);
      }
      throw err;
    }
  });
}

/** Retorna apenas créditos disponíveis de contas pré-pagas, nunca saldo pós-pago. */
export async function getMetaDirectAvailableFunds(accountId: string): Promise<number | null> {
  const token = getMetaDirectToken();
  if (!token || !accountId) return null;
  const actId = normalizeAccountId(accountId);
  const cacheKey = `meta:available-funds:${actId}`;
  const cached = getCached<number | null>(cacheKey);
  if (cached !== null) return cached;
  const response = await fetch(`${GRAPH_API_BASE}/${actId}?fields=balance,spend_cap,amount_spent,funding_source_details&access_token=${encodeURIComponent(token)}`);
  if (!response.ok) return null;
  const data = await response.json() as { balance?: string | number; spend_cap?: string | number; amount_spent?: string | number; funding_source_details?: Record<string, unknown> };
  const funding = data.funding_source_details ?? {};
  const display = typeof funding.display_string === "string" ? Number(funding.display_string.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) : NaN;
  const credits = [display, funding.amount, funding.available_funds, funding.available_balance, funding.prepaid_balance, funding.remaining_balance]
    .map(Number).find(Number.isFinite);
  const spendCap = Number(data.spend_cap);
  const amountSpent = Number(data.amount_spent);
  const capRemaining = Number.isFinite(spendCap) && Number.isFinite(amountSpent) && spendCap > 0 ? (spendCap - amountSpent) / 100 : null;
  const rawBalance = Number(data.balance);
  const value = credits ?? capRemaining ?? (Number.isFinite(rawBalance) ? rawBalance / 100 : null);
  setCached(cacheKey, value, 5 * 60 * 1000);
  return value;
}

/**
 * Resumo por Campanha no Período com agrupamento in-flight e circuit breaker.
 */
export async function getMetaDirectCampaigns(
  accountId: string,
  start?: string,
  end?: string,
): Promise<MetaCampaignRow[]> {
  const token = getMetaDirectToken();
  if (!token || !accountId) return [];

  const actId = normalizeAccountId(accountId);
  const cacheKey = `meta:campaigns:${actId}:${start ?? "all"}:${end ?? "all"}`;
  const cached = getCached<MetaCampaignRow[]>(cacheKey);
  if (cached) return cached;

  if (isMetaDirectSuspended()) {
    throw new MetaRateLimitError("Meta Direct temporariamente suspenso por rate limit");
  }

  return dedupeInFlight(cacheKey, async () => {
    const doubleCheck = getCached<MetaCampaignRow[]>(cacheKey);
    if (doubleCheck) return doubleCheck;

    let insightsSubquery = "";
    if (start && end) {
      insightsSubquery = `insights.time_range(${JSON.stringify({ since: start, until: end })}){spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type}`;
    } else {
      insightsSubquery = `insights.date_preset(last_30d){spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type}`;
    }

    const url = `${GRAPH_API_BASE}/${actId}/campaigns?fields=id,name,status,effective_status,${insightsSubquery}&limit=100&access_token=${encodeURIComponent(token)}`;

    try {
      const res = await resilientFetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Falha ao consultar campanhas na Meta";
        if (isMetaRateLimitError(errData.error || errMsg)) {
          triggerMetaRateLimitCooldown(errMsg);
          throw new MetaRateLimitError(errMsg);
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.error && isMetaRateLimitError(data.error)) {
        triggerMetaRateLimitCooldown(data.error.message);
        throw new MetaRateLimitError(data.error.message);
      }

      const rawList: any[] = Array.isArray(data.data) ? data.data : [];

      const rows: MetaCampaignRow[] = rawList.map((c) => {
        const ins = c.insights?.data?.[0] || {};
        const spend = Number(ins.spend || 0);
        const impressions = Number(ins.impressions || 0);
        const clicks = Number(ins.clicks || 0);
        const ctr = Number(ins.ctr || (impressions > 0 ? (clicks / impressions) * 100 : 0));
        const cpc = Number(ins.cpc || (clicks > 0 ? spend / clicks : 0));
        const cpm = Number(ins.cpm || (impressions > 0 ? (spend / impressions) * 1000 : 0));

        const actions = parseMetaActions(ins.actions);
        const custoPorConversa = actions.conversasIniciadas > 0 ? spend / actions.conversasIniciadas : null;

        return {
          campaign_id: c.id,
          campaign_name: c.name,
          status: c.effective_status || c.status || "ACTIVE",
          total_spend: spend,
          total_conversas_iniciadas: actions.conversasIniciadas,
          custo_por_conversa: custoPorConversa,
          total_impressions: impressions,
          total_clicks: clicks,
          avg_ctr: ctr,
          avg_cpc: cpc,
          avg_cpm: cpm,
        };
      });

      // Ordena por conversas iniciadas desc, depois investimento desc
      rows.sort(
        (a, b) =>
          b.total_conversas_iniciadas - a.total_conversas_iniciadas ||
          b.total_spend - a.total_spend,
      );

      setCached(cacheKey, rows, CACHE_TTL_MS);
      return rows;
    } catch (err: any) {
      if (isMetaRateLimitError(err)) {
        triggerMetaRateLimitCooldown(err.message);
      }
      throw err;
    }
  });
}

export function extractBestCreativeImageUrl(creative?: any): string | null {
  if (!creative) return null;

  // 1. Imagem direta de alta resolução (1080x1080 / 1600x1600 da CDN Meta)
  if (creative.image_url) {
    return creative.image_url;
  }

  // 2. Thumbnail de vídeo em alta resolução do object_story_spec.video_data
  if (creative.object_story_spec?.video_data?.image_url) {
    return creative.object_story_spec.video_data.image_url;
  }

  // 3. Imagem do link do object_story_spec
  if (creative.object_story_spec?.link_data?.picture) {
    return creative.object_story_spec.link_data.picture;
  }
  if (creative.object_story_spec?.link_data?.image_url) {
    return creative.object_story_spec.link_data.image_url;
  }

  // 4. Imagem de criativo dinâmico (asset_feed_spec)
  if (Array.isArray(creative.asset_feed_spec?.images) && creative.asset_feed_spec.images[0]?.url) {
    return creative.asset_feed_spec.images[0].url;
  }

  // 5. Fallback final para thumbnail
  if (creative.thumbnail_url) {
    return creative.thumbnail_url;
  }

  return null;
}

/**
 * Anúncios & Criativos no Período com agrupamento in-flight e circuit breaker.
 */
export async function getMetaDirectOffers(
  accountId: string,
  start?: string,
  end?: string,
): Promise<MetaOfferRow[]> {
  const token = getMetaDirectToken();
  if (!token || !accountId) return [];

  const actId = normalizeAccountId(accountId);
  const cacheKey = `meta:offers:${actId}:${start ?? "all"}:${end ?? "all"}`;
  const cached = getCached<MetaOfferRow[]>(cacheKey);
  if (cached) return cached;

  if (isMetaDirectSuspended()) {
    throw new MetaRateLimitError("Meta Direct temporariamente suspenso por rate limit");
  }

  return dedupeInFlight(cacheKey, async () => {
    const doubleCheck = getCached<MetaOfferRow[]>(cacheKey);
    if (doubleCheck) return doubleCheck;

    let insightsSubquery = "";
    if (start && end) {
      insightsSubquery = `insights.time_range(${JSON.stringify({ since: start, until: end })}){spend,impressions,clicks,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type,date_start,date_stop}`;
    } else {
      insightsSubquery = `insights.date_preset(last_30d){spend,impressions,clicks,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type,date_start,date_stop}`;
    }

    const url = `${GRAPH_API_BASE}/${actId}/ads?fields=id,name,status,effective_status,campaign{id,name},adset{id,name},creative{id,name,image_url,thumbnail_url,object_story_spec,asset_feed_spec},${insightsSubquery}&limit=100&access_token=${encodeURIComponent(token)}`;

    try {
      const res: Response = await resilientFetch(url);
      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Falha ao consultar anúncios na Meta";
        if (isMetaRateLimitError(errData.error || errMsg)) {
          triggerMetaRateLimitCooldown(errMsg);
          throw new MetaRateLimitError(errMsg);
        }
        throw new Error(errMsg);
      }

      const data: any = await res.json();
      if (data.error && isMetaRateLimitError(data.error)) {
        triggerMetaRateLimitCooldown(data.error.message);
        throw new MetaRateLimitError(data.error.message);
      }

      const rawList: any[] = Array.isArray(data.data) ? data.data : [];

      const rows: MetaOfferRow[] = rawList.map((ad) => {
        const ins = ad.insights?.data?.[0] || {};
        const spend = Number(ins.spend || 0);
        const impressions = Number(ins.impressions || 0);
        const clicks = Number(ins.clicks || 0);
        const reach = Number(ins.reach || 0);
        const frequency = Number(ins.frequency || 0);
        const ctr = Number(ins.ctr || (impressions > 0 ? (clicks / impressions) * 100 : 0));
        const cpc = Number(ins.cpc || (clicks > 0 ? spend / clicks : 0));
        const cpm = Number(ins.cpm || (impressions > 0 ? (spend / impressions) * 1000 : 0));

        const actions = parseMetaActions(ins.actions);
        const custoPorConversa = actions.conversasIniciadas > 0 ? spend / actions.conversasIniciadas : null;
        const cplMeta = actions.leadsMeta > 0 ? spend / actions.leadsMeta : null;

        const perf = calculatePerformanceStatus(spend, actions.conversasIniciadas);
        const statusFormatado = (ad.effective_status || ad.status) === "ACTIVE" ? "Ativa" : "Pausada";

        const imageUrl = extractBestCreativeImageUrl(ad.creative);

        return {
          id: ad.id,
          account_id: actId,
          date_start: ins.date_start || start || null,
          date_stop: ins.date_stop || end || null,
          synced_at: new Date().toISOString(),
          campaign_id: ad.campaign?.id || null,
          campaign_name: ad.campaign?.name || null,
          adset_id: ad.adset?.id || null,
          adset_name: ad.adset?.name || null,
          ad_id: ad.id,
          ad_name: ad.name,
          creative_id: ad.creative?.id || null,
          creative_name: ad.creative?.name || null,
          offer_name: ad.name,
          offer_status: ad.status || null,
          status_formatado: statusFormatado,
          performance_status: perf.status,
          performance_reason: perf.reason,
          ad_image_url: imageUrl,
          total_spend: spend,
          total_conversas_iniciadas: actions.conversasIniciadas,
          total_messaging_connections: actions.messagingConnections,
          total_leads_meta: actions.leadsMeta,
          alcance: reach,
          total_impressions: impressions,
          total_clicks: clicks,
          total_link_clicks: actions.linkClicks,
          avg_ctr: ctr,
          avg_cpc: cpc,
          avg_cpm: cpm,
          custo_por_conversa: custoPorConversa,
          cpl_meta: cplMeta,
          frequency,
        };
      });

      // Ordena por conversas desc, depois gasto desc
      rows.sort(
        (a, b) =>
          (b.total_conversas_iniciadas ?? 0) - (a.total_conversas_iniciadas ?? 0) ||
          (b.total_spend ?? 0) - (a.total_spend ?? 0),
      );

      setCached(cacheKey, rows, CACHE_TTL_MS);
      return rows;
    } catch (err: any) {
      if (isMetaRateLimitError(err)) {
        triggerMetaRateLimitCooldown(err.message);
      }
      throw err;
    }
  });
}
