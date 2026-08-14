import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  COMMUNICATION_OPTIONS,
  FALLBACK_UNITS,
  FEEDBACK_LAYOUT,
  LOSS_REASONS,
  RATING_OPTIONS,
  getAuthorizedUnitNames,
} from "../client/src/pages/feedbackLeadsConfig";
import { submitFeedbackLead } from "../client/src/pages/feedbackLeadsApi";
import { shouldRedirectToLogin } from "../client/src/hooks/adminAuthPolicy";
import { canSeeAdminFeedbacks } from "../client/src/components/adminNavigationPolicy";
import { deleteFeedbackLeadSql, planLegacyFeedbackBackfill } from "./feedbackSql.js";
import { hasUnitAccess, signToken, startServer } from "./index.js";

const validFeedback = {
  unit: "Ijuí",
  responsible: "Gestor de Teste",
  weekStart: "2026-08-10",
  weekEnd: "2026-08-16",
  totalLeads: 24,
  leadsContacted: 20,
  leadsResponded: 16,
  leadsConverted: 4,
  leadsLost: 8,
  leadsInNegotiation: 12,
  lossReason: "Preço",
  leadQuality: 4,
  observations: "Contexto de teste",
  agencySatisfaction: 5,
  communicationClarity: "Sim",
  agencyAdjustment: "Nenhum ajuste",
  submittedAt: "2026-08-14T00:00:00.000Z",
};

