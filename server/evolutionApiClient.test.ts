import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPixelInstanceName,
  deleteEvolutionInstance,
  evolutionQrDataUrl,
  extractEvolutionQrValue,
  logoutEvolutionInstance,
  setEvolutionInstanceWebhook,
} from "./evolutionApiClient.js";

describe("Evolution API client", () => {
  it("gera um nome de instância aceito pela Evolution sem expor o nome cru", () => {
    const name = buildPixelInstanceName("Clínica São José / Centro");
    expect(name).toMatch(/^pixel-clinica-sao-jose-centro-[a-f0-9]{6}$/);
    expect(name.length).toBeLessThanOrEqual(80);
  });

  it("aceita os formatos de QR retornados pelas versões v2", async () => {
    expect(extractEvolutionQrValue({ qrcode: { base64: "data:image/png;base64,abc" } })).toBe("data:image/png;base64,abc");
    expect(extractEvolutionQrValue({ code: "2@qr-raw" })).toBe("2@qr-raw");
    await expect(evolutionQrDataUrl({ code: "2@qr-raw" })).resolves.toMatch(/^data:image\/png;base64,/);
  });
});

describe("Evolution API client — ciclo de vida da instância", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.EVOLUTION_API_URL = "https://evolution.example.com";
    process.env.EVOLUTION_API_KEY = "test-key";
    process.env.EVOLUTION_WEBHOOK_SECRET = "test-secret";
    process.env.EVOLUTION_WEBHOOK_PUBLIC_URL = "https://app.example.com/api/evolution/webhook";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("deleta a instância na Evolution API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteEvolutionInstance("pixel-unidade-abc123")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://evolution.example.com/instance/delete/pixel-unidade-abc123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("não lança quando a deleção falha, apenas retorna false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await expect(deleteEvolutionInstance("pixel-unidade-abc123")).resolves.toBe(false);
  });

  it("desconecta (logout) a instância na Evolution API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(logoutEvolutionInstance("pixel-unidade-abc123")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://evolution.example.com/instance/logout/pixel-unidade-abc123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reconfigura a URL e o segredo do webhook da instância", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(setEvolutionInstanceWebhook("pixel-unidade-abc123")).resolves.toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.webhook.url).toBe("https://app.example.com/api/evolution/webhook");
    expect(body.webhook.headers.authorization).toBe("Bearer test-secret");
  });
});

