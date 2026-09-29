import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const moveRpc = vi.fn();
const automaticRpc = vi.fn();
const boardRpc = vi.fn();
const listRpc = vi.fn();

vi.mock("./evolutionSupabaseStore.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./evolutionSupabaseStore.js")>()),
  moveCrmLeadStageSupabase: (...args: unknown[]) => moveRpc(...args),
  setCrmLeadAutomaticSupabase: (...args: unknown[]) => automaticRpc(...args),
  getCrmBoardSupabase: (...args: unknown[]) => boardRpc(...args),
  listCrmLeadsSupabase: (...args: unknown[]) => listRpc(...args),
}));

const {
  CrmError, decodeCursor, encodeCursor, loadCrmBoard, loadCrmLeadPage, moveCrmLead, parseAutomationBody,
  parseCrmFilters, parseMoveBody, resumeCrmLeadAutomation, toCrmLead, toRpcFilters,
} = await import("./pixelCrmService.js");
const { formatCrmPhone, isCrmReopen, resolveCrmDrop } = await import("../shared/crm.js");

const unit = { id: "unit-1", name: "Unidade 1" };
const leadId = "7c2b6a2e-1f0a-4d8b-9a55-0f8b9c1d2e3f";
const requestId = "2f57273b-8318-47a8-9a3a-5e85e3e1f7b1";
const rawLead = {
  id: leadId, instanceName: "centro", instanceDisplayName: "Atendimento Centro", contactName: "Maria", contactPhone: "5511999990000",
  phoneLast4: "0000", classification: "lead", crmStage: "negotiation", crmStageMode: "manual", crmVersion: 4,
  crmStageUpdatedAt: "2026-09-29T12:00:00.000Z", crmStageUpdatedBy: "maria@empresa.com", temperature: null, leadScore: null,
  leadScoreUpdatedAt: null, firstContactAt: "2026-09-20T12:00:00.000Z", lastMessageAt: "2026-09-29T11:00:00.000Z",
  messagesReceived: 3, messagesSent: 2, originPlatform: "meta", originEvidence: "verified",
};

beforeEach(() => {
  moveRpc.mockReset();
  automaticRpc.mockReset();
  boardRpc.mockReset();
  listRpc.mockReset();
});

