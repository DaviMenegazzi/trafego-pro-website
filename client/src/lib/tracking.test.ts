import { describe, expect, it } from "vitest";
import { extractCleanUnitSlug } from "./tracking";

describe("extractCleanUnitSlug", () => {
  it("extrai o slug limpo da unidade a partir do slug público com hash", () => {
    expect(
      extractCleanUnitSlug({
        publicSlug: "vida-card-canela-1234abcd",
        title: "Trabalhe Conosco — Canela",
      })
    ).toBe("canela");
  });

  it("extrai o nome da unidade a partir de títulos compostos e acentuados", () => {
    expect(
      extractCleanUnitSlug({
        publicSlug: "vida-card-sao-leopoldo-abc1234",
        title: "Trabalhe Conosco — São Leopoldo",
      })
    ).toBe("sao_leopoldo");

    expect(
      extractCleanUnitSlug({
        publicSlug: "trabalhe-conosco-tupancireta-9876",
        title: "Vaga Comercial Tupanciretã",
      })
    ).toBe("tupancireta");
  });

  it("gera o identificador exato para a unidade de Canela", () => {
    const unitSlug = extractCleanUnitSlug({
      publicSlug: "vida-card-canela-83748291",
      title: "Trabalhe Conosco — Canela",
    });
    expect(`lead_forms_banco_talento_${unitSlug}`).toBe("lead_forms_banco_talento_canela");
  });
});
