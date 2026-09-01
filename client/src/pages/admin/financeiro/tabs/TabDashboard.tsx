import { useState, useMemo } from "react";
import type { DatabaseState } from "../types";
import { MESES, fmtBRL } from "../constants";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  CreditCard,
  Percent,
  AlertTriangle,
  Receipt,
  Users,
  BarChart3,
  Building2,
  DollarSign,
  Activity,
  CheckCircle2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
} from "lucide-react";

interface TabDashboardProps {
  dbState: DatabaseState;
}

export function TabDashboard({ dbState }: TabDashboardProps) {
  const [selectedMes, setSelectedMes] = useState(() => {
    const hoje = new Date();
    const currentKey = `${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const found = MESES.find((m) => m.k === currentKey);
    return found ? found.k : "2026_08";
  });

  const [chartType, setChartType] = useState<"bar" | "area">("bar");

  const mesLabel = useMemo(() => {
    return MESES.find((m) => m.k === selectedMes)?.l || selectedMes;
  }, [selectedMes]);

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

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl text-xs space-y-2.5 min-w-[220px]">
        <div className="font-bold text-white text-sm border-b border-white/10 pb-1.5 flex items-center justify-between">
          <span>{item.fullName}</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {item.paidUnits} unid. pagas
          </span>
        </div>

        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="size-2 rounded-full bg-emerald-500" />
              Receita:
            </span>
            <span className="font-bold">{fmtBRL(item.receita)}</span>
          </div>

          <div className="flex items-center justify-between text-rose-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="size-2 rounded-full bg-rose-500" />
              Despesas:
            </span>
            <span className="font-bold">{fmtBRL(item.despesas)}</span>
          </div>

          <div className="flex items-center justify-between text-blue-400 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="size-2 rounded-full bg-blue-500" />
              Lucro Líquido:
            </span>
            <span className="font-bold">{fmtBRL(item.lucro)}</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Margem Líquida:</span>
          <span className="font-bold text-emerald-400 font-mono">
            {item.margem.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header with Month Selector ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Dashboard Financeiro Consolidado
            </h2>
            <p className="text-xs text-zinc-400">
              Desempenho em tempo real, receita, margem de lucro e divisão societária.
            </p>
          </div>
        </div>

        <select
          value={selectedMes}
          onChange={(e) => setSelectedMes(e.target.value)}
          className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500 shadow-sm"
        >
          {MESES.map((m) => (
            <option key={m.k} value={m.k}>
              {m.l}
            </option>
          ))}
        </select>
      </div>

      {/* ═══ KPIs Grid ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/30 text-center">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
            Receita Bruta
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {fmtBRL(currentMonthData.receita)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {currentMonthData.paidUnitsCount} unid. pagas
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/30 text-center">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
            Despesas Pagas
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {fmtBRL(currentMonthData.despesas)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {currentMonthData.paidDespesasCount} lançamentos
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/30 text-center">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
            Lucro Líquido
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              currentMonthData.lucro >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {fmtBRL(currentMonthData.lucro)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Base da divisão entre sócios
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/30 text-center">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
            Inadimplência
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              currentMonthData.inadimplencia > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {currentMonthData.inadimplencia}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            unidade(s) sem pagamento
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl shadow-black/30 text-center sm:col-span-2 md:col-span-3 lg:col-span-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
            Ticket Médio
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {fmtBRL(currentMonthData.ticketMedio)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">por unidade paga</div>
        </div>
      </div>

      {/* ═══ Divisão do Lucro Líquido ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 mb-2">
          <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Divisão do Lucro Líquido — {mesLabel}
            </h2>
            <p className="text-xs text-zinc-400">
              Lucro de {fmtBRL(currentMonthData.lucro)} dividido conforme a regra societária.
            </p>
          </div>
        </div>

        {currentMonthData.lucro > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-5">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-center shadow-md">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Caixa (50%)
              </div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {fmtBRL(currentMonthData.caixa)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-center shadow-md">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Patrono (30%)
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {fmtBRL(currentMonthData.patrono)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-center shadow-md">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Davi (30%)
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {fmtBRL(currentMonthData.davi)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-center shadow-md">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Lucas (30%)
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {fmtBRL(currentMonthData.lucas)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-center col-span-2 sm:col-span-1 shadow-md">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Ana (10%)
              </div>
              <div className="text-lg font-bold text-blue-400 font-mono">
                {fmtBRL(currentMonthData.ana)}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-400 mt-4">
            Sem lucro líquido positivo em {mesLabel} — divisão não aplicável.
          </div>
        )}
      </div>

      {/* ═══ Evolução Mês a Mês (Modern Analytics Chart & Clean Row Cards) ═══ */}
      {chartData.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30 space-y-6">
          {/* Header & Chart Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <TrendingUp className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Evolução Mês a Mês
                </h2>
                <p className="text-xs text-zinc-400">
                  Histórico comparativo de receita, despesas e lucro líquido.
                </p>
              </div>
            </div>

            {/* View Selector (Bar / Area) */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  chartType === "bar"
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Colunas
              </button>
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  chartType === "area"
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Tendência
              </button>
            </div>
          </div>

          {/* Interactive Recharts Canvas */}
          <div className="h-[280px] sm:h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#A1A1AA", fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingBottom: 16 }}
                    formatter={(value) => (
                      <span className="text-zinc-300 font-medium ml-1">
                        {value === "receita"
                          ? "Receita"
                          : value === "despesas"
                          ? "Despesas"
                          : "Lucro Líquido"}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="receita"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="despesas"
                    fill="#F43F5E"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="lucro"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="areaReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="areaLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#A1A1AA", fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingBottom: 16 }}
                    formatter={(value) => (
                      <span className="text-zinc-300 font-medium ml-1">
                        {value === "receita"
                          ? "Receita"
                          : value === "despesas"
                          ? "Despesas"
                          : "Lucro Líquido"}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#areaReceita)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#areaLucro)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Monthly Comparison Cards Row (Full Width Rows with Zero Overflow) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
            {chartData.map((m) => (
              <div
                key={m.mesKey}
                className="bg-zinc-950/70 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span>{m.fullName}</span>
                  </div>
                  {m.growth !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        m.growth >= 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {m.growth >= 0 ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      <span>
                        {m.growth >= 0 ? "+" : ""}
                        {m.growth.toFixed(0)}% vs ant.
                      </span>
                    </span>
                  )}
                </div>

                {/* Financial breakdown table rows */}
                <div className="space-y-2 bg-zinc-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Receita Bruta</span>
                    </span>
                    <span className="font-bold text-emerald-400">
                      {fmtBRL(m.receita)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                      <span>Despesas Totais</span>
                    </span>
                    <span className="font-semibold text-rose-400">
                      {fmtBRL(m.despesas)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/5">
                    <span className="flex items-center gap-2 text-zinc-200 font-bold">
                      <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                      <span>Lucro Líquido</span>
                    </span>
                    <span className="font-black text-blue-400 text-sm">
                      {fmtBRL(m.lucro)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                  <span>Margem líquida:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {m.margem.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Situação das Unidades ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 mb-5">
          <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Situação das Unidades — {mesLabel}
            </h2>
            <p className="text-xs text-zinc-400">
              Quadro geral de pagamentos e emissões no período selecionado.
            </p>
          </div>
        </div>

        {clientesOrdenados.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Mensalidade</th>
                  <th className="py-3 px-4 text-center">Venc.</th>
                  <th className="py-3 px-4 text-center">Boleto</th>
                  <th className="py-3 px-4 text-center">NF</th>
                  <th className="py-3 px-4">Recebimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesOrdenados.map((c) => {
                  const ini = c.mesInicial || "2026_07";
                  if (selectedMes < ini) {
                    const startLabel = MESES.find((m) => m.k === ini)?.l || ini;
                    return (
                      <tr key={c.id} className="bg-zinc-950/30">
                        <td
                          colSpan={6}
                          className="py-3 px-4 text-zinc-500 text-[11px] italic"
                        >
                          {c.nome} — início em {startLabel}
                        </td>
                      </tr>
                    );
                  }

                  const cb = dbState.cobrancas?.[c.id]?.[selectedMes] || {};
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Building2 className="size-3.5 text-zinc-500" />
                        <span>{c.nome}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-200 font-mono">
                        {fmtBRL(c.mensalidade)}
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-400 font-mono">
                        dia {c.vencDia || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cb.boletoGerado ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Gerado
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cb.nfGerada ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Gerada
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {cb.recebido ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            <Check className="size-3" />
                            <span>{fmtBRL(cb.valorRecebido)}</span>
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
