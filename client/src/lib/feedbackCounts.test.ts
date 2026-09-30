import { describe, expect, it } from "vitest";
import { feedbackWeekFor, monthWeeks, previousFeedbackWeek, validateFeedbackCounts } from "../pages/feedbackLeadsConfig";

const base = { totalLeads: "68", leadsConverted: "6", leadsLost: "13", leadsInNegotiation: "9" };

describe("coerência do feedback semanal", () => {
  it("aceita uma semana coerente", () => {
    expect(validateFeedbackCounts(base)).toEqual({});
  });

  it("não deixa o desfecho passar dos recebidos", () => {
    const errors = validateFeedbackCounts({ ...base, leadsConverted: "50" });
    expect(errors.leadsInNegotiation).toContain("72");
    expect(errors.leadsInNegotiation).toContain("68");
  });

  it("ignora campos ainda vazios e recusa números inválidos", () => {
    expect(validateFeedbackCounts({ ...base, leadsLost: "", leadsInNegotiation: "" })).toEqual({});
    expect(validateFeedbackCounts({ ...base, leadsLost: "-1" }).leadsLost).toBeDefined();
  });
});

describe("semanas do mês (regra da aba Tráfego)", () => {
  const ranges = (y: number, m: number) => monthWeeks(y, m).map((w) => `${w.start.slice(8)}-${w.end.slice(8)}`);

  it("setembro/2026: primeira semana de 4 dias fica separada", () => {
    expect(ranges(2026, 8)).toEqual(["01-04", "05-11", "12-18", "19-25", "26-30"]);
  });

  it("outubro/2026: pedaços de 2 e 1 dia entram nas vizinhas", () => {
    expect(ranges(2026, 9)).toEqual(["01-09", "10-16", "17-23", "24-31"]);
  });

  it("agosto/2026: fim de 3 dias entra na penúltima", () => {
    expect(ranges(2026, 7)).toEqual(["01-07", "08-14", "15-21", "22-31"]);
  });

  it("acha a semana de uma data e a anterior, inclusive na virada do mês", () => {
    const current = feedbackWeekFor(new Date(2026, 8, 30));
    expect(current).toMatchObject({ number: 5, label: "26 a 30/09" });
    expect(previousFeedbackWeek(current)).toMatchObject({ start: "2026-09-19", end: "2026-09-25" });
    expect(previousFeedbackWeek(feedbackWeekFor(new Date(2026, 9, 5)))).toMatchObject({ start: "2026-09-26", end: "2026-09-30" });
  });
});
