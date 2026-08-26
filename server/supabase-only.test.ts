import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { signToken, startServer } from "./index.js";

describe("Dashboard com Supabase como fonte exclusiva", () => {
  let server: Server | null = null;
  let baseUrl = "";
  const token = signToken({
    email: "admin-supabase-test@trafego.pro",
    name: "Admin Supabase Test",
    role: "admin",
    id: "00000000-0000-4000-8000-000000000001",
    allowedClientIds: ["*"],
  });

  beforeAll(async () => {
    const started = await startServer({ listen: false });
    server = started.server;
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Servidor de teste não iniciou");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  });

  it("não expõe as rotas internas removidas de clientes e campanhas", async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [clients, campaign] = await Promise.all([
      fetch(`${baseUrl}/api/clients`, { headers }),
      fetch(`${baseUrl}/api/campaigns/1`, { method: "DELETE", headers }),
    ]);

    expect(clients.status).toBe(404);
    expect(campaign.status).toBe(404);
  });

  it("não permite consulta de unidades com JWT local sem sessão Supabase quando Meta Direct estiver desativado", async () => {
    const originalToken = process.env.META_DIRECT_TOKEN;
    delete process.env.META_DIRECT_TOKEN;
    try {
      const response = await fetch(`${baseUrl}/api/metrics/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Sessão Supabase expirada" });
    } finally {
      if (originalToken) process.env.META_DIRECT_TOKEN = originalToken;
    }
  });
});
