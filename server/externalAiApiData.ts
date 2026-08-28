import { listEvolutionInstancesSupabase, listEvolutionLeadsForAiClassificationSupabase, type EvolutionCrmStage } from "./evolutionSupabaseStore.js";
import { getAuthedSupabase } from "./supabase.js";
import { isMetaDirectActive, isMetaDirectEnabled, getMetaDirectClients, getMetaDirectDaily, getMetaDirectOffers, getMetaDirectAvailableFunds } from "./metaDirectService.js";

type MetricRow = Record<string, unknown>;
type MetricTotals = { spend: number; conversationsStarted: number; metaLeads: number; impressions: number; clicks: number };
const numeric = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

export function summarizeExternalAiMetrics(rows: MetricRow[], start: string, end: string) {
  const totals = rows.reduce<MetricTotals>((value, row) => ({
    spend: value.spend + numeric(row.total_spend),
    conversationsStarted: value.conversationsStarted + numeric(row.total_conversas_iniciadas),
    metaLeads: value.metaLeads + numeric(row.total_leads_meta),
    impressions: value.impressions + numeric(row.total_impressions ?? row.impressions),
    clicks: value.clicks + numeric(row.total_clicks ?? row.clicks),
  }), { spend: 0, conversationsStarted: 0, metaLeads: 0, impressions: 0, clicks: 0 });
  return {
    period: { start, end },
    totals: { ...totals, costPerConversation: totals.conversationsStarted ? totals.spend / totals.conversationsStarted : null, cpc: totals.clicks ? totals.spend / totals.clicks : null, ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : null },
    daily: rows.map((row) => ({ date: String(row.date_start ?? ""), spend: numeric(row.total_spend), conversationsStarted: numeric(row.total_conversas_iniciadas), metaLeads: numeric(row.total_leads_meta), impressions: numeric(row.total_impressions ?? row.impressions), clicks: numeric(row.total_clicks ?? row.clicks) })),
  };
}

