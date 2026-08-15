export function calculateResponseRate(responded: number, connections: number): number {
  if (!Number.isFinite(responded) || !Number.isFinite(connections) || connections <= 0) return 0;
  return (responded / connections) * 100;
}

export const DASHBOARD_PRESENTATION = {
  primaryKpiCount: 4,
  supportingKpiCount: 8,
} as const;
