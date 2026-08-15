import { describe, expect, it } from "vitest";
import { MetricsSessionError, readMetricsResponse } from "./metricsResponse";

describe("respostas de métricas", () => {
  it("transforma 401 com HTML em erro de sessão, sem tentar fazer parse de JSON", async () => {
    const response = new Response("<html><head><title>Login</title></head></html>", {
      status: 401,
      headers: { "content-type": "text/html" },
    });

    await expect(readMetricsResponse(response, "Falha")).rejects.toBeInstanceOf(MetricsSessionError);
  });

  it("retorna o payload quando a resposta de métricas é JSON válido", async () => {
    const response = new Response(JSON.stringify({ rows: [{ total_spend: 15 }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(readMetricsResponse(response, "Falha")).resolves.toEqual({ rows: [{ total_spend: 15 }] });
  });
});
