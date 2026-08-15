import { describe, expect, it } from "vitest";
import { calculateResponseRate, DASHBOARD_PRESENTATION } from "./dashboardPresentation";

describe("dashboard presentation", () => {
  it("prioriza quatro indicadores principais e oito complementares", () => {
    expect(DASHBOARD_PRESENTATION.primaryKpiCount).toBe(4);
    expect(DASHBOARD_PRESENTATION.supportingKpiCount).toBe(8);
  });

  it("calcula a taxa de resposta sem gerar valores inválidos", () => {
    expect(calculateResponseRate(24, 80)).toBe(30);
    expect(calculateResponseRate(0, 0)).toBe(0);
    expect(calculateResponseRate(10, -1)).toBe(0);
  });
});
