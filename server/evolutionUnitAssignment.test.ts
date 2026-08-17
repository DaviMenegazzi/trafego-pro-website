import { describe, expect, it } from "vitest";
import { resolveAuthorizedEvolutionUnit } from "./evolutionUnitAssignment.js";

const units = [
  { id: "unit-ijui", name: "Vida Card Ijuí" },
  { id: "unit-tupan", name: "Vida Card Tupanciretã" },
];

describe("associação de unidade no Evolution", () => {
  it("resolve apenas uma unidade existente no catálogo autorizado", () => {
    expect(resolveAuthorizedEvolutionUnit("unit-ijui", units)).toEqual(units[0]);
  });

  it("rejeita uma unidade ausente, vazia ou não autorizada", () => {
    expect(resolveAuthorizedEvolutionUnit("unit-nao-autorizada", units)).toBeNull();
    expect(resolveAuthorizedEvolutionUnit("", units)).toBeNull();
    expect(resolveAuthorizedEvolutionUnit(undefined, units)).toBeNull();
  });
});
