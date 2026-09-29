import { describe, expect, it, vi } from "vitest";
import { layaConfigFromEnv, layaPredict, type LayaQuestion } from "./evolutionLayaClient.js";

const interest: LayaQuestion = { type: "score", instructions: "Interesse?", criteria: ["nenhum", "alto"] };

describe("cliente do serviço Laya (/predict, igual ao SDR Flow)", () => {
  it("envia state e perguntas e devolve as respostas tipadas", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answers: { interest: { type: "score", score: 1.2, confidence: 0.7 } } }), { status: 200 }));
    const answers = await layaPredict({ url: "https://laya.test/", secret: "secret-token", fetcher }, ["CONTATO: oi"], { interest });

    expect(answers.interest).toEqual({ type: "score", score: 1.2, confidence: 0.7 });
    expect(fetcher).toHaveBeenCalledWith("https://laya.test/predict", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
    }));
    expect(JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body))).toEqual({ state: ["CONTATO: oi"], questions: { interest } });
  });

  it("rejeita resposta de tipo diferente do perguntado", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answers: { interest: { type: "choice", choice: "x", confidence: 0.9 } } }), { status: 200 }));
    await expect(layaPredict({ url: "https://laya.test", secret: "s", fetcher }, ["x"], { interest })).rejects.toThrow("resposta inválida");
  });

  it("propaga HTTP de erro", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(layaPredict({ url: "https://laya.test", secret: "s", fetcher }, ["x"], { interest })).rejects.toThrow("HTTP 503");
  });

  it("só configura quando URL e segredo existem", () => {
    expect(layaConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(layaConfigFromEnv({ LAYA_SERVICE_URL: "https://l", LAYA_SERVICE_SECRET: "s" } as NodeJS.ProcessEnv)).toMatchObject({ url: "https://l", secret: "s", timeoutMs: 45000 });
  });
});
