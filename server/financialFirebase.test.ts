import { afterEach, describe, expect, it, vi } from "vitest";

describe("financeiro via API REST do Firebase (sem conta de serviço)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lê, grava, apaga e faz update multi-caminho na URL do banco", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("FIREBASE_DATABASE_URL", "https://exemplo.firebaseio.com/");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ clientes: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getFinancialDatabase } = await import("./financialFirebase.js");
    const db = getFinancialDatabase();

    expect((await db.ref("trafegopro").get()).val()).toEqual({ clientes: {} });
    await db.ref("trafegopro/clientes/a1").set({ nome: "X" });
    await db.ref("trafegopro/clientes/a1").remove();
    await db.ref().update({ "trafegopro/clientes/a1": null });

    const calls = fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method, (init as RequestInit).body]);
    expect(calls).toEqual([
      ["https://exemplo.firebaseio.com/trafegopro.json", "GET", undefined],
      ["https://exemplo.firebaseio.com/trafegopro/clientes/a1.json", "PUT", JSON.stringify({ nome: "X" })],
      ["https://exemplo.firebaseio.com/trafegopro/clientes/a1.json", "DELETE", undefined],
      ["https://exemplo.firebaseio.com/.json", "PATCH", JSON.stringify({ "trafegopro/clientes/a1": null })],
    ]);
  });

  it("propaga erro HTTP do Firebase", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const { getFinancialDatabase } = await import("./financialFirebase.js");
    await expect(getFinancialDatabase().ref("trafegopro").get()).rejects.toThrow("HTTP 401");
  });
});
