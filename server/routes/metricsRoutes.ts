import { Router, type Request } from "express";
import {
  getSupabaseForRequest,
  isAdmin,
  isAdminRole,
  listDashboardClientsFromSupabase,
  requireAdmin,
  requireAuth,
  type SupabaseDashboardClient,
} from "../auth.js";
import {
  getLastKnownClients,
  getMetaDirectCampaigns,
  getMetaDirectClients,
  getMetaDirectDaily,
  getMetaDirectOffers,
  getMetaDirectSuspensionRemainingMs,
  isMetaDirectActive,
  isMetaDirectEnabled,
  isMetaDirectSuspended,
  isUserAllowedForMetaAccount,
  normalizeUnitString,
  KNOWN_DEFAULT_CLIENTS,
} from "../metaDirectService.js";
import { isSupabaseConfigured } from "../supabase.js";
import { validateMetricsClientSelection } from "../metricsAccess.js";
import {
  buildGlobalAnalyticsReport,
  buildPredictiveUnitProfile,
  type DailyMetric,
} from "../trafficAnalyticsEngine.js";
import {
  getDailyBackupStatus,
  recordClientAccess,
  runDailyMetricsBackupRoutine,
} from "../dailyMetricsBackupService.js";

export const metricsRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────
export function extractLatestSyncedAt(rows: Array<Record<string, any>>): string | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let latest: string | null = null;
  for (const r of rows) {
    const ts = r.synced_at || r.date_stop || r.date_start || r.created_at || r.updated_at;
    if (ts) {
      const str = String(ts);
      if (!latest || str > latest) {
        latest = str;
      }
    }
  }
  return latest;
}

export function normalizeRawOfferRow(row: Record<string, any>) {
  const totalSpend = Number(row.spend ?? row.total_spend ?? 0);
  const totalConversas = Number(row.conversations_started ?? row.total_conversas_iniciadas ?? 0);
  const custoPorConversa =
    row.cost_per_conversation ??
    row.custo_por_conversa ??
    (totalConversas > 0 ? totalSpend / totalConversas : null);
  const status = row.offer_status;

  let performanceStatus = "Sem classificação";
  if (totalSpend === 0 && totalConversas > 0) performanceStatus = "Residual";
  else if (totalSpend > 0 && totalConversas === 0) performanceStatus = "Sem conversas";
  else if (custoPorConversa != null) {
    const custo = Number(custoPorConversa);
    if (custo < 5) performanceStatus = "Excelente";
    else if (custo < 9) performanceStatus = "Positivo";
    else if (custo < 13) performanceStatus = "Atenção";
    else performanceStatus = "Crítico";
  }

  return {
    ...row,
    total_spend: totalSpend,
    total_conversas_iniciadas: totalConversas,
    total_leads_meta: row.leads_meta ?? row.total_leads_meta ?? 0,
    alcance: row.reach ?? row.alcance ?? 0,
    total_impressions: row.impressions ?? row.total_impressions ?? 0,
    total_clicks: row.clicks ?? row.total_clicks ?? 0,
    total_link_clicks: row.inline_link_clicks ?? row.total_link_clicks ?? 0,
    avg_ctr: row.ctr ?? row.avg_ctr ?? 0,
    avg_cpc: row.cpc ?? row.avg_cpc ?? 0,
    avg_cpm: row.cpm ?? row.avg_cpm ?? 0,
    custo_por_conversa: custoPorConversa,
    status_formatado:
      status === "ACTIVE"
        ? "Ativa"
        : ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(status)
          ? "Pausada"
          : status ?? null,
    performance_status: performanceStatus,
  };
}

export async function checkUserHasMetaAccountAccess(req: Request, clientId: string): Promise<boolean> {
  if (!req.claims) return false;
  if (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*")) {
    return true;
  }

  // 1. Verificação direta por id autorizado nas claims JWT
  const allowedIds = req.claims.allowedClientIds || [];
  if (allowedIds.includes(clientId) || allowedIds.includes(`act_${clientId}`)) {
    return true;
  }

  // 2. Consulta de clientes autorizados via Supabase
  const sb = getSupabaseForRequest(req);
  let authorizedClients: SupabaseDashboardClient[] = [];
  if (sb) {
    const result = await listDashboardClientsFromSupabase(sb, req.claims);
    authorizedClients = result.clients || [];
    if (
      authorizedClients.some(
        (c) => String(c.id) === clientId || normalizeUnitString(c.name) === normalizeUnitString(clientId),
      )
    ) {
      return true;
    }
  }

  // 3. Consulta protegida ao catálogo Meta
  let allMeta: any[] = [];
  try {
    allMeta = await getMetaDirectClients();
  } catch {
    allMeta = getLastKnownClients() || [];
  }

  const targetAcc = allMeta.find(
    (c) => c.id === clientId || c.account_id === clientId || `act_${c.account_id}` === clientId,
  );
  if (!targetAcc) {
    return false;
  }

  return isUserAllowedForMetaAccount(targetAcc, authorizedClients, req.claims);
}

