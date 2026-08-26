import { describe, expect, it } from "vitest";
import { summarizeExternalAiMetrics } from "./externalAiApiData.js";

describe("agregação de métricas da API externa", () => {
  it("entrega apenas agregados e não preserva campos de campanha", () => {
    const result = summarizeExternalAiMetrics([
      { date_start: "2026-08-01", total_spend: 120, total_conversas_iniciadas: 10, total_leads_meta: 4, total_impressions: 2000, total_clicks: 50, campaign_name: "Não expor" },
      { date_start: "2026-08-02", total_spend: 80, total_conversas_iniciadas: 5, total_leads_meta: 1, total_impressions: 1000, total_clicks: 25 },
    ], "2026-08-01", "2026-08-02");
    expect(result).toMatchObject({ period: { start: "2026-08-01", end: "2026-08-02" }, totals: { spend: 200, conversationsStarted: 15, metaLeads: 5, impressions: 3000, clicks: 75, costPerConversation: 200 / 15, cpc: 200 / 75, ctr: 2.5 } });
    expect(JSON.stringify(result)).not.toContain("campaign_name");
  });
});
