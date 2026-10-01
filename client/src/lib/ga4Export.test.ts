import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { Ga4Report, Ga4Totals } from "../../../shared/google";
import { buildGa4Sheets, ga4ExportFileName } from "./ga4Export";

const totals = (overrides: Partial<Ga4Totals> = {}): Ga4Totals => ({
  sessions: 3795, users: 3086, newUsers: 3132, engagedSessions: 2348, engagementRate: 0.6187, avgEngagementSeconds: 86.2,
  keyEvents: 949, conversionRate: 0.139, adCost: 621.244, adClicks: 3776, adImpressions: 113113, ...overrides,
});

const report: Ga4Report = {
  propertyId: "551682423",
  start: "2026-09-01",
  end: "2026-09-30",
  previousStart: "2026-08-02",
  previousEnd: "2026-08-31",
  currency: "BRL",
  totals: totals(),
  previousTotals: totals({ sessions: 441, conversionRate: 0.102, adCost: 0 }),
  daily: [{ date: "2026-09-01", sessions: 40, keyEvents: 3 }],
  keyEventsByName: [{ eventName: "lead_whatsapp", label: "WhatsApp", count: 949 }],
  landingPages: [{ hostName: "vidacardpf.com.br", landingPage: "/empresarial", sessions: 2509, engagedSessions: 1651, keyEvents: 721, convertedSessions: 380 }],
  cities: [{ city: "Porto Alegre", sessions: 600, keyEvents: 163, convertedSessions: 90 }],
  sources: [],
  campaigns: [{ campaign: "[TP] - [PMAX]", cost: 621.24, clicks: 3776, impressions: 113113, sessions: 3368, keyEvents: 860 }],
  campaignsError: null,
  fetchedAt: "2026-09-30T14:00:00.000Z",
};

const context = { unitName: "Vida Card Passo Fundo", unitId: "act_2734549853534435", landingPageName: "LP Vida Card Passo Fundo", siteUrl: "https://vidacardpf.com.br/", periodLabel: "01 set 2026 — 30 set 2026" };

describe("planilha do Google Analytics", () => {
  const sheets = buildGa4Sheets(report, context);

  it("tem uma aba por bloco da tela", () => {
    expect(sheets.map((s) => s.name)).toEqual([
      "Referência", "Resumo", "Métricas diárias", "Conversões por tipo", "Campanhas Google Ads", "Páginas de entrada", "Cidades", "Origem e mídia",
    ]);
  });

  it("compara com o período anterior e deixa a variação vazia quando não há base", () => {
    const resumo = sheets.find((s) => s.name === "Resumo")!.rows;
    expect(resumo.find((r) => r.métrica === "Sessões")).toMatchObject({ período_atual: 3795, período_anterior: 441, "variação_%": 760.5 });
    expect(resumo.find((r) => r.métrica === "Taxa de conversão (%)")).toMatchObject({ período_atual: 13.9, período_anterior: 10.2 });
    expect(resumo.find((r) => r.métrica === "Investimento Google Ads (R$)")).toMatchObject({ período_atual: 621.24, "variação_%": null });
  });

  it("gera um .xlsx que abre com os valores certos", () => {
    const workbook = XLSX.utils.book_new();
    for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{ observação: "Sem dados neste período." }]), sheet.name);
    const reopened = XLSX.read(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    const cities = XLSX.utils.sheet_to_json<Record<string, unknown>>(reopened.Sheets["Cidades"]);
    expect(cities[0]).toMatchObject({ cidade: "Porto Alegre", sessões: 600, "percentual_das_sessões_%": 15.8, "taxa_de_conversão_%": 15 });
    expect(XLSX.utils.sheet_to_json(reopened.Sheets["Origem e mídia"])).toEqual([{ observação: "Sem dados neste período." }]);
  });

  it("nomeia o arquivo pela unidade e pelo período", () => {
    expect(ga4ExportFileName("Vida Card Júlio de Castilhos", "2026-09-01", "2026-09-30")).toBe("google-analytics-vida-card-julio-de-castilhos-2026-09-01-a-2026-09-30.xlsx");
  });
});
