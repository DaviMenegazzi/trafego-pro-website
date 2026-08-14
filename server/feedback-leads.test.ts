import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FALLBACK_UNITS, FEEDBACK_LAYOUT, REASONS, getAuthorizedUnitNames } from "../client/src/pages/feedbackLeadsConfig";
import { submitFeedbackLead } from "../client/src/pages/feedbackLeadsApi";
import { shouldRedirectToLogin } from "../client/src/hooks/adminAuthPolicy";
import { deleteFeedbackLead } from "./db.js";
import { hasUnitAccess, signToken, startServer } from "./index.js";

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

  it("shows only the units assigned to a restricted user", () => {
    const clients = [
      { id: "unit-ijui", name: "Ijuí" },
      { id: "unit-canela", name: "Canela" },
      { id: "unit-itaqui", name: "Itaqui" },
    ];

    expect(getAuthorizedUnitNames(clients, FALLBACK_UNITS, ["unit-canela"], "client_viewer")).toEqual(["Canela"]);
    expect(getAuthorizedUnitNames(clients, FALLBACK_UNITS, ["unit-canela", "unit-itaqui"], "viewer")).toEqual(["Canela", "Itaqui"]);
    expect(getAuthorizedUnitNames([], FALLBACK_UNITS, ["unit-canela"], "client_viewer")).toEqual([]);
  });

    it("keeps full access only for clients returned by the backend", () => {
    const clients = [
      { id: "unit-ijui", name: "Ijuí" },
      { id: "unit-canela", name: "Canela" },
    ];
    expect(getAuthorizedUnitNames(clients, FALLBACK_UNITS, [], "admin")).toEqual(["Ijuí", "Canela"]);
    expect(getAuthorizedUnitNames([], FALLBACK_UNITS, [], "admin")).toEqual([]);
    expect(hasUnitAccess("unit-canela", { role: "viewer", allowedClientIds: ["*"] })).toBe(true);
  });

  it("denies a restricted backend claim for an unassigned unit", () => {
    const claims = { role: "client_viewer", allowedClientIds: ["unit-ijui"] };
    expect(hasUnitAccess("unit-ijui", claims)).toBe(true);
    expect(hasUnitAccess("unit-canela", claims)).toBe(false);
  });

  it("keeps the standalone form readable across responsive breakpoints", () => {
    expect(FEEDBACK_LAYOUT.page).toContain("max-w-5xl");
    expect(FEEDBACK_LAYOUT.page).toContain("px-4");
    expect(FEEDBACK_LAYOUT.page).toContain("sm:px-8");
    expect(FEEDBACK_LAYOUT.identityGrid).toBe("grid grid-cols-1 gap-4 md:grid-cols-3");
    expect(FEEDBACK_LAYOUT.metricsGrid).toBe("grid grid-cols-1 gap-4 md:grid-cols-2");
    expect(FEEDBACK_LAYOUT.fieldMinHeight).toBeGreaterThanOrEqual(44);
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

  it("returns 403 when a restricted user submits an unassigned unit", async () => {
    const token = signToken({
      email: "restricted-test@trafego.pro",
      name: "Restricted Test",
      role: "client_viewer",
      id: 998,
      allowedClientIds: ["client-id-that-does-not-exist"],
    });
    const response = await fetch(`${baseUrl}/api/feedback-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unit: "__unassigned_test_unit__", responsible: "Restricted Test", weekStart: "2026-08-10" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Sem acesso a essa unidade" });
  });

  it("returns only authorized clients for a restricted metrics session", async () => {
    const token = signToken({
      email: "units-test@trafego.pro",
      name: "Units Test",
      role: "client_viewer",
      id: 997,
      allowedClientIds: ["client-id-that-does-not-exist"],
    });
    const response = await fetch(`${baseUrl}/api/metrics/units`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { clients: Array<{ id: string }> };
    expect(data.clients.every((client) => client.id === "client-id-that-does-not-exist")).toBe(true);
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

  it("allows a verified restricted user with assigned units", () => {
    const restrictedUser = JSON.stringify({
      email: "unit@trafego.pro",
      role: "client_viewer",
      name: "Unit Viewer",
      allowedClientIds: ["client-ijui"],
    });
    expect(shouldRedirectToLogin("token", restrictedUser, true)).toBe(false);
  });

  it("redirects when the session is missing, invalid, or not admin", () => {
    expect(shouldRedirectToLogin(null, adminUser, true)).toBe(true);
    expect(shouldRedirectToLogin("token", adminUser, false)).toBe(true);
    expect(shouldRedirectToLogin("token", JSON.stringify({ role: "user" }), true)).toBe(true);
    expect(shouldRedirectToLogin("token", JSON.stringify({ role: "client_viewer", allowedClientIds: [] }), true)).toBe(true);
    expect(shouldRedirectToLogin("token", "not-json", true)).toBe(true);
  });
});
