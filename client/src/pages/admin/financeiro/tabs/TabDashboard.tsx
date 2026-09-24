import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SegmentedControl, StatTile, StatusBadge, Surface, SurfaceHeader } from "@/components/ds";
import { formatCurrency, formatCurrencyCompact, formatMonthKey, formatPercent } from "@/lib/format";
import { CHART, CHART_CHROME, chartAxisTick, chartTooltipStyle } from "@/lib/chartPalette";
import type { DatabaseState } from "../types";
import { MESES } from "../constants";
import { MonthPicker } from "../components/MonthPicker";

interface TabDashboardProps {
  dbState: DatabaseState;
}

// Receita = aqua, despesas = laranja, lucro = azul (paleta validada; ver lib/chartPalette).
const SERIES = [
  { key: "receita", label: "Receita", color: CHART.aqua },
  { key: "despesas", label: "Despesas", color: CHART.orange },
  { key: "lucro", label: "Lucro", color: CHART.blue },
] as const;

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function TabDashboard({ dbState }: TabDashboardProps) {
  const [selectedMes, setSelectedMes] = useState(() => {
    const hoje = new Date();
    const currentKey = `${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const found = MESES.find((m) => m.k === currentKey);
    return found ? found.k : "2026_08";
  });
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const mesLabel = formatMonthKey(selectedMes, true);

  const calcMetricsForMonth = (mesKey: string) => {
    let receita = 0;
    let paidUnitsCount = 0;

    Object.values(dbState.clientes || {}).forEach((c) => {
      const cb = dbState.cobrancas?.[c.id]?.[mesKey];
      if (cb?.recebido && cb.valorRecebido) {
        receita += cb.valorRecebido;
        paidUnitsCount++;
      }
    });

    let despesas = 0;
    let paidDespesasCount = 0;
    Object.values(dbState.despesas || {}).forEach((d) => {
      if (d.mes === mesKey && d.status === "paga") {
        despesas += d.val || 0;
        paidDespesasCount++;
      }
    });

    const lucro = receita - despesas;
    const caixa = lucro > 0 ? lucro * 0.5 : 0;
    const sobra = lucro > 0 ? lucro * 0.5 : 0;

    const inadimplencia = Object.values(dbState.clientes || {}).filter((c) => {
      const cb = dbState.cobrancas?.[c.id]?.[mesKey];
      const ini = c.mesInicial || "2026_07";
      return ini <= mesKey && (!cb || !cb.recebido);
    }).length;

    const ticketMedio = paidUnitsCount > 0 ? receita / paidUnitsCount : 0;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;

    return {
      receita,
      despesas,
      lucro,
      caixa,
      patrono: sobra * 0.3,
      davi: sobra * 0.3,
      lucas: sobra * 0.3,
      ana: sobra * 0.1,
      paidUnitsCount,
      paidDespesasCount,
      inadimplencia,
      ticketMedio,
      margem,
    };
  };

  const currentMonthData = useMemo(() => {
    return calcMetricsForMonth(selectedMes);
  }, [selectedMes, dbState]);

  const monthsWithData = useMemo(() => {
    return MESES.map((m) => ({
      ...m,
      metrics: calcMetricsForMonth(m.k),
    })).filter((m) => m.metrics.receita > 0 || m.metrics.despesas > 0);
  }, [dbState]);

  const chartData = useMemo(() => {
    return monthsWithData.map((m, index) => {
      const prev = index > 0 ? monthsWithData[index - 1].metrics.receita : 0;
      const growth = prev > 0 ? ((m.metrics.receita - prev) / prev) * 100 : null;

      return {
        mesKey: m.k,
        name: m.l.split(" ")[0],
        fullName: m.l,
        receita: m.metrics.receita,
        despesas: m.metrics.despesas,
        lucro: Math.max(0, m.metrics.lucro),
        margem: m.metrics.margem,
        paidUnits: m.metrics.paidUnitsCount,
        growth,
      };
    });
  }, [monthsWithData]);

  const clientesOrdenados = useMemo(() => {
    return Object.values(dbState.clientes || {}).sort(
      (a, b) => parseInt(String(a.vencDia || 99)) - parseInt(String(b.vencDia || 99))
    );
  }, [dbState.clientes]);

  const d = currentMonthData;
  const tooltipFormatter = (value: number, name: string) => [formatCurrency(value), SERIES.find((s) => s.key === name)?.label ?? name];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Resumo de {mesLabel}</h2>
        <MonthPicker value={selectedMes} onChange={setSelectedMes} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Receita" value={formatCurrency(d.receita)} hint={`${d.paidUnitsCount} unidades pagaram · ticket ${formatCurrency(d.ticketMedio)}`} />
        <StatTile label="Despesas pagas" value={formatCurrency(d.despesas)} hint={`${d.paidDespesasCount} lançamentos`} />
        <StatTile
          label="Lucro"
          value={formatCurrency(d.lucro)}
          hint={d.receita > 0 ? `Margem ${formatPercent(d.margem)}` : undefined}
          status={d.lucro < 0 ? { tone: "critical", label: "Prejuízo" } : undefined}
        />
        <StatTile
          label="Inadimplência"
          value={d.inadimplencia}
          hint={d.inadimplencia === 1 ? "unidade sem pagamento" : "unidades sem pagamento"}
          status={d.inadimplencia > 0 ? { tone: "warning", label: "Cobrar" } : { tone: "good", label: "Em dia" }}
        />
      </div>

      <Surface>
        <SurfaceHeader title="Divisão do lucro" description={d.lucro > 0 ? `${formatCurrency(d.lucro)} divididos pela regra societária.` : `Sem lucro positivo em ${mesLabel}; não há divisão.`} />
        {d.lucro > 0 && (
          <dl className="grid gap-px bg-white/[0.06] sm:grid-cols-5">
            {[
              ["Caixa · 50%", d.caixa],
              ["Patrono · 30%", d.patrono],
              ["Davi · 30%", d.davi],
              ["Lucas · 30%", d.lucas],
              ["Ana · 10%", d.ana],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-zinc-900 px-5 py-3">
                <dt className="text-xs text-zinc-400">{label}</dt>
                <dd className="mt-0.5 text-base font-medium tabular-nums text-zinc-100">{formatCurrency(value as number)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Surface>

      {chartData.length > 0 && (
        <Surface>
          <SurfaceHeader
            title="Mês a mês"
            description="Receita, despesas pagas e lucro de cada mês com movimento."
            actions={
              <SegmentedControl
                aria-label="Tipo de gráfico"
                size="sm"
                value={chartType}
                onValueChange={setChartType}
                options={[{ value: "bar", label: "Colunas" }, { value: "line", label: "Tendência" }]}
              />
            }
          />
          <div className="space-y-3 p-5">
            <Legend />
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={3}>
                    <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                    <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={72} tickFormatter={(v) => formatCurrencyCompact(v)} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={tooltipFormatter} labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""} />
                    {SERIES.map((s) => (
                      <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    ))}
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                    <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={72} tickFormatter={(v) => formatCurrencyCompact(v)} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={tooltipFormatter} labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""} />
                    {SERIES.map((s) => (
                      <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          {/* A mesma informação em tabela (leitura exata e leitor de tela). */}
          <div className="overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full min-w-[560px] text-sm tabular-nums">
              <caption className="sr-only">Receita, despesas e lucro por mês</caption>
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Mês</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Receita</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Despesas</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Lucro</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Margem</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">Receita vs. mês anterior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                {chartData.map((m) => (
                  <tr key={m.mesKey}>
                    <td className="py-2.5 pl-5 pr-3 text-zinc-100">{m.fullName}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.receita)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.despesas)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(m.lucro)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPercent(m.margem)}</td>
                    <td className="py-2.5 pl-3 pr-5 text-right">
                      {m.growth === null ? "—" : `${m.growth >= 0 ? "+" : ""}${formatPercent(m.growth, 0)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SurfaceHeader title={`Unidades em ${mesLabel}`} />
        {clientesOrdenados.length === 0 ? (
          <p className="px-5 py-4 text-sm text-zinc-500">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Unidade</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Mensalidade</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Boleto</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Nota fiscal</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Recebimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                {clientesOrdenados.map((c) => {
                  const ini = c.mesInicial || "2026_07";
                  if (selectedMes < ini) {
                    return (
                      <tr key={c.id}>
                        <td className="py-2.5 pl-5 pr-3 text-zinc-500">{c.nome}</td>
                        <td colSpan={4} className="py-2.5 pl-3 pr-5 text-zinc-500">Começa em {formatMonthKey(ini, true)}</td>
                      </tr>
                    );
                  }
                  const cb = dbState.cobrancas?.[c.id]?.[selectedMes];
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 pl-5 pr-3">
                        <span className="block text-zinc-100">{c.nome}</span>
                        <span className="block text-xs text-zinc-500">vence dia {c.vencDia || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(c.mensalidade)}</td>
                      <td className="px-3 py-2.5">{cb?.boletoGerado ? "Gerado" : <span className="text-zinc-500">Pendente</span>}</td>
                      <td className="px-3 py-2.5">{cb?.nfGerada ? "Gerada" : <span className="text-zinc-500">Pendente</span>}</td>
                      <td className="py-2.5 pl-3 pr-5">
                        {cb?.recebido ? <StatusBadge tone="good">{formatCurrency(cb.valorRecebido)}</StatusBadge> : <StatusBadge tone="warning">Pendente</StatusBadge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}
