import { afterEach, describe, expect, it, vi } from "vitest";

describe("acesso financeiro ao Firebase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falha sem credencial de serviço, mesmo com URL de banco configurada", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("FIREBASE_DATABASE_URL", "https://exemplo.firebaseio.com/");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getFinancialDatabase } = await import("./financialFirebase.js");
    expect(() => getFinancialDatabase()).toThrow("FIREBASE_SERVICE_ACCOUNT_JSON é obrigatória");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
