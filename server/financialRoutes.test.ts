import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { financialPath, financialRouter } from "./routes/financialRoutes.js";
import { signToken } from "./auth.js";

describe("financial API boundary", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", financialRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("blocks financial reads and writes without an app session", async () => {
    const [read, write] = await Promise.all([
      fetch(`${baseUrl}/api/finance`),
      fetch(`${baseUrl}/api/finance/item/despesas/1`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: 1 }),
      }),
    ]);
    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
  });

  it("accepts only known financial paths and safe IDs", () => {
    expect(financialPath("cobrancas/unit_1/2026-09")).toBe("trafegopro/cobrancas/unit_1/2026-09");
    expect(financialPath("caixa")).toBe("trafegopro/caixa");
    expect(financialPath("usuarios/123")).toBeNull();
    expect(financialPath("clientes/../segredo")).toBeNull();
    expect(financialPath("__proto__/1")).toBeNull();
  });

  it("rejects an app JWT without the matching Supabase session", async () => {
    const token = signToken({ id: "admin-1", role: "admin", allowedClientIds: ["*"] });
    const response = await fetch(`${baseUrl}/api/finance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
  });
});
