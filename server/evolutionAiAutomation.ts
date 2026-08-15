import { AUTOMATION_ACTOR, classifyEvolutionConversation, OPENAI_LEAD_CLASSIFIER_MODEL, type AiCrmClassification } from "./evolutionAiClassification.js";
import {
  getEvolutionAiAutomationSettingsSupabase,
  listEvolutionAiCompletedSourceKeysSupabase,
  listEvolutionLeadsForAiClassificationSupabase,
  listEvolutionMessagesSupabase,
  moveEvolutionLeadCrmStageSupabase,
  recordEvolutionAiClassificationRunSupabase,
  updateEvolutionAiAutomationStatusSupabase,
  type EvolutionAiAutomationSettings,
  type EvolutionAiClassificationRunInput,
  type EvolutionCrmStage,
  type EvolutionLead,
  type EvolutionMessage,
} from "./evolutionSupabaseStore.js";

const TERMINAL_STAGES: EvolutionCrmStage[] = ["closed_won", "closed_lost"];
const CONCURRENCY = 5;

export type DailyAutomationSummary = {
  status: "completed" | "disabled";
  total: number;
  applied: number;
  unchanged: number;
  review: number;
  skipped: number;
  failed: number;
  alreadyProcessed: number;
};

type AutomationDeps = {
  getSettings: () => Promise<EvolutionAiAutomationSettings>;
  listCompletedSourceKeys: () => Promise<Set<string>>;
  listLeads: () => Promise<EvolutionLead[]>;
  listMessages: (leadId: string) => Promise<EvolutionMessage[]>;
  classify: (input: { currentStage: EvolutionCrmStage; messages: Pick<EvolutionMessage, "direction" | "bodyText" | "sentAt">[] }) => Promise<AiCrmClassification>;
  moveStage: (input: { leadId: string; instanceName: string; toStage: EvolutionCrmStage; changedBy: string; note?: string }) => Promise<unknown>;
  recordRun: (input: EvolutionAiClassificationRunInput) => Promise<void>;
  updateStatus: (input: { status: string; summary?: Record<string, number | string | boolean>; startedAt?: string; completedAt?: string }) => Promise<void>;
};

const productionDeps: AutomationDeps = {
  getSettings: getEvolutionAiAutomationSettingsSupabase,
  listCompletedSourceKeys: listEvolutionAiCompletedSourceKeysSupabase,
  listLeads: listEvolutionLeadsForAiClassificationSupabase,
  listMessages: listEvolutionMessagesSupabase,
  classify: classifyEvolutionConversation,
  moveStage: moveEvolutionLeadCrmStageSupabase,
  recordRun: recordEvolutionAiClassificationRunSupabase,
  updateStatus: updateEvolutionAiAutomationStatusSupabase,
};

function sourceKey(lead: EvolutionLead): string {
  return `${lead.id}:${new Date(lead.lastMessageAt).toISOString()}`;
}

function executionKey(now: Date): string {
  return `daily-lead-stage:${now.toISOString().slice(0, 10)}`;
}

function emptySummary(status: DailyAutomationSummary["status"]): DailyAutomationSummary {
  return { status, total: 0, applied: 0, unchanged: 0, review: 0, skipped: 0, failed: 0, alreadyProcessed: 0 };
}

function aiNote(result: AiCrmClassification): string {
  return `IA ${OPENAI_LEAD_CLASSIFIER_MODEL} (confiança ${result.confidence.toFixed(2)}): ${result.rationale}`.slice(0, 500);
}

async function processLead(
  lead: EvolutionLead,
  settings: EvolutionAiAutomationSettings,
  deps: AutomationDeps,
  key: string,
  summary: DailyAutomationSummary,
): Promise<void> {
  const messages = (await deps.listMessages(lead.id)).filter((message) => message.bodyText.trim()).slice(-10);
  const base = {
    leadId: lead.id,
    instanceName: lead.instanceName,
    sourceLastMessageAt: lead.lastMessageAt,
    sourceMessageCount: messages.length,
    model: OPENAI_LEAD_CLASSIFIER_MODEL,
    previousStage: lead.crmStage,
    executionKey: key,
  };
  if (!messages.length) {
    await deps.recordRun({ ...base, proposedStage: null, appliedStage: null, confidence: null, rationale: null, status: "skipped", errorMessage: "Sem mensagens de texto disponíveis" });
    summary.skipped += 1;
    return;
  }

  try {
    const classification = await deps.classify({ currentStage: lead.crmStage, messages });
    if (classification.proposedStage === lead.crmStage) {
      await deps.recordRun({ ...base, proposedStage: classification.proposedStage, appliedStage: null, confidence: classification.confidence, rationale: classification.rationale, status: "unchanged" });
      summary.unchanged += 1;
      return;
    }
    if (TERMINAL_STAGES.includes(lead.crmStage) || classification.confidence < settings.minConfidence) {
      await deps.recordRun({ ...base, proposedStage: classification.proposedStage, appliedStage: null, confidence: classification.confidence, rationale: classification.rationale, status: "review" });
      summary.review += 1;
      return;
    }
    await deps.moveStage({ leadId: lead.id, instanceName: lead.instanceName, toStage: classification.proposedStage, changedBy: AUTOMATION_ACTOR, note: aiNote(classification) });
    await deps.recordRun({ ...base, proposedStage: classification.proposedStage, appliedStage: classification.proposedStage, confidence: classification.confidence, rationale: classification.rationale, status: "applied" });
    summary.applied += 1;
  } catch (error) {
    await deps.recordRun({ ...base, proposedStage: null, appliedStage: null, confidence: null, rationale: null, status: "failed", errorMessage: error instanceof Error ? error.message : String(error) });
    summary.failed += 1;
  }
}

async function processWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  const iterator = items.values();
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    for (let next = iterator.next(); !next.done; next = iterator.next()) await worker(next.value);
  });
  await Promise.all(workers);
}

export async function runDailyEvolutionAiAutomation(
  options: { now?: Date; deps?: Partial<AutomationDeps> } = {},
): Promise<DailyAutomationSummary> {
  const deps = { ...productionDeps, ...options.deps };
  const now = options.now ?? new Date();
  const settings = await deps.getSettings();
  if (!settings.enabled) return emptySummary("disabled");
  const startedAt = now.toISOString();
  await deps.updateStatus({ status: "running", startedAt });
  const summary = emptySummary("completed");
  const [completedKeys, leads] = await Promise.all([deps.listCompletedSourceKeys(), deps.listLeads()]);
  const candidates = leads.filter((lead) => {
    if (completedKeys.has(sourceKey(lead))) {
      summary.alreadyProcessed += 1;
      return false;
    }
    return true;
  });
  summary.total = candidates.length;
  const key = executionKey(now);
  await processWithConcurrency(candidates, async (lead) => processLead(lead, settings, deps, key, summary));
  await deps.updateStatus({ status: "completed", completedAt: new Date().toISOString(), summary });
  return summary;
}
