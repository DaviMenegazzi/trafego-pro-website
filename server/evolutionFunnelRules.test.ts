import { describe, expect, it } from "vitest";
import { canAdvanceFunnel, signalsFromLeadText, strongestSignal } from "./evolutionFunnelRules.js";

describe("regras do funil do Pixel (portadas do SDR Flow)", () => {
  it("só anda para frente; closed_won é final; perdido reabre com sinal de compra", () => {
    expect(canAdvanceFunnel("lead_replied", "negotiation")).toBe(true);
    expect(canAdvanceFunnel("negotiation", "lead_replied")).toBe(false);
    expect(canAdvanceFunnel("closed_won", "closed_lost")).toBe(false);
    expect(canAdvanceFunnel("negotiation", "closed_lost")).toBe(true);
    expect(canAdvanceFunnel("closed_lost", "negotiation")).toBe(true);
    expect(canAdvanceFunnel("closed_lost", "lead_replied")).toBe(false);
  });

  it("detecta preço e pagamento no texto do lead, sem acento", () => {
    expect(signalsFromLeadText(["Quanto custa o plano?"])[0]).toMatchObject({ stage: "negotiation", source: "text_rule" });
    expect(signalsFromLeadText(["Já paguei, segue comprovante"])[0]).toMatchObject({ stage: "closed_won" });
    expect(signalsFromLeadText(["Bom dia!"])).toEqual([]);
  });

  it("o sinal mais avançado vence; perdido só quando nada aponta para frente", () => {
    expect(strongestSignal([
      { stage: "closed_lost", source: "laya", reason: "r" },
      { stage: "negotiation", source: "text_rule", reason: "r" },
    ])?.stage).toBe("negotiation");
    expect(strongestSignal([{ stage: "closed_lost", source: "laya", reason: "r" }])?.stage).toBe("closed_lost");
  });
});
