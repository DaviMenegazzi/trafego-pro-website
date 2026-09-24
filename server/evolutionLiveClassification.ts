import { AI_AUTOMATION_ACTOR_LAYA } from "../shared/evolutionAiPolicy.js";
import { classifyLeadStageWithLaya, LAYA_MODEL_NAME } from "./evolutionLayaClient.js";
import { bufferClassificationRun, bufferStageUpdate } from "./evolutionLeadStageBuffer.js";
import { getEvolutionAiLiveSettingsSupabase, getEvolutionLeadByIdSupabase, listEvolutionMessagesSupabase, type EvolutionCrmStage } from "./evolutionSupabaseStore.js";
import { logger } from "./logger.js";

const TERMINAL_STAGES: EvolutionCrmStage[] = ["closed_won", "closed_lost"];

function layaNote(confidence: number): string {
  return `IA ${LAYA_MODEL_NAME} (confiança ${confidence.toFixed(2)})`;
}

// Chamado a partir do webhook a cada mensagem recebida. Nunca deve derrubar o
// webhook: qualquer erro (serviço Laya fora do ar, lead não encontrado etc.)
// fica só em log. O resultado vai para o buffer em memória — quem grava no
// Supabase é o flush periódico (server/evolutionLeadStageBuffer.ts).
export async function classifyLeadStageLive(leadId: string): Promise<void> {
  const settings = await getEvolutionAiLiveSettingsSupabase();
  if (!settings.enabled) return;

  const lead = await getEvolutionLeadByIdSupabase(leadId);
  if (!lead) return;

  const messages = (await listEvolutionMessagesSupabase(leadId)).filter((message) => message.bodyText.trim()).slice(-10);
  if (!messages.length) return;

  const base = {
    leadId: lead.id,
    instanceName: lead.instanceName,
    sourceLastMessageAt: lead.lastMessageAt,
    sourceMessageCount: messages.length,
    model: LAYA_MODEL_NAME,
    previousStage: lead.crmStage,
    executionKey: `live-lead-stage:${new Date().toISOString().slice(0, 13)}`,
  };

  try {
    const classification = await classifyLeadStageWithLaya({ leadId: lead.id, instanceName: lead.instanceName, currentStage: lead.crmStage, messages });

    if (classification.proposedStage === lead.crmStage) {
      bufferClassificationRun({ ...base, proposedStage: classification.proposedStage, appliedStage: null, confidence: classification.confidence, rationale: layaNote(classification.confidence), status: "unchanged" });
      return;
    }
    if (TERMINAL_STAGES.includes(lead.crmStage) || classification.confidence < settings.minConfidence) {
      bufferClassificationRun({ ...base, proposedStage: classification.proposedStage, appliedStage: null, confidence: classification.confidence, rationale: layaNote(classification.confidence), status: "review" });
      return;
    }
    bufferStageUpdate({ leadId: lead.id, instanceName: lead.instanceName, toStage: classification.proposedStage, changedBy: AI_AUTOMATION_ACTOR_LAYA, note: layaNote(classification.confidence) });
    bufferClassificationRun({ ...base, proposedStage: classification.proposedStage, appliedStage: classification.proposedStage, confidence: classification.confidence, rationale: layaNote(classification.confidence), status: "applied" });
  } catch (error) {
    logger.warn("[evolution-live-ai] Falha ao classificar lead ao vivo", { leadId: lead.id, error: error instanceof Error ? error.message : String(error) });
    bufferClassificationRun({ ...base, proposedStage: null, appliedStage: null, confidence: null, rationale: null, status: "failed", errorMessage: error instanceof Error ? error.message : String(error) });
  }
}
