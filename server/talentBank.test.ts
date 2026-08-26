import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer } from "./index.js";
import { talentSlugFromUnitName } from "./talentBankSupabaseStore.js";

describe("Banco de Talentos", () => {
  it("cria slug público estável sem revelar o nome completo da unidade", () => {
    const slug = talentSlugFromUnitName("Vida Card São José — Centro", "0cf96a70-0244-42c2-a02b-1e86ae67af41");
    expect(slug).toBe("vida-card-sao-jose-centro-0cf96a70");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  describe("proteção das rotas administrativas", () => {
    let baseUrl = "";
    let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;
    beforeAll(async () => {
      const started = await startServer({ listen: false });
      server = started.server;
      await new Promise<void>((resolve, reject) => { server!.once("error", reject); server!.listen(0, "127.0.0.1", () => resolve()); });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível");
      baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); });
    it("não permite listar unidades de recrutamento sem sessão da dashboard", async () => {
      const response = await fetch(`${baseUrl}/api/talent/admin/units`);
      expect(response.status).toBe(401);
    });
    it("não permite acessar slugs públicos inválidos", async () => {
      const response = await fetch(`${baseUrl}/api/talent/public/../../admin`);
      expect(response.status).toBe(404);
    });
  });
});
