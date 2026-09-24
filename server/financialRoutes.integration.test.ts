import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const firebase = vi.hoisted(() => ({
  value: { clientes: { unit_1: { nome: "Unidade 1" } } },
  writes: [] as Array<{ path: string | undefined; value: unknown }>,
}));

vi.mock("./financialFirebase.js", () => ({
  getFinancialDatabase: () => ({
    ref: (path?: string) => ({
      get: async () => ({ val: () => firebase.value }),
      set: async (value: unknown) => { firebase.writes.push({ path, value }); },
      remove: async () => { firebase.writes.push({ path, value: null }); },
      update: async (value: unknown) => { firebase.writes.push({ path, value }); },
    }),
  }),
}));

vi.mock("./auth.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./auth.js")>();
  return {
    ...original,
    getSupabaseForRequest: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { role: "admin", status: "active" }, error: null,
      }) }) }) }),
    }),
  };
});

import { signToken } from "./auth.js";
import { financialRouter } from "./routes/financialRoutes.js";

describe("financial API for a current administrator", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", financialRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    baseUrl = `http://127.0.0.1:${address.port}`;
    token = signToken({ id: "admin-1", role: "admin", allowedClientIds: ["*"] });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const headers = () => ({ Authorization: `Bearer ${token}`, Cookie: "tp_supabase_access=valid" });

  it("returns the financial state only through the protected API", async () => {
    const response = await fetch(`${baseUrl}/api/finance`, { headers: headers() });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(firebase.value);
  });

  it("writes only within the financial tree", async () => {
    const response = await fetch(`${baseUrl}/api/finance/item/despesas/expense_1`, {
      method: "PUT", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ valor: 42 }),
    });
    expect(response.status).toBe(204);
    expect(firebase.writes.at(-1)).toEqual({ path: "trafegopro/despesas/expense_1", value: { valor: 42 } });
  });
});
