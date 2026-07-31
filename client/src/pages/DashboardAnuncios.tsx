import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Megaphone, DollarSign, MessageCircle, Coins, Target, Search, ChevronDown, ImageOff,
} from "lucide-react";

// ─── Paleta de destaque (vívida no tema escuro) ──────────────────────────────
const CHART = { green: "#22C55E", teal: "#2FD4A5", orange: "#F59E0B", red: "#EF4444", blue: "#38BDF8" };

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) setLocation("/login");
  }, [setLocation]);
}

type AdRow = {
  id: number | string;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  creative_name: string | null;
  offer_name: string | null;
  status_formatado: string | null;      // "Ativa" | "Pausada" | ...
  performance_status: string | null;    // "Excelente" | "Positivo" | "Atenção" | "Crítico" | ...
  performance_reason: string | null;
  ad_image_url: string | null;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  total_leads_meta: number | null;
  alcance: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  avg_ctr: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
  custo_por_conversa: number | null;
};

// ─── Formatação (pt-BR) ───────────────────────────────────────────────────────
const n = (v: number) => v.toLocaleString("pt-BR");
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const num = (v: number | null | undefined) => Number(v ?? 0);

// ─── Dados de exemplo (enquanto a view vw_meta_ads_offer_ads não existe) ───────
const FALLBACK_ADS: AdRow[] = [
  { id: 1, campaign_name: "[TP] - [ENG] - [WHATS] - [CARTÃO] - [MAIO/26]", adset_name: "Público frio 25-55", ad_name: "Cartão — depoimento", creative_name: "Vídeo depoimento", offer_name: "Vida Card", status_formatado: "Ativa", performance_status: "Excelente", performance_reason: "Custo por conversa abaixo de R$ 5,00.", ad_image_url: null, total_spend: 612.4, total_conversas_iniciadas: 148, total_leads_meta: 0, alcance: 42100, total_impressions: 98200, total_clicks: 990, avg_ctr: 1.01, avg_cpc: 0.62, avg_cpm: 6.24, custo_por_conversa: 4.14 },
  { id: 2, campaign_name: "[TP] - [ENG] - [WHATS] - [CARTÃO] - [MAIO/26]", adset_name: "Remarketing 7d", ad_name: "Cartão — benefícios", creative_name: "Estático benefícios", offer_name: "Vida Card", status_formatado: "Ativa", performance_status: "Positivo", performance_reason: "Custo por conversa entre R$ 5,00 e R$ 9,00.", ad_image_url: null, total_spend: 505.37, total_conversas_iniciadas: 64, total_leads_meta: 0, alcance: 31600, total_impressions: 81500, total_clicks: 814, avg_ctr: 1.0, avg_cpc: 0.62, avg_cpm: 6.2, custo_por_conversa: 7.9 },
  { id: 3, campaign_name: "[TP] - [ENG] - [WHATS] - [EMPRESARIAL] - [JUNHO/26]", adset_name: "Empresários 30-55", ad_name: "Empresarial — economia", creative_name: "Carrossel", offer_name: "Vida Card Empresarial", status_formatado: "Ativa", performance_status: "Atenção", performance_reason: "Custo por conversa entre R$ 9,00 e R$ 13,00.", ad_image_url: null, total_spend: 205.8, total_conversas_iniciadas: 18, total_leads_meta: 1, alcance: 14200, total_impressions: 22755, total_clicks: 280, avg_ctr: 1.23, avg_cpc: 0.73, avg_cpm: 9.04, custo_por_conversa: 11.43 },
  { id: 4, campaign_name: "[TP] - [ENG] - [WHATS] - [EMPRESARIAL] - [JUNHO/26]", adset_name: "Lookalike 2%", ad_name: "Empresarial — chamada direta", creative_name: "Vídeo curto", offer_name: "Vida Card Empresarial", status_formatado: "Pausada", performance_status: "Crítico", performance_reason: "Custo por conversa acima de R$ 13,00.", ad_image_url: null, total_spend: 80.0, total_conversas_iniciadas: 4, total_leads_meta: 0, alcance: 5300, total_impressions: 9800, total_clicks: 96, avg_ctr: 0.98, avg_cpc: 0.83, avg_cpm: 8.16, custo_por_conversa: 20.0 },
  { id: 5, campaign_name: "[TP] - [ENG] - [WHATS] - [CARTÃO] - [MAIO/26]", adset_name: "Interesses saúde", ad_name: "Cartão — oferta relâmpago", creative_name: "Estático oferta", offer_name: "Vida Card", status_formatado: "Ativa", performance_status: "Sem conversas", performance_reason: "Investimento registrado, mas nenhuma conversa iniciada.", ad_image_url: null, total_spend: 44.2, total_conversas_iniciadas: 0, total_leads_meta: 0, alcance: 3800, total_impressions: 7200, total_clicks: 61, avg_ctr: 0.85, avg_cpc: 0.72, avg_cpm: 6.14, custo_por_conversa: null },
];

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-popover)", border: "1px solid var(--color-border)",
  borderRadius: 14, fontSize: 12, color: "var(--color-foreground)",
};
const axisTick = { fontSize: 11, fill: "var(--color-muted-foreground)" };

