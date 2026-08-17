import { describe, expect, it } from "vitest";
import { buildSocialCalendarMonth, socialCalendarKey } from "./socialCalendar";

describe("calendário social mensal", () => {
  it("mantém uma grade completa de seis semanas", () => {
    const days = buildSocialCalendarMonth(new Date(2026, 7, 1));
    expect(days).toHaveLength(42);
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
  });

  it("gera uma chave consistente para posicionar agendamentos", () => {
    expect(socialCalendarKey("2026-08-31T22:18:00.000Z")).toMatch(/^2026-7-(30|31)$/);
  });
});
