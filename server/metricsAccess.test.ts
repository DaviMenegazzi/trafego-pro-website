import { describe, expect, it } from "vitest";
import { validateMetricsClientSelection } from "./metricsAccess.js";

describe("validação da unidade em métricas de anúncios", () => {
  it("exige que uma unidade seja selecionada", () => {
    expect(validateMetricsClientSelection(undefined, { role: "admin", allowedClientIds: ["*"] })).toEqual({
      status: 400,
      error: "Selecione uma unidade para consultar os anúncios",
    });
  });

  it("permite uma unidade vinculada ao usuário", () => {
    expect(validateMetricsClientSelection("unidade-a", { role: "client_viewer", allowedClientIds: ["unidade-a"] })).toBeNull();
  });

  it("bloqueia uma unidade sem permissão", () => {
    expect(validateMetricsClientSelection("unidade-b", { role: "client_viewer", allowedClientIds: ["unidade-a"] })).toEqual({
      status: 403,
      error: "Sem acesso a essa unidade",
    });
  });

  it("permite todas as unidades para acesso administrativo", () => {
    expect(validateMetricsClientSelection("unidade-b", { role: "admin", allowedClientIds: ["*"] })).toBeNull();
  });
});
