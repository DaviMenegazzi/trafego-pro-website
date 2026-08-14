import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FALLBACK_UNITS, REASONS } from "../client/src/pages/feedbackLeadsConfig";
import { submitFeedbackLead } from "../client/src/pages/feedbackLeadsApi";
import { shouldRedirectToLogin } from "../client/src/hooks/adminAuthPolicy";
import { deleteFeedbackLead } from "./db.js";
import { signToken, startServer } from "./index.js";

describe("Lead feedback form configuration", () => {
  it("contains the 17 Vida Card units", () => {
    expect(FALLBACK_UNITS).toHaveLength(17);
    expect(FALLBACK_UNITS).toContain("Ijuí");
    expect(FALLBACK_UNITS).toContain("Uruguaiana");
  });

  it("contains the approved non-conversion reasons", () => {
    expect(REASONS).toEqual([
      "Preço/Objeção de valor",
      "Cliente pediu tempo para decidir",
      "Sem resposta do lead",
      "Fora da área de atuação",
      "Já é cliente/duplicado",
      "Outro",
    ]);
  });

  it("requires a token before attempting submission", async () => {
    await expect(submitFeedbackLead({ unit: "Ijuí" }, null, async () => {
      throw new Error("fetch should not be called");
    })).rejects.toThrow("SESSION_EXPIRED");
  });

  it("submits with the bearer token and accepts a successful response", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const result = await submitFeedbackLead(
      { unit: "Ijuí", responsible: "Teste" },
      "test-token",
      async (input, init) => {
        request = { input, init };
        return new Response(JSON.stringify({ id: 42 }), { status: 201 });
      },
    );

    expect(result).toEqual({ id: 42 });
    expect(request?.input).toBe("/api/feedback-leads");
    expect(request?.init?.method).toBe("POST");
    expect((request?.init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("surfaces the backend error for an unsuccessful response", async () => {
    await expect(
      submitFeedbackLead({ unit: "Ijuí" }, "test-token", async () =>
        new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), { status: 400 }),
      ),
    ).rejects.toThrow("Campos obrigatórios faltando");
  });
});


describe("Protected feedback endpoint", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;

  beforeAll(async () => {
    const started = await startServer({ listen: false });
    server = started.server;
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) return;
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  });

  it("returns 401 when the feedback endpoint has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/feedback-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit: "Ijuí", responsible: "Teste", weekStart: "2026-08-10" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns a validation error for an authenticated incomplete submission", async () => {
    const token = signToken({
      email: "endpoint-test@trafego.pro",
      name: "Endpoint Test",
      role: "admin",
      id: 999,
      allowedClientIds: ["*"],
    });
    const response = await fetch(`${baseUrl}/api/feedback-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unit: "Ijuí" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Campos obrigatórios faltando" });
  });

  it("creates a feedback record for an authenticated valid submission", async () => {
    const token = signToken({
      email: "endpoint-test@trafego.pro",
      name: "Endpoint Test",
      role: "admin",
      id: 999,
      allowedClientIds: ["*"],
    });
    const response = await fetch(`${baseUrl}/api/feedback-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        unit: "Ijuí",
        responsible: "Endpoint Test",
        weekStart: "2026-08-10",
        totalLeads: 12,
        leadsAnswered: 10,
        salesClosed: 2,
        submittedAt: "2026-08-14T00:00:00.000Z",
      }),
    });

    expect(response.status).toBe(201);
    const created = (await response.json()) as { id: number; unit: string; totalLeads: number };
    expect(created).toMatchObject({ unit: "Ijuí", totalLeads: 12 });
    deleteFeedbackLead(created.id);
  });
});


describe("Standalone feedback auth guard policy", () => {
  const adminUser = JSON.stringify({ email: "admin@trafego.pro", role: "admin", name: "Admin" });

  it("allows a verified admin session", () => {
    expect(shouldRedirectToLogin("token", adminUser, true)).toBe(false);
  });

  it("redirects when the session is missing, invalid, or not admin", () => {
    expect(shouldRedirectToLogin(null, adminUser, true)).toBe(true);
    expect(shouldRedirectToLogin("token", adminUser, false)).toBe(true);
    expect(shouldRedirectToLogin("token", JSON.stringify({ role: "user" }), true)).toBe(true);
    expect(shouldRedirectToLogin("token", "not-json", true)).toBe(true);
  });
});
