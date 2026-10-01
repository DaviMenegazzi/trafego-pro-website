import { generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMainReportRequests,
  canAccessUnit,
  clearGa4Cache,
  getGa4Report,
  Ga4Error,
  normalizeCampaigns,
  normalizeCities,
  normalizeDaily,
  normalizeKeyEvents,
  normalizeLandingPages,
  normalizeTotals,
  parseLandingPageInput,
  parseServiceAccount,
  previousRange,
  validateGa4Range,
} from "./ga4Service";

const row = (dims: string[], metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

describe("parseServiceAccount", () => {
  const json = JSON.stringify({ client_email: "sa@proj.iam.gserviceaccount.com", private_key: "-----BEGIN\\nKEY" });

  it("lê JSON puro e em base64", () => {
    expect(parseServiceAccount(json)?.client_email).toBe("sa@proj.iam.gserviceaccount.com");
    expect(parseServiceAccount(Buffer.from(json).toString("base64"))?.private_key).toBe("-----BEGIN\nKEY");
  });

  it("recusa credencial incompleta", () => {
    expect(parseServiceAccount(JSON.stringify({ client_email: "x" }))).toBeNull();
    expect(parseServiceAccount("")).toBeNull();
  });
});

describe("acesso por unidade", () => {
  it("libera a unidade para administradores, acesso global e quem tem a unidade (com ou sem act_)", () => {
    expect(canAccessUnit("act_1", { role: "admin", allowedClientIds: [] })).toBe(true);
    expect(canAccessUnit("act_1", { role: "client", allowedClientIds: ["*"] })).toBe(true);
    expect(canAccessUnit("act_2853331541612919", { role: "client", allowedClientIds: ["2853331541612919"] })).toBe(true);
    expect(canAccessUnit("2853331541612919", { role: "client", allowedClientIds: ["act_2853331541612919"] })).toBe(true);
  });

  it("bloqueia outra unidade, sessão ausente e unidade vazia", () => {
    expect(canAccessUnit("act_2853331541612919", { role: "client", allowedClientIds: ["act_999"] })).toBe(false);
    expect(canAccessUnit("act_1", null)).toBe(false);
    expect(canAccessUnit("", { role: "admin", allowedClientIds: [] })).toBe(false);
  });
});

describe("parseLandingPageInput", () => {
  const valid = { unitId: "act_2853331541612919", propertyId: "properties/412345678", name: "  LP   Ijuí ", hostnames: [] };

  it("normaliza unidade, ID da propriedade, nome e domínios", () => {
    expect(parseLandingPageInput({ ...valid, hostnames: ["https://Ijui.VidaCard.com.br/oferta?x=1", "ijui.vidacard.com.br", " "] })).toEqual({
      unitId: "2853331541612919",
      propertyId: "412345678",
      name: "LP Ijuí",
      hostnames: ["ijui.vidacard.com.br"],
      siteUrl: null,
    });
  });

  it("normaliza o endereço da Landing Page e recusa endereço inválido", () => {
    expect(parseLandingPageInput({ ...valid, siteUrl: "vidacardpf.com.br" }).siteUrl).toBe("https://vidacardpf.com.br/");
    expect(parseLandingPageInput({ ...valid, siteUrl: "https://www.vidacardtupan.com.br/oferta" }).siteUrl).toBe("https://www.vidacardtupan.com.br/oferta");
    expect(() => parseLandingPageInput({ ...valid, siteUrl: "javascript:alert(1)" })).toThrow(/Endereço da Landing Page/);
    expect(() => parseLandingPageInput({ ...valid, siteUrl: "não é site" })).toThrow(/Endereço da Landing Page/);
  });

  it("explica quando colam o ID de medição G- no lugar do ID da propriedade", () => {
    expect(() => parseLandingPageInput({ ...valid, propertyId: "G-5Z9K559DDL" })).toThrow(/ID da propriedade/);
  });

  it("recusa unidade, ID, nome e domínio inválidos", () => {
    expect(() => parseLandingPageInput({ ...valid, unitId: "" })).toThrow(Ga4Error);
    expect(() => parseLandingPageInput({ ...valid, propertyId: "abc" })).toThrow(Ga4Error);
    expect(() => parseLandingPageInput({ ...valid, name: "   " })).toThrow(Ga4Error);
    expect(() => parseLandingPageInput({ ...valid, name: "x".repeat(121) })).toThrow(Ga4Error);
    expect(() => parseLandingPageInput({ ...valid, hostnames: ["não é domínio"] })).toThrow(/Domínio inválido/);
    expect(() => parseLandingPageInput(null)).toThrow(Ga4Error);
  });
});

describe("validateGa4Range", () => {
  it("aceita um período válido", () => {
    expect(validateGa4Range("2026-09-01", "2026-09-30")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });

  it("recusa formato errado, período invertido e período longo demais", () => {
    expect(() => validateGa4Range("01/09/2026", "2026-09-30")).toThrow(Ga4Error);
    expect(() => validateGa4Range("2026-09-30", "2026-09-01")).toThrow(Ga4Error);
    expect(() => validateGa4Range("2024-01-01", "2026-09-30")).toThrow(Ga4Error);
  });
});

describe("previousRange", () => {
  it("devolve o período imediatamente anterior com o mesmo número de dias", () => {
    expect(previousRange("2026-09-01", "2026-09-30")).toEqual({ start: "2026-08-02", end: "2026-08-31" });
    expect(previousRange("2026-09-30", "2026-09-30")).toEqual({ start: "2026-09-29", end: "2026-09-29" });
  });
});

describe("normalização", () => {
  it("lê os totais dos dois períodos e calcula engajamento e tempo médio", () => {
    const { current, previous } = normalizeTotals({
      rows: [
        // activeUsers, newUsers, sessions, engagedSessions, sessionKeyEventRate, keyEvents, userEngagementDuration
        row(["current"], [100, 80, 200, 120, 0.15, 40, 8600]),
        row(["previous"], [50, 40, 100, 30, 0.1, 12, 1000]),
      ],
    });
    expect(current).toEqual({
      users: 100, newUsers: 80, sessions: 200, engagedSessions: 120, engagementRate: 0.6, conversionRate: 0.15, keyEvents: 40, avgEngagementSeconds: 86,
    });
    expect(previous.engagementRate).toBe(0.3);
    expect(previous.avgEngagementSeconds).toBe(20);
  });

  it("devolve zeros quando o período não tem dados", () => {
    expect(normalizeTotals({ rows: [] }).previous).toMatchObject({ sessions: 0, engagementRate: 0, avgEngagementSeconds: 0 });
  });

  it("converte a data do GA4 e ordena os dias", () => {
    expect(normalizeDaily({ rows: [row(["20260902"], [5, 1]), row(["20260901"], [10, 2])] })).toEqual([
      { date: "2026-09-01", sessions: 10, keyEvents: 2 },
      { date: "2026-09-02", sessions: 5, keyEvents: 1 },
    ]);
  });

  it("traduz o nome das conversões", () => {
    expect(normalizeKeyEvents({ rows: [row(["lead_whatsapp"], [48]), row(["lead_formulario"], [9]), row(["evento_novo"], [2]), row(["zerado"], [0])] })).toEqual([
      { eventName: "lead_whatsapp", label: "WhatsApp", count: 48 },
      { eventName: "lead_formulario", label: "Formulário", count: 9 },
      { eventName: "evento_novo", label: "evento_novo", count: 2 },
    ]);
  });

  it("junta '(not set)' e vazio numa linha só de páginas de entrada, somando sessões com conversão", () => {
    const pages = normalizeLandingPages({
      rows: [
        // sessions, engagedSessions, keyEvents, sessionKeyEventRate
        row(["lp.com.br", "/"], [10, 8, 2, 0.2]),
        row(["lp.com.br", "(not set)"], [30, 4, 3, 0.1]),
        row(["lp.com.br", ""], [1, 0, 0, 0]),
      ],
    });
    expect(pages).toEqual([
      { hostName: "lp.com.br", landingPage: "(sem página de entrada)", sessions: 31, engagedSessions: 4, keyEvents: 3, convertedSessions: 3 },
      { hostName: "lp.com.br", landingPage: "/", sessions: 10, engagedSessions: 8, keyEvents: 2, convertedSessions: 2 },
    ]);
  });

  it("agrupa cidades não identificadas", () => {
    expect(normalizeCities({ rows: [row(["Passo Fundo"], [100, 20, 0.15]), row(["(not set)"], [10, 1, 0.1]), row([""], [5, 0, 0])] })).toEqual([
      { city: "Passo Fundo", sessions: 100, keyEvents: 20, convertedSessions: 15 },
      { city: "(cidade não identificada)", sessions: 15, keyEvents: 1, convertedSessions: 1 },
    ]);
  });

  it("separa as campanhas do período atual e soma o custo do anterior, sem as sessões fora do Google Ads", () => {
    const { campaigns, previous } = normalizeCampaigns({
      rows: [
        row(["Pesquisa | Ijuí", "current"], [120.5, 40, 900, 38, 6]),
        row(["(not set)", "current"], [0, 0, 0, 500, 20]),
        row(["Pesquisa | Ijuí", "previous"], [80, 20, 500, 18, 3]),
      ],
    });
    expect(campaigns).toEqual([{ campaign: "Pesquisa | Ijuí", cost: 120.5, clicks: 40, impressions: 900, sessions: 38, keyEvents: 6 }]);
    expect(previous).toEqual({ adCost: 80, adClicks: 20, adImpressions: 500 });
  });

  it("filtra por domínio só quando a propriedade informa domínios", () => {
    expect(buildMainReportRequests("2026-09-01", "2026-09-30", [])[0]).not.toHaveProperty("dimensionFilter");
    expect(buildMainReportRequests("2026-09-01", "2026-09-30", ["lp.exemplo.com"])[2].dimensionFilter).toEqual({
      filter: { fieldName: "hostName", inListFilter: { values: ["lp.exemplo.com"], caseSensitive: false } },
    });
  });

  it("cabe num único lote da Data API (máximo de 5 relatórios)", () => {
    expect(buildMainReportRequests("2026-09-01", "2026-09-30", []).length).toBeLessThanOrEqual(5);
  });
});

describe("getGa4Report", () => {
  const property = { propertyId: "123", hostnames: [] };
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

  beforeEach(() => {
    clearGa4Cache();
    process.env.GA4_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@proj.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GA4_SERVICE_ACCOUNT_JSON;
  });

  function mockGoogle(campaignResponse: { status: number; body: unknown }) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
      if (url.includes("oauth2")) return json(200, { access_token: "tok", expires_in: 3600 });
      if (url.endsWith(":batchRunReports")) {
        return json(200, {
          reports: [
            { rows: [row(["current"], [8, 6, 10, 7, 0.2, 2, 480]), row(["previous"], [4, 3, 5, 2, 0.2, 1, 100])] },
            { rows: [row(["20260901"], [10, 2])] },
            { rows: [row(["lp.exemplo.com", "/"], [10, 7, 2, 0.2])] },
            { rows: [row(["google / cpc"], [6, 5, 2])] },
            { rows: [row(["lead_whatsapp"], [2])] },
          ],
        });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { dimensions?: { name: string }[] };
      if (body.dimensions?.[0]?.name === "city") return json(200, { rows: [row(["Ijuí"], [10, 2, 0.2])] });
      return json(campaignResponse.status, campaignResponse.body);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("junta os relatórios, compara com o período anterior e guarda em cache", async () => {
    const fetchMock = mockGoogle({
      status: 200,
      body: { rows: [row(["Pesquisa", "current"], [50, 10, 100, 6, 2]), row(["Pesquisa", "previous"], [30, 5, 60, 3, 1])], metadata: { currencyCode: "BRL" } },
    });
    const report = await getGa4Report(property, "2026-09-01", "2026-09-01");
    expect(report.totals).toMatchObject({ sessions: 10, keyEvents: 2, conversionRate: 0.2, engagementRate: 0.7, adCost: 50, adClicks: 10 });
    expect(report.previousTotals).toMatchObject({ sessions: 5, adCost: 30 });
    expect(report.previousStart).toBe("2026-08-31");
    expect(report.currency).toBe("BRL");
    expect(report.keyEventsByName).toEqual([{ eventName: "lead_whatsapp", label: "WhatsApp", count: 2 }]);
    expect(report.cities[0].city).toBe("Ijuí");
    expect(report.campaignsError).toBeNull();

    const calls = fetchMock.mock.calls.length;
    await getGa4Report(property, "2026-09-01", "2026-09-01");
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("mantém o relatório quando só a consulta de campanhas falha", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGoogle({ status: 400, body: { error: { message: "incompatible", status: "INVALID_ARGUMENT" } } });
    const report = await getGa4Report(property, "2026-09-01", "2026-09-01");
    expect(report.totals.sessions).toBe(10);
    expect(report.campaigns).toEqual([]);
    expect(report.campaignsError).toContain("incompatible");
    warn.mockRestore();
  });
});
