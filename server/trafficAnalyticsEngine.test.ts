import { describe, expect, it } from "vitest";
import {
  calculateConfidenceInterval,
  calculateDaysLeftInMonth,
  calculateGoalProbability,
  calculateNormalDistribution,
  calculateScoreDesdobrado,
  calculateSma7Series,
  evaluateDataConfidence,
  formatUnitCleanName,
  type DailyMetric,
} from "./trafficAnalyticsEngine.js";

describe("Motor de Análise Estatística e Preditiva (trafficAnalyticsEngine)", () => {
  it("calcula dias restantes no mês corretamente", () => {
    const d1 = new Date(2026, 7, 15); // 15 de agosto (31 dias)
    expect(calculateDaysLeftInMonth(d1)).toBe(16);

    const d2 = new Date(2026, 7, 31);
    expect(calculateDaysLeftInMonth(d2)).toBe(1); // mínimo 1 dia
  });

  it("avalia o nível de confiança amostral", () => {
    expect(evaluateDataConfidence(100, 600, 25).level).toBe("ALTA");
    expect(evaluateDataConfidence(30, 200, 10).level).toBe("MÉDIA");
    expect(evaluateDataConfidence(10, 50, 5).level).toBe("BAIXA");
  });

  it("calcula o intervalo de confiança normal com 95% de precisão", () => {
    const ci = calculateConfidenceInterval(1000, 100);
    expect(ci.conversionRate).toBe(0.1);
    expect(ci.lowerBound).toBeLessThan(0.1);
    expect(ci.upperBound).toBeGreaterThan(0.1);
    expect(ci.sampleSize).toBe(1000);
  });

  it("calcula probabilidade de meta atingida antecipadamente", () => {
    const res = calculateGoalProbability(200, 210, 10, 50, 0.08, 50);
    expect(res.probability).toBe(1.0);
    expect(res.riskLevel).toBe("META_ALCANCADA");
  });

  it("calcula probabilidade binomial realista de atingir a meta", () => {
    // Faltam 20 leads em 10 dias (2 leads/dia), fazendo 50 cliques/dia com 8% conv (4 leads/dia esperados) -> alta prob
    const resAlta = calculateGoalProbability(200, 180, 10, 50, 0.08, 28);
    expect(resAlta.probability).toBeGreaterThanOrEqual(0.75);
    expect(resAlta.riskLevel).toBe("ALTA_PROBABILIDADE");

    // Faltam 100 leads em 5 dias (20 leads/dia), fazendo 50 cliques/dia com 5% conv (2.5 leads/dia) -> risco alto
    const resBaixa = calculateGoalProbability(200, 100, 5, 50, 0.05, 10);
    expect(resBaixa.probability).toBeLessThan(0.2);
    expect(resBaixa.riskLevel).toBe("RISCO_ALTO");
  });

  it("calcula média, desvio padrão e banda de controle 2 sigma de CPL", () => {
    const history: DailyMetric[] = [
      { date: "2026-08-01", spend: 100, leads: 10, impressions: 1000, clicks: 100, cpl: 10 },
      { date: "2026-08-02", spend: 110, leads: 10, impressions: 1000, clicks: 100, cpl: 11 },
      { date: "2026-08-03", spend: 90, leads: 10, impressions: 1000, clicks: 100, cpl: 9 },
      { date: "2026-08-04", spend: 105, leads: 10, impressions: 1000, clicks: 100, cpl: 10.5 },
    ];
    const dist = calculateNormalDistribution(history);
    expect(dist.mean).toBeCloseTo(10.12, 1);
    expect(dist.upperBound).toBeGreaterThan(dist.mean);
    expect(dist.lowerBound).toBeLessThan(dist.mean);
  });

  it("calcula série SMA 7 com janela móvel deslizante", () => {
    const history: DailyMetric[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-0${i + 1}`,
      spend: 100,
      leads: 10,
      impressions: 1000,
      clicks: 100,
      cpl: 10,
    }));
    const series = calculateSma7Series(history, 10, 15);
    expect(series.length).toBe(10);
    expect(series[9].sma7).toBe(10);
  });

  it("calcula score ponderado com notas e desdobramento", () => {
    const scoreA = calculateScoreDesdobrado(8, 10, 0.09, 0.95, "QUEDA");
    expect(scoreA.grade).toBe("A");
    expect(scoreA.scoreFinal).toBeGreaterThanOrEqual(80);

    const scoreD = calculateScoreDesdobrado(30, 10, 0.01, 0.2, "ALTA");
    expect(scoreD.grade).toBe("D");
    expect(scoreD.scoreFinal).toBeLessThan(50);
  });

  it("formata nome limpo de unidade", () => {
    expect(formatUnitCleanName("Vida Card | Canela")).toBe("Canela");
    expect(formatUnitCleanName("Vida Card - Júlio de Castilhos")).toBe("Júlio de Castilhos");
    expect(formatUnitCleanName("Vida Card Tupanciretã")).toBe("Tupanciretã");
  });
});
