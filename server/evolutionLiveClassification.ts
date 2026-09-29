import { AI_AUTOMATION_ACTOR_LAYA, AI_AUTOMATION_ACTOR_TEXT_RULE } from "../shared/evolutionAiPolicy.js";
import { canAdvanceFunnel, signalsFromLeadText, strongestSignal, type FunnelSignal } from "./evolutionFunnelRules.js";
import { layaConfigFromEnv, layaPredict, LAYA_MODEL_NAME, type LayaConfig, type LayaQuestion } from "./evolutionLayaClient.js";
import { bufferClassificationRun, bufferLeadScore, bufferStageUpdate, flushPendingEvolutionAiState, pendingStageFor } from "./evolutionLeadStageBuffer.js";
import {
  getEvolutionAiLiveSettingsSupabase,
  getEvolutionLeadByIdSupabase,
  listEvolutionMessagesSupabase,
  type EvolutionCrmStage,
  type EvolutionLead,
  type EvolutionLeadTemperature,
} from "./evolutionSupabaseStore.js";
import { logger } from "./logger.js";

// Mesma estratégia do SDR Flow (packages/runtime/src/funnel/funnel-service.ts). Validado contra
// conversas de venda PT-BR rotuladas (2026-09-23): o score ordinal de interesse foi a única
// resposta da Laya que acompanhou a realidade. Recusas ficaram < 0,8, compras confirmadas ~3,9,
// conversas em aberto 1,3–2,6. A etapa como pergunta "choice" acertou 3/8, então a etapa vem de
// regras de texto e a Laya só decide "perdido" e a temperatura do lead.
const INTEREST_QUESTION: LayaQuestion = {
  type: "score",
  instructions: "Qual o nível de interesse de compra do CONTATO?",
  criteria: [
    "sem interesse, recusou ou desistiu",
    "interesse baixo, só curiosidade",
    "interesse moderado, fazendo perguntas",
    "interesse alto, quer avançar",
    "pronto para comprar ou já comprou",
  ],
};
const INTEREST_LEVELS = INTEREST_QUESTION.criteria.length - 1;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1200;
const MIN_INCOMING_MESSAGES = 2;