describe("Lead feedback weekly form configuration", () => {
  it("contains the 17 Vida Card units", () => {
    expect(FALLBACK_UNITS).toHaveLength(17);
    expect(FALLBACK_UNITS).toContain("Ijuí");
    expect(FALLBACK_UNITS).toContain("Uruguaiana");
  });

  it("uses the new loss, communication and rating options", () => {
    expect(LOSS_REASONS).toEqual(["Preço", "Não respondeu", "Não tinha interesse", "Fora do perfil", "Outro"]);
    expect(COMMUNICATION_OPTIONS).toEqual(["Sim", "Parcialmente", "Não"]);
    expect(RATING_OPTIONS).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows only the units assigned to a restricted user", () => {
    const clients = [{ id: "unit-ijui", name: "Ijuí" }, { id: "unit-canela", name: "Canela" }, { id: "unit-itaqui", name: "Itaqui" }];
    expect(getAuthorizedUnitNames(clients, FALLBACK_UNITS, ["unit-canela"], "client_viewer")).toEqual(["Canela"]);
    expect(getAuthorizedUnitNames(clients, FALLBACK_UNITS, ["unit-canela", "unit-itaqui"], "viewer")).toEqual(["Canela", "Itaqui"]);
    expect(getAuthorizedUnitNames([], FALLBACK_UNITS, ["unit-canela"], "client_viewer")).toEqual([]);
  });

  it("keeps the form responsive and comfortable to use", () => {
    expect(FEEDBACK_LAYOUT.page).toContain("max-w-5xl");
    expect(FEEDBACK_LAYOUT.identityGrid).toBe("grid grid-cols-1 gap-4 md:grid-cols-3");
    expect(FEEDBACK_LAYOUT.metricsGrid).toBe("grid grid-cols-1 gap-4 md:grid-cols-2");
    expect(FEEDBACK_LAYOUT.fieldMinHeight).toBeGreaterThanOrEqual(44);
  });

  it("requires a token before attempting submission", async () => {
    await expect(submitFeedbackLead({ unit: "Ijuí" }, null, async () => { throw new Error("fetch should not be called"); })).rejects.toThrow("SESSION_EXPIRED");
  });

  it("submits the weekly payload with bearer authentication", async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
    const result = await submitFeedbackLead(validFeedback, "test-token", async (input, init) => {
      request = { input, init };
      return new Response(JSON.stringify({ id: 42 }), { status: 201 });
    });
    expect(result).toEqual({ id: 42 });
    expect(request?.input).toBe("/api/feedback-leads");
    expect(request?.init?.method).toBe("POST");
    expect((request?.init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("preserves legacy feedback data when backfilling to the weekly contract", () => {
    expect(planLegacyFeedbackBackfill({
      weekStart: "2026-08-10",
      leadsAnswered: 18,
      salesClosed: 4,
      leadsNoAnswer: 7,
      mainReason: "Cliente pediu tempo para decidir",
      generalObservations: "Dados do modelo anterior",
      supportNeeded: "Revisar criativos",
    })).toEqual({
      weekEnd: "2026-08-16",
      leadsContacted: 18,
      leadsResponded: 18,
      leadsConverted: 4,
      leadsLost: 7,
      leadsInNegotiation: 0,
      lossReason: "Cliente pediu tempo para decidir",
      observations: "Dados do modelo anterior",
      agencyAdjustment: "Revisar criativos",
    });
  });
});

describe("Protected weekly feedback endpoints", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;
  const createdIds: number[] = [];
  const adminToken = () => signToken({ email: "admin-list@trafego.pro", name: "Admin List", role: "admin", id: 995, allowedClientIds: ["*"] });

  beforeAll(async () => {
    const started = await startServer({ listen: false });
    server = started.server;
    await new Promise<void>((resolve, reject) => { server!.once("error", reject); server!.listen(0, "127.0.0.1", () => resolve()); });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await Promise.all(createdIds.map((id) => deleteFeedbackLeadSql(id)));
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  });

  it("returns 401 for an unauthenticated submission", async () => {
    const response = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validFeedback) });
    expect(response.status).toBe(401);
  });

  it("validates the complete weekly contract", async () => {
    const response = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ unit: "Ijuí" }) });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Campos obrigatórios faltando" });
  });

  it("rejects invalid weekly ratings and dates", async () => {
    const invalidRating = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ ...validFeedback, leadQuality: 6 }) });
    expect(invalidRating.status).toBe(400);
    await expect(invalidRating.json()).resolves.toEqual({ error: "As avaliações devem estar entre 1 e 5" });
    const invalidPeriod = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify({ ...validFeedback, weekStart: "2026-08-17", weekEnd: "2026-08-16" }) });
    expect(invalidPeriod.status).toBe(400);
  });

  it("returns 403 when a restricted user submits an unassigned unit", async () => {
    const token = signToken({ email: "restricted-test@trafego.pro", name: "Restricted Test", role: "client_viewer", id: 998, allowedClientIds: ["client-id-that-does-not-exist"] });
    const response = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...validFeedback, unit: "__unassigned_test_unit__" }) });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Sem acesso a essa unidade" });
  });

  it("creates and lists the new SQL feedback record for an admin", async () => {
    const response = await fetch(`${baseUrl}/api/feedback-leads`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` }, body: JSON.stringify(validFeedback) });
    expect(response.status).toBe(201);
    const created = await response.json() as { id: number; leadsConverted: number; agencySatisfaction: number; weekEnd: string };
    createdIds.push(created.id);
    expect(created).toMatchObject({ leadsConverted: 4, agencySatisfaction: 5, weekEnd: "2026-08-16" });
    const listResponse = await fetch(`${baseUrl}/api/feedback-leads?unit=Ijuí`, { headers: { Authorization: `Bearer ${adminToken()}` } });
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json() as Array<{ id: number }>).some((item) => item.id === created.id)).toBe(true);
  });

  it("denies listing and exporting feedbacks to non-admin sessions", async () => {
    const token = signToken({ email: "viewer@trafego.pro", name: "Viewer", role: "client_viewer", id: 996, allowedClientIds: ["client-id-that-does-not-exist"] });
    const list = await fetch(`${baseUrl}/api/feedback-leads`, { headers: { Authorization: `Bearer ${token}` } });
    const exportResponse = await fetch(`${baseUrl}/api/feedback-leads/export`, { headers: { Authorization: `Bearer ${token}` } });
    expect(list.status).toBe(403);
    expect(exportResponse.status).toBe(403);
  });

  it("exports the complete weekly feedback database for admins", async () => {
    const response = await fetch(`${baseUrl}/api/feedback-leads/export`, { headers: { Authorization: `Bearer ${adminToken()}` } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("feedbacks-semanais-completo.xlsx");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });
});

describe("Feedback permission policies", () => {
  it("keeps unit access restricted according to the signed session", () => {
    expect(hasUnitAccess("unit-ijui", { role: "client_viewer", allowedClientIds: ["unit-ijui"] })).toBe(true);
    expect(hasUnitAccess("unit-canela", { role: "client_viewer", allowedClientIds: ["unit-ijui"] })).toBe(false);
  });

  it("shows submitted feedback navigation only for admins", () => {
    expect(canSeeAdminFeedbacks({ role: "admin" })).toBe(true);
    expect(canSeeAdminFeedbacks({ role: "socio" })).toBe(false);
    expect(canSeeAdminFeedbacks({ role: "gerente" })).toBe(false);
    expect(canSeeAdminFeedbacks({ role: "client_viewer" })).toBe(false);
  });

  it("allows an authenticated user with assigned units to open the form", () => {
    const admin = JSON.stringify({ email: "admin@trafego.pro", role: "admin", name: "Admin" });
    const restricted = JSON.stringify({ email: "unit@trafego.pro", role: "client_viewer", name: "Unit Viewer", allowedClientIds: ["client-ijui"] });
    expect(shouldRedirectToLogin("token", admin, true)).toBe(false);
    expect(shouldRedirectToLogin("token", restricted, true)).toBe(false);
    expect(shouldRedirectToLogin("token", JSON.stringify({ role: "client_viewer", allowedClientIds: [] }), true)).toBe(true);
  });
});
