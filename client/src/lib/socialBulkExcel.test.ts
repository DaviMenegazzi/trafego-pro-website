import { describe, expect, it } from "vitest";
import { mapSocialExcelRows } from "./socialBulkExcel";

const units = [{ id: "unit-1", name: "Vida Card | Centro" }];
const connections = [{ id: "connection-1", unitId: "unit-1", facebookPageName: "Vida Card Centro", instagramUsername: "vidacardcentro" }];

describe("importação Excel da fila social", () => {
  it("mapeia uma linha válida e escolhe a conexão única da unidade", () => {
    const result = mapSocialExcelRows([{ Unidade: "Vida Card | Centro", Título: "Post", Legenda: "Legenda", Formato: "Imagem", Mídias: "https://cdn.example.com/post.jpg", Facebook: "Sim", Instagram: "Não", "Data e horário": "30/09/2030 10:00" }], units, connections);
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ unitId: "unit-1", connectionId: "connection-1", targetInstagram: false, contentFormat: "image" });
  });

  it("aponta página obrigatória quando a unidade tem múltiplas conexões", () => {
    const result = mapSocialExcelRows([{ Unidade: "Vida Card | Centro", Título: "Post", Legenda: "Legenda", Formato: "Imagem", Mídias: "https://cdn.example.com/post.jpg", "Data e horário": "30/09/2030 10:00" }], units, [...connections, { id: "connection-2", unitId: "unit-1", facebookPageName: "Outra Página", instagramUsername: null }]);
    expect(result.errors[0]?.message).toContain("Página Meta");
  });

  it("rejeita unidade que não pertence ao utilizador", () => {
    const result = mapSocialExcelRows([{ Unidade: "Unidade externa", Formato: "Imagem", "Data e horário": "30/09/2030 10:00" }], units, connections);
    expect(result.errors[0]?.message).toContain("não encontrada");
  });
});
