import { describe, expect, it } from "vitest";
import { getPresetDashboardDateRange, isValidDashboardDateRange } from "./dashboardDateRange";

describe("intervalo de datas da dashboard", () => {
  it("calcula o atalho de 30 dias com início e fim previsíveis", () => {
    const range = getPresetDashboardDateRange("30", new Date("2026-08-15T12:00:00.000Z"));

    expect(range).toEqual({ start: "2026-07-16", end: "2026-08-15" });
  });

  it("aceita uma faixa personalizada em ordem cronológica", () => {
    expect(isValidDashboardDateRange({ start: "2026-06-01", end: "2026-08-15" })).toBe(true);
  });

  it("rejeita uma faixa personalizada cujo fim é anterior ao início", () => {
    expect(isValidDashboardDateRange({ start: "2026-08-15", end: "2026-08-14" })).toBe(false);
  });
});
