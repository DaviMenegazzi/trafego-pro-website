import { describe, expect, it, vi } from "vitest";
import { classifyLeadStageWithLaya } from "./evolutionLayaClient.js";

describe("classificação de estágio via serviço Laya (self-hosted)", () => {
  it("envia o histórico e a etapa atual, e retorna a classificação tipada", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ proposedStage: "lead_replied", confidence: 0.87 }), { status: 200 }));
    const result = await classifyLeadStageWithLaya({
      leadId: "lead-1",
      instanceName: "unidade-1",
      currentStage: "lead_responded",
      messages: [{ direction: "incoming", bodyText: "Tenho interesse", sentAt: "2026-09-01T12:00:00.000Z" }],
    }, { serviceUrl: "https://laya.test", serviceSecret: "secret-token", fetcher });

    expect(result).toEqual({ proposedStage: "lead_replied", confidence: 0.87 });
    expect(fetcher).toHaveBeenCalledWith("https://laya.test/classify", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
    }));
    const body = JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(body).toMatchObject({ leadId: "lead-1", instanceName: "unidade-1", currentStage: "lead_responded" });
  });

  it("rejeita etapa que não existe no pipeline", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ proposedStage: "unknown", confidence: 0.9 }), { status: 200 }));
    await expect(classifyLeadStageWithLaya(
      { leadId: "lead-1", instanceName: "unidade-1", currentStage: "lead_responded", messages: [] },
      { serviceUrl: "https://laya.test", serviceSecret: "secret-token", fetcher },
    )).rejects.toThrow("etapa de CRM inválida");
  });

  it("propaga o erro retornado pelo serviço quando o HTTP falha", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "modelo ainda carregando" }), { status: 503 }));
    await expect(classifyLeadStageWithLaya(
      { leadId: "lead-1", instanceName: "unidade-1", currentStage: "lead_responded", messages: [] },
      { serviceUrl: "https://laya.test", serviceSecret: "secret-token", fetcher },
    )).rejects.toThrow("modelo ainda carregando");
  });

  it("exige LAYA_SERVICE_URL e LAYA_SERVICE_SECRET configuradas", async () => {
    await expect(classifyLeadStageWithLaya(
      { leadId: "lead-1", instanceName: "unidade-1", currentStage: "lead_responded", messages: [] },
      { serviceUrl: undefined, serviceSecret: undefined, fetcher: vi.fn() },
    )).rejects.toThrow("LAYA_SERVICE_URL não configurada");
  });
});
