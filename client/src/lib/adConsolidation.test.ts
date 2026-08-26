import { describe, expect, it } from "vitest";
import { consolidateAdsList } from "./adConsolidation";

describe("consolidateAdsList", () => {
  it("consolida anúncios com o mesmo criativo/nome rodando em múltiplos conjuntos", () => {
    const rawAds: any[] = [
      {
        id: 101,
        ad_name: "AD01 - 31/07",
        adset_name: "[CJ01] - [ABERTO]",
        total_spend: 100,
        total_conversas_iniciadas: 10,
        total_impressions: 1000,
        total_clicks: 50,
        ad_image_url: "https://scontent.fbcdn.net/ad01.png",
        status_formatado: "Ativa",
      },
      {
        id: 102,
        ad_name: "AD01 - 31/07",
        adset_name: "[CJ02] - [INTERESSE]",
        total_spend: 50,
        total_conversas_iniciadas: 5,
        total_impressions: 500,
        total_clicks: 25,
        ad_image_url: "https://scontent.fbcdn.net/ad01.png",
        status_formatado: "Ativa",
      },
    ];

    const result = consolidateAdsList(rawAds);

    expect(result).toHaveLength(1);
    expect(result[0].ad_name).toBe("AD01 - 31/07");
    expect(result[0].total_spend).toBe(150);
    expect(result[0].total_conversas_iniciadas).toBe(15);
    expect(result[0].custo_por_conversa).toBe(10); // 150 / 15
    expect(result[0].total_impressions).toBe(1500);
    expect(result[0].total_clicks).toBe(75);
    expect(result[0].ad_count).toBe(2);
    expect(result[0].adset_names).toEqual(["[CJ01] - [ABERTO]", "[CJ02] - [INTERESSE]"]);
  });

  it("mantém anúncios únicos sem alteração desnecessária", () => {
    const rawAds: any[] = [
      {
        id: 201,
        ad_name: "AD02 - 31/07",
        adset_name: "[CJ01] - [ABERTO]",
        total_spend: 80,
        total_conversas_iniciadas: 8,
        ad_image_url: "https://scontent.fbcdn.net/ad02.png",
        status_formatado: "Ativa",
      },
    ];

    const result = consolidateAdsList(rawAds);

    expect(result).toHaveLength(1);
    expect(result[0].ad_name).toBe("AD02 - 31/07");
    expect(result[0].ad_count).toBe(1);
    expect(result[0].adset_names).toEqual(["[CJ01] - [ABERTO]"]);
  });
});
