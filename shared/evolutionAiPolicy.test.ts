import { describe, expect, it } from "vitest";
import { isEvolutionAiAutomationRunning, wasLastCrmUpdateMadeByAi } from "./evolutionAiPolicy.js";

describe("política de edição do CRM durante análise por IA", () => {
  it("bloqueia a edição manual somente quando a rotina está em execução", () => {
    expect(isEvolutionAiAutomationRunning({ lastRunStatus: "running", lastStartedAt: "2026-08-15T23:00:00.000Z", lastCompletedAt: null })).toBe(true);
    expect(isEvolutionAiAutomationRunning({ lastRunStatus: "completed", lastStartedAt: "2026-08-15T23:00:00.000Z", lastCompletedAt: "2026-08-15T23:01:00.000Z" })).toBe(false);
  });

  it("identifica a última atualização aplicada pela IA da Tráfego Pro", () => {
    expect(wasLastCrmUpdateMadeByAi("automacao-ia-openai")).toBe(true);
    expect(wasLastCrmUpdateMadeByAi("gerente@unidade.com")).toBe(false);
  });
});