export async function listExternalAiUnits(unitIds: string[]): Promise<Array<{ id: string; name: string }>> {
  if (!unitIds.length) return [];
  if (isMetaDirectActive()) {
    const allMeta = await getMetaDirectClients().catch(() => []);
    const idSet = new Set(unitIds);
    const matched = allMeta.filter((c) => idSet.has(c.id) || idSet.has(c.account_id));
    if (matched.length > 0) {
      return matched.map((c) => ({ id: c.id, name: c.name }));
    }
  }
  const sb = await getAuthedSupabase();
  if (!sb) throw new Error("Leitura técnica do Supabase não configurada");
  const { data, error } = await sb.from("clients").select("id,name").in("id", unitIds).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function getExternalAiUnit(unitId: string): Promise<{ id: string; name: string }> {
  if (isMetaDirectActive()) {
    const allMeta = await getMetaDirectClients().catch(() => []);
    const matched = allMeta.find((c) => c.id === unitId || c.account_id === unitId);
    if (matched) return { id: matched.id, name: matched.name };
  }
  const units = await listExternalAiUnits([unitId]);
  if (!units[0]) throw new Error("Unidade não encontrada ou não autorizada");
  return units[0];
}

export async function getExternalAiMetrics(unitId: string, start: string, end: string) {
  if (isMetaDirectActive()) {
    try {
      const [daily, availableFunds] = await Promise.all([
        getMetaDirectDaily(unitId, start, end),
        getMetaDirectAvailableFunds(unitId).catch(() => null),
      ]);
      return { ...summarizeExternalAiMetrics(daily as unknown as MetricRow[], start, end), availableFunds };
    } catch (err: any) {
      console.warn("[external-ai] Falha ao consultar métricas Meta, usando Supabase:", err.message);
    }
  }
  const sb = await getAuthedSupabase();
  if (!sb) throw new Error("Leitura técnica do Supabase não configurada");
  const { data, error } = await sb.from("vw_meta_ads_daily_summary").select("date_start,total_spend,total_conversas_iniciadas,total_leads_meta,total_impressions,impressions,total_clicks,clicks").eq("client_id", unitId).gte("date_start", start).lte("date_start", end).order("date_start", { ascending: true });
  if (error) throw new Error(error.message);
  return { ...summarizeExternalAiMetrics((data ?? []) as MetricRow[], start, end), availableFunds: null };
}

const crmStages: EvolutionCrmStage[] = ["lead_not_responded", "lead_responded", "follow_up", "lead_replied", "negotiation", "closed_won", "closed_lost"];

async function unitEvolutionLeads(unitName: string) {
  const [instances, leads] = await Promise.all([listEvolutionInstancesSupabase(), listEvolutionLeadsForAiClassificationSupabase()]);
  const instanceNames = new Set(instances.filter((instance) => instance.unitName === unitName).map((instance) => instance.instanceName));
  return { instanceCount: instanceNames.size, leads: leads.filter((lead) => instanceNames.has(lead.instanceName)) };
}

export async function getExternalAiLeadSummary(unitName: string) {
  const { instanceCount, leads } = await unitEvolutionLeads(unitName);
  return {
    instanceCount,
    totalLeads: leads.length,
    classifications: { pendente: leads.filter((lead) => lead.classification === "pendente").length, lead: leads.filter((lead) => lead.classification === "lead").length, naoLead: leads.filter((lead) => lead.classification === "nao_lead").length },
    origins: { meta: leads.filter((lead) => lead.originPlatform === "meta").length, googleAds: leads.filter((lead) => lead.originPlatform === "google_ads").length, mixed: leads.filter((lead) => lead.originPlatform === "mixed").length, unknown: leads.filter((lead) => lead.originPlatform === "unknown").length },
  };
}

export async function getExternalAiCrmSummary(unitName: string) {
  const { instanceCount, leads } = await unitEvolutionLeads(unitName);
  return { instanceCount, totalLeads: leads.length, stages: Object.fromEntries(crmStages.map((stage) => [stage, leads.filter((lead) => lead.crmStage === stage).length])) as Record<EvolutionCrmStage, number> };
}

export async function getExternalAiAdsMetrics(unitId: string, start: string, end: string) {
  if (!isMetaDirectActive()) return { data: [], sourceStatus: "pending_provider_integration" };
  try {
    const unit = await getExternalAiUnit(unitId);
    const rows = await getMetaDirectOffers(unitId, start, end);
    return { sourceStatus: "meta", data: rows.map((row) => ({ date: row.date_start, platform: "meta", account_id: row.account_id, unit_id: unit.id, unit_name: unit.name, campaign_id: row.campaign_id, campaign_name: row.campaign_name, adset_id: row.adset_id, adset_name: row.adset_name, ad_id: row.ad_id, ad_name: row.ad_name, creative_id: row.creative_id, spend: row.total_spend, impressions: row.total_impressions, reach: row.alcance, clicks: row.total_clicks, landing_page_views: null, video_views: null, frequency: row.frequency, leads: row.total_leads_meta, qualified_leads: null, contacted_leads: null, scheduled_leads: null, attended_leads: null, sales: null, revenue: null })) };
  } catch {
    return { data: [], sourceStatus: "pending_provider_integration" };
  }
}

export async function getExternalAiCreatives(unitId?: string) {
  if (!unitId || !isMetaDirectActive()) return { creatives: [], sourceStatus: "pending_provider_integration" };
  try {
    const rows = await getMetaDirectOffers(unitId);
    return { sourceStatus: "meta", creatives: rows.map((row) => ({ creative_id: row.creative_id, ad_id: row.ad_id, creative_name: row.creative_name, format: null, angle: null, hook: null, offer: row.offer_name, cta: null })) };
  } catch {
    return { creatives: [], sourceStatus: "pending_provider_integration" };
  }
}
