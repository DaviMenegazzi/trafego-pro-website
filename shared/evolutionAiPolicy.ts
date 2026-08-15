export type EvolutionAiAutomationState = {
  lastRunStatus: string | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
};

export const AI_AUTOMATION_ACTOR = "automacao-ia-openai";

export function isEvolutionAiAutomationRunning(state: EvolutionAiAutomationState | null | undefined): boolean {
  return state?.lastRunStatus === "running";
}

export function wasLastCrmUpdateMadeByAi(changedBy: string | null | undefined): boolean {
  return changedBy === AI_AUTOMATION_ACTOR;
}
