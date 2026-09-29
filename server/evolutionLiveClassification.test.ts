import { describe, expect, it, vi, beforeEach } from "vitest";

const getSettings = vi.fn();
const getLead = vi.fn();
const listMessages = vi.fn();
const predict = vi.fn();
const bufferStageUpdate = vi.fn();
const bufferClassificationRun = vi.fn();
const bufferLeadScore = vi.fn();
const pendingStageFor = vi.fn();

vi.mock("./evolutionSupabaseStore.js", () => ({
  getEvolutionAiLiveSettingsSupabase: (...args: unknown[]) => getSettings(...args),
  getEvolutionLeadByIdSupabase: (...args: unknown[]) => getLead(...args),
  listEvolutionMessagesSupabase: (...args: unknown[]) => listMessages(...args),
}));
vi.mock("./evolutionLayaClient.js", () => ({
  layaPredict: (...args: unknown[]) => predict(...args),
  layaConfigFromEnv: () => null,
  LAYA_MODEL_NAME: "laya",
}));
vi.mock("./evolutionLeadStageBuffer.js", () => ({
  bufferStageUpdate: (...args: unknown[]) => bufferStageUpdate(...args),
  bufferClassificationRun: (...args: unknown[]) => bufferClassificationRun(...args),
  bufferLeadScore: (...args: unknown[]) => bufferLeadScore(...args),
  pendingStageFor: (...args: unknown[]) => pendingStageFor(...args),
}));

const baseLead = {
  id: "lead-1", instanceName: "unidade-1", crmStage: "lead_replied", lastMessageAt: "2026-09-22T12:00:00.000Z", messagesSent: 2, isQuarantine: false,
};
const messages = [
  { direction: "incoming", bodyText: "Oi, vi o anúncio", sentAt: "2026-09-22T11:00:00.000Z" },
  { direction: "outgoing", bodyText: "Olá! Como posso ajudar?", sentAt: "2026-09-22T11:01:00.000Z" },
  { direction: "incoming", bodyText: "Não tenho mais interesse", sentAt: "2026-09-22T12:00:00.000Z" },
];
const laya = { url: "https://laya.test", secret: "s" };

describe("Laya no Pixel de Mensagens (modelo do SDR Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue({ enabled: true, minConfidence: 0.8 });
    getLead.mockResolvedValue(baseLead);
    listMessages.mockResolvedValue(messages);
    pendingStageFor.mockReturnValue(null);
  });

  it("não faz nada quando a automação ao vivo está desabilitada", async () => {
    getSettings.mockResolvedValue({ enabled: false, minConfidence: 0.8 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1", "quanto custa?");
    expect(getLead).not.toHaveBeenCalled();
  });

  it("regra de texto move para negociação na hora", async () => {
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1", "Quanto custa?");
    expect(bufferStageUpdate).toHaveBeenCalledWith(expect.objectContaining({ toStage: "negotiation", changedBy: "automacao-regra-texto" }));
  });

  it("ignora leads que a equipe ainda não respondeu", async () => {
    getLead.mockResolvedValue({ ...baseLead, messagesSent: 0 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1", "Quanto custa?");
    expect(bufferStageUpdate).not.toHaveBeenCalled();
  });

  it("score baixo da Laya grava COLD e marca como perdido", async () => {
    predict.mockResolvedValue({ interest: { type: "score", score: 0.3, confidence: 0.8 } });
    const { classifyLeadWithLaya } = await import("./evolutionLiveClassification.js");
    const result = await classifyLeadWithLaya("lead-1", { laya });

    expect(result).toMatchObject({ status: "classified", score: 8, temperature: "COLD", movedTo: "closed_lost" });
    expect(bufferLeadScore).toHaveBeenCalledWith({ leadId: "lead-1", instanceName: "unidade-1", score: 8, temperature: "COLD" });
    expect(bufferStageUpdate).toHaveBeenCalledWith(expect.objectContaining({ toStage: "closed_lost", changedBy: "automacao-ia-laya" }));
  });

  it("score alto só atualiza temperatura, sem mexer na etapa", async () => {
    predict.mockResolvedValue({ interest: { type: "score", score: 3.2, confidence: 0.6 } });
    const { classifyLeadWithLaya } = await import("./evolutionLiveClassification.js");
    const result = await classifyLeadWithLaya("lead-1", { laya });

    expect(result).toMatchObject({ score: 80, temperature: "HOT", movedTo: null });
    expect(bufferStageUpdate).not.toHaveBeenCalled();
  });

  it("pula conversas com menos de duas mensagens do contato", async () => {
    listMessages.mockResolvedValue(messages.slice(0, 2));
    const { classifyLeadWithLaya } = await import("./evolutionLiveClassification.js");
    expect(await classifyLeadWithLaya("lead-1", { laya })).toEqual({ status: "skipped", reason: "not_enough_messages" });
    expect(predict).not.toHaveBeenCalled();
  });

  it("não marca como perdido um lead já fechado", async () => {
    getLead.mockResolvedValue({ ...baseLead, crmStage: "closed_won" });
    predict.mockResolvedValue({ interest: { type: "score", score: 0.1, confidence: 0.9 } });
    const { classifyLeadWithLaya } = await import("./evolutionLiveClassification.js");
    expect(await classifyLeadWithLaya("lead-1", { laya })).toMatchObject({ movedTo: null });
  });
});
