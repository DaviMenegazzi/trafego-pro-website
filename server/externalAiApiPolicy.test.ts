import { describe, expect, it } from "vitest";
import { createExternalAiApiToken, hashExternalAiApiToken, isExternalAiApiTokenActive, isExternalAiApiUnitAllowed, resolveExternalAiApiDateRange, validateExternalAiApiTokenDraft } from "./externalAiApiPolicy.js";

const unitId = "0cf96a70-0244-42c2-a02b-1e86ae67af41";

describe("política de tokens da API externa", () => {
  it("gera um token opaco e guarda apenas um hash", () => {
    const token = createExternalAiApiToken();
    expect(token).toMatch(/^tpai_live_[A-Za-z0-9_-]{40,}$/);
    expect(hashExternalAiApiToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashExternalAiApiToken(token)).not.toContain(token);
  });

  it("exige escopos conhecidos, unidades UUID e validade limitada", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    expect(validateExternalAiApiTokenDraft({ name: "Assistente de performance", scopes: ["metrics:read", "crm:summary:read"], unitIds: [unitId], expiresAt: "2026-10-20T12:00:00.000Z" }, now)).toMatchObject({ ok: true });
    expect(validateExternalAiApiTokenDraft({ name: "IA", scopes: ["messages:read"], unitIds: ["all"], expiresAt: "2026-10-20T12:00:00.000Z" }, now)).toMatchObject({ ok: false });
    expect(validateExternalAiApiTokenDraft({ name: "Assistente seguro", scopes: ["metrics:read"], unitIds: [unitId], expiresAt: "2028-10-20T12:00:00.000Z" }, now)).toMatchObject({ ok: false });
  });

  it("bloqueia tokens expirados ou revogados e unidades não incluídas", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    expect(isExternalAiApiTokenActive({ revokedAt: null, expiresAt: "2026-08-21T12:00:00.000Z" }, now)).toBe(true);
    expect(isExternalAiApiTokenActive({ revokedAt: "2026-08-20T11:00:00.000Z", expiresAt: "2026-08-21T12:00:00.000Z" }, now)).toBe(false);
    expect(isExternalAiApiUnitAllowed([unitId], unitId)).toBe(true);
    expect(isExternalAiApiUnitAllowed([unitId], "17ef96a9-3219-4c06-b677-10c5c740f1a7")).toBe(false);
  });

  it("limita períodos de métricas para evitar leituras excessivas", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    expect(resolveExternalAiApiDateRange("2026-08-01", "2026-08-20", now)).toEqual({ ok: true, start: "2026-08-01", end: "2026-08-20" });
    expect(resolveExternalAiApiDateRange("2026-08-21", "2026-08-20", now)).toMatchObject({ ok: false });
    expect(resolveExternalAiApiDateRange("2025-01-01", "2026-08-20", now)).toMatchObject({ ok: false });
  });
});
