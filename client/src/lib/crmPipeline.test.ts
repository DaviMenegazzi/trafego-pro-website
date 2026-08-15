import { describe, expect, it } from "vitest";
import { resolveCrmDrop, type CrmLeadReference } from "./crmPipeline";

const leads: CrmLeadReference[] = [
  { id: "lead-a", crmStage: "lead_not_responded" },
  { id: "lead-b", crmStage: "follow_up" },
];

describe("resolveCrmDrop", () => {
  it("resolve uma etapa válida para o lead arrastado", () => {
    expect(resolveCrmDrop(leads, "lead-a", "negotiation")).toEqual({ lead: leads[0], stage: "negotiation" });
  });

  it("ignora um destino inválido, o próprio estágio e leads fora do escopo", () => {
    expect(resolveCrmDrop(leads, "lead-a", "lead_not_responded")).toBeNull();
    expect(resolveCrmDrop(leads, "lead-a", "unknown-stage")).toBeNull();
    expect(resolveCrmDrop(leads, "lead-missing", "closed_won")).toBeNull();
  });
});
