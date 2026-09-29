import { describe, expect, it } from "vitest";
import {
  backtestLeadModel,
  buildLeadProjection,
  fitLeadModel,
  predictDailyLeads,
  projectMonth,
  requiredDailySpend,
  type ProjectionDay,
} from "../shared/leadProjection";

// leads = e^(0.2 + 0.6·ln(spend+1) − 0.3·fimDeSemana) − 1, com ruído determinístico pequeno.
function synthetic(days: number, start = "2026-06-01"): ProjectionDay[] {
  const rows: ProjectionDay[] = [];
  const t0 = Date.parse(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const date = new Date(t0 + i * 86_400_000).toISOString().slice(0, 10);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 1 : 0;
    const spend = 60 + ((i * 37) % 90);
    const noise = Math.sin(i * 1.7) * 0.05;
    const leads = Math.max(0, Math.round(Math.exp(0.2 + 0.6 * Math.log(spend + 1) - 0.3 * weekend + noise) - 1));
    rows.push({ date, spend, leads });
  }
  return rows;
}

describe("fitLeadModel", () => {
  it("recupera a elasticidade e o efeito de fim de semana", () => {
    const model = fitLeadModel(synthetic(90))!;
    expect(model).not.toBeNull();
    expect(model.coefficients[1]).toBeGreaterThan(0.45);
    expect(model.coefficients[1]).toBeLessThan(0.75);
    expect(model.coefficients[2]).toBeLessThan(-0.15);
    expect(model.r2Adjusted).toBeGreaterThan(0.7);
  });

  it("recusa histórico curto", () => {
    expect(fitLeadModel(synthetic(15))).toBeNull();
  });

  it("ignora dias sem investimento", () => {
    const rows = synthetic(40).map((d, i) => (i % 5 === 0 ? { ...d, spend: 0, leads: 0 } : d));
    expect(fitLeadModel(rows)?.sampleDays).toBe(32);
  });
});

describe("projectMonth", () => {
  const model = fitLeadModel(synthetic(90))!;
  const input = { currentLeads: 100, target: 180, futureDates: ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"] };

  it("mais investimento dá mais leads, com retorno decrescente", () => {
    const low = projectMonth(model, input, 60);
    const mid = projectMonth(model, input, 120);
    const high = projectMonth(model, input, 240);
    expect(mid.expectedLeads).toBeGreaterThan(low.expectedLeads);
    expect(high.expectedLeads - mid.expectedLeads).toBeLessThan((mid.expectedLeads - low.expectedLeads) * 2);
    expect(high.expectedCpl!).toBeGreaterThan(low.expectedCpl!);
  });

  it("faixa contém o esperado e a probabilidade fica entre 0 e 1", () => {
    const r = projectMonth(model, input, 120);
    expect(r.lowLeads).toBeLessThanOrEqual(r.expectedLeads + 1);
    expect(r.highLeads).toBeGreaterThanOrEqual(r.expectedLeads - 1);
    expect(r.probability).toBeGreaterThanOrEqual(0);
    expect(r.probability).toBeLessThanOrEqual(1);
  });

  it("é determinístico", () => {
    expect(projectMonth(model, input, 120)).toEqual(projectMonth(model, input, 120));
  });

  it("sem investimento fica no realizado", () => {
    const r = projectMonth(model, input, 0);
    expect(r.expectedLeads).toBe(100);
    expect(r.probability).toBe(0);
  });

  it("marca extrapolação acima do maior investimento visto", () => {
    expect(projectMonth(model, input, model.maxObservedSpend * 2).extrapolating).toBe(true);
  });
});

describe("requiredDailySpend", () => {
  const model = fitLeadModel(synthetic(90))!;
  const dates = ["2026-09-28", "2026-09-29", "2026-09-30"];

  it("fecha a meta com o valor encontrado", () => {
    const input = { currentLeads: 100, target: 130, futureDates: dates };
    const spend = requiredDailySpend(model, input)!;
    const got = dates.reduce((a, d) => a + predictDailyLeads(model, d, spend), 0);
    expect(got).toBeGreaterThanOrEqual(30);
  });

  it("retorna 0 com meta batida e null quando é inalcançável", () => {
    expect(requiredDailySpend(model, { currentLeads: 200, target: 180, futureDates: dates })).toBe(0);
    expect(requiredDailySpend(model, { currentLeads: 0, target: 10_000, futureDates: dates })).toBeNull();
  });
});

describe("backtest e payload", () => {
  it("modelo ganha do ritmo de 7 dias quando o investimento varia", () => {
    const bt = backtestLeadModel(synthetic(90))!;
    expect(bt.windows).toBeGreaterThan(5);
    expect(bt.modelMae).toBeLessThan(bt.baselineMae);
  });

  it("gera os dias restantes do mês", () => {
    const rows = synthetic(90, "2026-06-28");
    const p = buildLeadProjection(rows, 120, 200, "2026-09-25")!;
    expect(p.input.futureDates).toEqual(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(p.baselineDailySpend).toBeGreaterThan(0);
  });
});
