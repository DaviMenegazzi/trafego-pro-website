import { describe, expect, it } from "vitest";
import { isSocialBulkLocalId, validateSocialBulkBatch } from "./socialBulkPolicy.js";

describe("política de envio em massa de publicações", () => {
  it("aceita no máximo dez peças por lote", () => {
    expect(validateSocialBulkBatch([])).toBe("Envie entre uma e dez publicações por lote");
    expect(validateSocialBulkBatch(Array.from({ length: 11 }))).toBe("Envie entre uma e dez publicações por lote");
    expect(validateSocialBulkBatch([{}])).toBeNull();
  });

  it("requer uma chave UUID local para idempotência", () => {
    expect(isSocialBulkLocalId("c9881537-c630-4511-8b8e-e5b0a124c8b7")).toBe(true);
    expect(isSocialBulkLocalId("linha-1")).toBe(false);
  });
});
