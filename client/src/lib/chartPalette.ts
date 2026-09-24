// Paleta de gráficos validada com o validate_palette.js da skill dataviz
// (plans/ux-visual-audit/README.md). A cor segue a entidade, nunca a posição:
// conversas/receita = aqua, investimento/lucro = azul, custo/despesas = laranja.
// Vermelho, âmbar e verde ficam reservados para status e sempre com texto.

export const CHART_SERIES_DARK = {
  aqua: "#199e70",
  blue: "#3987e5",
  orange: "#d95926",
} as const;

export const CHART_SERIES_LIGHT = {
  aqua: "#1baf7a",
  blue: "#2a78d6",
  orange: "#eb6834",
} as const;

// O produto é escuro; o claro está validado para quando houver tema claro.
export const CHART = CHART_SERIES_DARK;

export const CHART_CHROME = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#71717a",
  reference: "#a1a1aa",
} as const;

export const chartTooltipStyle = {
  background: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#f4f4f5",
  boxShadow: "0 12px 24px -8px rgba(0, 0, 0, 0.6)",
  padding: "8px 12px",
} as const;

export const chartAxisTick = { fontSize: 11, fill: CHART_CHROME.axis } as const;