export function temperatureFor(score: number): EvolutionLeadTemperature {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

function actorFor(signal: FunnelSignal): string {
  return signal.source === "laya" ? AI_AUTOMATION_ACTOR_LAYA : AI_AUTOMATION_ACTOR_TEXT_RULE;
}

function noteFor(signal: FunnelSignal): string {
  const evidence = signal.evidence ? ` — "${signal.evidence.slice(0, 120)}"` : "";
  return `${signal.reason}${evidence}`;
}

// O estágio no Supabase só muda no flush; até lá vale o que já está pendente no buffer.
function effectiveStage(lead: EvolutionLead): EvolutionCrmStage {
  return pendingStageFor(lead.id) ?? lead.crmStage;
}

function runBase(lead: EvolutionLead, messageCount: number, previousStage: EvolutionCrmStage, model: string) {
  return {
    leadId: lead.id,
    instanceName: lead.instanceName,
    sourceLastMessageAt: lead.lastMessageAt,
    sourceMessageCount: messageCount,
    model,
    previousStage,
    executionKey: `live-lead-stage:${new Date().toISOString().slice(0, 13)}`,
  };
}

/** Aplica o sinal mais forte ao buffer, se ele move o funil. Retorna a etapa aplicada. */
function applyFunnelSignals(lead: EvolutionLead, signals: FunnelSignal[], messageCount: number): EvolutionCrmStage | null {
  const signal = strongestSignal(signals);
  if (!signal) return null;
  const from = effectiveStage(lead);
  if (!canAdvanceFunnel(from, signal.stage)) return null;
  bufferStageUpdate({ leadId: lead.id, instanceName: lead.instanceName, toStage: signal.stage, changedBy: actorFor(signal), note: noteFor(signal) });
  bufferClassificationRun({
    ...runBase(lead, messageCount, from, signal.source === "laya" ? LAYA_MODEL_NAME : "regra-de-texto"),
    proposedStage: signal.stage, appliedStage: signal.stage, confidence: signal.confidence ?? null,
    rationale: noteFor(signal), status: "applied",
  });
  return signal.stage;
}

// Só leads que a equipe já respondeu entram no funil: conversas pessoais e de fornecedores
// ficariam de fora do mesmo jeito que no SDR Flow (leadHasSdrReplies).
function teamHasReplied(lead: EvolutionLead): boolean {
  return lead.messagesSent > 0;
}

export type LeadClassificationResult =
  | { status: "skipped"; reason: string }
  | { status: "classified"; interest: number; confidence: number; score: number; temperature: EvolutionLeadTemperature; movedTo: EvolutionCrmStage | null };

export async function classifyLeadWithLaya(
  leadId: string,
  deps: { laya: LayaConfig; lostThreshold?: number },
): Promise<LeadClassificationResult> {
  const lead = await getEvolutionLeadByIdSupabase(leadId);
  if (!lead) return { status: "skipped", reason: "lead_not_found" };
  if (!teamHasReplied(lead)) return { status: "skipped", reason: "team_never_replied" };

  const messages = (await listEvolutionMessagesSupabase(leadId))
    .filter((message) => message.bodyText.trim())
    .slice(-MAX_MESSAGES);
  if (messages.filter((message) => message.direction === "incoming").length < MIN_INCOMING_MESSAGES) {
    return { status: "skipped", reason: "not_enough_messages" };
  }
  const state = messages.map((message) =>
    `${message.direction === "incoming" ? "CONTATO" : "EQUIPE"}: ${message.bodyText.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS)}`,
  );

  const answers = await layaPredict(deps.laya, state, { interest: INTEREST_QUESTION });
  const interest = Math.min(INTEREST_LEVELS, Math.max(0, answers.interest!.score!));
  const confidence = answers.interest!.confidence;
  const score = Math.round((interest / INTEREST_LEVELS) * 100);
  const temperature = temperatureFor(score);
  bufferLeadScore({ leadId: lead.id, instanceName: lead.instanceName, score, temperature });

  const lostThreshold = deps.lostThreshold ?? 0.8;
  const movedTo = interest < lostThreshold
    ? applyFunnelSignals(lead, [{
        stage: "closed_lost", source: "laya", confidence,
        reason: `Laya: interesse ${interest.toFixed(2)}/4 indica recusa ou desistência`,
        evidence: state[state.length - 1] ?? null,
      }], messages.length)
    : null;
  return { status: "classified", interest, confidence, score, temperature, movedTo };
}

// Em vez de inferir a cada mensagem, o webhook só marca o lead como "com novidade". Num intervalo
// fixo (LAYA_CLASSIFY_INTERVAL_MINUTES), um varredor classifica os leads marcados, uma inferência
// por vez (o serviço Laya é serial e compartilhado com o SDR Flow), e grava o resultado. Uma rajada
// de mensagens entre duas varreduras custa uma inferência só. Um restart perde as marcas pendentes
// — aceitável porque a próxima mensagem do lead marca de novo.
const dirtyLeads = new Set<string>();
let sweeping = false;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function scheduleLeadClassification(leadId: string): void {
  dirtyLeads.add(leadId);
}

export async function runLeadClassificationSweep(): Promise<{ classified: number; skipped: number; failed: number }> {
  const summary = { classified: 0, skipped: 0, failed: 0 };
  if (sweeping) return summary;
  const laya = layaConfigFromEnv();
  if (!laya || !dirtyLeads.size) return summary;
  sweeping = true;
  try {
    const leadIds = Array.from(dirtyLeads);
    dirtyLeads.clear();
    const lostThreshold = Number(process.env.LAYA_LOST_INTEREST_THRESHOLD) || 0.8;
    for (const leadId of leadIds) {
      try {
        const result = await classifyLeadWithLaya(leadId, { laya, lostThreshold });
        if (result.status === "classified") summary.classified += 1;
        else summary.skipped += 1;
        logger.info("[evolution-live-ai] Classificação Laya do lead", { leadId, ...result });
      } catch (error) {
        // Best effort: o lead mantém etapa e score atuais até a próxima mensagem.
        summary.failed += 1;
        logger.warn("[evolution-live-ai] Falha na classificação Laya do lead", { leadId, error: error instanceof Error ? error.message : String(error) });
      }
    }
    if (summary.classified) await flushPendingEvolutionAiState();
  } finally {
    sweeping = false;
  }
  return summary;
}

export function startLeadClassificationLoop(intervalMs: number): void {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = setInterval(() => {
    runLeadClassificationSweep().catch((error) =>
      logger.error("[evolution-live-ai] Erro inesperado na varredura da Laya", { error: error instanceof Error ? error.message : String(error) }));
  }, intervalMs);
  sweepTimer.unref?.();
}

export function stopLeadClassificationLoop(): void {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = null;
}

// Chamado a partir do webhook a cada mensagem recebida. Nunca deve derrubar o webhook: qualquer
// erro fica só em log. Regras de texto aplicam na hora (custo zero); a Laya roda na próxima
// varredura do intervalo. Quem grava no Supabase é o flush periódico (server/evolutionLeadStageBuffer.ts).
export async function classifyLeadStageLive(leadId: string, incomingText?: string | null): Promise<void> {
  const settings = await getEvolutionAiLiveSettingsSupabase();
  if (!settings.enabled) return;

  const lead = await getEvolutionLeadByIdSupabase(leadId);
  if (!lead || lead.isQuarantine || !teamHasReplied(lead)) return;

  applyFunnelSignals(lead, signalsFromLeadText([incomingText]), 1);
  if (layaConfigFromEnv()) scheduleLeadClassification(lead.id);
}

export function pendingClassificationCountForTest(): number {
  return dirtyLeads.size;
}
