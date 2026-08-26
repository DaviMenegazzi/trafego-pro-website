import { listEvolutionInstancesSupabase, listEvolutionLeadsForAiClassificationSupabase, type EvolutionCrmStage } from "./evolutionSupabaseStore.js";
import { getAuthedSupabase } from "./supabase.js";

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
  const sb = await getAuthedSupabase();
  if (!sb) throw new Error("Leitura técnica do Supabase não configurada");
  const { data, error } = await sb.from("clients").select("id,name").in("id", unitIds).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function getExternalAiUnit(unitId: string): Promise<{ id: string; name: string }> {
  const units = await listExternalAiUnits([unitId]);
  if (!units[0]) throw new Error("Unidade não encontrada ou não autorizada");
  return units[0];
}

export async function getExternalAiMetrics(unitId: string, start: string, end: string) {
  const sb = await getAuthedSupabase();
  if (!sb) throw new Error("Leitura técnica do Supabase não configurada");
  const { data, error } = await sb.from("vw_meta_ads_daily_summary").select("date_start,total_spend,total_conversas_iniciadas,total_leads_meta,total_impressions,impressions,total_clicks,clicks").eq("client_id", unitId).gte("date_start", start).lte("date_start", end).order("date_start", { ascending: true });
  if (error) throw new Error(error.message);
  return summarizeExternalAiMetrics((data ?? []) as MetricRow[], start, end);
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
