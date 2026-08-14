import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
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
import { Download, RefreshCw, ChevronDown } from "lucide-react";

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

// ─── Fallback ilustrativo (usado só enquanto o Supabase não está configurado) ──
const FALLBACK_DAILY: DailyRow[] = [
  { date_start: "2026-06-30", total_spend: 42, total_conversas_iniciadas: 4, total_messaging_connections: 4, total_primeiras_respostas: 3, total_conversas_respondidas: 3, total_leads_meta: 0, total_impressions: 7200, total_clicks: 78, custo_por_conversa: 10.5, avg_cpc: 0.78, avg_cpm: 8.4, avg_ctr: 1.1, avg_frequency: 1.68 },
  { date_start: "2026-07-04", total_spend: 66, total_conversas_iniciadas: 15, total_messaging_connections: 15, total_primeiras_respostas: 9, total_conversas_respondidas: 9, total_leads_meta: 0, total_impressions: 9800, total_clicks: 110, custo_por_conversa: 4.4, avg_cpc: 0.6, avg_cpm: 6.2, avg_ctr: 1.0, avg_frequency: 1.68 },
  { date_start: "2026-07-10", total_spend: 96, total_conversas_iniciadas: 22, total_messaging_connections: 22, total_primeiras_respostas: 14, total_conversas_respondidas: 14, total_leads_meta: 1, total_impressions: 12400, total_clicks: 140, custo_por_conversa: 4.4, avg_cpc: 0.62, avg_cpm: 6.4, avg_ctr: 1.2, avg_frequency: 1.68 },
  { date_start: "2026-07-16", total_spend: 49, total_conversas_iniciadas: 9, total_messaging_connections: 9, total_primeiras_respostas: 6, total_conversas_respondidas: 6, total_leads_meta: 0, total_impressions: 8100, total_clicks: 90, custo_por_conversa: 5.4, avg_cpc: 0.72, avg_cpm: 7.1, avg_ctr: 1.05, avg_frequency: 1.68 },
  { date_start: "2026-07-23", total_spend: 40, total_conversas_iniciadas: 6, total_messaging_connections: 6, total_primeiras_respostas: 4, total_conversas_respondidas: 4, total_leads_meta: 0, total_impressions: 6900, total_clicks: 74, custo_por_conversa: 6.7, avg_cpc: 0.79, avg_cpm: 8.4, avg_ctr: 1.1, avg_frequency: 1.68 },
];
const FALLBACK_CAMPAIGNS: CampaignRow[] = [
  { campaign_name: "[TP] - [ENG] - [WHATS] - [CARTÃO] - [MAIO/26]", total_spend: 1117.77, total_conversas_iniciadas: 212, custo_por_conversa: 5.27, total_leads_meta: 0, total_impressions: 179701, total_clicks: 1804, avg_ctr: 1.0, avg_cpc: 0.62, avg_cpm: 6.22 },
  { campaign_name: "[TP] - [ENG] - [WHATS] - [EMPRESARIAL] - [JUNHO/26]", total_spend: 285.81, total_conversas_iniciadas: 18, custo_por_conversa: 15.88, total_leads_meta: 1, total_impressions: 25755, total_clicks: 312, avg_ctr: 1.21, avg_cpc: 0.92, avg_cpm: 11.1 },
];

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
  useEffect(() => { document.title = "Tráfego Pro — Dashboard"; }, []);

  const [period, setPeriod] = useState("30");
  const [daily, setDaily] = useState<DailyRow[]>(FALLBACK_DAILY);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(FALLBACK_CAMPAIGNS);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clients: clientOpts, selectedClientId, selectedClient, setSelectedClientId, loading: clientsLoading } = useClientContext();
  const clientId = selectedClientId ?? "";

  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  // Carrega métricas ao mudar período/cliente
  useEffect(() => {
    if (!authHeaders || !selectedClientId) {
      setDaily([]);
      setCampaigns([]);
      setLoading(false);
      return;
    }
    const { start, end } = rangeFor(period);
    const qs = buildClientMetricsQuery(start, end, selectedClientId);
    if (!qs) return;
    setLoading(true); setError(null);
    Promise.all([
      fetch(`/api/metrics/daily?${qs}`, { headers: authHeaders }).then((r) => r.json()),
      fetch(`/api/metrics/campaigns?${qs}`, { headers: authHeaders }).then((r) => r.json()),
    ])
      .then(([d, c]) => {
        const ok = d.configured !== false;
        setConfigured(ok);
        if (ok && Array.isArray(d.rows) && d.rows.length > 0) setDaily(d.rows);
        else if (ok) setDaily([]);
        if (ok && Array.isArray(c.rows)) setCampaigns(c.rows);
        if (d.error || c.error) setError(d.error || c.error);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [token, period, selectedClientId]);

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

  const KPIS = [
    { label: "Investimento total", value: brl(kpi.spend) },
    { label: "Conversas iniciadas", value: n(kpi.conv) },
    { label: "Custo por conversa", value: brl(kpi.custoConversa) },
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

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {selectedClient?.name ?? "Selecione uma unidade"}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em]">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral da performance de mídia.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          <div className="relative">
            <select value={clientId} onChange={(e) => setSelectedClientId(e.target.value)} disabled={clientsLoading || clientOpts.length === 0}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
              {!clientId && <option value="">Selecione uma unidade</option>}
              {clientOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
            <Download className="size-4" /> Baixar dados
          </button>
          <button onClick={() => setPeriod((p) => p)} disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar dados
          </button>
          <span className="text-xs text-muted-foreground">
            {clientsLoading || loading ? "Carregando…" : !selectedClientId ? "Selecione uma unidade para ver as métricas" : notSynced ? "Supabase não configurado — exibindo dados de exemplo" : "Dados sincronizados do Supabase"}
          </span>
        </div>

        {error && (
          <div className="rounded-2xl border border-[color:var(--color-destructive)]/30 bg-[color:var(--color-destructive)]/10 px-4 py-3 text-sm text-[color:var(--color-destructive)]">
            Erro ao buscar métricas: {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-border border border-border rounded-3xl overflow-hidden">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-background p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{k.label}</div>
              <div className="mt-3 font-display text-2xl md:text-[1.7rem] font-semibold tracking-[-0.02em]">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground/60">Sem período anterior</div>
            </div>
          ))}
        </div>

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
      </div>
    </AppLayout>
  );
}
