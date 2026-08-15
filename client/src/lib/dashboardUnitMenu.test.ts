import { describe, expect, it } from "vitest";
import { getDashboardUnitMenuState, selectAuthorizedDashboardUnit } from "./dashboardUnitMenu";

describe("menu de unidades da dashboard", () => {
  const authorizedUnits = [
    { id: "unidade-ijuí", name: "Vida Card Ijuí" },
    { id: "unidade-tupan", name: "Vida Card Tupanciretã" },
  ];

  it("exibe apenas a unidade selecionada dentro da lista autorizada", () => {
    expect(getDashboardUnitMenuState(authorizedUnits, "unidade-ijuí", false)).toMatchObject({
      label: "Vida Card Ijuí",
      canOpen: true,
    });
  });

  it("mantém o menu indisponível enquanto as unidades autorizadas carregam", () => {
    expect(getDashboardUnitMenuState([], null, true)).toMatchObject({
      label: "Carregando unidades…",
      canOpen: false,
    });
  });

  it("informa ausência quando não há unidades disponíveis na sessão", () => {
    expect(getDashboardUnitMenuState([], null, false)).toMatchObject({
      label: "Selecione uma unidade",
      canOpen: false,
    });
  });

  it("atualiza a unidade selecionada somente ao escolher uma unidade autorizada", () => {
    let selectedUnitId = "unidade-ijuí";

    const changed = selectAuthorizedDashboardUnit(authorizedUnits, "unidade-tupan", (id) => {
      selectedUnitId = id;
    });

    expect(changed).toBe(true);
    expect(selectedUnitId).toBe("unidade-tupan");
    expect(selectAuthorizedDashboardUnit(authorizedUnits, "unidade-inexistente", () => {})).toBe(false);
  });
});
