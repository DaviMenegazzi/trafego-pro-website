import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardState } from "./DashboardState";

describe("DashboardState", () => {
  it("explica a ausência de métricas sem renderizar cartões zerados", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardState, {
        title: "Sem dados para este período",
        description: "Amplie o período selecionado.",
      }),
    );

    expect(html).toContain("Sem dados para este período");
    expect(html).toContain("Amplie o período selecionado.");
  });

  it("identifica visualmente o estado de carregamento", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardState, {
        title: "Atualizando indicadores",
        description: "Consultando o Supabase.",
        loading: true,
      }),
    );

    expect(html).toContain("Atualizando indicadores");
    expect(html).toContain("animate-pulse");
  });
});
