export type AdRow = {
  id: number;
  account_id: string | null;
  date_start: string | null;
  date_stop: string | null;
  synced_at: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  creative_id: string | null;
  creative_name: string | null;
  offer_name: string | null;
  offer_status: string | null;
  status_formatado: string | null;
  performance_status: string | null;
  performance_reason: string | null;
  ad_image_url: string | null;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  total_messaging_connections: number | null;
  total_leads_meta: number | null;
  alcance: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  total_link_clicks: number | null;
  avg_ctr: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
  custo_por_conversa: number | null;
  cpl_meta: number | null;
  frequency: number | null;
};

export type ConsolidatedAdRow = AdRow & {
  adset_names?: string[];
  ad_count?: number;
};

export function cleanDisplayName(r: { ad_name?: string | null; offer_name?: string | null; creative_name?: string | null }) {
  const candidates = [r.ad_name, r.offer_name, r.creative_name];
  for (const raw of candidates) {
    if (!raw) continue;
    let s = raw.trim();
    s = s.replace(/^[\[({].*?[\])}]\s*[-–—:|]?\s*/g, "");
    s = s.replace(/\s*[\[({].*?[\])}]$/g, "");
    s = s.replace(/\b[0-9a-f]{16,}\b/gi, "");
    s = s.replace(/\s{2,}/g, " ").trim();
    s = s.replace(/^[-–—:|]+|[-–—:|]+$/g, "").trim();
    if (s.length >= 3) return s;
  }
  return "Oferta sem nome";
}

export function calculateAdPerfStatus(spend: number, conv: number): { status: string; reason: string | null } {
  if (spend > 0 && conv === 0) return { status: "Sem conversas", reason: "Houve investimento, mas nenhuma conversa foi iniciada." };
  if (spend === 0 && conv > 0) return { status: "Residual", reason: "Oferta sem investimento atual, mas que ainda possui conversas registradas." };
  if (conv === 0 && spend === 0) return { status: "Sem classificação", reason: "Dados insuficientes para classificar a performance." };
  const cpl = spend / conv;
  if (cpl < 5) return { status: "Excelente", reason: "Custo por conversa abaixo de R$ 5,00." };
  if (cpl <= 9) return { status: "Positivo", reason: "Custo por conversa entre R$ 5,00 e R$ 9,00, com bom resultado e espaço para otimização." };
  if (cpl <= 13) return { status: "Atenção", reason: "Custo por conversa entre R$ 9,00 e R$ 13,00. Precisa ser acompanhada." };
  return { status: "Crítico", reason: "Custo por conversa acima de R$ 13,00." };
}

export function consolidateAdsList(ads: AdRow[]): ConsolidatedAdRow[] {
  const groups = new Map<string, AdRow[]>();

  for (const ad of ads) {
    const key = (cleanDisplayName(ad) || ad.ad_name || `ad_${ad.id}`).trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(ad);
  }

  const result: ConsolidatedAdRow[] = [];

  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      const single = group[0];
      result.push({
        ...single,
        adset_names: single.adset_name ? [single.adset_name] : [],
        ad_count: 1,
      });
      continue;
    }

    const primary = group[0];
    const totalSpend = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_spend) || 0), 0);
    const totalConversas = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_conversas_iniciadas) || 0), 0);
    const totalMessaging = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_messaging_connections) || 0), 0);
    const totalLeads = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_leads_meta) || 0), 0);
    const totalImpressions = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_impressions) || 0), 0);
    const totalClicks = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_clicks) || 0), 0);
    const totalLinkClicks = group.reduce((acc: number, a: AdRow) => acc + (Number(a.total_link_clicks) || 0), 0);
    const reach = group.reduce((acc: number, a: AdRow) => acc + (Number(a.alcance) || 0), 0);

    const custoPorConversa = totalConversas > 0 ? totalSpend / totalConversas : null;
    const cplMeta = totalLeads > 0 ? totalSpend / totalLeads : null;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    const anyActive = group.some((a: AdRow) => a.status_formatado === "Ativa" || a.offer_status === "ACTIVE");
    const statusFormatado = anyActive ? "Ativa" : "Pausada";

    const perf = calculateAdPerfStatus(totalSpend, totalConversas);
    const bestImage = group.find((a: AdRow) => a.ad_image_url)?.ad_image_url || primary.ad_image_url;
    const adsetNames = Array.from(new Set(group.map((a: AdRow) => a.adset_name).filter(Boolean) as string[]));

    result.push({
      ...primary,
      total_spend: totalSpend,
      total_conversas_iniciadas: totalConversas,
      total_messaging_connections: totalMessaging,
      total_leads_meta: totalLeads,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_link_clicks: totalLinkClicks,
      alcance: reach,
      custo_por_conversa: custoPorConversa,
      cpl_meta: cplMeta,
      avg_ctr: avgCtr,
      avg_cpc: avgCpc,
      avg_cpm: avgCpm,
      status_formatado: statusFormatado,
      performance_status: perf.status,
      performance_reason: perf.reason,
      ad_image_url: bestImage,
      adset_names: adsetNames,
      ad_count: group.length,
    });
  }

  return result;
}
