export type DashboardUnitOption = { id: string; name: string };

export function getDashboardUnitMenuState(
  units: DashboardUnitOption[],
  selectedUnitId: string | null,
  loading: boolean,
) {
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);

  if (loading) {
    return {
      label: selectedUnit?.name ?? "Carregando unidades…",
      canOpen: false,
      emptyMessage: "Carregando as unidades autorizadas para a sua sessão.",
    };
  }

  return {
    label: selectedUnit?.name ?? "Selecione uma unidade",
    canOpen: units.length > 0,
    emptyMessage: "Nenhuma unidade está disponível para a sua sessão.",
  };
}

export function selectAuthorizedDashboardUnit(
  units: DashboardUnitOption[],
  unitId: string,
  setSelectedUnitId: (id: string) => void,
): boolean {
  const unit = units.find((item) => item.id === unitId);
  if (!unit) return false;

  setSelectedUnitId(unit.id);
  return true;
}
