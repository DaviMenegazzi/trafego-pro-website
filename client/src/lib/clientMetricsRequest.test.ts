import { describe, expect, it } from "vitest";
import { buildClientMetricsQuery } from "./clientMetricsRequest";

describe("consulta de métricas por unidade", () => {
  it("mantém a unidade selecionada na query enviada à aba de anúncios", () => {
    const query = buildClientMetricsQuery("2026-07-01", "2026-07-31", "unidade-tupancireta");
    expect(query).toBe("start=2026-07-01&end=2026-07-31&clientId=unidade-tupancireta");
  });

  it("não cria consulta sem uma unidade selecionada", () => {
    expect(buildClientMetricsQuery("2026-07-01", "2026-07-31", null)).toBeNull();
  });
});
