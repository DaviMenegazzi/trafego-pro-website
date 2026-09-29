import { logger } from "./logger.js";
import {
  moveEvolutionLeadCrmStageBatchSupabase,
  recordEvolutionAiClassificationRunsBatchSupabase,
  setEvolutionLeadScoresBatchSupabase,
  type EvolutionAiClassificationRunInput,
  type EvolutionLeadScoreUpdate,
  type EvolutionStageUpdate,
} from "./evolutionSupabaseStore.js";

// Classificacao ao vivo (Laya) acumula aqui em memoria em vez de gravar no
// Supabase a cada mensagem; um flush periodico grava tudo de uma vez. Como o
// buffer vive so no processo Node (server/index.ts roda um http.Server
// persistente, nao serverless), atualizacoes pendentes se perdem num restart —
// aceitavel porque a proxima mensagem do lead reclassifica do zero.

// expectedVersion é a crm_version lida junto com o lead: se um usuário mover o cartão (ou o
// devolver à automação) antes do flush, o banco descarta a proposta em vez de sobrescrever.
type PendingStageUpdate = EvolutionStageUpdate & { note: string };

const pendingStageUpdates = new Map<string, PendingStageUpdate>();
const pendingRuns: EvolutionAiClassificationRunInput[] = [];
const pendingScores = new Map<string, EvolutionLeadScoreUpdate>();

export function bufferStageUpdate(update: PendingStageUpdate): void {
  pendingStageUpdates.set(update.leadId, update);
}

export function pendingStageFor(leadId: string): EvolutionStageUpdate["toStage"] | null {
  return pendingStageUpdates.get(leadId)?.toStage ?? null;
}

export function bufferLeadScore(update: EvolutionLeadScoreUpdate): void {
  pendingScores.set(update.leadId, update);
}

export function bufferClassificationRun(run: EvolutionAiClassificationRunInput): void {
  pendingRuns.push(run);
  if (pendingRuns.length > 5000) pendingRuns.shift();
}

export type FlushSummary = { stageUpdates: number; runs: number; applied: number; ignored: number; scores: number };

export async function flushPendingEvolutionAiState(): Promise<FlushSummary> {
  const stageUpdates = Array.from(pendingStageUpdates.values());
  const runs = pendingRuns.splice(0, pendingRuns.length);
  const scores = Array.from(pendingScores.values());
  pendingStageUpdates.clear();
  pendingScores.clear();

  let applied = 0;
  let ignored = 0;
  if (stageUpdates.length) {
    try {
      const results = await moveEvolutionLeadCrmStageBatchSupabase(stageUpdates);
      applied = results.filter((result) => result.applied).length;
      ignored = results.length - applied;
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
  if (scores.length) {
    try {
      await setEvolutionLeadScoresBatchSupabase(scores);
    } catch (error) {
      logger.error(`[evolution-live-ai] Falha ao gravar lote de scores (${scores.length} leads)`, { error: error instanceof Error ? error.message : String(error) });
      for (const score of scores) if (!pendingScores.has(score.leadId)) bufferLeadScore(score);
    }
  }
  return { stageUpdates: stageUpdates.length, runs: runs.length, applied, ignored, scores: scores.length };
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startEvolutionLiveAiFlushLoop(intervalMs: number): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    flushPendingEvolutionAiState().then((summary) => {
      if (summary.stageUpdates || summary.runs || summary.scores) {
        logger.info(`[evolution-live-ai] Flush: ${summary.applied}/${summary.stageUpdates} estágios aplicados (${summary.ignored} ignorados por decisão manual ou versão), ${summary.scores} scores, ${summary.runs} execuções registradas`);
      }
    }).catch((error) => logger.error("[evolution-live-ai] Erro inesperado no flush periódico", { error: error instanceof Error ? error.message : String(error) }));
  }, intervalMs);
  flushTimer.unref?.();
}

export function stopEvolutionLiveAiFlushLoop(): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}

export function pendingCountsForTest(): { stageUpdates: number; runs: number; scores: number } {
  return { stageUpdates: pendingStageUpdates.size, runs: pendingRuns.length, scores: pendingScores.size };
}