// ─── GET /api/metrics/status ────────────────────────────────────────────────
metricsRouter.get("/metrics/status", requireAuth, (_req, res) => {
  res.json({
    configured: isMetaDirectEnabled() || isSupabaseConfigured(),
    metaDirectActive: isMetaDirectActive(),
    metaDirectSuspended: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
  });
});

// ─── GET /api/metrics/clients ───────────────────────────────────────────────
metricsRouter.get("/metrics/clients", requireAuth, async (req, res) => {
  try {
    const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

    if (isMetaDirectActive()) {
      try {
        const allMetaClients = await getMetaDirectClients();
        if (allMetaClients && allMetaClients.length > 0) {
          if (isFullAdmin) {
            res.json({
              configured: true,
              clients: allMetaClients,
              source: "meta_direct",
              rateLimited: false,
              cooldownRemainingSeconds: 0,
            });
            return;
          }

          const sb = getSupabaseForRequest(req);
          let authorizedClients: SupabaseDashboardClient[] = [];
          if (sb && req.claims) {
            const result = await listDashboardClientsFromSupabase(sb, req.claims);
            authorizedClients = result.clients || [];
          }

          const filteredClients = allMetaClients.filter((metaAcc) =>
            isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
          );

          res.json({
            configured: true,
            clients: filteredClients,
            source: "meta_direct",
            rateLimited: false,
            cooldownRemainingSeconds: 0,
          });
          return;
        }
      } catch (err: any) {
        console.warn(
          "[meta-direct] Falha ou rate limit ao listar clientes Meta, redirecionando para Supabase:",
          err.message,
        );
      }
    }

    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(401).json({ error: "Sessão Supabase expirada" });
      return;
    }

    let clients: SupabaseDashboardClient[] = [];
    if (req.claims) {
      const result = await listDashboardClientsFromSupabase(sb, req.claims);
      clients = result.clients || [];
    }

    // Se o Supabase estiver vazio ou indisponível, faz fallback para as unidades conhecidas
    if (clients.length === 0) {
      if (isFullAdmin) {
        clients = KNOWN_DEFAULT_CLIENTS.map((c) => ({
          id: c.id,
          name: c.name,
          client_group: c.client_group,
        }));
      } else if (req.claims?.allowedClientIds) {
        const allowed = req.claims.allowedClientIds;
        clients = KNOWN_DEFAULT_CLIENTS.filter((c) =>
          allowed.includes(c.id) ||
          (c.account_id && allowed.includes(c.account_id)) ||
          (c.account_id && allowed.includes(`act_${c.account_id}`))
        ).map((c) => ({ id: c.id, name: c.name, client_group: c.client_group }));
      }
    }

    res.json({
      configured: true,
      clients,
      source: "supabase",
      rateLimited: isMetaDirectSuspended(),
      cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha inesperada ao carregar unidades";
    console.error("[metrics/clients] Falha ao carregar unidades:", message);
    const fallback = KNOWN_DEFAULT_CLIENTS.map((c) => ({ id: c.id, name: c.name, client_group: c.client_group }));
    res.json({ configured: true, clients: fallback, source: "fallback" });
  }
});

// ─── GET /api/metrics/daily ─────────────────────────────────────────────────
metricsRouter.get("/metrics/daily", requireAuth, async (req, res) => {
  const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
  if (clientId) recordClientAccess(clientId);

  if (isMetaDirectActive() && clientId) {
    const allowed = await checkUserHasMetaAccountAccess(req, clientId);
    if (!allowed) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
    try {
      const rows = await getMetaDirectDaily(clientId, start, end);
      res.json({
        configured: true,
        rows,
        source: "meta_direct",
        rateLimited: false,
        cooldownRemainingSeconds: 0,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit ao carregar métricas diárias, usando fallback Supabase:",
        err.message,
      );
    }
  }

  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  if (clientId && req.claims && !isAdmin(req.claims)) {
    if (!req.claims.allowedClientIds.includes(clientId)) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
  }

  let q = sb.from("vw_meta_ads_daily_summary").select("*");

  if (req.claims && !isAdmin(req.claims)) {
    if (clientId) {
      q = q.eq("client_id", clientId);
    } else {
      q = q.in("client_id", req.claims.allowedClientIds);
    }
  } else if (clientId) {
    q = q.eq("client_id", clientId);
  }

  if (start) q = q.gte("date_start", start);
  if (end) q = q.lte("date_start", end);
  const { data, error } = await q.order("date_start", { ascending: true });
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  const rows = data ?? [];
  res.json({
    configured: true,
    rows,
    source: "supabase",
    rateLimited: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
    lastSyncedAt: extractLatestSyncedAt(rows),
  });
});

// ─── GET /api/metrics/campaigns ─────────────────────────────────────────────
metricsRouter.get("/metrics/campaigns", requireAuth, async (req, res) => {
  const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
  if (clientId) recordClientAccess(clientId);

  if (isMetaDirectActive() && clientId) {
    const allowed = await checkUserHasMetaAccountAccess(req, clientId);
    if (!allowed) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
    try {
      const rows = await getMetaDirectCampaigns(clientId, start, end);
      res.json({
        configured: true,
        rows,
        source: "meta_direct",
        rateLimited: false,
        cooldownRemainingSeconds: 0,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit ao carregar campanhas, usando fallback Supabase:",
        err.message,
      );
    }
  }

  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  if (clientId && req.claims && !isAdmin(req.claims)) {
    if (!req.claims.allowedClientIds.includes(clientId)) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
  }

  if (!isAdmin(req.claims!) && !clientId) {
    const allowed = req.claims!.allowedClientIds;
    const allRows: any[] = [];
    for (const cid of allowed) {
      const { data } = await sb.rpc("fn_campaign_period_summary", {
        p_client_id: cid,
        p_date_start: start ?? null,
        p_date_stop: end ?? null,
      });
      if (data) allRows.push(...data);
    }
    res.json({
      configured: true,
      rows: allRows,
      source: "supabase",
      rateLimited: isMetaDirectSuspended(),
      cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
      lastSyncedAt: extractLatestSyncedAt(allRows),
    });
    return;
  }

  const { data, error } = await sb.rpc("fn_campaign_period_summary", {
    p_client_id: clientId ?? null,
    p_date_start: start ?? null,
    p_date_stop: end ?? null,
  });
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  const rows = data ?? [];
  res.json({
    configured: true,
    rows,
    source: "supabase",
    rateLimited: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
    lastSyncedAt: extractLatestSyncedAt(rows),
  });
});

// ─── GET /api/metrics/dashboard-bundle ──────────────────────────────────────
// Endpoint otimizado que retorna métricas diárias e de campanhas em uma única requisição
metricsRouter.get("/metrics/dashboard-bundle", requireAuth, async (req, res) => {
  const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
  if (clientId) recordClientAccess(clientId);

  // 1. Caminho Meta Direct (se ativo e cliente especificado)
  if (isMetaDirectActive() && clientId) {
    const allowed = await checkUserHasMetaAccountAccess(req, clientId);
    if (!allowed) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }

    try {
      // Executa daily e campaigns em paralelo no servidor
      const [dailyRows, campaignRows] = await Promise.all([
        getMetaDirectDaily(clientId, start, end),
        getMetaDirectCampaigns(clientId, start, end),
      ]);

      res.json({
        configured: true,
        daily: dailyRows,
        campaigns: campaignRows,
        source: "meta_direct",
        rateLimited: false,
        cooldownRemainingSeconds: 0,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit no dashboard-bundle, usando fallback Supabase:",
        err.message,
      );
    }
  }

  // 2. Fallback Supabase
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }

  if (clientId && req.claims && !isAdmin(req.claims)) {
    if (!req.claims.allowedClientIds.includes(clientId)) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
  }

  try {
    const [dailyRes, campaignsRes] = await Promise.all([
      sb.rpc("fn_daily_period_summary", {
        p_client_id: clientId ?? null,
        p_date_start: start ?? null,
        p_date_stop: end ?? null,
      }),
      sb.rpc("fn_campaign_period_summary", {
        p_client_id: clientId ?? null,
        p_date_start: start ?? null,
        p_date_stop: end ?? null,
      }),
    ]);

    const dailyRows = dailyRes.data ?? [];
    const campaignRows = campaignsRes.data ?? [];
    const latestSynced = extractLatestSyncedAt(dailyRows) || extractLatestSyncedAt(campaignRows);

    res.json({
      configured: true,
      daily: dailyRows,
      campaigns: campaignRows,
      source: "supabase",
      rateLimited: isMetaDirectSuspended(),
      cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
      lastSyncedAt: latestSynced,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Erro ao consultar métricas" });
  }
});

// ─── GET /api/metrics/offers ────────────────────────────────────────────────
metricsRouter.get("/metrics/offers", requireAuth, async (req, res) => {
  const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
  if (clientId) recordClientAccess(clientId);

  if (isMetaDirectActive() && clientId) {
    const allowed = await checkUserHasMetaAccountAccess(req, clientId);
    if (!allowed) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
    try {
      const rows = await getMetaDirectOffers(clientId, start, end);
      res.json({
        configured: true,
        rows,
        source: "meta_direct",
        rateLimited: false,
        cooldownRemainingSeconds: 0,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit ao carregar ofertas, usando fallback Supabase:",
        err.message,
      );
    }
  }

  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const selectionError = validateMetricsClientSelection(clientId, req.claims);
  if (selectionError) {
    res.status(selectionError.status).json({ error: selectionError.error });
    return;
  }
  let q = sb.from("vw_meta_ads_offer_ads").select("*");
  q = q.eq("client_id", clientId);
  if (start) q = q.gte("date_start", start);
  if (end) q = q.lte("date_start", end);
  const { data, error } = await q.order("total_spend", { ascending: false });
  if (error) {
    res.status(502).json({ error: error.message });
    return;
  }
  const rows = data ?? [];
  res.json({
    configured: true,
    rows,
    source: "supabase",
    rateLimited: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
    lastSyncedAt: extractLatestSyncedAt(rows),
  });
});

// ─── GET /api/metrics/offers-rpc ────────────────────────────────────────────
metricsRouter.get("/metrics/offers-rpc", requireAuth, async (req, res) => {
  const { clientId, start, end } = req.query as { clientId?: string; start?: string; end?: string };
  if (clientId) recordClientAccess(clientId);

  if (isMetaDirectActive() && clientId) {
    const allowed = await checkUserHasMetaAccountAccess(req, clientId);
    if (!allowed) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
    try {
      const rows = await getMetaDirectOffers(clientId, start, end);
      res.json({
        configured: true,
        rows,
        source: "meta_direct",
        rateLimited: false,
        cooldownRemainingSeconds: 0,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit ao carregar ofertas (rpc), usando fallback Supabase:",
        err.message,
      );
    }
  }

  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const selectionError = validateMetricsClientSelection(clientId, req.claims);
  if (selectionError) {
    res.status(selectionError.status).json({ error: selectionError.error });
    return;
  }
  const { data, error } = await sb.rpc("fn_offers_by_period", {
    p_client_id: clientId,
    p_date_start: start ?? null,
    p_date_stop: end ?? null,
  });
  if (error) {
    if (error.message?.includes("fn_offers_by_period")) {
      let q = sb.from("vw_meta_ads_offer_ads").select("*");
      q = q.eq("client_id", clientId);
      if (start) q = q.gte("date_start", start);
      if (end) q = q.lte("date_start", end);
      const fallback = await q.order("total_spend", { ascending: false });
      if (!fallback.error) {
        const rows = fallback.data ?? [];
        res.json({
          configured: true,
          rows,
          source: "supabase",
          rateLimited: isMetaDirectSuspended(),
          cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
          lastSyncedAt: extractLatestSyncedAt(rows),
        });
        return;
      }

      let rawQuery = sb.from("meta_ads_offers").select("*").eq("client_id", clientId);
      if (start) rawQuery = rawQuery.gte("date_start", start);
      if (end) rawQuery = rawQuery.lte("date_start", end);
      const rawFallback = await rawQuery.order("spend", { ascending: false });
      if (rawFallback.error) {
        res.status(502).json({ error: fallback.error.message });
        return;
      }
      const rawRows = (rawFallback.data ?? []).map(normalizeRawOfferRow);
      res.json({
        configured: true,
        rows: rawRows,
        source: "supabase",
        rateLimited: isMetaDirectSuspended(),
        cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
        lastSyncedAt: extractLatestSyncedAt(rawRows),
      });
      return;
    }
    res.status(502).json({ error: error.message });
    return;
  }
  const rows = data ?? [];
  res.json({
    configured: true,
    rows,
    source: "supabase",
    rateLimited: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
    lastSyncedAt: extractLatestSyncedAt(rows),
  });
});

// ─── GET /api/metrics/units ─────────────────────────────────────────────────
metricsRouter.get("/metrics/units", requireAuth, async (req, res) => {
  const isFullAdmin = req.claims && (isAdminRole(req.claims.role) || req.claims.allowedClientIds.includes("*"));

  if (isMetaDirectActive()) {
    try {
      const allMetaClients = await getMetaDirectClients();
      let clients = allMetaClients;

      if (!isFullAdmin) {
        const sb = getSupabaseForRequest(req);
        let authorizedClients: SupabaseDashboardClient[] = [];
        if (sb && req.claims) {
          const result = await listDashboardClientsFromSupabase(sb, req.claims);
          authorizedClients = result.clients || [];
        }
        clients = allMetaClients.filter((metaAcc) =>
          isUserAllowedForMetaAccount(metaAcc, authorizedClients, req.claims),
        );
      }

      const units = clients.map((c) => c.name);
      res.json({
        configured: true,
        source: "meta_direct",
        units,
        clients,
        rateLimited: false,
        cooldownRemainingSeconds: 0,
      });
      return;
    } catch (err: any) {
      console.warn(
        "[meta-direct] Falha ou rate limit ao listar unidades Meta, usando fallback Supabase:",
        err.message,
      );
    }
  }

  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const result = await listDashboardClientsFromSupabase(sb, req.claims!);
  if (result.error) {
    res.status(502).json({ error: result.error });
    return;
  }
  const units = result.clients.map((client) => client.name);
  res.json({
    configured: true,
    source: "supabase",
    units,
    clients: result.clients,
    rateLimited: isMetaDirectSuspended(),
    cooldownRemainingSeconds: Math.round(getMetaDirectSuspensionRemainingMs() / 1000),
  });
});

// ─── GET /api/analytics/predictive ──────────────────────────────────────────
metricsRouter.get("/analytics/predictive", requireAuth, requireAdmin, async (req, res) => {
  try {
    const unitId = typeof req.query.unit_id === "string" ? req.query.unit_id.trim() : "";
    if (!unitId) {
      res.status(400).json({ error: "Informe o unit_id da unidade" });
      return;
    }

    const allClients = isMetaDirectActive() ? await getMetaDirectClients().catch(() => []) : [];
    const clientObj = allClients.find((c) => c.id === unitId || c.account_id === unitId);
    const unitName = clientObj?.name || unitId;

    const metaAllowed =
      req.claims?.role === "admin" || (clientObj ? isUserAllowedForMetaAccount(clientObj, [], req.claims) : false);
    if (!metaAllowed) {
      res.status(403).json({ error: "Acesso não autorizado para esta unidade" });
      return;
    }

    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 30 * 86_400_000);
    const start = startDate.toISOString().slice(0, 10);

    let dailyMetrics: DailyMetric[] = [];

    if (isMetaDirectActive()) {
      try {
        const metaDaily = await getMetaDirectDaily(unitId, start, end);
        dailyMetrics = metaDaily.map((d) => ({
          date: d.date_start,
          spend: d.total_spend,
          leads: (d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0),
          impressions: d.total_impressions || 0,
          clicks: d.total_clicks || 0,
          cpl:
            (d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0) > 0
              ? d.total_spend / ((d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0))
              : 0,
        }));
      } catch (err: any) {
        console.warn("[analytics] Falha na leitura direta Meta para preditivo, usando Supabase:", err.message);
      }
    }

    if (dailyMetrics.length === 0) {
      const sb = getSupabaseForRequest(req);
      if (sb) {
        const { data } = await sb
          .from("vw_meta_ads_daily_summary")
          .select("date_start,total_spend,total_conversas_iniciadas,total_leads_meta,total_impressions,total_clicks")
          .eq("client_id", unitId)
          .gte("date_start", start)
          .lte("date_start", end)
          .order("date_start", { ascending: true });

        if (Array.isArray(data)) {
          dailyMetrics = data.map((d) => {
            const sp = Number(d.total_spend || 0);
            const ld = Number(d.total_conversas_iniciadas || 0) + Number(d.total_leads_meta || 0);
            return {
              date: String(d.date_start),
              spend: sp,
              leads: ld,
              impressions: Number(d.total_impressions || 0),
              clicks: Number(d.total_clicks || 0),
              cpl: ld > 0 ? sp / ld : 0,
            };
          });
        }
      }
    }

    const customTarget = typeof req.query.target === "string" ? Number(req.query.target) : undefined;
    const profile = buildPredictiveUnitProfile(unitId, unitName, dailyMetrics, customTarget, now);
    res.json(profile);
  } catch (error) {
    console.error("[analytics] Falha ao processar análise preditiva:", error);
    res.status(500).json({ error: "Não foi possível gerar a análise preditiva" });
  }
});

// ─── GET /api/analytics/overview ────────────────────────────────────────────
metricsRouter.get("/analytics/overview", requireAuth, requireAdmin, async (req, res) => {
  try {
    const allClients = isMetaDirectActive() ? await getMetaDirectClients().catch(() => []) : [];
    if (allClients.length === 0) {
      const sb = getSupabaseForRequest(req);
      let sbClients: SupabaseDashboardClient[] = [];
      if (sb) {
        const resList = await listDashboardClientsFromSupabase(sb, req.claims!);
        sbClients = resList.clients || [];
      }
      if (sbClients.length === 0) {
        res.json({
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          totalUnits: 0,
          daysLeftInMonth: 1,
          totalMonthSpend: 0,
          totalMonthLeads: 0,
          avgNetworkCpl: 0,
          totalNetworkTarget: 0,
          networkGoalPacePct: 0,
          summary: { criticalUnitsCount: 0, warningUnitsCount: 0, healthyUnitsCount: 0 },
          rankedProfiles: [],
          whatsAppConsolidatedReport: "Sem unidades cadastradas.",
        });
        return;
      }
    }

    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

    const isFullAdmin = req.claims?.role === "admin";
    const allowedClients = isFullAdmin
      ? allClients
      : allClients.filter((c) => isUserAllowedForMetaAccount(c, [], req.claims));

    const profiles = await Promise.all(
      allowedClients.map(async (c) => {
        let dailyMetrics: DailyMetric[] = [];
        if (isMetaDirectActive()) {
          const metaDaily = await getMetaDirectDaily(c.id, start, end).catch(() => []);
          dailyMetrics = metaDaily.map((d) => ({
            date: d.date_start,
            spend: d.total_spend,
            leads: (d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0),
            impressions: d.total_impressions || 0,
            clicks: d.total_clicks || 0,
            cpl:
              (d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0) > 0
                ? d.total_spend / ((d.total_conversas_iniciadas || 0) + (d.total_leads_meta || 0))
                : 0,
          }));
        }
        return buildPredictiveUnitProfile(c.id, c.name, dailyMetrics, undefined, now);
      }),
    );

    const report = buildGlobalAnalyticsReport(profiles, now);
    res.json(report);
  } catch (error) {
    console.error("[analytics] Falha ao processar visão geral analítica:", error);
    res.status(500).json({ error: "Não foi possível carregar a visão geral analítica" });
  }
});

// ─── GET /api/metrics/backup-status ─────────────────────────────────────────
metricsRouter.get("/metrics/backup-status", requireAuth, (_req, res) => {
  res.json(getDailyBackupStatus());
});

// ─── POST /api/metrics/backup-daily ─────────────────────────────────────────
metricsRouter.post("/metrics/backup-daily", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await runDailyMetricsBackupRoutine();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/metrics/image-proxy ───────────────────────────────────────────
// Proxy seguro para imagens de criativos (permite renderização de canvas em HD sem erro de CORS)
metricsRouter.get("/metrics/image-proxy", async (req, res) => {
  // Always set CORS headers so client fetch / html-to-image never triggers CORS violations
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  const TRANSPARENT_1PX_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC",
    "base64"
  );

  try {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== "string" || !rawUrl.startsWith("http")) {
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(TRANSPARENT_1PX_PNG);
      return;
    }

    const response = await fetch(rawUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.warn(`[image-proxy] Imagem externa indisponível (${response.status}):`, rawUrl);
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(TRANSPARENT_1PX_PNG);
      return;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error: any) {
    console.warn("[image-proxy] Erro ao carregar imagem externa:", error?.message || error);
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(TRANSPARENT_1PX_PNG);
  }
});
