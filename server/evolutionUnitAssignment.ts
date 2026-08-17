export type AuthorizedEvolutionUnit = {
  id: string;
  name: string;
};

/**
 * Resolve uma unidade pelo ID do catálogo autorizado da dashboard.
 * O nome persistido no Supabase Evolution é sempre derivado do Supabase principal,
 * nunca de texto livre vindo do navegador.
 */
export function resolveAuthorizedEvolutionUnit(
  unitId: unknown,
  units: readonly AuthorizedEvolutionUnit[],
): AuthorizedEvolutionUnit | null {
  if (typeof unitId !== "string" || !unitId.trim()) return null;
  return units.find((unit) => unit.id === unitId) ?? null;
}
