import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { createExternalAiMcpServer, type ExternalAiMcpData, type ExternalAiMcpToken } from "./externalAiMcp.js";

const UNIT = "0cf96a70-0244-42c2-a02b-1e86ae67af41";
const OTHER_UNIT = "11111111-2222-4333-8444-555555555555";

function fakeData(): ExternalAiMcpData {
  return {
    listUnits: vi.fn(async (ids: string[]) => ids.map((id) => ({ id, name: `Unidade ${id.slice(0, 4)}` }))),
    getUnit: vi.fn(async (id: string) => ({ id, name: "Unidade" })),
    getMetrics: vi.fn(async (_id: string, start: string, end: string) => ({ period: { start, end }, totals: { spend: 100 } })) as any,
    getAdsMetrics: vi.fn(async () => ({ data: [], sourceStatus: "meta" })) as any,
    getLeadSummary: vi.fn(async () => ({ totalLeads: 3 })) as any,
    getCrmSummary: vi.fn(async () => ({ totalLeads: 3, stages: {} })) as any,
    getCreatives: vi.fn(async () => ({ creatives: [], sourceStatus: "meta" })) as any,
    getFechamentos: vi.fn(async () => []) as any,
    getGoogleAnalytics: vi.fn(async () => ({ sourceStatus: "ga4", landingPages: [{ landingPage: { name: "LP" }, totals: { sessions: 10 } }] })) as any,
  };
}

async function connect(token: ExternalAiMcpToken, data = fakeData(), onOutcome?: (outcome: string) => void) {
  const server = createExternalAiMcpServer(token, { data, onOutcome });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "teste", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, data };
}

const text = (result: any) => JSON.parse(result.content[0].text);

describe("servidor MCP da API externa", () => {
  it("expõe apenas as ferramentas cobertas pelos escopos do token", async () => {
    const { client } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(["get_google_analytics", "get_metrics", "list_units"]);
  });

  it("lista só as unidades vinculadas ao token", async () => {
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const result = text(await client.callTool({ name: "list_units", arguments: {} }));
    expect(data.listUnits).toHaveBeenCalledWith([UNIT]);
    expect(result.units).toEqual([{ id: UNIT, name: "Unidade 0cf9" }]);
  });

  it("entrega o Google Analytics da unidade com o escopo de métricas", async () => {
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const result = await client.callTool({ name: "get_google_analytics", arguments: { unit_id: UNIT, start: "2026-09-01", end: "2026-09-30" } });
    expect(result.isError).toBeFalsy();
    expect(data.getGoogleAnalytics).toHaveBeenCalledWith(UNIT, "2026-09-01", "2026-09-30");
    expect(text(result)).toMatchObject({ apiVersion: "v1", unit: { id: UNIT }, sourceStatus: "ga4", landingPages: [{ totals: { sessions: 10 } }] });
  });

  it("não consulta o Google Analytics de unidade fora do token", async () => {
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const result = await client.callTool({ name: "get_google_analytics", arguments: { unit_id: OTHER_UNIT } });
    expect(result.isError).toBe(true);
    expect(data.getGoogleAnalytics).not.toHaveBeenCalled();
  });

  it("retorna métricas da unidade permitida no período informado", async () => {
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const result = await client.callTool({ name: "get_metrics", arguments: { unit_id: UNIT, start: "2026-09-01", end: "2026-09-15" } });
    expect(result.isError).toBeFalsy();
    expect(data.getMetrics).toHaveBeenCalledWith(UNIT, "2026-09-01", "2026-09-15");
    expect(text(result)).toMatchObject({ apiVersion: "v1", unit: { id: UNIT }, metrics: { totals: { spend: 100 } } });
  });

  it("entrega os fechamentos da unidade com o escopo de resumo de leads, sem quem enviou", async () => {
    const data = fakeData();
    const row = (weekStart: string, weekEnd: string, submittedAt: string, received: number, closed: number) => ({
      id: 1, unit: "Unidade", responsible: "Fulano", weekStart, weekEnd, totalLeads: received, totalLeadsSource: "dashboard", totalLeadsSuggested: received, leadsContacted: 0, leadsResponded: 0,
      leadsConverted: closed, leadsLost: 2, leadsInNegotiation: 1, lossReason: "Preço", leadQuality: 4, observations: "Semana boa",
      agencySatisfaction: 0, communicationClarity: "", agencyAdjustment: "", submittedAt, submittedByUserId: "9", submittedByEmail: "fulano@x.com", createdAt: submittedAt,
    });
    data.getFechamentos = vi.fn(async () => [
      row("2026-09-26", "2026-09-30", "2026-09-30T18:00:00.000Z", 20, 5),
      row("2026-09-26", "2026-09-30", "2026-09-30T12:00:00.000Z", 10, 1),
      row("2026-09-19", "2026-09-25", "2026-09-25T18:00:00.000Z", 30, 3),
    ]) as any;
    const { client } = await connect({ id: "t1", scopes: ["leads:summary:read"], unitIds: [UNIT] }, data);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("get_fechamentos");
    const result = await client.callTool({ name: "get_fechamentos", arguments: { unit_id: UNIT, start: "2026-09-19", end: "2026-09-30" } });
    expect(data.getFechamentos).toHaveBeenCalledWith("Unidade", "2026-09-19", "2026-09-30");
    const body = text(result);
    expect(body.totals).toEqual({ weeksReported: 2, leadsReceived: 50, leadsClosed: 8, leadsInNegotiation: 2, leadsLost: 4, conversionRate: 0.16 });
    expect(body.fechamentos[0]).toMatchObject({ isLatestForWeek: true, leadsClosed: 5, leadsReceivedSource: "dashboard", leadsReceivedSuggested: 20, agencySatisfaction: null, comment: "Semana boa", lossReason: "Preço" });
    expect(body.fechamentos[1].isLatestForWeek).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/Fulano|fulano@x\.com/);
  });

  it("recusa unidade fora do token sem consultar dados", async () => {
    const outcomes: string[] = [];
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] }, fakeData(), (o) => outcomes.push(o));
    const result: any = await client.callTool({ name: "get_metrics", arguments: { unit_id: OTHER_UNIT } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("O token não possui acesso a esta unidade");
    expect(data.getMetrics).not.toHaveBeenCalled();
    expect(outcomes).toEqual(["unit_denied"]);
  });

  it("recusa períodos inválidos", async () => {
    const { client, data } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] });
    const result: any = await client.callTool({ name: "get_metrics", arguments: { unit_id: UNIT, start: "2026-09-10", end: "2026-09-01" } });
    expect(result.isError).toBe(true);
    expect(data.getMetrics).not.toHaveBeenCalled();
  });

  it("não vaza a mensagem de erro da fonte de dados", async () => {
    const data = fakeData();
    data.getMetrics = vi.fn(async () => { throw new Error("segredo interno"); }) as any;
    const outcomes: string[] = [];
    const { client } = await connect({ id: "t1", scopes: ["metrics:read"], unitIds: [UNIT] }, data, (o) => outcomes.push(o));
    const result: any = await client.callTool({ name: "get_metrics", arguments: { unit_id: UNIT } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("segredo");
    expect(outcomes).toEqual(["upstream_error"]);
  });
});
