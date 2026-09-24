import { describe, expect, it } from "vitest";
import { resolveActiveNav } from "./navigation";

const items = [
  { to: "/dashboard" },
  { to: "/dashboard/anuncios" },
  { to: "/dashboard/feedback-leads" },
  { to: "/dashboard/feedback-leads/list" },
  { to: "/admin/metricas" },
];

describe("item ativo do menu", () => {
  it("marca só o caminho mais específico", () => {
    expect(resolveActiveNav("/dashboard/feedback-leads/list", items)).toBe("/dashboard/feedback-leads/list");
    expect(resolveActiveNav("/dashboard/feedback-leads", items)).toBe("/dashboard/feedback-leads");
  });

  it("não marca a Dashboard nas telas filhas", () => {
    expect(resolveActiveNav("/dashboard/anuncios/", items)).toBe("/dashboard/anuncios");
    expect(resolveActiveNav("/dashboard", items)).toBe("/dashboard");
  });

  it("não confunde prefixos parecidos", () => {
    expect(resolveActiveNav("/dashboard/anuncios-extra", items)).toBe("/dashboard");
    expect(resolveActiveNav("/login", items)).toBeNull();
  });
});