// ─── Bandas de performance → cor ──────────────────────────────────────────────
const PERF_COLOR: Record<string, string> = {
  Excelente: CHART.green,
  Positivo: CHART.teal,
  Atenção: CHART.orange,
  Crítico: CHART.red,
  "Sem conversas": CHART.red,
  Residual: CHART.blue,
};
function perfColor(v: string | null) { return (v && PERF_COLOR[v]) || "var(--color-muted-foreground)"; }

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  const style = color
    ? { background: `${color}26`, color, border: `1px solid ${color}55` }
    : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${color ? "" : "bg-muted/40 text-muted-foreground border border-border"}`}
      style={style}
    >
      {children}
    </span>
  );
}
function StatusBadge({ value }: { value: string | null }) {
  if (value === "Ativa") return <Badge color={CHART.green}>Ativa</Badge>;
  if (value === "Pausada") return <Badge>Pausada</Badge>;
  return <Badge>{value ?? "—"}</Badge>;
}
function PerfBadge({ value }: { value: string | null }) {
  return <Badge color={perfColor(value)}>{value ?? "Sem classificação"}</Badge>;
}

function SafeImage({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
        <ImageOff className="size-5" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-cover" />;
}

function displayName(r: AdRow) {
  return r.ad_name || r.offer_name || r.creative_name || r.campaign_name || "Anúncio sem nome";
}

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

const STATUS_FILTERS = ["todas", "ativas", "pausadas"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const PERF_FILTERS = ["todas", "Excelente", "Positivo", "Atenção", "Crítico", "Sem conversas"] as const;
type PerfFilter = (typeof PERF_FILTERS)[number];
const SORT_OPTIONS = [
  { value: "total_spend", label: "Valor usado" },
  { value: "total_conversas_iniciadas", label: "Conversas iniciadas" },
  { value: "custo_por_conversa", label: "Custo por conversa" },
  { value: "total_leads_meta", label: "Leads Meta" },
  { value: "total_impressions", label: "Impressões" },
  { value: "avg_ctr", label: "CTR" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export default function DashboardAnunciosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Anúncios"; }, []);

  const [period, setPeriod] = useState("30");
  const [ads, setAds] = useState<AdRow[]>(FALLBACK_ADS);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [perf, setPerf] = useState<PerfFilter>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("total_spend");
  const [selectedId, setSelectedId] = useState<AdRow["id"] | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  useEffect(() => {
    if (!authHeaders) return;
    const { start, end } = rangeFor(period);
    const qs = new URLSearchParams({ start, end }).toString();
    setLoading(true); setError(null);
    fetch(`/api/metrics/ads?${qs}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => {
        const ok = d.configured !== false;
        setConfigured(ok);
        if (ok && Array.isArray(d.rows) && d.rows.length > 0) setAds(d.rows);
        else if (ok) setAds([]);
        if (d.error) setError(d.error);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [token, period]);

  const filtered = useMemo(() => {
    let r = ads;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        [x.ad_name, x.offer_name, x.creative_name, x.campaign_name, x.adset_name]
          .filter(Boolean).some((s) => s!.toLowerCase().includes(q)));
    }
    if (status === "ativas") r = r.filter((x) => x.status_formatado === "Ativa");
    if (status === "pausadas") r = r.filter((x) => x.status_formatado === "Pausada");
    if (perf !== "todas") r = r.filter((x) => x.performance_status === perf);
    return [...r].sort((a, b) => num(b[sortKey]) - num(a[sortKey]));
  }, [ads, search, status, perf, sortKey]);

  const selected = useMemo(() => filtered.find((r) => r.id === selectedId) ?? null, [filtered, selectedId]);
  const activeImages = useMemo(() => filtered.filter((r) => r.status_formatado === "Ativa" && r.ad_image_url), [filtered]);

  const totals = useMemo(() => {
    const sum = (k: keyof AdRow) => filtered.reduce((a, r) => a + num(r[k] as number), 0);
    const spend = sum("total_spend");
    const conv = sum("total_conversas_iniciadas");
    return { spend, conv, leads: sum("total_leads_meta"), custo: conv > 0 ? spend / conv : 0 };
  }, [filtered]);

  const KPIS = [
    { label: "Anúncios", value: n(filtered.length), icon: Megaphone, color: CHART.teal },
    { label: "Investimento total", value: brl(totals.spend), icon: DollarSign, color: CHART.orange },
    { label: "Conversas iniciadas", value: n(totals.conv), icon: MessageCircle, color: CHART.green },
    { label: "Custo por conversa", value: brl(totals.custo), icon: Coins, color: CHART.red },
    { label: "Leads Meta", value: n(totals.leads), icon: Target, color: CHART.blue },
  ];

  const chartData = useMemo(
    () => filtered.slice(0, 8).map((r) => ({
      name: displayName(r).length > 22 ? displayName(r).slice(0, 22) + "…" : displayName(r),
      conversas: num(r.total_conversas_iniciadas),
      perf: r.performance_status,
    })),
    [filtered],
  );

  const notSynced = configured === false;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Meta Ads</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em]">Anúncios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance por anúncio, com classificação por custo de conversa.</p>
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

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar anúncio…"
              className="w-full text-sm rounded-full border border-border bg-surface/60 pl-9 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="relative">
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="todas">Todos os status</option>
              <option value="ativas">Ativas</option>
              <option value="pausadas">Pausadas</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          <div className="relative">
            <select value={perf} onChange={(e) => setPerf(e.target.value as PerfFilter)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {PERF_FILTERS.map((p) => <option key={p} value={p}>{p === "todas" ? "Toda performance" : p}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          <div className="relative">
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Ordenar: {o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          <span className="text-xs text-muted-foreground">
            {loading ? "Carregando…" : notSynced ? "Supabase/view não configurados — exibindo dados de exemplo" : "Dados sincronizados do Supabase"}
          </span>
        </div>

        {error && (
          <div className="rounded-2xl border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 px-4 py-3 text-sm text-[color:var(--color-warning)]">
            Não foi possível carregar a view de anúncios ({error}). Rode <code>db/vw_meta_ads_offer_ads.sql</code> no Supabase.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-3xl border border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl" style={{ background: `${k.color}1f`, color: k.color }}>
                    <Icon className="size-4" />
                  </span>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{k.label}</div>
                </div>
                <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">{k.value}</div>
              </div>
            );
          })}
        </div>

        {/* Galeria de criativos ativos */}
        {activeImages.length > 0 && (
          <Panel title="Criativos ativos" note={`${activeImages.length} com imagem`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {activeImages.map((r) => (
                <div key={r.id} className="aspect-square rounded-xl overflow-hidden border border-border bg-card/60">
                  <SafeImage src={r.ad_image_url} alt={displayName(r)} />
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Gráfico: conversas por anúncio (colorido por performance) */}
        <Panel title="Conversas iniciadas por anúncio" note="Top 8 no período — cor = performance">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={70} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.25 }} />
              <Bar dataKey="conversas" radius={[6, 6, 0, 0]} name="Conversas">
                {chartData.map((d, i) => <Cell key={i} fill={perfColor(d.perf ?? null)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-3">
            {(["Excelente", "Positivo", "Atenção", "Crítico"] as const).map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: perfColor(p) }} /> {p}
              </span>
            ))}
          </div>
        </Panel>

        {/* Lista + prévia */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <Panel title="Anúncios" note={`${filtered.length} no período`}>
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum anúncio para os filtros atuais.</div>
            ) : (
              <div className="divide-y divide-border/60 -my-2">
                {filtered.map((r) => {
                  const isSel = r.id === selectedId;
                  const custo = r.custo_por_conversa;
                  return (
                    <button key={r.id} onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left py-3 flex gap-3 rounded-xl px-2 transition-colors ${isSel ? "bg-surface" : "hover:bg-surface/50"}`}>
                      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-card/60">
                        <SafeImage src={r.ad_image_url} alt={displayName(r)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" title={displayName(r)}>{displayName(r)}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <StatusBadge value={r.status_formatado} />
                          <PerfBadge value={r.performance_status} />
                        </div>
                        <div className="mt-1.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
                          <span>Conv.: <span className="text-foreground tabular-nums">{n(num(r.total_conversas_iniciadas))}</span></span>
                          <span>Valor: <span className="text-foreground tabular-nums">{brl(num(r.total_spend))}</span></span>
                          <span>Custo/conv.: <span className="text-foreground tabular-nums">{custo != null ? brl(custo) : "—"}</span></span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Prévia do anúncio">
            {!selected ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Selecione um anúncio para ver os detalhes.</div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden border border-border bg-card/60">
                  <SafeImage src={selected.ad_image_url} alt={displayName(selected)} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{displayName(selected)}</div>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <StatusBadge value={selected.status_formatado} />
                    <PerfBadge value={selected.performance_status} />
                  </div>
                  {selected.performance_reason && (
                    <p className="mt-2 text-xs text-muted-foreground">{selected.performance_reason}</p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {[
                    ["Investimento", brl(num(selected.total_spend))],
                    ["Conversas", n(num(selected.total_conversas_iniciadas))],
                    ["Custo/conversa", selected.custo_por_conversa != null ? brl(selected.custo_por_conversa) : "—"],
                    ["Leads Meta", n(num(selected.total_leads_meta))],
                    ["Impressões", n(num(selected.total_impressions))],
                    ["Cliques", n(num(selected.total_clicks))],
                    ["CTR", pct(num(selected.avg_ctr))],
                    ["CPC", brl(num(selected.avg_cpc))],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}
