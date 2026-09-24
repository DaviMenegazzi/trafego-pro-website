import { describe, expect, it, vi, beforeEach } from "vitest";

const getSettings = vi.fn();
const getLead = vi.fn();
const listMessages = vi.fn();
const classify = vi.fn();
const bufferStageUpdate = vi.fn();
const bufferClassificationRun = vi.fn();

vi.mock("./evolutionSupabaseStore.js", () => ({
  getEvolutionAiLiveSettingsSupabase: (...args: unknown[]) => getSettings(...args),
  getEvolutionLeadByIdSupabase: (...args: unknown[]) => getLead(...args),
  listEvolutionMessagesSupabase: (...args: unknown[]) => listMessages(...args),
}));
vi.mock("./evolutionLayaClient.js", () => ({
  classifyLeadStageWithLaya: (...args: unknown[]) => classify(...args),
  LAYA_MODEL_NAME: "laya",
}));
vi.mock("./evolutionLeadStageBuffer.js", () => ({
  bufferStageUpdate: (...args: unknown[]) => bufferStageUpdate(...args),
  bufferClassificationRun: (...args: unknown[]) => bufferClassificationRun(...args),
}));

const baseLead = {
  id: "lead-1", instanceName: "unidade-1", crmStage: "lead_responded", lastMessageAt: "2026-09-22T12:00:00.000Z",
};
const messages = [{ direction: "incoming", bodyText: "Quero saber o preço", sentAt: "2026-09-22T12:00:00.000Z" }];

describe("orquestração de classificação ao vivo (Laya)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue({ enabled: true, minConfidence: 0.8 });
    getLead.mockResolvedValue(baseLead);
    listMessages.mockResolvedValue(messages);
  });

  it("não faz nada quando a automação ao vivo está desabilitada", async () => {
    getSettings.mockResolvedValue({ enabled: false, minConfidence: 0.8 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1");
    expect(getLead).not.toHaveBeenCalled();
  });

  it("aplica a mudança de estágio quando a confiança supera o mínimo", async () => {
    classify.mockResolvedValue({ proposedStage: "negotiation", confidence: 0.9 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1");

    expect(bufferStageUpdate).toHaveBeenCalledWith(expect.objectContaining({ leadId: "lead-1", toStage: "negotiation", changedBy: "automacao-ia-laya" }));
    expect(bufferClassificationRun).toHaveBeenCalledWith(expect.objectContaining({ status: "applied", appliedStage: "negotiation" }));
  });

  it("marca como 'review' quando a confiança fica abaixo do mínimo configurado", async () => {
    classify.mockResolvedValue({ proposedStage: "negotiation", confidence: 0.5 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1");

    expect(bufferStageUpdate).not.toHaveBeenCalled();
    expect(bufferClassificationRun).toHaveBeenCalledWith(expect.objectContaining({ status: "review" }));
  });

  it("marca como 'unchanged' quando a etapa proposta é igual à atual", async () => {
    classify.mockResolvedValue({ proposedStage: "lead_responded", confidence: 0.95 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1");

    expect(bufferStageUpdate).not.toHaveBeenCalled();
    expect(bufferClassificationRun).toHaveBeenCalledWith(expect.objectContaining({ status: "unchanged" }));
  });

  it("nunca deixa o erro do serviço Laya escapar — registra 'failed' no buffer", async () => {
    classify.mockRejectedValue(new Error("serviço fora do ar"));
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await expect(classifyLeadStageLive("lead-1")).resolves.toBeUndefined();

    expect(bufferClassificationRun).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", errorMessage: "serviço fora do ar" }));
  });

  it("não classifica etapas terminais mesmo com alta confiança", async () => {
    getLead.mockResolvedValue({ ...baseLead, crmStage: "closed_won" });
    classify.mockResolvedValue({ proposedStage: "negotiation", confidence: 0.99 });
    const { classifyLeadStageLive } = await import("./evolutionLiveClassification.js");
    await classifyLeadStageLive("lead-1");

    expect(bufferStageUpdate).not.toHaveBeenCalled();
    expect(bufferClassificationRun).toHaveBeenCalledWith(expect.objectContaining({ status: "review" }));
  });
});
