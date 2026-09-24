import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyInput,
  formatDate,
  formatDateRange,
  formatMonthKey,
  formatNumber,
  formatPercent,
  formatPhone,
  formatRatio,
  formatRelative,
  parseCurrencyInput,
} from "./format";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("formatação pt-BR", () => {
  it("formata números, moeda e percentuais no padrão brasileiro", () => {
    expect(formatNumber(163684)).toBe("163.684");
    expect(formatNumber(9.914, 2)).toBe("9,91");
    expect(nbsp(formatCurrency(1800))).toBe("R$ 1.800,00");
    expect(formatPercent(11.2)).toBe("11,2%");
    expect(formatRatio(0.731)).toBe("73,1%");
    expect(formatNumber(null)).toBe("0");
  });

  it("não desloca datas de calendário pelo fuso", () => {
    expect(formatDate("2026-09-24")).toBe("24/09/2026");
    expect(formatDate("2026-09-14T12:00:00.000Z")).toBe("14/09/2026");
    expect(formatDate(null)).toBe("—");
  });

  it("formata intervalos curtos de semana", () => {
    expect(formatDateRange("2026-09-18", "2026-09-24")).toBe("18–24/09");
    expect(formatDateRange("2026-08-28", "2026-09-03")).toBe("28/08–03/09");
  });

  it("descreve tempo relativo", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(formatRelative("2026-09-24T11:59:30Z", now)).toBe("agora");
    expect(formatRelative("2026-09-24T11:40:00Z", now)).toBe("há 20 min");
    expect(formatRelative("2026-09-24T09:00:00Z", now)).toBe("há 3 h");
    expect(formatRelative("2026-09-23T09:00:00Z", now)).toBe("ontem");
    expect(formatRelative("2026-09-20T09:00:00Z", now)).toBe("há 4 dias");
  });

  it("traduz chaves internas de mês", () => {
    expect(formatMonthKey("2026_07")).toBe("Jul 2026");
    expect(formatMonthKey("2026-09", true)).toBe("Setembro 2026");
    expect(formatMonthKey("qualquer")).toBe("qualquer");
  });

  it("formata telefone brasileiro", () => {
    expect(formatPhone("5555981001000")).toBe("(55) 98100-1000");
    expect(formatPhone("5532211234")).toBe("(55) 3221-1234");
    expect(formatPhone("")).toBe("—");
  });

  it("lê valores monetários digitados", () => {
    expect(parseCurrencyInput("1.800,50")).toBe(1800.5);
    expect(parseCurrencyInput("1800.5")).toBe(1800.5);
    expect(parseCurrencyInput("R$ 2.200")).toBe(2200);
    expect(parseCurrencyInput("R$ 2.200,00")).toBe(2200);
    expect(parseCurrencyInput("")).toBeNull();
    expect(formatCurrencyInput(1800)).toBe("1.800,00");
  });
});
