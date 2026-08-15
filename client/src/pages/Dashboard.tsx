import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { DashboardState } from "@/components/DashboardState";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import { calculateResponseRate } from "@/lib/dashboardPresentation";
import { MetricsSessionError, readMetricsResponse } from "@/lib/metricsResponse";
import { createRequestGate } from "@/lib/requestGate";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Paleta de destaque dos gráficos ─────────────────────────────────────────
// Cores fixas (não usam --primary, que fica quase branco no tema escuro do
// dashboard). Todas têm bom contraste sobre o fundo escuro.
const CHART = {
  green: "#22C55E",   // conversas / positivo
  teal: "#2FD4A5",    // marca (Vida Card)
  orange: "#F59E0B",  // investimento / atenção
  red: "#EF4444",     // custo / alerta
  blue: "#38BDF8",    // apoio
};
import { RefreshCw, ChevronDown } from "lucide-react";

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
  background: "var(--color-popover)", border: "1px solid var(--color-border)",
  borderRadius: 14, fontSize: 12, color: "var(--color-foreground)",
};
const axisTick = { fontSize: 11, fill: "var(--color-muted-foreground)" };

// Regra de status provisória (a confirmar): custo por conversa.
function statusFor(custo: number): "Positivo" | "Atenção" | "Crítico" {
  if (custo > 0 && custo <= 8) return "Positivo";
  if (custo <= 15) return "Atenção";
  return "Crítico";
}
const STATUS_CLS: Record<string, string> = {
  Positivo: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  Atenção: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  Crítico: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]",
};

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function rangeFor(period: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (parseInt(period, 10) || 30));
  return { start: ymd(start), end: ymd(end) };
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border/70">
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
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
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const { clients: clientOpts, selectedClientId, selectedClient, setSelectedClientId, loading: clientsLoading } = useClientContext();
  const metricsRequestGate = useRef(createRequestGate());
  const clientId = selectedClientId ?? "";

  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

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
    const { start, end } = rangeFor(period);
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
  }, [token, period, selectedClientId, refreshIndex, setLocation]);

  // ─── Agregações (mesma lógica da dashboard antiga) ──────────────────────────
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
    { label: "Investimento", value: brl(kpi.spend), note: "no período selecionado", accent: "text-orange-300" },
    { label: "Conversas iniciadas", value: n(kpi.conv), note: "pelo WhatsApp", accent: "text-emerald-300" },
    { label: "Custo por conversa", value: brl(kpi.custoConversa), note: "média do período", accent: "text-sky-300" },
    { label: "Taxa de resposta", value: pct(responseRate), note: "conversas respondidas", accent: "text-teal-300" },
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

  const FUNNEL = [
    { label: "Conexões por mensagem", value: kpi.connections },
    { label: "Conversas iniciadas", value: kpi.conv },
    { label: "Primeiras respostas", value: kpi.primeiras },
    { label: "Conversas respondidas", value: kpi.respondidas },
  ];
  const funnelMax = Math.max(1, ...FUNNEL.map((f) => f.value));

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
        <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-emerald-300/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> Visão de performance
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Dashboard</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe os indicadores mais importantes da unidade sem perder contexto sobre campanhas e atendimento.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Unidade selecionada</p>
            <p className="mt-1 text-sm font-medium text-foreground">{selectedClient?.name ?? "Selecione uma unidade"}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-surface/35 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground"><span>Período</span><div className="relative">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div></label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground"><span>Unidade</span><div className="relative">
            <select value={clientId} onChange={(e) => setSelectedClientId(e.target.value)} disabled={clientsLoading || clientOpts.length === 0}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
              {!clientId && <option value="">Selecione uma unidade</option>}
              {clientOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div></label>
            </div>
            <button onClick={() => setRefreshIndex((value) => value + 1)} disabled={loading || clientsLoading || !selectedClientId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar dados
            </button>
          </div>
          <p className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            {clientsLoading || loading ? "Atualizando métricas do Supabase…" : !selectedClientId ? "Selecione uma unidade para visualizar as métricas." : notSynced ? "Não há dados sincronizados no Supabase para este período." : "Dados carregados diretamente do Supabase."}
          </p>
        </section>

        {error && (
          <div className="rounded-2xl border border-[color:var(--color-destructive)]/30 bg-[color:var(--color-destructive)]/10 px-4 py-3 text-sm text-[color:var(--color-destructive)]">
            Erro ao buscar métricas: {error}
          </div>
        )}

        {dashboardState ? <DashboardState {...dashboardState} /> : <>
        <section className="overflow-hidden rounded-3xl border border-border bg-surface/25">
          <div className="flex flex-col gap-1 border-b border-border/70 px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-semibold">Resumo operacional</h2>
            <p className="text-sm text-muted-foreground">Quatro indicadores para orientar a leitura da semana.</p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            {primaryKpis.map((k) => (
              <div key={k.label} className="min-h-35 bg-background/75 p-5 sm:p-6">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{k.label}</div>
                <div className={`mt-3 font-display text-3xl font-semibold tracking-[-0.03em] ${k.accent}`}>{k.value}</div>
                <div className="mt-2 text-xs text-muted-foreground">{k.note}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/70 bg-background/45 px-5 py-4 sm:px-6">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Métricas complementares</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:grid-cols-8">
              {supportingKpis.map((k) => <div key={k.label}><p className="text-xs text-muted-foreground">{k.label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{k.value}</p></div>)}
            </div>
          </div>
        </section>

        {/* Gráficos linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Conversas iniciadas por dia">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.green} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="conversas" stroke={CHART.green} strokeWidth={3} fill="url(#gConversas)"
                  dot={{ r: 3, fill: CHART.green, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Conversas" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Investimento x Conversas">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line yAxisId="l" type="monotone" dataKey="investimento" stroke={CHART.orange} strokeWidth={3}
                  dot={{ r: 3, fill: CHART.orange, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Investimento (R$)" />
                <Line yAxisId="r" type="monotone" dataKey="conversas" stroke={CHART.green} strokeWidth={3}
                  dot={{ r: 3, fill: CHART.green, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Conversas" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Gráficos linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Custo por conversa" note="R$ por conversa iniciada">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.red} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART.orange} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v))} />
                <Area type="monotone" dataKey="custo" stroke={CHART.red} strokeWidth={3} fill="url(#gCusto)"
                  dot={{ r: 3, fill: CHART.red, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Custo/conversa" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Funil de mensagens">
            <div className="space-y-5">
              {FUNNEL.map((f, i) => {
                const funnelColors = [CHART.green, CHART.teal, CHART.blue, CHART.orange];
                const c = funnelColors[i % funnelColors.length];
                return (
                  <div key={f.label}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">{f.label}</span>
                      <span className="font-display text-lg font-semibold tracking-[-0.01em]" style={{ color: c }}>{n(f.value)}</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round((f.value / funnelMax) * 100)}%`, background: `linear-gradient(90deg, ${c}, ${c}bb)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Desempenho por campanha */}
        <Panel title="Desempenho por campanha" note="Resultados por campanha no período selecionado">
          <div className="overflow-x-auto -m-2 p-2">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-3 pr-4">Campanha</th>
                  <th className="text-right font-medium py-3 px-3">Investimento</th>
                  <th className="text-right font-medium py-3 px-3">Conversas</th>
                  <th className="text-right font-medium py-3 px-3">Custo/conversa</th>
                  <th className="text-right font-medium py-3 px-3">Leads Meta</th>
                  <th className="text-right font-medium py-3 px-3">Impressões</th>
                  <th className="text-right font-medium py-3 px-3">Cliques</th>
                  <th className="text-right font-medium py-3 px-3">CTR</th>
                  <th className="text-right font-medium py-3 px-3">CPC</th>
                  <th className="text-right font-medium py-3 px-3">CPM</th>
                  <th className="text-right font-medium py-3 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">Sem campanhas no período.</td></tr>
                ) : campaigns.map((c) => {
                  const custo = num(c.custo_por_conversa) || (num(c.total_conversas_iniciadas) > 0 ? num(c.total_spend) / num(c.total_conversas_iniciadas) : 0);
                  const st = statusFor(custo);
                  return (
                    <tr key={c.campaign_name} className="border-b border-border/50 hover:bg-surface/40 transition-colors">
                      <td className="py-3 pr-4 font-medium max-w-[280px]">{c.campaign_name}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{brl(num(c.total_spend))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{n(num(c.total_conversas_iniciadas))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{brl(custo)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{n(num(c.total_leads_meta))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{n(num(c.total_impressions))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{n(num(c.total_clicks))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{pct(num(c.avg_ctr))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{brl(num(c.avg_cpc))}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{brl(num(c.avg_cpm))}</td>
                      <td className="py-3 pl-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CLS[st]}`}>{st}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        </>}
      </div>
    </AppLayout>
  );
}
