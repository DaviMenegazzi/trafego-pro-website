export type DashboardDateRange = { start: string; end: string };

export const CUSTOM_PERIOD = "custom";

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPresetDashboardDateRange(period: string, now = new Date()): DashboardDateRange {
  const end = new Date(now);
  const start = new Date(now);
  const totalDays = Math.max(1, parseInt(period, 10) || 30);
  // O dia atual compõe o intervalo. Assim, o atalho “7 dias” retorna
  // exatamente sete datas, em vez de oito dias por diferença inclusiva.
  start.setDate(end.getDate() - (totalDays - 1));
  return { start: toYmd(start), end: toYmd(end) };
}

export function isValidDashboardDateRange(range: DashboardDateRange): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(range.start)
    && /^\d{4}-\d{2}-\d{2}$/.test(range.end)
    && range.start <= range.end;
}

export function formatDashboardDateRange(range: DashboardDateRange): string {
  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).replace(".", "");

  return `${formatDate(range.start)} — ${formatDate(range.end)}`;
}
