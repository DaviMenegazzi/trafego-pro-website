import { describe, expect, it } from "vitest";
import { 
  consolidateAdsList, 
  isAdActive, 
  adHasConversations, 
  filterActiveCreativesWithConversations 
} from "./adConsolidation";

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

describe("filterActiveCreativesWithConversations", () => {
  it("valida status ativo corretamente", () => {
    expect(isAdActive({ status_formatado: "Ativa" })).toBe(true);
    expect(isAdActive({ offer_status: "ACTIVE" })).toBe(true);
    expect(isAdActive({ effective_status: "ACTIVE" } as any)).toBe(true);
    expect(isAdActive({ status_formatado: "Pausada" })).toBe(false);
    expect(isAdActive({ offer_status: "PAUSED" })).toBe(false);
  });

  it("identifica se o anúncio teve conversas ou leads no período selecionado", () => {
    expect(adHasConversations({ total_conversas_iniciadas: 5 })).toBe(true);
    expect(adHasConversations({ total_leads_meta: 2 })).toBe(true);
    expect(adHasConversations({ total_messaging_connections: 1 })).toBe(true);
    expect(adHasConversations({ total_conversas_iniciadas: 0, total_leads_meta: 0 })).toBe(false);
    expect(adHasConversations({ total_conversas_iniciadas: null })).toBe(false);
  });

  it("filtra exclusivamente anúncios que têm imagem, estão ativos E geraram conversas no período", () => {
    const ads: any[] = [
      // Ativo com conversa e imagem -> DEVE FICAR
      {
        id: 1,
        ad_name: "Ativo Com Conversas",
        ad_image_url: "https://fb.com/img1.png",
        status_formatado: "Ativa",
        total_conversas_iniciadas: 7,
      },
      // Ativo sem conversas no período -> DEVE SER REMOVIDO
      {
        id: 2,
        ad_name: "Ativo Zero Conversas",
        ad_image_url: "https://fb.com/img2.png",
        status_formatado: "Ativa",
        total_conversas_iniciadas: 0,
        total_leads_meta: 0,
      },
      // Pausado com conversas no período -> DEVE SER REMOVIDO
      {
        id: 3,
        ad_name: "Pausado Com Conversas",
        ad_image_url: "https://fb.com/img3.png",
        status_formatado: "Pausada",
        total_conversas_iniciadas: 15,
      },
      // Ativo com conversa mas sem imagem -> DEVE SER REMOVIDO
      {
        id: 4,
        ad_name: "Sem Imagem",
        ad_image_url: null,
        status_formatado: "Ativa",
        total_conversas_iniciadas: 3,
      },
      // Ativo com leads meta > 0 -> DEVE FICAR
      {
        id: 5,
        ad_name: "Ativo com Leads Meta",
        ad_image_url: "https://fb.com/img5.png",
        offer_status: "ACTIVE",
        total_conversas_iniciadas: 0,
        total_leads_meta: 4,
      },
    ];

    const filtered = filterActiveCreativesWithConversations(ads);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((x) => x.id)).toEqual([1, 5]);
  });
});

