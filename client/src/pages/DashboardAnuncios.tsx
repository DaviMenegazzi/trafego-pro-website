import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Tag, DollarSign, MessageCircle, Coins, Target, Search, Filter, Check,
  Sparkles, ImageOff, ArrowUpDown, Download, HelpCircle, LayoutGrid, LayoutList,
  ChevronDown, RefreshCw,
} from "lucide-react";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!localStorage.getItem("tp_token")) setLocation("/login");
  }, [setLocation]);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type AdRow = {
  id: number;
  account_id: string | null;
  date_start: string | null;
  date_stop: string | null;
  synced_at: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  creative_id: string | null;
  creative_name: string | null;
  offer_name: string | null;
  offer_status: string | null;
  status_formatado: string | null;
  performance_status: string | null;
  performance_reason: string | null;
  ad_image_url: string | null;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  total_messaging_connections: number | null;
  total_leads_meta: number | null;
  alcance: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  total_link_clicks: number | null;
  avg_ctr: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
  custo_por_conversa: number | null;
  cpl_meta: number | null;
  frequency: number | null;
};

type StatusFilter = "todas" | "ativas" | "pausadas";
type PerfFilter = "todas" | "Excelente" | "Positivo" | "Atenção" | "Crítico" | "Sem conversas" | "Residual";
type SortKey = "total_conversas_iniciadas" | "total_leads_meta" | "total_spend" | "custo_por_conversa" | "total_impressions" | "avg_ctr" | "avg_cpc" | "avg_cpm";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "total_conversas_iniciadas", label: "Conversas iniciadas" },
  { value: "total_leads_meta", label: "Leads Meta" },
  { value: "total_spend", label: "Valor usado" },
  { value: "custo_por_conversa", label: "Custo por conversa" },
  { value: "total_impressions", label: "Impressões" },
  { value: "avg_ctr", label: "CTR" },
  { value: "avg_cpc", label: "CPC" },
  { value: "avg_cpm", label: "CPM" },
];

const PERF_OPTIONS: PerfFilter[] = ["todas", "Excelente", "Positivo", "Atenção", "Crítico", "Sem conversas", "Residual"];

const PERF_EXPLANATIONS: { label: string; tone: BadgeTone; description: string }[] = [
  { label: "Excelente", tone: "success", description: "Custo por conversa abaixo de R$ 5,00." },
  { label: "Positivo", tone: "info", description: "Custo por conversa entre R$ 5,00 e R$ 9,00, com bom resultado e espaço para otimização." },
  { label: "Atenção", tone: "warning", description: "Custo por conversa entre R$ 9,00 e R$ 13,00. Precisa ser acompanhada." },
  { label: "Crítico", tone: "danger", description: "Custo por conversa acima de R$ 13,00." },
  { label: "Sem conversas", tone: "danger", description: "Houve investimento, mas nenhuma conversa foi iniciada." },
  { label: "Residual", tone: "purple", description: "Oferta sem investimento atual, mas que ainda possui conversas registradas no período." },
  { label: "Sem classificação", tone: "muted", description: "Dados insuficientes para classificar a performance." },
];

// ─── Format helpers ───────────────────────────────────────────────────────────
const n = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("pt-BR");
const brl = (v: number | null | undefined) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const num = (v: number | null | undefined) => Number(v ?? 0);
function dateBR(s: string | null | undefined) {
  if (!s) return "—";
  const parts = s.slice(0, 10).split("-");
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function dateTimeBR(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
}

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function rangeFor(period: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (parseInt(period, 10) || 30));
  return { start: ymd(start), end: ymd(end) };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function cleanDisplayName(r: AdRow): string {
  const candidates = [r.ad_name, r.offer_name, r.creative_name];
  for (const raw of candidates) {
    if (!raw) continue;
    let s = raw;
    s = s.replace(/\{\{[^}]+\}\}/g, "");
    s = s.replace(/\b[0-9a-f]{16,}\b/gi, "");
    s = s.replace(/\s{2,}/g, " ").trim();
    s = s.replace(/^[-–—:|]+|[-–—:|]+$/g, "").trim();
    if (s.length >= 3) return s;
  }
  return "Oferta sem nome";
}

type BadgeTone = "success" | "warning" | "danger" | "purple" | "muted" | "info";

