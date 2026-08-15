import { describe, expect, it } from "vitest";
import { scopeEvolutionData } from "./evolutionScope";

describe("scopeEvolutionData", () => {
  const instances = [
    { instanceName: "ijui-1", unitName: "Ijuí" },
    { instanceName: "tupan-1", unitName: "Tupanciretã" },
    { instanceName: "sem-unidade", unitName: null },
  ];
  const leads = [
    { instanceName: "ijui-1", classification: "pendente", funnelStage: "novo" },
    { instanceName: "tupan-1", classification: "lead", funnelStage: "qualificado" },
    { instanceName: "sem-unidade", classification: "lead", funnelStage: "fechado" },
  ];
  const events = instances.map((instance) => ({ instanceName: instance.instanceName, receivedAt: "2026-08-15T12:00:00.000Z" }));

  it("segrega contatos e eventos pela unidade selecionada", () => {
    const scope = scopeEvolutionData(instances, leads, events, "Ijuí", "all");
    expect(scope.visibleInstances.map((item) => item.instanceName)).toEqual(["ijui-1"]);
    expect(scope.visibleLeads).toHaveLength(1);
    expect(scope.visibleEvents).toHaveLength(1);
  });

  it("filtra uma instância específica sem misturar outras unidades", () => {
    const scope = scopeEvolutionData(instances, leads, events, "all", "tupan-1");
    expect(scope.visibleInstances.map((item) => item.instanceName)).toEqual(["tupan-1"]);
    expect(scope.visibleLeads[0]?.instanceName).toBe("tupan-1");
    expect(scope.unitOptions).toEqual(["Ijuí", "Tupanciretã", "__unassigned"]);
  });
});
