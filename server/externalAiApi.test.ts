import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer } from "./index.js";

describe("fronteira de autenticação da API externa", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;
  beforeAll(async () => { const started = await startServer({ listen: false }); server = started.server; await new Promise<void>((resolve, reject) => { server!.once("error", reject); server!.listen(0, "127.0.0.1", () => resolve()); }); const address = server.address(); if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível"); baseUrl = `http://127.0.0.1:${address.port}`; });
  afterAll(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); });
  it("rejeita chamadas sem token antes de acessar qualquer dado", async () => { const response = await fetch(`${baseUrl}/api/external/v1/metrics?unit_id=0cf96a70-0244-42c2-a02b-1e86ae67af41`); expect(response.status).toBe(401); await expect(response.json()).resolves.toEqual({ error: "Token de API ausente ou inválido" }); });
  it("não aceita tokens em query string ou bearer arbitrário", async () => { expect((await fetch(`${baseUrl}/api/external/v1/units?token=tpai_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`)).status).toBe(401); expect((await fetch(`${baseUrl}/api/external/v1/units`, { headers: { Authorization: "Bearer token-invalido" } })).status).toBe(401); });
});
