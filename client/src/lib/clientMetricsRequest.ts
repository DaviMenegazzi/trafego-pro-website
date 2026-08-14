/** Constrói a query de métricas somente quando há uma unidade ativa. */
export function buildClientMetricsQuery(start: string, end: string, clientId: string | null): string | null {
  if (!clientId) return null;
  return new URLSearchParams({ start, end, clientId }).toString();
}
