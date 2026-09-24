import { describe, expect, it } from "vitest";
import { resolveAuthorizedEvolutionUnit } from "./evolutionUnitAssignment.js";

describe("resolveAuthorizedEvolutionUnit", () => {
  it("resolve uma unidade pelo ID canônico", () => {
    expect(resolveAuthorizedEvolutionUnit("unit-1", [{ id: "unit-1", name: "Unidade 1" }])).toEqual({
      id: "unit-1",
      name: "Unidade 1",
    });
  });

  it("resolve a conta Meta pelos aliases autorizados", () => {
    const unit = {
      id: "act_123456",
      name: "Unidade Meta",
      metaAccountId: "act_123456",
      aliases: ["123456", "act_123456"],
    };

    expect(resolveAuthorizedEvolutionUnit("123456", [unit])).toEqual(unit);
    expect(resolveAuthorizedEvolutionUnit("act_123456", [unit])).toEqual(unit);
  });

  it("não resolve IDs fora do catálogo autorizado", () => {
    expect(resolveAuthorizedEvolutionUnit("act_999", [{
      id: "act_123",
      name: "Unidade autorizada",
      aliases: ["123"],
    }])).toBeNull();
  });
});
