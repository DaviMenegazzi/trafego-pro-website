import type { Ga4Report, Ga4Totals } from "../../../shared/google";

// Planilha do Google Analytics da unidade (mesmo formato da planilha de Meta Ads: uma aba por bloco).
// Percentuais saem em pontos percentuais com uma casa (13,9) para ficarem legíveis no Excel.

const pct = (value: number) => Math.round(value * 1000) / 10;
const money = (value: number) => Math.round(value * 100) / 100;
const share = (part: number, whole: number) => (whole > 0 ? pct(part / whole) : 0);
const variation = (now: number, before: number) => (before > 0 ? pct((now - before) / before) : null);

export type Ga4Sheet = { name: string; rows: Record<string, string | number | null>[] };

function summaryRows(current: Ga4Totals, previous: Ga4Totals) {
  const line = (métrica: string, atual: number, anterior: number) => ({
    métrica,
    período_atual: atual,
    período_anterior: anterior,
    "variação_%": variation(atual, anterior),
  });
  return [
    line("Sessões", current.sessions, previous.sessions),
    line("Usuários", current.users, previous.users),
    line("Novos usuários", current.newUsers, previous.newUsers),
    line("Sessões engajadas", current.engagedSessions, previous.engagedSessions),
    line("Taxa de engajamento (%)", pct(current.engagementRate), pct(previous.engagementRate)),
    line("Tempo médio de engajamento (s)", Math.round(current.avgEngagementSeconds), Math.round(previous.avgEngagementSeconds)),
    line("Conversões", current.keyEvents, previous.keyEvents),
    line("Taxa de conversão (%)", pct(current.conversionRate), pct(previous.conversionRate)),
    line("Investimento Google Ads (R$)", money(current.adCost), money(previous.adCost)),
    line("Cliques Google Ads", current.adClicks, previous.adClicks),
    line("Impressões Google Ads", current.adImpressions, previous.adImpressions),
  ];
}

export function buildGa4Sheets(
  report: Ga4Report,
  context: { unitName: string; unitId: string; landingPageName: string | null; siteUrl: string | null; periodLabel: string },
): Ga4Sheet[] {
  const { totals } = report;
  return [
    {
      name: "Referência",
      rows: [{
        unidade: context.unitName,
        conta_meta: context.unitId,
        landing_page: context.landingPageName ?? "",
        endereço: context.siteUrl ?? "",
        propriedade_ga4: report.propertyId,
        período: context.periodLabel,
        período_anterior: `${report.previousStart} a ${report.previousEnd}`,
        fonte: "Google Analytics 4 (Data API)",
        exportado_em: new Date().toLocaleString("pt-BR"),
      }],
    },
    { name: "Resumo", rows: summaryRows(totals, report.previousTotals) },
    {
      name: "Métricas diárias",
      rows: report.daily.map((row) => ({
        data: row.date,
        sessões: row.sessions,
        conversões: row.keyEvents,
      })),
    },
    {
      name: "Conversões por tipo",
      rows: report.keyEventsByName.map((row) => ({ tipo: row.label, evento_ga4: row.eventName, conversões: row.count })),
    },
    {
      name: "Campanhas Google Ads",
      rows: report.campaigns.map((row) => ({
        campanha: row.campaign,
        investimento: money(row.cost),
        impressões: row.impressions,
        cliques: row.clicks,
        "ctr_%": share(row.clicks, row.impressions),
        sessões: row.sessions,
        conversões: row.keyEvents,
        custo_por_conversão: row.keyEvents > 0 ? money(row.cost / row.keyEvents) : null,
      })),
    },
    {
      name: "Páginas de entrada",
      rows: report.landingPages.map((row) => ({
        domínio: row.hostName,
        página: row.landingPage,
        sessões: row.sessions,
        "engajamento_%": share(row.engagedSessions, row.sessions),
        conversões: row.keyEvents,
        "taxa_de_conversão_%": share(row.convertedSessions, row.sessions),
      })),
    },
    {
      name: "Cidades",
      rows: report.cities.map((row) => ({
        cidade: row.city,
        sessões: row.sessions,
        "percentual_das_sessões_%": share(row.sessions, totals.sessions),
        conversões: row.keyEvents,
        "taxa_de_conversão_%": share(row.convertedSessions, row.sessions),
      })),
    },
    {
      name: "Origem e mídia",
      rows: report.sources.map((row) => ({ origem_mídia: row.sourceMedium, sessões: row.sessions, usuários: row.users, conversões: row.keyEvents })),
    },
  ];
}

export function ga4ExportFileName(unitName: string, start: string, end: string): string {
  const slug = unitName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `google-analytics-${slug}-${start}-a-${end}.xlsx`;
}

/** Monta e baixa a planilha; a biblioteca xlsx só é carregada no clique. */
export async function downloadGa4Workbook(sheets: Ga4Sheet[], fileName: string): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    // Aba vazia ganha uma linha explicando, em vez de sair em branco.
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ observação: "Sem dados neste período." }];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheet.name);
  }
  XLSX.writeFile(workbook, fileName);
}
