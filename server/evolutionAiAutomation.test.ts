import { describe, expect, it, vi } from "vitest";
import { runDailyEvolutionAiAutomation } from "./evolutionAiAutomation.js";
import type { EvolutionLead, EvolutionMessage } from "./evolutionSupabaseStore.js";

const lead: EvolutionLead = {
  id: "00000000-0000-4000-8000-000000000001", instanceName: "vida-card-test", contactKey: "key", contactPhone: null, phoneLast4: "9999", contactName: null,
  classification: "lead", funnelStage: "novo", classificationNote: null, firstContactAt: "2026-08-15T10:00:00.000Z", lastMessageAt: "2026-08-15T12:00:00.000Z",
  messagesReceived: 1, messagesSent: 1, classifiedByEmail: null, classifiedAt: null, originPlatform: "unknown", originEvidence: "none", metaCtwaClid: null, googleClickId: null,
  originDetectedAt: null, crmStage: "lead_responded", crmStageUpdatedAt: null, crmStageUpdatedBy: null,
};
const messages: EvolutionMessage[] = [{ id: "m1", leadId: lead.id, instanceName: lead.instanceName, direction: "incoming", messageType: "conversation", bodyText: "Quero contratar", sentAt: lead.lastMessageAt }];

function createDeps(overrides: Record<string, unknown> = {}) {
  return {
    getSettings: vi.fn().mockResolvedValue({ enabled: true, minConfidence: 0.8, scheduleCronTaskUid: "job" }),
    listCompletedSourceKeys: vi.fn().mockResolvedValue(new Set()),
    listLeads: vi.fn().mockResolvedValue([lead]),
    listMessages: vi.fn().mockResolvedValue(messages),
    classify: vi.fn().mockResolvedValue({ proposedStage: "negotiation", confidence: 0.91, rationale: "O contato confirmou interesse e pediu condições." }),
    moveStage: vi.fn().mockResolvedValue({}),
    recordRun: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("automação diária do CRM Evolution", () => {
  it("move automaticamente uma classificação com confiança suficiente e audita a decisão", async () => {
    const deps = createDeps();
    const result = await runDailyEvolutionAiAutomation({ now: new Date("2026-08-16T02:55:00.000Z"), deps });
    expect(result).toMatchObject({ total: 1, applied: 1, review: 0 });
    expect(deps.moveStage).toHaveBeenCalledWith(expect.objectContaining({ toStage: "negotiation", changedBy: "automacao-ia-openai" }));
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ status: "applied", appliedStage: "negotiation" }));
  });

  it("envia para revisão sem alterar o funil quando a confiança é baixa", async () => {
    const deps = createDeps({ classify: vi.fn().mockResolvedValue({ proposedStage: "negotiation", confidence: 0.55, rationale: "Conversa pouco conclusiva." }) });
    const result = await runDailyEvolutionAiAutomation({ deps });
    expect(result).toMatchObject({ applied: 0, review: 1 });
    expect(deps.moveStage).not.toHaveBeenCalled();
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ status: "review" }));
  });

  it("não reprocessa a mesma versão da conversa após uma execução bem-sucedida", async () => {
    const deps = createDeps({ listCompletedSourceKeys: vi.fn().mockResolvedValue(new Set([`${lead.id}:${lead.lastMessageAt}`])) });
    const result = await runDailyEvolutionAiAutomation({ deps });
    expect(result).toMatchObject({ total: 0, alreadyProcessed: 1 });
    expect(deps.classify).not.toHaveBeenCalled();
  });
});
