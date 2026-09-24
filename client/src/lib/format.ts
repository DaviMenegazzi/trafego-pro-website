// Formatação local (pt-BR) centralizada. Toda tela deve usar estas funções em
// vez de montar strings com toFixed ou toLocaleString espalhados.

const LOCALE = "pt-BR";
const TIME_ZONE = "America/Sao_Paulo";

const toNumber = (value: number | string | null | undefined) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? (n as number) : 0;
};

export function formatNumber(value: number | string | null | undefined, digits = 0): string {
  return toNumber(value).toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCurrency(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString(LOCALE, { style: "currency", currency: "BRL" });
}

/** Moeda compacta para eixos de gráfico: R$ 1,2 mil. */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString(LOCALE, { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
}

/** Percentual a partir de um valor já em pontos percentuais (12.5 → "12,5%"). */
export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  return `${formatNumber(value, digits)}%`;
}

/** Percentual a partir de uma fração (0.125 → "12,5%"). */
export function formatRatio(value: number | string | null | undefined, digits = 1): string {
  return formatPercent(toNumber(value) * 100, digits);
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // "2026-09-24" sem hora é uma data de calendário: evita que o fuso volte um dia.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | number | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE }) : fallback;
}

export function formatShortDate(value: string | number | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", timeZone: TIME_ZONE }) : fallback;
}

export function formatDateTime(value: string | number | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  return date
    ? date.toLocaleString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
    : fallback;
}

export function formatTime(value: string | number | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }) : fallback;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" e, depois de uma semana, a data. */
export function formatRelative(value: string | number | Date | null | undefined, now: Date = new Date(), fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 0) return formatDate(date);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatDate(date);
}

/** Intervalo curto: "18–24/09" no mesmo mês, "28/08–03/09" entre meses. */
export function formatDateRange(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const a = toDate(start);
  const b = toDate(end);
  if (!a || !b) return "—";
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${String(a.getDate()).padStart(2, "0")}–${formatShortDate(b)}`;
  }
  return `${formatShortDate(a)}–${formatShortDate(b)}`;
}

export function formatPhone(value: string | null | undefined, fallback = "—"): string {
  const digits = (value ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value?.trim() ? value : fallback;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Chave interna de mês ("2026_07" ou "2026-07") para "Jul 2026" (ou "Julho 2026"). */
export function formatMonthKey(key: string | null | undefined, long = false): string {
  const match = /^(\d{4})[_-](\d{2})$/.exec(key ?? "");
  if (!match) return key ?? "—";
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return key ?? "—";
  const name = long ? MONTHS_LONG[month] : MONTHS[month].charAt(0).toUpperCase() + MONTHS[month].slice(1);
  return `${name} ${match[1]}`;
}

/** Converte texto digitado em moeda brasileira ("1.800,50", "1800.5", "R$ 1.800") em número. */
export function parseCurrencyInput(text: string): number | null {
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  // "2.200" sem vírgula é milhar (pt-BR); "1800.5" é decimal digitado com ponto.
  const thousandsOnly = !hasComma && /^-?\d{1,3}(\.\d{3})+$/.test(cleaned);
  const normalized = hasComma ? cleaned.replace(/\./g, "").replace(",", ".") : thousandsOnly ? cleaned.replace(/\./g, "") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Número para exibir dentro de um campo de moeda editável ("1.800,00"). */
export function formatCurrencyInput(value: number | string | null | undefined): string {
  return formatNumber(value, 2);
}
