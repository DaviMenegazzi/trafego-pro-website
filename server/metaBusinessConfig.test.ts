import { describe, expect, it } from "vitest";
import { createMetaAuthorizationUrl, getMetaOAuthConfig } from "./socialMetaService.js";

const validateWithMeta = process.env.RUN_META_CONFIG_VALIDATION === "true";

describe.skipIf(!validateWithMeta)("configuração protegida do Login do Facebook para Empresas", () => {
  it("é aceita pelo diálogo OAuth sem solicitar escopos diretos", async () => {
    const config = getMetaOAuthConfig();
    const response = await fetch(createMetaAuthorizationUrl(config, "tp-config-validation"), { redirect: "manual" });
    const location = response.headers.get("location") || "";
    expect([200, 302]).toContain(response.status);
    expect(location.toLowerCase()).not.toContain("invalid");
    expect(location).toContain("config_id=");
  }, 15_000);
});
