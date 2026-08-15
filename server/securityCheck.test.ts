import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("barreira de segredos rastreados", () => {
  it("aprova apenas o estado Git sem valores de credenciais", () => {
    const output = execFileSync("node", ["scripts/check-tracked-secrets.mjs"], { cwd: process.cwd(), encoding: "utf8" });
    expect(output).toContain("Verificação de segredos aprovada");
  });
});