function Badge({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) {
  const styles: Record<string, string> = {
    success: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] border-[color:var(--color-success)]/30",
    warning: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] border-[color:var(--color-warning)]/30",
    danger: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)] border-[color:var(--color-destructive)]/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    muted: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${styles[tone]}`}>
      {children}
    </span>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <Badge tone="muted">—</Badge>;
  if (value === "Ativa") return <Badge tone="success">Ativa</Badge>;
  if (value === "Pausada") return <Badge tone="muted">Pausada</Badge>;
  return <Badge tone="muted">{value}</Badge>;
}

function PerfBadge({ value }: { value: string | null }) {
  switch (value) {
    case "Excelente": return <Badge tone="success">Excelente</Badge>;
    case "Positivo": return <Badge tone="info">Positivo</Badge>;
    case "Atenção": return <Badge tone="warning">Atenção</Badge>;
    case "Crítico": return <Badge tone="danger">Crítico</Badge>;
    case "Sem conversas": return <Badge tone="danger">Sem conversas</Badge>;
    case "Residual": return <Badge tone="purple">Residual</Badge>;
    default: return <Badge tone="muted">Sem classificação</Badge>;
  }
}

function SafeImage({ src, alt, className, fit = "cover" }: { src: string | null; alt: string; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-card/60 border border-border text-muted-foreground text-[11px] ${className ?? ""}`}>
        <div className="flex items-center gap-1.5"><ImageOff className="size-3.5" /> Sem imagem</div>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className ?? ""}`} loading="lazy" />;
}

function KpiCard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: React.ElementType; accent?: "primary" | "success" | "warning" | "purple" }) {
  const accentCls = accent === "success" ? "text-[color:var(--color-success)]" : accent === "warning" ? "text-[color:var(--color-warning)]" : accent === "purple" ? "text-purple-400" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${accentCls}`} />
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
      </div>
      <div className={`font-display text-2xl font-semibold tracking-[-0.02em] ${accentCls}`}>{value}</div>
    </div>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: "primary" | "success" | "warning" | "purple" }) {
  const tone = accent === "success" ? "text-[color:var(--color-success)]" : accent === "warning" ? "text-[color:var(--color-warning)]" : accent === "purple" ? "text-purple-400" : accent === "primary" ? "text-foreground" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground truncate" title={value}>{value}</span>
    </div>
  );
}

