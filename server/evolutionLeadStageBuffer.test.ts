import { describe, expect, it, vi, beforeEach } from "vitest";

const moveBatch = vi.fn();
const setScoresBatch = vi.fn();
const recordRunsBatch = vi.fn();

vi.mock("./evolutionSupabaseStore.js", () => ({
  moveEvolutionLeadCrmStageBatchSupabase: (...args: unknown[]) => moveBatch(...args),
  recordEvolutionAiClassificationRunsBatchSupabase: (...args: unknown[]) => recordRunsBatch(...args),
  setEvolutionLeadScoresBatchSupabase: (...args: unknown[]) => setScoresBatch(...args),
}));

describe("buffer em memória de classificação ao vivo do CRM", () => {
  beforeEach(async () => {
    vi.resetModules();
    moveBatch.mockReset();
    recordRunsBatch.mockReset();
  });

  it("acumula atualizações por lead (última vence) e grava tudo de uma vez no flush", async () => {
    const { bufferStageUpdate, bufferClassificationRun, flushPendingEvolutionAiState, pendingCountsForTest } = await import("./evolutionLeadStageBuffer.js");
    moveBatch.mockResolvedValue([{ leadId: "lead-1", crmStage: "negotiation", crmStageUpdatedAt: "2026-09-22T12:00:00.000Z", applied: true }]);
    recordRunsBatch.mockResolvedValue(undefined);

    bufferStageUpdate({ leadId: "lead-1", instanceName: "unidade-1", toStage: "lead_replied", changedBy: "automacao-ia-laya", note: "primeira" });
    bufferStageUpdate({ leadId: "lead-1", instanceName: "unidade-1", toStage: "negotiation", changedBy: "automacao-ia-laya", note: "mais recente" });
    bufferClassificationRun({
      leadId: "lead-1", instanceName: "unidade-1", sourceLastMessageAt: "2026-09-22T12:00:00.000Z", sourceMessageCount: 3,
      model: "laya", previousStage: "lead_responded", proposedStage: "negotiation", appliedStage: "negotiation",
      confidence: 0.91, rationale: "IA laya (confiança 0.91)", status: "applied", executionKey: "live-lead-stage:2026-09-22T12",
    });

    expect(pendingCountsForTest()).toEqual({ stageUpdates: 1, runs: 1, scores: 0 });

    const summary = await flushPendingEvolutionAiState();

    expect(moveBatch).toHaveBeenCalledTimes(1);
    expect(moveBatch.mock.calls[0][0]).toEqual([{ leadId: "lead-1", instanceName: "unidade-1", toStage: "negotiation", changedBy: "automacao-ia-laya", note: "mais recente" }]);
    expect(recordRunsBatch).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ stageUpdates: 1, runs: 1, applied: 1, ignored: 0, scores: 0 });
    expect(pendingCountsForTest()).toEqual({ stageUpdates: 0, runs: 0, scores: 0 });
  });

  it("recoloca no buffer as atualizações de estágio quando a gravação em lote falha", async () => {
    const { bufferStageUpdate, flushPendingEvolutionAiState, pendingCountsForTest } = await import("./evolutionLeadStageBuffer.js");
    moveBatch.mockRejectedValue(new Error("timeout no Supabase"));

    bufferStageUpdate({ leadId: "lead-2", instanceName: "unidade-1", toStage: "negotiation", changedBy: "automacao-ia-laya", note: "x" });
    const summary = await flushPendingEvolutionAiState();

    expect(summary.applied).toBe(0);
    expect(pendingCountsForTest().stageUpdates).toBe(1);
  });

  it("conta como ignoradas as propostas que o banco recusou (modo manual ou versão mudou)", async () => {
    const { bufferStageUpdate, flushPendingEvolutionAiState, pendingCountsForTest } = await import("./evolutionLeadStageBuffer.js");
    moveBatch.mockResolvedValue([{ leadId: "lead-3", crmStage: "negotiation", crmStageUpdatedAt: "2026-09-22T12:00:00.000Z", applied: false }]);

    bufferStageUpdate({ leadId: "lead-3", instanceName: "unidade-1", toStage: "closed_lost", changedBy: "automacao-ia-laya", note: "x", expectedVersion: 4 });
    const summary = await flushPendingEvolutionAiState();

    expect(moveBatch.mock.calls[0][0][0]).toMatchObject({ expectedVersion: 4 });
    expect(summary).toMatchObject({ applied: 0, ignored: 1 });
    expect(pendingCountsForTest().stageUpdates).toBe(0);
  });

  it("não chama o Supabase quando não há nada pendente", async () => {
    const { flushPendingEvolutionAiState } = await import("./evolutionLeadStageBuffer.js");
    const summary = await flushPendingEvolutionAiState();
    expect(summary).toEqual({ stageUpdates: 0, runs: 0, applied: 0, ignored: 0, scores: 0 });
    expect(moveBatch).not.toHaveBeenCalled();
    expect(recordRunsBatch).not.toHaveBeenCalled();
  });
});

describe("buffer de score Laya", () => {
  it("grava o score mais recente de cada lead no flush", async () => {
    const buffer = await import("./evolutionLeadStageBuffer.js");
    await buffer.flushPendingEvolutionAiState();
    setScoresBatch.mockReset();
    setScoresBatch.mockResolvedValue(undefined);
    buffer.bufferLeadScore({ leadId: "lead-9", instanceName: "u", score: 10, temperature: "COLD" });
    buffer.bufferLeadScore({ leadId: "lead-9", instanceName: "u", score: 80, temperature: "HOT" });
    const summary = await buffer.flushPendingEvolutionAiState();
    expect(summary.scores).toBe(1);
    expect(setScoresBatch).toHaveBeenCalledWith([{ leadId: "lead-9", instanceName: "u", score: 80, temperature: "HOT" }]);
  });
});
