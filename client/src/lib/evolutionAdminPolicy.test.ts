import { describe, expect, it } from "vitest";
import { canAccessEvolutionPanel } from "./evolutionAdminPolicy";

describe("canAccessEvolutionPanel", () => {
  it("permite somente uma sessão administrativa válida", () => {
    expect(canAccessEvolutionPanel("token", JSON.stringify({ role: "admin" }))).toBe(true);
    expect(canAccessEvolutionPanel("token", JSON.stringify({ role: "viewer" }))).toBe(false);
    expect(canAccessEvolutionPanel(null, JSON.stringify({ role: "admin" }))).toBe(false);
    expect(canAccessEvolutionPanel("token", "inválido")).toBe(false);
  });
});