function FilterPopover({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface/60 hover:bg-surface text-xs font-medium text-muted-foreground hover:text-foreground transition">
        {trigger}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-card shadow-xl p-1" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const tooltipStyle: React.CSSProperties = {
  background: "var(--color-card)", border: "1px solid var(--color-border)",
  borderRadius: 8, fontSize: 12, color: "var(--color-foreground)",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardAnunciosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Anúncios"; }, []);

  const { selectedClientId, selectedClient, loading: clientsLoading } = useClientContext();
  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  // ─── State ────────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState("30");
  const [rows, setRows] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [perfFilter, setPerfFilter] = useState<PerfFilter>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("total_conversas_iniciadas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "creative-grid">("default");

  // ─── Fetch offers ─────────────────────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    if (!authHeaders || !selectedClientId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { start, end } = rangeFor(period);
      const qs = buildClientMetricsQuery(start, end, selectedClientId);
      if (!qs) return;
      // Tenta a RPC primeiro, depois fallback para a view
      const res = await fetch(`/api/metrics/offers-rpc?${qs}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar os anúncios");
      setConfigured(data.configured !== false);
      if (Array.isArray(data.rows)) setRows(data.rows);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, period, selectedClientId]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // ─── Filtered & sorted ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((x) =>
        [x.ad_name, x.offer_name, x.creative_name, x.campaign_name, x.adset_name]
          .filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
      );
    }
    if (statusFilter === "ativas") r = r.filter((x) => x.status_formatado === "Ativa");
    if (statusFilter === "pausadas") r = r.filter((x) => x.status_formatado === "Pausada");
    if (perfFilter !== "todas") r = r.filter((x) => x.performance_status === perfFilter);
    return [...r].sort((a, b) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [rows, search, statusFilter, perfFilter, sortKey, sortDir]);

  const activeImages = useMemo(() => {
    if (viewMode !== "creative-grid") return [];
    return rows.filter((r) => r.status_formatado === "Ativa" && r.ad_image_url);
  }, [rows, viewMode]);

  // Keep valid selection
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (selectedId == null || !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => filtered.find((r) => r.id === selectedId) ?? null, [filtered, selectedId]);

  // ─── Aggregations ─────────────────────────────────────────────────────────
  const sum = (k: keyof AdRow) => filtered.reduce((acc, r) => acc + Number((r[k] as number) ?? 0), 0);
  const totalSpend = sum("total_spend");
  const totalConversas = sum("total_conversas_iniciadas");
  const totalLeads = sum("total_leads_meta");
  const custoPorConversa = totalConversas > 0 ? totalSpend / totalConversas : 0;

  const conversasChart = useMemo(() =>
    [...filtered].map((r) => ({ name: cleanDisplayName(r), value: num(r.total_conversas_iniciadas) }))
      .sort((a, b) => b.value - a.value).slice(0, 15),
    [filtered]);

  const spendChart = useMemo(() =>
    [...filtered].map((r) => ({ name: cleanDisplayName(r), value: num(r.total_spend) }))
      .sort((a, b) => b.value - a.value).slice(0, 15),
    [filtered]);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortKey)?.label ?? "Ordenar";
  const notSynced = configured === false;

  const gridToggleBtn = (
    <button type="button" onClick={() => setViewMode((v) => (v === "default" ? "creative-grid" : "default"))}
      className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition ${
        viewMode === "creative-grid" ? "border-foreground/30 bg-foreground/10 text-foreground" : "border-border bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground"
      }`}>
      {viewMode === "creative-grid" ? <LayoutList className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
      {viewMode === "creative-grid" ? "Modo normal" : "Grid de criativos"}
    </button>
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {selectedClient?.name ?? "Todos os clientes"}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em] flex items-center gap-3">
            <Tag className="size-7 text-muted-foreground" /> Anúncios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance dos anúncios e criativos.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar oferta ou anúncio"
              className="h-9 pl-9 pr-3 rounded-full border border-border bg-surface/60 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="relative">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Todo o período</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          <FilterPopover trigger={<><Filter className="size-3.5" /> Status: {statusFilter === "todas" ? "Todas" : statusFilter === "ativas" ? "Ativas" : "Pausadas"}</>}>
            {(["todas", "ativas", "pausadas"] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-surface text-left capitalize">
                <span>{s === "todas" ? "Todas" : s === "ativas" ? "Ativas" : "Pausadas"}</span>
                {statusFilter === s && <Check className="size-3.5 text-foreground" />}
              </button>
            ))}
          </FilterPopover>

          <FilterPopover trigger={<><Sparkles className="size-3.5" /> Performance: {perfFilter === "todas" ? "Todas" : perfFilter}</>}>
            {PERF_OPTIONS.map((p) => (
              <button key={p} onClick={() => setPerfFilter(p)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-surface text-left">
                <span>{p === "todas" ? "Todas" : p}</span>
                {perfFilter === p && <Check className="size-3.5 text-foreground" />}
              </button>
            ))}
          </FilterPopover>

          <FilterPopover trigger={<><ArrowUpDown className="size-3.5" /> {currentSortLabel}</>}>
            {SORT_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setSortKey(opt.value)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-surface text-left">
                <span>{opt.label}</span>
                {sortKey === opt.value && <Check className="size-3.5 text-foreground" />}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-surface text-left">
              <span>Direção</span>
              <span className="text-muted-foreground">{sortDir === "desc" ? "↓ Desc" : "↑ Asc"}</span>
            </button>
          </FilterPopover>

          <button type="button" onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-surface/60 hover:bg-surface text-xs font-medium text-muted-foreground hover:text-foreground transition">
            <HelpCircle className="size-3.5" /> Status
          </button>

          <button type="button" onClick={fetchOffers} disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>

          <span className="text-xs text-muted-foreground">
            {loading || clientsLoading ? "Carregando…" : !selectedClientId ? "Selecione uma unidade" : notSynced ? "Supabase não configurado" : `${rows.length} anúncio(s) encontrado(s)`}
          </span>
        </div>

        {error && (
          <div className="rounded-2xl border border-[color:var(--color-destructive)]/30 bg-[color:var(--color-destructive)]/10 px-4 py-3 text-sm text-[color:var(--color-destructive)]">
            Não foi possível carregar os anúncios: {error}
          </div>
        )}

        {/* ─── Creative Grid mode ─────────────────────────────────────────────── */}
        {viewMode === "creative-grid" && (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{activeImages.length} criativos ativos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Somente imagens de anúncios com status Ativa.</p>
              </div>
              {gridToggleBtn}
            </div>
            {loading && <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-sm text-muted-foreground">Carregando criativos...</div>}
            {!loading && activeImages.length === 0 && <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-sm text-muted-foreground">Nenhum criativo ativo encontrado.</div>}
            {!loading && activeImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeImages.map((r) => (
                  <div key={r.id} className="aspect-[4/5] rounded-xl overflow-hidden border border-border bg-card/60">
                    <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="contain" className="w-full h-full" />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Default mode ───────────────────────────────────────────────────── */}
        {viewMode === "default" && (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <KpiCard title="Ofertas" value={n(filtered.length)} icon={Tag} accent="primary" />
              <KpiCard title="Investimento total" value={brl(totalSpend)} icon={DollarSign} accent="purple" />
              <KpiCard title="Conversas iniciadas" value={n(totalConversas)} icon={MessageCircle} accent="success" />
              <KpiCard title="Custo por conversa" value={totalConversas > 0 ? brl(custoPorConversa) : "—"} icon={Coins} accent="warning" />
              <KpiCard title="Leads Meta" value={n(totalLeads)} icon={Target} accent="primary" />
            </section>

            {loading && <div className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">Carregando anúncios...</div>}

            {/* Split view */}
            {!loading && !error && (
              <section className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-4">
                {/* Left: list */}
                <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-sm font-semibold">Lista de anúncios</h2>
                      <span className="text-[11px] text-muted-foreground">{filtered.length} resultado(s)</span>
                    </div>
                    {gridToggleBtn}
                  </div>
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {rows.length === 0 ? "Nenhum anúncio encontrado." : "Nenhum anúncio encontrado para esse filtro."}
                    </div>
                  ) : (
                    <div className="max-h-[720px] overflow-y-auto divide-y divide-border/50">
                      {filtered.map((r) => {
                        const isSel = r.id === selectedId;
                        return (
                          <button key={r.id} onClick={() => setSelectedId(r.id)}
                            className={`w-full text-left px-3 py-3 flex gap-3 transition group ${
                              isSel ? "bg-foreground/5 border-l-2 border-foreground" : "hover:bg-surface/60 border-l-2 border-transparent"
                            }`}>
                            <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden border border-border bg-card/60">
                              <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="cover" className="w-full h-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate" title={cleanDisplayName(r)}>{cleanDisplayName(r)}</div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <StatusBadge value={r.status_formatado} />
                                <PerfBadge value={r.performance_status} />
                              </div>
                              <div className="mt-1.5 text-[11px] text-muted-foreground grid grid-cols-2 gap-x-2">
                                <span>Conv.: <span className="text-foreground">{n(r.total_conversas_iniciadas)}</span></span>
                                <span>Valor: <span className="text-foreground">{brl(r.total_spend)}</span></span>
                                <span>Custo/conv.: <span className="text-foreground">{r.custo_por_conversa != null ? brl(r.custo_por_conversa) : "—"}</span></span>
                                <span>Leads: <span className="text-foreground">{n(r.total_leads_meta)}</span></span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: preview */}
                <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-border/70">
                    <h2 className="text-sm font-semibold">Prévia do anúncio</h2>
                  </div>
                  {!selected ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">Selecione um anúncio para visualizar.</div>
                  ) : (
                    <div className="p-4 space-y-4 overflow-y-auto max-h-[800px]">
                      {/* Big creative */}
                      <div className="rounded-xl bg-background border border-border overflow-hidden">
                        <div className="w-full max-h-[420px] aspect-square sm:aspect-video flex items-center justify-center">
                          <SafeImage src={selected.ad_image_url} alt={cleanDisplayName(selected)} fit="contain" className="w-full h-full max-h-[420px]" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <InfoRow label="Nome do anúncio" value={cleanDisplayName(selected)} />
                        <InfoRow label="Oferta" value={selected.offer_name ?? "—"} />
                        <InfoRow label="Criativo" value={selected.creative_name ?? "—"} />
                        <InfoRow label="Campanha" value={selected.campaign_name ?? "—"} />
                        <InfoRow label="Conjunto" value={selected.adset_name ?? "—"} />
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-32 shrink-0">Status</span>
                          <StatusBadge value={selected.status_formatado} />
                        </div>
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <span className="text-muted-foreground w-32 shrink-0 pt-0.5">Performance</span>
                          <div className="flex flex-col gap-1 min-w-0">
                            <PerfBadge value={selected.performance_status} />
                            {selected.performance_reason && (
                              <span className="text-[11px] text-muted-foreground leading-snug">{selected.performance_reason}</span>
                            )}
                          </div>
                        </div>
                        <InfoRow label="Período" value={`${dateBR(selected.date_start)} → ${dateBR(selected.date_stop)}`} />
                        <InfoRow label="Última atualização" value={dateTimeBR(selected.synced_at)} />
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <MetricTile label="Conversas iniciadas" value={n(selected.total_conversas_iniciadas)} accent="success" />
                        <MetricTile label="Valor usado" value={brl(selected.total_spend)} accent="purple" />
                        <MetricTile label="Custo por conversa" value={selected.custo_por_conversa != null ? brl(selected.custo_por_conversa) : "—"} accent="warning" />
                        <MetricTile label="Leads Meta" value={n(selected.total_leads_meta)} />
                        <MetricTile label="CPL Meta" value={selected.cpl_meta != null ? brl(selected.cpl_meta) : "—"} />
                        <MetricTile label="Impressões" value={n(selected.total_impressions)} />
                        <MetricTile label="Alcance" value={n(selected.alcance)} />
                        <MetricTile label="Cliques" value={n(selected.total_clicks)} />
                        <MetricTile label="Cliques no link" value={n(selected.total_link_clicks)} />
                        <MetricTile label="CTR" value={pct(selected.avg_ctr)} />
                        <MetricTile label="CPC" value={brl(selected.avg_cpc)} />
                        <MetricTile label="CPM" value={brl(selected.avg_cpm)} />
                        <MetricTile label="Frequência" value={selected.frequency != null ? Number(selected.frequency).toFixed(2) : "—"} accent="primary" />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Charts */}
            {!loading && filtered.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-surface/40 p-5">
                  <h3 className="text-sm font-semibold mb-4">Conversas por anúncio</h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversasChart} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" stroke="var(--color-muted-foreground)" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)"
                          tick={{ fill: "var(--color-foreground)", fontSize: 11 }} width={160}
                          tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)} />
                        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle}
                          formatter={(v: number) => [n(v), "Conversas"]} />
                        <Bar dataKey="value" fill="var(--color-success)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-5">
                  <h3 className="text-sm font-semibold mb-4">Investimento por anúncio</h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendChart} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" stroke="var(--color-muted-foreground)" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                          tickFormatter={(v) => brl(v)} />
                        <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)"
                          tick={{ fill: "var(--color-foreground)", fontSize: 11 }} width={160}
                          tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)} />
                        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle}
                          formatter={(v: number) => [brl(v), "Investimento"]} />
                        <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}

            {/* Full table */}
            {!loading && filtered.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
                <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Dados completos dos anúncios</h3>
                  <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[1100px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left font-medium py-3 px-3">Imagem</th>
                        <th className="text-left font-medium py-3 px-3">Nome</th>
                        <th className="text-left font-medium py-3 px-3">Oferta</th>
                        <th className="text-left font-medium py-3 px-3">Status</th>
                        <th className="text-left font-medium py-3 px-3">Performance</th>
                        <th className="text-right font-medium py-3 px-3">Conversas</th>
                        <th className="text-right font-medium py-3 px-3">Investimento</th>
                        <th className="text-right font-medium py-3 px-3">Custo/conv.</th>
                        <th className="text-right font-medium py-3 px-3">Leads</th>
                        <th className="text-right font-medium py-3 px-3">Impressões</th>
                        <th className="text-right font-medium py-3 px-3">CTR</th>
                        <th className="text-right font-medium py-3 px-3">CPC</th>
                        <th className="text-right font-medium py-3 px-3">CPM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-surface/40 transition-colors cursor-pointer" onClick={() => setSelectedId(r.id)}>
                          <td className="py-2 px-3">
                            <div className="w-10 h-10 rounded overflow-hidden border border-border bg-card/60">
                              <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="cover" className="w-full h-full" />
                            </div>
                          </td>
                          <td className="py-2 px-3 max-w-[200px] truncate" title={cleanDisplayName(r)}>{cleanDisplayName(r)}</td>
                          <td className="py-2 px-3 max-w-[180px] truncate" title={r.offer_name ?? ""}>{r.offer_name ?? "—"}</td>
                          <td className="py-2 px-3"><StatusBadge value={r.status_formatado} /></td>
                          <td className="py-2 px-3"><PerfBadge value={r.performance_status} /></td>
                          <td className="py-2 px-3 text-right tabular-nums">{n(r.total_conversas_iniciadas)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{brl(r.total_spend)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{r.custo_por_conversa != null ? brl(r.custo_por_conversa) : "—"}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{n(r.total_leads_meta)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{n(r.total_impressions)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{pct(r.avg_ctr)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{brl(r.avg_cpc)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{brl(r.avg_cpm)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Help dialog */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">Como o status de performance é calculado?</h2>
            <p className="text-sm text-muted-foreground mb-4">Cada oferta recebe uma classificação automática com base no custo por conversa (CPL) do período.</p>
            <div className="space-y-3">
              {PERF_EXPLANATIONS.map((p) => (
                <div key={p.label} className="flex items-start gap-3 rounded-lg border border-border bg-surface/40 p-3">
                  <div className="shrink-0"><Badge tone={p.tone}>{p.label}</Badge></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setHelpOpen(false)} className="mt-4 w-full rounded-lg bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 transition-opacity">
              Entendi
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