describe("contrato do CRM", () => {
  it("valida filtros e rejeita enums desconhecidos", () => {
    expect(parseCrmFilters({ temperature: "unrated", classification: "lead", q: " maria " })).toEqual({ temperature: "unrated", classification: "lead", q: "maria" });
    expect(() => parseCrmFilters({ temperature: "HOTTER" })).toThrow(CrmError);
    expect(() => parseCrmFilters({ classification: "nao_lead" })).toThrow(CrmError);
    expect(() => parseCrmFilters({ instanceName: "../x" })).toThrow(CrmError);
  });

  it("neutraliza curingas da busca e separa dígitos do telefone", () => {
    expect(toRpcFilters({ q: "50%_\\" })).toEqual({ q: "50" });
    expect(toRpcFilters({ q: "(11) 99999-0000" })).toEqual({ q: "(11) 99999-0000", qDigits: "11999990000" });
  });

  it("amarra o cursor à consulta que o gerou", () => {
    const cursor = encodeCursor("chave-a", { at: "2026-09-29T12:00:00.000Z", id: leadId });
    expect(decodeCursor("chave-a", cursor)).toEqual({ at: "2026-09-29T12:00:00.000Z", id: leadId });
    expect(() => decodeCursor("chave-b", cursor)).toThrow(CrmError);
    expect(() => decodeCursor("chave-a", "lixo")).toThrow(CrmError);
    expect(decodeCursor("chave-a", undefined)).toBeNull();
  });

  it("rejeita campos desconhecidos no movimento, inclusive tentativas de trocar autor ou instância", () => {
    const valid = { unitId: "unit-1", stage: "closed_won", expectedVersion: 4, requestId };
    expect(parseMoveBody(valid)).toMatchObject({ stage: "closed_won", expectedVersion: 4, note: null });
    expect(() => parseMoveBody({ ...valid, changedBy: "outra pessoa" })).toThrow(CrmError);
    expect(() => parseMoveBody({ ...valid, instanceName: "outra" })).toThrow(CrmError);
    expect(() => parseMoveBody({ ...valid, stage: "fechado" })).toThrow(CrmError);
    expect(() => parseMoveBody({ ...valid, expectedVersion: "4" })).toThrow(CrmError);
    expect(() => parseMoveBody({ ...valid, requestId: "abc" })).toThrow(CrmError);
    expect(() => parseMoveBody({ ...valid, note: "x".repeat(501) })).toThrow(CrmError);
    expect(() => parseAutomationBody({ unitId: "u", mode: "manual", expectedVersion: 1, requestId })).toThrow(CrmError);
  });

  it("não expõe e-mail interno nem inventa temperatura ou telefone", () => {
    const lead = toCrmLead(rawLead);
    expect(lead.crmStageUpdatedBy).toBe("Equipe");
    expect(lead.temperature).toBeNull();
    expect(toCrmLead({ ...rawLead, crmStageUpdatedBy: "automacao-ia-laya" }).crmStageUpdatedBy).toBe("Laya");
    expect(formatCrmPhone(lead)).toEqual({ label: "+55 (11) 99999-0000", partial: false, copyValue: "+5511999990000" });
    expect(formatCrmPhone({ contactPhone: null, phoneLast4: "1234" })).toMatchObject({ label: "Final 1234", partial: true });
    expect(formatCrmPhone({ contactPhone: null, phoneLast4: null })).toMatchObject({ label: "Número indisponível" });
  });

  it("identifica drops sem mudança e reaberturas de etapas finais", () => {
    const leads = [{ id: "a", crmStage: "closed_won" as const }];
    expect(resolveCrmDrop(leads, "a", "closed_won")).toBeNull();
    expect(resolveCrmDrop(leads, "a", "outra-coisa")).toBeNull();
    expect(resolveCrmDrop(leads, "a", "negotiation")).toMatchObject({ stage: "negotiation" });
    expect(isCrmReopen("closed_won", "negotiation")).toBe(true);
    expect(isCrmReopen("closed_won", "closed_lost")).toBe(false);
    expect(isCrmReopen("negotiation", "closed_won")).toBe(false);
  });
});

