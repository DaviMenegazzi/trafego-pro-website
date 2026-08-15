import { describe, expect, it, vi } from "vitest";
import { buildClassificationPrompt, classifyEvolutionConversation, parseAiCrmClassification } from "./evolutionAiClassification.js";

describe("classificação automática de CRM por IA", () => {
  it("mantém o prompt limitado à conversa, sem telefone ou nome do contato", () => {
    const prompt = buildClassificationPrompt({
      currentStage: "lead_responded",
      messages: [{ direction: "incoming", bodyText: "Quero saber o valor do plano", sentAt: "2026-08-15T12:00:00.000Z" }],
    });
    expect(prompt).toContain("CONTATO: Quero saber o valor do plano");
    expect(prompt).not.toContain("5511");
    expect(prompt).not.toContain("Nome do contato");
  });

  it("aceita uma classificação estruturada em uma etapa válida", () => {
    expect(parseAiCrmClassification(JSON.stringify({ proposedStage: "negotiation", confidence: 0.91, rationale: "O contato pediu condições e confirmou interesse." }))).toEqual({
      proposedStage: "negotiation", confidence: 0.91, rationale: "O contato pediu condições e confirmou interesse.",
    });
  });

  it("rejeita etapa que não existe no pipeline", () => {
    expect(() => parseAiCrmClassification(JSON.stringify({ proposedStage: "unknown", confidence: 0.9, rationale: "Teste" }))).toThrow("etapa de CRM inválida");
  });

  it("chama gpt-5-nano com resposta JSON estruturada", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ proposedStage: "lead_replied", confidence: 0.88, rationale: "O contato respondeu demonstrando interesse." }) } }],
    }), { status: 200 }));
    const result = await classifyEvolutionConversation({
      currentStage: "lead_responded",
      messages: [{ direction: "incoming", bodyText: "Tenho interesse", sentAt: "2026-08-15T12:00:00.000Z" }],
    }, { apiKey: "test-key", fetcher });

    expect(result.proposedStage).toBe("lead_replied");
    expect(fetcher).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toMatchObject({ model: "gpt-5-nano", response_format: { type: "json_schema" } });
  });
});
