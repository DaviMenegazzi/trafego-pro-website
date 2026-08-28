import { describe, expect, it, beforeEach } from "vitest";
import {
  clearMetaCache,
  clearMetaRateLimitCooldown,
  dedupeInFlight,
  isMetaDirectActive,
  isMetaDirectSuspended,
  isMetaRateLimitError,
  triggerMetaRateLimitCooldown,
  normalizeUnitString,
  standardizeUnitDisplayName,
} from "./metaDirectService.js";
import { normalizeRawOfferRow } from "./routes/metricsRoutes.js";

describe("Meta Graph API Rate Limit & Supabase Fallback", () => {
  beforeEach(() => {
    clearMetaCache();
    clearMetaRateLimitCooldown();
  });

  it("coalesce 10 requisições simultâneas em 1 única execução com dedupeInFlight", async () => {
    let executions = 0;
    const fetchAccounts = async () => {
      executions++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return [{ id: "act_123", name: "Vida Card Ijuí" }];
    };

    const promises = Array.from({ length: 10 }, () =>
      dedupeInFlight("meta:clients:all", fetchAccounts),
    );

    const allResults = await Promise.all(promises);
    expect(executions).toBe(1);
    expect(allResults).toHaveLength(10);
    expect(allResults[0][0].name).toBe("Vida Card Ijuí");
  });

  it("detecta erro de rate limit e ativa suspensão temporária de 5 minutos", () => {
    const rateLimitError = {
      message: "There have been too many calls to this ad-account. Wait a bit and try again.",
      code: 80004,
    };

    expect(isMetaRateLimitError(rateLimitError)).toBe(true);

    triggerMetaRateLimitCooldown(rateLimitError.message);
    expect(isMetaDirectSuspended()).toBe(true);
    expect(isMetaDirectActive()).toBe(false);
  });

  it("normaliza os dados de ofertas do Supabase corretamente mantendo compatibilidade de colunas", () => {
    const rawOfferFromSupabase = {
      spend: 150.5,
      conversations_started: 30,
      leads_meta: 12,
      reach: 5000,
      impressions: 12000,
      clicks: 450,
      offer_status: "ACTIVE",
    };

    const normalized = normalizeRawOfferRow(rawOfferFromSupabase);
    expect(normalized.total_spend).toBe(150.5);
    expect(normalized.total_conversas_iniciadas).toBe(30);
    expect(normalized.custo_por_conversa).toBeCloseTo(150.5 / 30, 2);
    expect(normalized.performance_status).toBe("Positivo"); // 5.01 -> entre 5 e 9
    expect(normalized.status_formatado).toBe("Ativa");
  });

  it("padroniza e normaliza nomes de unidades para compatibilidade entre Meta e Supabase", () => {
    expect(standardizeUnitDisplayName("CA 01 - VIDA CARD IJUI | OFICIAL")).toBe("Vida Card Ijuí");
    expect(standardizeUnitDisplayName("Vida Card Julio de Castilho")).toBe("Vida Card Júlio de Castilhos");
    expect(normalizeUnitString("Vida Card Tupãncireta")).toBe("tupancireta");
  });
});
