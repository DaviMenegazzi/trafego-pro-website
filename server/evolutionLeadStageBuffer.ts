import { logger } from "./logger.js";
import {
  moveEvolutionLeadCrmStageBatchSupabase,
  recordEvolutionAiClassificationRunsBatchSupabase,
  type EvolutionAiClassificationRunInput,
  type EvolutionCrmStage,
} from "./evolutionSupabaseStore.js";

// Classificacao ao vivo (Laya) acumula aqui em memoria em vez de gravar no
// Supabase a cada mensagem; um flush periodico grava tudo de uma vez. Como o
// buffer vive so no processo Node (server/index.ts roda um http.Server
// persistente, nao serverless), atualizacoes pendentes se perdem num restart —
// aceitavel porque a proxima mensagem do lead reclassifica do zero.

type PendingStageUpdate = {
  leadId: string;
  instanceName: string;
  toStage: EvolutionCrmStage;
  changedBy: string;
  note: string;
};

const pendingStageUpdates = new Map<string, PendingStageUpdate>();
const pendingRuns: EvolutionAiClassificationRunInput[] = [];

export function bufferStageUpdate(update: PendingStageUpdate): void {
  pendingStageUpdates.set(update.leadId, update);
}

export function bufferClassificationRun(run: EvolutionAiClassificationRunInput): void {
  pendingRuns.push(run);
  if (pendingRuns.length > 5000) pendingRuns.shift();
}

export type FlushSummary = { stageUpdates: number; runs: number; applied: number };

export async function flushPendingEvolutionAiState(): Promise<FlushSummary> {
  const stageUpdates = Array.from(pendingStageUpdates.values());
  const runs = pendingRuns.splice(0, pendingRuns.length);
  pendingStageUpdates.clear();

  let applied = 0;
  if (stageUpdates.length) {
    try {
      const results = await moveEvolutionLeadCrmStageBatchSupabase(stageUpdates);
      applied = results.length;
    } catch (error) {
      logger.error(`[evolution-live-ai] Falha ao gravar lote de estágios (${stageUpdates.length} leads)`, { error: error instanceof Error ? error.message : String(error) });
      for (const update of stageUpdates) if (!pendingStageUpdates.has(update.leadId)) bufferStageUpdate(update);
    }
  }
  if (runs.length) {
    try {
      await recordEvolutionAiClassificationRunsBatchSupabase(runs);
    } catch (error) {
      logger.error(`[evolution-live-ai] Falha ao gravar lote de execuções (${runs.length})`, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { stageUpdates: stageUpdates.length, runs: runs.length, applied };
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startEvolutionLiveAiFlushLoop(intervalMs: number): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    flushPendingEvolutionAiState().then((summary) => {
      if (summary.stageUpdates || summary.runs) {
        logger.info(`[evolution-live-ai] Flush: ${summary.applied}/${summary.stageUpdates} estágios aplicados, ${summary.runs} execuções registradas`);
      }
    }).catch((error) => logger.error("[evolution-live-ai] Erro inesperado no flush periódico", { error: error instanceof Error ? error.message : String(error) }));
  }, intervalMs);
  flushTimer.unref?.();
}

export function stopEvolutionLiveAiFlushLoop(): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}

export function pendingCountsForTest(): { stageUpdates: number; runs: number } {
  return { stageUpdates: pendingStageUpdates.size, runs: pendingRuns.length };
}
