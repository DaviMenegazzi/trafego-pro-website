import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { DashboardState } from "@/components/DashboardState";
import { DeepAnalyticsAccordion } from "@/components/DeepAnalyticsAccordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import { CUSTOM_PERIOD, formatDashboardDateRange, getPresetDashboardDateRange, isValidDashboardDateRange } from "@/lib/dashboardDateRange";
import { calculateResponseRate } from "@/lib/dashboardPresentation";
import { getDashboardUnitMenuState, selectAuthorizedDashboardUnit } from "@/lib/dashboardUnitMenu";
import { MetricsSessionError, readMetricsResponse } from "@/lib/metricsResponse";
import { createRequestGate } from "@/lib/requestGate";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  ChevronDown,
  CalendarRange,
  Building2,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Target,
  Activity,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

// ─── Paleta de destaque dos gráficos ─────────────────────────────────────────
const CHART = {
  green: "#10B981",   // conversas / positivo (Emerald)
  teal: "#14B8A6",    // taxa / conexões (Teal)
  orange: "#F59E0B",  // investimento / atenção (Amber)
  red: "#EF4444",     // custo / alerta (Rose)
  blue: "#38BDF8",    // apoio (Sky)
};

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) setLocation("/login");
  }, [setLocation]);
}

// ─── Tipos das fontes de dados (view + função do Supabase) ────────────────────
type DailyRow = {
  date_start: string;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  total_messaging_connections: number | null;
  total_primeiras_respostas: number | null;
  total_conversas_respondidas: number | null;
  total_leads_meta: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  custo_por_conversa: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
  avg_ctr: number | null;
  avg_frequency: number | null;
};
type CampaignRow = {
  campaign_name: string;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  custo_por_conversa: number | null;
  total_leads_meta: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  avg_ctr: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
};

// ─── Formatação (pt-BR) ───────────────────────────────────────────────────────
const n = (v: number) => v.toLocaleString("pt-BR");
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const num = (v: number | null | undefined) => Number(v ?? 0);

const tooltipStyle: React.CSSProperties = {
  background: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 14,
  fontSize: 12,
  color: "#f4f4f5",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
};
const axisTick = { fontSize: 11, fill: "#71717a" };

function statusFor(custo: number): "Positivo" | "Atenção" | "Crítico" {
  if (custo > 0 && custo <= 8) return "Positivo";
  if (custo <= 15) return "Atenção";
  return "Crítico";
}
const STATUS_CLS: Record<string, string> = {
  Positivo: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  Atenção: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Crítico: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
};

const PERIOD_SHORTCUTS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