describe("serviço do CRM", () => {
  it("monta o quadro com totais do banco e cursor quando há mais cartões", async () => {
    boardRpc.mockResolvedValue({
      instances: [{ instanceName: "centro", displayName: "Atendimento Centro", connectionStatus: "open" }],
      columns: { negotiation: { total: 30, items: [rawLead] } },
      generatedAt: "2026-09-29T12:00:00.000Z",
    });
    const board = await loadCrmBoard(unit, {});
    expect(boardRpc).toHaveBeenCalledWith("unit-1", {}, 25);
    expect(board.total).toBe(30);
    expect(board.columns.negotiation).toMatchObject({ total: 30, hasMore: true });
    expect(board.columns.negotiation.nextCursor).toBeTruthy();
    expect(board.columns.closed_won).toEqual({ items: [], total: 0, hasMore: false, nextCursor: null });
  });

  it("pagina uma coluna com o cursor emitido pelo quadro", async () => {
    boardRpc.mockResolvedValue({ instances: [], columns: { negotiation: { total: 30, items: [rawLead] } } });
    const board = await loadCrmBoard(unit, { temperature: "HOT" });
    listRpc.mockResolvedValue({ total: 30, items: [] });
    await loadCrmLeadPage(unit, { unitId: "unit-1", stage: "negotiation", temperature: "HOT", cursor: board.columns.negotiation.nextCursor! });
    expect(listRpc).toHaveBeenCalledWith(expect.objectContaining({ stage: "negotiation", afterId: leadId, filters: { temperature: "HOT" } }));
    await expect(loadCrmLeadPage(unit, { unitId: "unit-1", stage: "negotiation", cursor: board.columns.negotiation.nextCursor! }))
      .rejects.toMatchObject({ status: 422 });
    await expect(loadCrmLeadPage(unit, { unitId: "unit-1", stage: "negotiation", admin: "1" })).rejects.toMatchObject({ status: 422 });
  });

  it("move com o autor do servidor e traduz conflitos", async () => {
    moveRpc.mockResolvedValue({ status: "ok", lead: rawLead });
    const input = parseMoveBody({ unitId: "unit-1", stage: "negotiation", expectedVersion: 3, requestId, note: " Pediu proposta " });
    const lead = await moveCrmLead(unit, leadId, input, { id: "user-1", name: "Ana" });
    expect(lead.crmStageMode).toBe("manual");
    expect(moveRpc).toHaveBeenCalledWith(expect.objectContaining({ actorId: "user-1", actorLabel: "Ana", unitId: "unit-1", note: "Pediu proposta", expectedVersion: 3 }));

    moveRpc.mockResolvedValue({ status: "version_conflict", lead: rawLead });
    await expect(moveCrmLead(unit, leadId, input, { id: "user-1", name: "Ana" })).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
    moveRpc.mockResolvedValue({ status: "request_conflict" });
    await expect(moveCrmLead(unit, leadId, input, { id: "user-1", name: "Ana" })).rejects.toMatchObject({ status: 409, code: "REQUEST_CONFLICT" });
    moveRpc.mockResolvedValue({ status: "not_found" });
    await expect(moveCrmLead(unit, leadId, input, { id: "user-1", name: "Ana" })).rejects.toMatchObject({ status: 404 });
  });

  it("devolve o lead à automação", async () => {
    automaticRpc.mockResolvedValue({ status: "ok", lead: { ...rawLead, crmStageMode: "automatic", crmVersion: 5 } });
    const lead = await resumeCrmLeadAutomation(unit, leadId, parseAutomationBody({ unitId: "unit-1", mode: "automatic", expectedVersion: 4, requestId }), { id: "user-1", name: "Ana" });
    expect(lead).toMatchObject({ crmStageMode: "automatic", crmVersion: 5 });
  });
});

describe("fronteira HTTP do CRM", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const { pixelCrmRouter } = await import("./routes/pixelCrmRoutes.js");
    const app = express();
    app.use(express.json());
    app.use("/api", pixelCrmRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("exige sessão em todas as rotas, com no-store", async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/evolution/pixel/crm/board?unitId=unit-1`),
      fetch(`${baseUrl}/api/evolution/pixel/crm/leads?unitId=unit-1&stage=negotiation`),
      fetch(`${baseUrl}/api/evolution/pixel/crm/leads/${leadId}?unitId=unit-1`),
      fetch(`${baseUrl}/api/evolution/pixel/crm/leads/${leadId}/history?unitId=unit-1`),
      fetch(`${baseUrl}/api/evolution/pixel/crm/leads/${leadId}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }),
      fetch(`${baseUrl}/api/evolution/pixel/crm/leads/${leadId}/automation`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(moveRpc).not.toHaveBeenCalled();
  });

  it("recusa JWT da plataforma sem a sessão Supabase, inclusive para admin e fora de produção", async () => {
    const { signToken } = await import("./auth.js");
    const token = signToken({ id: "admin-1", email: "a@b.c", name: "Admin", role: "admin", allowedClientIds: ["*"] });
    const response = await fetch(`${baseUrl}/api/evolution/pixel/crm/board?unitId=unit-1`, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(401);
    expect(boardRpc).not.toHaveBeenCalled();
  });

  it("desliga as rotas pela flag sem tocar na autorização", async () => {
    process.env.PIXEL_CRM_ENABLED = "false";
    try {
      const response = await fetch(`${baseUrl}/api/evolution/pixel/crm/board?unitId=unit-1`);
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("DISABLED");
    } finally {
      delete process.env.PIXEL_CRM_ENABLED;
    }
  });
});
