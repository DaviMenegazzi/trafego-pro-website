import { describe, expect, it } from "vitest";
import { hasDeterministicLeadOrigin, isVisiblePixelLead } from "./evolutionPixelPolicy.js";

describe("Pixel lead visibility", () => {
  it("mostra leads confirmados e contatos pendentes já promovidos da quarentena", () => {
    expect(isVisiblePixelLead({ classification: "lead", isQuarantine: false })).toBe(true);
    expect(isVisiblePixelLead({ classification: "pendente", isQuarantine: false })).toBe(true);
  });

  it("oculta não leads e contatos ainda em quarentena", () => {
    expect(isVisiblePixelLead({ classification: "nao_lead", isQuarantine: false })).toBe(false);
    expect(isVisiblePixelLead({ classification: "pendente", isQuarantine: true })).toBe(false);
  });

  it("aceita como origem determinística somente evidência de Meta ou Google Ads", () => {
    expect(hasDeterministicLeadOrigin({ platform: "meta", evidence: "verified" })).toBe(true);
    expect(hasDeterministicLeadOrigin({ platform: "google_ads", evidence: "observed" })).toBe(true);
    expect(hasDeterministicLeadOrigin({ platform: "mixed", evidence: "observed" })).toBe(true);
    expect(hasDeterministicLeadOrigin({ platform: "unknown", evidence: "none" })).toBe(false);
  });
});
