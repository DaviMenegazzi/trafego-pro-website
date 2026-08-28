import { describe, expect, it, beforeEach } from "vitest";
import {
  parseMetaActions,
  calculatePerformanceStatus,
  getCached,
  setCached,
  clearMetaCache,
  isMetaDirectEnabled,
  isMetaDirectActive,
  isUserAllowedForMetaAccount,
  normalizeUnitString,
  extractBestCreativeImageUrl,
  dedupeInFlight,
  isMetaRateLimitError,
  triggerMetaRateLimitCooldown,
  isMetaDirectSuspended,
  clearMetaRateLimitCooldown,
  getLastKnownClients,
} from "./metaDirectService.js";

describe("metaDirectService", () => {
  beforeEach(() => {
    clearMetaCache();
    clearMetaRateLimitCooldown();
  });

  describe("parseMetaActions", () => {
    it("extrai conversas iniciadas, leads e cliques no link corretamente", () => {
      const rawActions = [
        { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "14" },
        { action_type: "onsite_conversion.total_messaging_connection", value: "14" },
        { action_type: "onsite_conversion.messaging_first_reply", value: "8" },
        { action_type: "lead", value: "3" },
        { action_type: "link_click", value: "45" },
      ];

      const result = parseMetaActions(rawActions);

      expect(result.conversasIniciadas).toBe(14);
      expect(result.messagingConnections).toBe(14);
      expect(result.firstReply).toBe(8);
      expect(result.leadsMeta).toBe(3);
      expect(result.linkClicks).toBe(45);
    });

    it("faz fallback para total_messaging_connection quando conversas_started não estiver explícito", () => {
      const rawActions = [
        { action_type: "onsite_conversion.total_messaging_connection", value: "7" },
        { action_type: "link_click", value: "12" },
      ];

      const result = parseMetaActions(rawActions);

      expect(result.conversasIniciadas).toBe(7);
      expect(result.messagingConnections).toBe(7);
    });

    it("retorna zeros de forma segura para array vazio ou indefinido", () => {
      const result = parseMetaActions(undefined);
      expect(result).toEqual({
        conversasIniciadas: 0,
        messagingConnections: 0,
        leadsMeta: 0,
        linkClicks: 0,
        firstReply: 0,
      });
    });
  });

  describe("calculatePerformanceStatus", () => {
    it("classifica como Excelente quando custo por conversa for abaixo de R$ 5", () => {
      const result = calculatePerformanceStatus(40, 10); // R$ 4,00 por conversa
      expect(result.status).toBe("Excelente");
    });

    it("classifica como Positivo quando custo for entre R$ 5 e R$ 9", () => {
      const result = calculatePerformanceStatus(70, 10); // R$ 7,00 por conversa
      expect(result.status).toBe("Positivo");
    });

    it("classifica como Atenção quando custo for entre R$ 9 e R$ 13", () => {
      const result = calculatePerformanceStatus(110, 10); // R$ 11,00 por conversa
      expect(result.status).toBe("Atenção");
    });

    it("classifica como Crítico quando custo for acima de R$ 13", () => {
      const result = calculatePerformanceStatus(150, 10); // R$ 15,00 por conversa
      expect(result.status).toBe("Crítico");
    });

    it("classifica como Sem conversas quando houver investimento mas 0 conversas", () => {
      const result = calculatePerformanceStatus(100, 0);
      expect(result.status).toBe("Sem conversas");
    });

    it("classifica como Residual quando investimento for zero mas houver conversas", () => {
      const result = calculatePerformanceStatus(0, 5);
      expect(result.status).toBe("Residual");
    });
  });

  describe("In-Memory Caching", () => {
    it("guarda e recupera dados em cache respeitando expiração", () => {
      setCached("test:key", { value: 123 }, 1000);
      expect(getCached("test:key")).toEqual({ value: 123 });
    });

    it("retorna null para chaves expiradas", async () => {
      setCached("test:exp", { value: 456 }, -10); // já expirado
      expect(getCached("test:exp")).toBeNull();
    });

    it("limpa todo o cache", () => {
      setCached("key1", "val1");
      setCached("key2", "val2");
      clearMetaCache();
      expect(getCached("key1")).toBeNull();
      expect(getCached("key2")).toBeNull();
    });
  });

  describe("In-Flight Request Coalescing (dedupeInFlight)", () => {
    it("agrupa múltiplas requisições simultâneas em uma única execução", async () => {
      let callCount = 0;
      const fakeFetch = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: "success" };
      };

      // Dispara 5 chamadas simultâneas com a mesma chave
      const promises = [
        dedupeInFlight("clients:catalog", fakeFetch),
        dedupeInFlight("clients:catalog", fakeFetch),
        dedupeInFlight("clients:catalog", fakeFetch),
        dedupeInFlight("clients:catalog", fakeFetch),
        dedupeInFlight("clients:catalog", fakeFetch),
      ];

      const results = await Promise.all(promises);

      // Todos devem receber a mesma resposta
      expect(results).toHaveLength(5);
      expect(results.every((r) => r.data === "success")).toBe(true);

      // A função executou apenas UMA vez
      expect(callCount).toBe(1);
    });
  });

  describe("Rate Limit & Circuit Breaker", () => {
    it("detecta erro de rate limit da Meta por código 17, 80004 e mensagens características", () => {
      expect(isMetaRateLimitError({ code: 17 })).toBe(true);
      expect(isMetaRateLimitError({ code: 80004 })).toBe(true);
      expect(isMetaRateLimitError({ error: { code: 613 } })).toBe(true);
      expect(
        isMetaRateLimitError(new Error("There have been too many calls to this ad-account. Wait a bit and try again.")),
      ).toBe(true);
      expect(isMetaRateLimitError(new Error("User request limit reached"))).toBe(true);
      expect(isMetaRateLimitError(new Error("Erro de banco de dados comum"))).toBe(false);
    });

    it("ativa o circuit breaker de suspensão e bloqueia chamadas ativas", () => {
      expect(isMetaDirectSuspended()).toBe(false);

      triggerMetaRateLimitCooldown("Teste de rate limit", 5000);
      expect(isMetaDirectSuspended()).toBe(true);
      expect(isMetaDirectActive()).toBe(false);

      clearMetaRateLimitCooldown();
      expect(isMetaDirectSuspended()).toBe(false);
    });
  });

  describe("Permission & Unit Normalization Filtering", () => {
    const metaIjui = { id: "act_2853331541612919", name: "Vida Card Ijuí", account_id: "2853331541612919" };
    const metaSantaMaria = { id: "act_1778679539198076", name: "Vida Card Santa Maria", account_id: "1778679539198076" };
    const metaBarreiro = { id: "act_343587184793003", name: "VIDA CARD BH BARREIRO", account_id: "343587184793003" };

    const authorizedClients = [
      { id: "client-ijui-id", name: "Ijuí" },
      { id: "client-sm-id", name: "Santa Maria" },
      { id: "client-barreiro-id", name: "Belo Horizonte/Barreiro" },
    ];

    it("libera todas as contas para admin ou curinga (*)", () => {
      const adminClaims = { role: "admin", allowedClientIds: ["*"] };
      expect(isUserAllowedForMetaAccount(metaIjui, authorizedClients, adminClaims)).toBe(true);
      expect(isUserAllowedForMetaAccount(metaSantaMaria, authorizedClients, adminClaims)).toBe(true);
    });

    it("permite acesso apenas à unidade vinculada ao client_viewer (ex: Rosângela de Ijuí)", () => {
      const rosangelaClaims = { role: "client_viewer", allowedClientIds: ["client-ijui-id"] };

      // Deve ter acesso a Ijuí
      expect(isUserAllowedForMetaAccount(metaIjui, authorizedClients, rosangelaClaims)).toBe(true);

      // NÃO deve ter acesso a Santa Maria ou Barreiro
      expect(isUserAllowedForMetaAccount(metaSantaMaria, authorizedClients, rosangelaClaims)).toBe(false);
      expect(isUserAllowedForMetaAccount(metaBarreiro, authorizedClients, rosangelaClaims)).toBe(false);
    });

    it("reconhece variações de grafia e acentuação de cidades", () => {
      const claimsBarreiro = { role: "client_viewer", allowedClientIds: ["client-barreiro-id"] };
      expect(isUserAllowedForMetaAccount(metaBarreiro, authorizedClients, claimsBarreiro)).toBe(true);
      expect(isUserAllowedForMetaAccount(metaIjui, authorizedClients, claimsBarreiro)).toBe(false);
    });
  });

  describe("extractBestCreativeImageUrl", () => {
    it("prioriza image_url em alta definição sobre thumbnail_url de 64px", () => {
      const creative = {
        image_url: "https://scontent.fbcdn.net/high_res_1600x1600.png",
        thumbnail_url: "https://external.fbcdn.net/p64x64_thumb.png",
      };
      expect(extractBestCreativeImageUrl(creative)).toBe("https://scontent.fbcdn.net/high_res_1600x1600.png");
    });

    it("extrai imagem de object_story_spec se image_url direto não existir", () => {
      const creative = {
        object_story_spec: {
          video_data: {
            image_url: "https://scontent.fbcdn.net/video_cover_hd.jpg",
          },
        },
        thumbnail_url: "https://external.fbcdn.net/p64x64_thumb.png",
      };
      expect(extractBestCreativeImageUrl(creative)).toBe("https://scontent.fbcdn.net/video_cover_hd.jpg");
    });

    it("retorna null de forma segura para creative ausente", () => {
      expect(extractBestCreativeImageUrl(undefined)).toBeNull();
    });
  });

  describe("isMetaDirectEnabled", () => {
    it("retorna true quando o token está definido no ambiente", () => {
      expect(typeof isMetaDirectEnabled()).toBe("boolean");
    });
  });
});