function Panel({
  title,
  note,
  icon: Icon,
  children,
}: {
  title: string;
  note?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/40 transition-all duration-200 hover:border-white/15">
      <div className="flex items-center justify-between gap-3 px-6 py-4.5 border-b border-white/5 bg-white/[0.015]">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300">
              <Icon className="size-3.5" />
            </div>
          )}
          <h2 className="font-display text-base font-bold tracking-tight text-zinc-100">{title}</h2>
        </div>
        {note && <span className="text-xs text-zinc-400 font-light">{note}</span>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  useAuthGuard();
  const [, setLocation] = useLocation();
  useEffect(() => { document.title = "Tráfego Pro — Dashboard"; }, []);

  const [period, setPeriod] = useState("30");
  const [customRange, setCustomRange] = useState(() => getPresetDashboardDateRange("30"));
  const [draftStart, setDraftStart] = useState(customRange.start);
  const [draftEnd, setDraftEnd] = useState(customRange.end);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const { clients: clientOpts, selectedClientId, selectedClient, setSelectedClientId, loading: clientsLoading } = useClientContext();
  const metricsRequestGate = useRef(createRequestGate());

  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const activeRange = useMemo(
    () => period === CUSTOM_PERIOD ? customRange : getPresetDashboardDateRange(period),
    [customRange, period],
  );
  const periodLabel = period === CUSTOM_PERIOD
    ? `Personalizado · ${formatDashboardDateRange(activeRange)}`
    : (PERIOD_SHORTCUTS.find((item) => item.value === period)?.label ?? "Últimos 30 dias");
  const unitMenu = getDashboardUnitMenuState(clientOpts, selectedClientId, clientsLoading);

  const selectPresetPeriod = (value: string) => {
    setPeriod(value);
    setCustomRangeError(null);
    setPeriodMenuOpen(false);
  };

  const applyCustomRange = () => {
    const nextRange = { start: draftStart, end: draftEnd };
    if (!isValidDashboardDateRange(nextRange)) {
      setCustomRangeError("Escolha uma data inicial e uma data final válidas.");
      return;
    }
    setCustomRange(nextRange);
    setPeriod(CUSTOM_PERIOD);
    setCustomRangeError(null);
    setPeriodMenuOpen(false);
  };

  const handlePeriodMenu = (open: boolean) => {
    setPeriodMenuOpen(open);
    if (open) {
      setDraftStart(activeRange.start);
      setDraftEnd(activeRange.end);
      setCustomRangeError(null);
    }
  };

  const selectUnit = (clientId: string) => {
    if (selectAuthorizedDashboardUnit(clientOpts, clientId, setSelectedClientId)) {
      setUnitMenuOpen(false);
    }
  };

  // Carrega métricas ao mudar período/cliente
  useEffect(() => {
    const requestId = metricsRequestGate.current.begin();
    const controller = new AbortController();
    const isCurrentRequest = () => metricsRequestGate.current.isLatest(requestId);

    if (!authHeaders || !selectedClientId) {
      setDaily([]);
      setCampaigns([]);
      setLoading(false);
      return () => controller.abort();
    }
    const { start, end } = activeRange;
    const qs = buildClientMetricsQuery(start, end, selectedClientId);
    if (!qs) return () => controller.abort();
    setLoading(true); setError(null);
    Promise.all([
      fetch(`/api/metrics/daily?${qs}`, { headers: authHeaders, credentials: "same-origin", signal: controller.signal })
        .then((response) => readMetricsResponse<{ configured?: boolean; rows?: DailyRow[]; error?: string }>(response, "Não foi possível carregar as métricas diárias")),
      fetch(`/api/metrics/campaigns?${qs}`, { headers: authHeaders, credentials: "same-origin", signal: controller.signal })
        .then((response) => readMetricsResponse<{ rows?: CampaignRow[]; error?: string }>(response, "Não foi possível carregar as campanhas")),
    ])
      .then(([d, c]) => {
        if (!isCurrentRequest()) return;
        const ok = d.configured !== false;
        setConfigured(ok);
        if (ok && Array.isArray(d.rows) && d.rows.length > 0) setDaily(d.rows);
        else if (ok) setDaily([]);
        if (ok && Array.isArray(c.rows)) setCampaigns(c.rows);
        if (d.error || c.error) setError(d.error ?? c.error ?? "Não foi possível carregar as métricas.");
      })
      .catch((e) => {
        if (controller.signal.aborted || !isCurrentRequest()) return;
        if (e instanceof MetricsSessionError) {
          localStorage.removeItem("tp_token");
          localStorage.removeItem("tp_user");
          void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
          setLocation("/login?reason=session-expired");
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (isCurrentRequest()) setLoading(false);
      });

    return () => controller.abort();
  }, [activeRange, token, selectedClientId, refreshIndex, setLocation]);

  // ─── Agregações ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const rows = daily;
    const sum = (k: keyof DailyRow) => rows.reduce((a, r) => a + num(r[k] as number), 0);
    const avg = (k: keyof DailyRow) => (rows.length ? sum(k) / rows.length : 0);
    const spend = sum("total_spend");
    const conv = sum("total_conversas_iniciadas");
    return {
      spend, conv,
      custoConversa: conv > 0 ? spend / conv : 0,
      primeiras: sum("total_primeiras_respostas"),
      respondidas: sum("total_conversas_respondidas"),
      connections: sum("total_messaging_connections"),
      leads: sum("total_leads_meta"),
      impressions: sum("total_impressions"),
      clicks: sum("total_clicks"),
      ctr: avg("avg_ctr"),
      cpc: avg("avg_cpc"),
      cpm: avg("avg_cpm"),
      frequency: avg("avg_frequency"),
    };
  }, [daily]);

  const responseRate = calculateResponseRate(kpi.respondidas, kpi.connections);

  const primaryKpis = [
    {
      label: "Total Investido",
      value: brl(kpi.spend),
      note: "verba Meta Ads no período",
      accent: "text-amber-400",
      icon: DollarSign,
      indicator: "bg-amber-400/20 text-amber-300 border-amber-400/30",
    },
    {
      label: "Conversas Iniciadas",
      value: n(kpi.conv),
      note: "inícios de conversa WhatsApp",
      accent: "text-emerald-400",
      icon: MessageSquare,
      indicator: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      label: "Custo por Conversa",
      value: brl(kpi.custoConversa),
      note: "investimento / conversas",
      accent: kpi.custoConversa <= 8 ? "text-emerald-400" : kpi.custoConversa <= 15 ? "text-amber-400" : "text-rose-400",
      icon: Target,
      indicator: "bg-white/10 text-zinc-300 border-white/15",
    },
    {
      label: "Taxa de Resposta",
      value: pct(responseRate),
      note: "conversas respondidas",
      accent: "text-teal-300",
      icon: Activity,
      indicator: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    },
  ];

  const supportingKpis = [
    { label: "Primeiras respostas", value: n(kpi.primeiras) },
    { label: "Leads Meta", value: n(kpi.leads) },
    { label: "Impressões", value: n(kpi.impressions) },
    { label: "Cliques", value: n(kpi.clicks) },
    { label: "CTR", value: pct(kpi.ctr) },
    { label: "CPC", value: brl(kpi.cpc) },
    { label: "CPM", value: brl(kpi.cpm) },
    { label: "Frequência", value: kpi.frequency.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ];

  const chart = useMemo(() => daily.map((r) => ({
    d: r.date_start ? r.date_start.slice(5).split("-").reverse().join("/") : "",
    conversas: num(r.total_conversas_iniciadas),
    investimento: num(r.total_spend),
    custo: num(r.custo_por_conversa) || (num(r.total_conversas_iniciadas) > 0 ? num(r.total_spend) / num(r.total_conversas_iniciadas) : 0),
  })), [daily]);

  const notSynced = configured === false;
  const hasMetrics = daily.length > 0 || campaigns.length > 0;
  const dashboardState = clientsLoading || loading
    ? { title: "Atualizando indicadores", description: "Estamos consultando as métricas mais recentes no Supabase.", loading: true }
    : !selectedClientId
      ? { title: "Selecione uma unidade", description: "Escolha uma unidade no filtro para analisar os indicadores de mídia e atendimento." }
      : error
        ? { title: "Não foi possível carregar as métricas", description: "Revise a conexão com o Supabase ou atualize os dados para tentar novamente." }
        : !hasMetrics
          ? { title: "Sem dados para este período", description: "Não há métricas sincronizadas para a unidade e o período selecionados. Tente ampliar o intervalo de datas." }
          : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-10">
        
        {/* Top Header Banner */}
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Visão de Performance & Mídia</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dashboard de Resultados
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400 font-light">
              Acompanhe os principais indicadores de investimento, geração de conversas e retorno de campanhas por unidade.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md px-4 py-3 shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Unidade ativa</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Building2 className="size-4 text-emerald-400 shrink-0" />
              <span>{selectedClient?.name ?? "Selecione uma unidade"}</span>
            </p>
          </div>
        </div>

        {/* Filter Control Deck */}
        <section className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              
              {/* Period Filter */}
              <Popover open={periodMenuOpen} onOpenChange={handlePeriodMenu}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Selecionar período das métricas"
                    className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-left text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <CalendarRange className="size-4 text-emerald-400" />
                    <span className="max-w-52 truncate">{periodLabel}</span>
                    <ChevronDown className="size-3.5 text-zinc-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className="font-display text-base font-bold">Período de análise</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">Selecione um intervalo pré-definido ou datas personalizadas.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-4">
                    {PERIOD_SHORTCUTS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => selectPresetPeriod(item.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                          period === item.value
                            ? "border-emerald-500 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/40"
                            : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="mx-4 border-t border-white/10 pt-4 pb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-2.5">Intervalo Customizado</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-zinc-400">
                        <span>Data inicial</span>
                        <input
                          type="date"
                          value={draftStart}
                          max={draftEnd || undefined}
                          onChange={(event) => setDraftStart(event.target.value)}
                          className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        <span>Data final</span>
                        <input
                          type="date"
                          value={draftEnd}
                          min={draftStart || undefined}
                          onChange={(event) => setDraftEnd(event.target.value)}
                          className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </label>
                    </div>
                    {customRangeError && <p role="alert" className="mt-3 text-xs text-red-400">{customRangeError}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 bg-zinc-900/40 px-4 py-3">
                    <button type="button" onClick={() => setPeriodMenuOpen(false)} className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-white">Cancelar</button>
                    <button type="button" onClick={applyCustomRange} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400">Aplicar período</button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Unit Filter */}
              <Popover open={unitMenuOpen} onOpenChange={(isOpen) => { setUnitMenuOpen(isOpen); if (!isOpen) setUnitSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Selecionar unidade das métricas"
                    disabled={!unitMenu.canOpen}
                    className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-left text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Building2 className="size-4 text-emerald-400" />
                    <span className="max-w-52 truncate">{unitMenu.label}</span>
                    <ChevronDown className="size-3.5 text-zinc-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl z-50">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className="font-display text-base font-bold">Unidades disponíveis</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">Selecione a unidade para filtrar as métricas.</p>
                    {clientOpts.length > 5 && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          placeholder="Filtrar unidade…"
                          className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
                        />
                      </div>
                    )}
                  </div>
                  {clientsLoading ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-zinc-400" aria-live="polite">
                      <RefreshCw className="size-4 animate-spin text-emerald-400" /> Carregando unidades…
                    </div>
                  ) : clientOpts.length === 0 ? (
                    <p className="px-4 py-6 text-sm leading-6 text-zinc-400">{unitMenu.emptyMessage}</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto p-2">
                      {clientOpts
                        .filter((c) => !unitSearch.trim() || c.name.toLowerCase().includes(unitSearch.toLowerCase()))
                        .map((client) => {
                          const selected = client.id === selectedClientId;
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                selectUnit(client.id);
                                setUnitSearch("");
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left text-xs transition-all ${
                                selected
                                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-950/30"
                                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{client.name}</span>
                              {selected && <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-900 font-extrabold">Ativa</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshIndex((value) => value + 1)}
              disabled={loading || clientsLoading || !selectedClientId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar dados</span>
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-zinc-500">
            <span className="size-1.5 rounded-full bg-emerald-400/80" />
            <span>
              {clientsLoading || loading
                ? "Sincronizando métricas mais recentes do Supabase…"
                : !selectedClientId
                ? "Selecione uma unidade para visualizar os resultados."
                : notSynced
                ? "Nenhuma sincronização recente encontrada para este intervalo."
                : "Dados sincronizados e consolidados em tempo real."}
            </span>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Erro ao buscar métricas: {error}
          </div>
        )}

        {dashboardState ? (
          <DashboardState {...dashboardState} />
        ) : (
          <>
            {/* Primary KPI Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {primaryKpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-xl shadow-black/30 transition-all duration-200 hover:border-white/20 hover:bg-zinc-900/80"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                        {k.label}
                      </span>
                      <div className={`flex size-8 items-center justify-center rounded-xl border p-1.5 ${k.indicator}`}>
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <div className={`mt-3 font-display text-3xl font-bold tracking-tight ${k.accent}`}>
                      {k.value}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 font-light">
                      {k.note}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complementary Metrics Section */}
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/30 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-black/20">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="size-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                  Métricas Complementares & Tráfego
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                {supportingKpis.map((k) => (
                  <div key={k.label} className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3">
                    <p className="text-[11px] text-zinc-500 truncate">{k.label}</p>
                    <p className="mt-1 text-sm font-bold text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Análise Profunda e Projeções (Sanfona Inteligente) */}
            <DeepAnalyticsAccordion unitId={selectedClientId} unitName={selectedClient?.name} />

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Conversas iniciadas por dia" note="Evolução diária de leads" icon={TrendingUp}>
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gConversas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.green} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="conversas"
                      stroke={CHART.green}
                      strokeWidth={3}
                      fill="url(#gConversas)"
                      dot={{ r: 3, fill: CHART.green, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Conversas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Investimento x Conversas" note="Relação de custo e volume" icon={BarChart3}>
                <ResponsiveContainer width="100%" height={270}>
                  <LineChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line
                      yAxisId="l"
                      type="monotone"
                      dataKey="investimento"
                      stroke={CHART.orange}
                      strokeWidth={3}
                      dot={{ r: 3, fill: CHART.orange, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Investimento (R$)"
                    />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="conversas"
                      stroke={CHART.green}
                      strokeWidth={3}
                      dot={{ r: 3, fill: CHART.green, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Conversas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Charts Row 2: Custo por conversa */}
            <div>
              <Panel title="Custo por conversa" note="R$ por conversa iniciada" icon={Target}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.red} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART.orange} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v))} />
                    <Area
                      type="monotone"
                      dataKey="custo"
                      stroke={CHART.red}
                      strokeWidth={3}
                      fill="url(#gCusto)"
                      dot={{ r: 3, fill: CHART.red, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Custo/conversa"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Campaigns Table Panel */}
            <Panel title="Desempenho por campanha" note="Resultados detalhados no período selecionado" icon={Layers}>
              <div className="overflow-x-auto -m-2 p-2">
                <table className="w-full text-xs min-w-[860px]">
                  <thead>
                    <tr className="text-zinc-400 border-b border-white/10">
                      <th className="text-left font-semibold py-3.5 pr-4 text-[11px] uppercase tracking-wider">Campanha</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Investimento</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Conversas</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Custo/conv</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Leads Meta</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Impressões</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Cliques</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CTR</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CPC</th>
                      <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CPM</th>
                      <th className="text-right font-semibold py-3.5 pl-3 text-[11px] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-zinc-500 font-light">
                          Nenhuma campanha com dados registrada neste período.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((c) => {
                        const custo = num(c.custo_por_conversa) || (num(c.total_conversas_iniciadas) > 0 ? num(c.total_spend) / num(c.total_conversas_iniciadas) : 0);
                        const st = statusFor(custo);
                        return (
                          <tr key={c.campaign_name} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3.5 pr-4 font-semibold text-zinc-200 max-w-[280px] truncate">{c.campaign_name}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-300">{brl(num(c.total_spend))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono font-semibold text-emerald-400">{n(num(c.total_conversas_iniciadas))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-300">{brl(custo)}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-400">{n(num(c.total_leads_meta))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-400">{n(num(c.total_impressions))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-400">{n(num(c.total_clicks))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-300">{pct(num(c.avg_ctr))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-400">{brl(num(c.avg_cpc))}</td>
                            <td className="py-3.5 px-3 text-right tabular-nums font-mono text-zinc-400">{brl(num(c.avg_cpm))}</td>
                            <td className="py-3.5 pl-3 text-right">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_CLS[st]}`}>
                                {st}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </AppLayout>
  );
}
