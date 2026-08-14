import { describe, expect, it } from "vitest";
import { groupClientAccessByUser, uniqueGrantedClientIds } from "./clientAccess.js";

describe("contrato de acessos de usuário por unidade", () => {
  it("anexa unidade, grupo e identificador da concessão a cada acesso", () => {
    const grouped = groupClientAccessByUser(
      [{
        id: "accesso-001",
        user_id: "usuario-001",
        client_id: "unidade-001",
        granted_by: "admin@trafego.pro",
        created_at: "2026-08-14T00:00:00.000Z",
      }],
      [{ id: "unidade-001", name: "Vida Card Tupanciretã", client_group: "Vida Card" }],
    );

    expect(grouped["usuario-001"]).toEqual([{
      id: "accesso-001",
      client_id: "unidade-001",
      client_name: "Vida Card Tupanciretã",
      client_group: "Vida Card",
      granted_by: "admin@trafego.pro",
      created_at: "2026-08-14T00:00:00.000Z",
    }]);
  });

  it("preserva o identificador da concessão mesmo quando a unidade não é encontrada", () => {
    const grouped = groupClientAccessByUser(
      [{
        id: "accesso-002",
        user_id: "usuario-002",
        client_id: "unidade-removida",
        granted_by: "admin@trafego.pro",
        created_at: "2026-08-14T00:00:00.000Z",
      }],
      [],
    );

    expect(grouped["usuario-002"][0]).toMatchObject({
      id: "accesso-002",
      client_id: "unidade-removida",
      client_name: null,
      client_group: null,
    });
  });

  it("resolve IDs únicos de unidades a partir das concessões do Supabase", () => {
    const ids = uniqueGrantedClientIds([
      { client_id: "unidade-ijuí" },
      { client_id: "unidade-canela" },
      { client_id: "unidade-ijuí" },
    ]);

    expect(ids).toEqual(["unidade-ijuí", "unidade-canela"]);
  });
});
