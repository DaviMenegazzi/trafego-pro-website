import { describe, expect, it } from "vitest";
import { validateFeedbackCounts } from "../pages/feedbackLeadsConfig";

const base = { totalLeads: "68", leadsContacted: "61", leadsResponded: "43", leadsConverted: "6", leadsLost: "13", leadsInNegotiation: "9" };

describe("coerência do feedback semanal", () => {
  it("aceita um funil coerente", () => {
    expect(validateFeedbackCounts(base)).toEqual({});
  });

  it("não deixa contatados passarem dos recebidos", () => {
    expect(validateFeedbackCounts({ ...base, leadsContacted: "70" }).leadsContacted).toContain("68");
  });

  it("não deixa o desfecho passar de quem respondeu", () => {
    const errors = validateFeedbackCounts({ ...base, leadsConverted: "40" });
    expect(errors.leadsInNegotiation).toContain("62");
  });

  it("ignora campos ainda vazios e recusa números inválidos", () => {
    expect(validateFeedbackCounts({ ...base, leadsLost: "", leadsInNegotiation: "" })).toEqual({});
    expect(validateFeedbackCounts({ ...base, leadsLost: "-1" }).leadsLost).toBeDefined();
  });
});
