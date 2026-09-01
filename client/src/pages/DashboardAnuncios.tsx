import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { canSeeAdminFeedbacks } from "@/components/adminNavigationPolicy";
import { WeeklyCreativeExportModal } from "@/components/WeeklyCreativeExportModal";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import {
  CUSTOM_PERIOD,
  formatDashboardDateRange,
  getPresetDashboardDateRange,
  isValidDashboardDateRange,
} from "@/lib/dashboardDateRange";
import { getDashboardUnitMenuState, selectAuthorizedDashboardUnit } from "@/lib/dashboardUnitMenu";
import { AdRow, ConsolidatedAdRow, cleanDisplayName, consolidateAdsList } from "@/lib/adConsolidation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Tag, DollarSign, MessageSquare, Coins, Target, Search, Filter, Check,
  Sparkles, ImageOff, ArrowUpDown, HelpCircle, LayoutGrid, LayoutList,
  ChevronDown, RefreshCw, Building2, TrendingUp, BarChart3, Layers, CalendarRange,
  Database, Clock, AlertTriangle, Download,
} from "lucide-react";


function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!localStorage.getItem("tp_token")) setLocation("/login");
  }, [setLocation]);
}

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

const PERIOD_SHORTCUTS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

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

// ─── UI helpers ───────────────────────────────────────────────────────────────

type BadgeTone = "success" | "warning" | "danger" | "purple" | "muted" | "info";

function Badge({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    info: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    muted: "bg-white/5 text-zinc-400 border border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${styles[tone]}`}>
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
      <div className={`grid place-items-center bg-zinc-950/80 border border-white/5 text-zinc-500 text-[11px] ${className ?? ""}`}>
        <div className="flex items-center gap-1.5"><ImageOff className="size-3.5" /> Sem imagem</div>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className ?? ""}`} loading="lazy" />;
}

function KpiCard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: React.ElementType; accent?: "primary" | "success" | "warning" | "purple" }) {
  const accentCls = accent === "success" ? "text-emerald-400" : accent === "warning" ? "text-amber-400" : accent === "purple" ? "text-purple-400" : "text-zinc-100";
  const indicator = accent === "success" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : accent === "warning" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : accent === "purple" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-white/10 text-zinc-300 border-white/15";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-black/30 transition-all duration-200 hover:border-white/20 hover:bg-zinc-900/80">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
          {title}
        </span>
        <div className={`flex size-8 items-center justify-center rounded-xl border p-1.5 ${indicator}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className={`mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight ${accentCls}`}>
        {value}
      </div>
    </div>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: "primary" | "success" | "warning" | "purple" }) {
  const tone = accent === "success" ? "text-emerald-400" : accent === "warning" ? "text-amber-400" : accent === "purple" ? "text-purple-400" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-sm font-bold mt-1 font-mono ${tone}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-500 w-32 shrink-0 text-xs font-light">{label}</span>
      <span className="text-zinc-200 truncate font-medium text-xs" title={value}>{value}</span>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 14,
  fontSize: 12,
  color: "#f4f4f5",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardAnunciosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Anúncios"; }, []);

  const { clients: clientOpts, selectedClientId, selectedClient, setSelectedClientId, loading: clientsLoading } = useClientContext();
  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  // ─── Unit Filter State ────────────────────────────────────────────────────
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const unitMenu = getDashboardUnitMenuState(clientOpts, selectedClientId, clientsLoading);

  const selectUnit = (clientId: string) => {
    if (selectAuthorizedDashboardUnit(clientOpts, clientId, setSelectedClientId)) {
      setUnitMenuOpen(false);
      setUnitSearch("");
    }
  };

  // ─── Date Range State (Exact same as Dashboard) ───────────────────────────
  const [period, setPeriod] = useState("30");
  const [customRange, setCustomRange] = useState(() => getPresetDashboardDateRange("30"));
  const [draftStart, setDraftStart] = useState(customRange.start);
  const [draftEnd, setDraftEnd] = useState(customRange.end);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const activeRange = useMemo(
    () => (period === CUSTOM_PERIOD ? customRange : getPresetDashboardDateRange(period)),
    [customRange, period],
  );

  const periodLabel = useMemo(() => {
    if (period === CUSTOM_PERIOD) {
      return formatDashboardDateRange(activeRange);
    }
    return PERIOD_SHORTCUTS.find((p) => p.value === period)?.label ?? `${period} dias`;
  }, [activeRange, period]);

  function handlePeriodMenu(open: boolean) {
    if (open) {
      setDraftStart(activeRange.start);
      setDraftEnd(activeRange.end);
      setCustomRangeError(null);
    }
    setPeriodMenuOpen(open);
  }

  function selectPresetPeriod(val: string) {
    const nextRange = getPresetDashboardDateRange(val);
    setPeriod(val);
    setCustomRange(nextRange);
    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    setCustomRangeError(null);
    setPeriodMenuOpen(false);
  }

  function applyCustomRange() {
    const nextRange = { start: draftStart, end: draftEnd };
    if (!isValidDashboardDateRange(nextRange)) {
      setCustomRangeError("A data inicial não pode ser posterior à data final.");
      return;
    }
    setCustomRangeError(null);
    setCustomRange(nextRange);
    setPeriod(CUSTOM_PERIOD);
    setPeriodMenuOpen(false);
  }

  // ─── Filters & Search State ────────────────────────────────────────────────
  const [rows, setRows] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [dataSource, setDataSource] = useState<"meta_direct" | "supabase" | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [groupByCreative, setGroupByCreative] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [perfFilter, setPerfFilter] = useState<PerfFilter>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("total_conversas_iniciadas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "creative-grid">("default");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = canSeeAdminFeedbacks(storedUser);

  // Popover open states (using Radix UI Portal)
  const [statusOpen, setStatusOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);


  const [refreshIndex, setRefreshIndex] = useState(0);

  // ─── Fetch offers ─────────────────────────────────────────────────────────
  const fetchOffers = useCallback(() => {
    setRefreshIndex((v) => v + 1);
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
    const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    if (!token || !selectedClientId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { start, end } = activeRange;
    const qs = buildClientMetricsQuery(start, end, selectedClientId);
    if (!qs) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch(`/api/metrics/offers-rpc?${qs}`, { headers: authHeaders })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (!res.ok) throw new Error(data.error || "Não foi possível carregar os anúncios");
        setConfigured(data.configured !== false);
        setDataSource(data.source || null);
        setIsRateLimited(Boolean(data.rateLimited));
        setCooldownRemainingSeconds(data.cooldownRemainingSeconds ?? null);
        setLastSyncedAt(data.lastSyncedAt || null);

        if (Array.isArray(data.rows)) setRows(data.rows);
        else setRows([]);
        if (data.error) setError(data.error);
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRange.start, activeRange.end, selectedClientId, refreshIndex]);

  // ─── Filtered & sorted ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let raw = [...rows];
    let r: ConsolidatedAdRow[] = groupByCreative ? consolidateAdsList(raw) : raw;

    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((x) =>
        [x.ad_name, x.offer_name, x.creative_name, x.campaign_name, x.adset_name, ...(x.adset_names || [])]
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
  }, [rows, groupByCreative, search, statusFilter, perfFilter, sortKey, sortDir]);

  const activeImages = useMemo(() => {
    // Pega todos os anúncios ativos (da lista consolidada) que possuem imagem válida
    const consolidated = consolidateAdsList(rows);
    return consolidated.filter((r) => {
      const isAtivo = 
        r.status_formatado === "Ativa" || 
        r.offer_status === "ACTIVE" || 
        (r as any).effective_status === "ACTIVE" ||
        (r as any).status === "ACTIVE";
      return Boolean(r.ad_image_url) && isAtivo;
    });
  }, [rows]);



  // Keep valid selection without triggering re-render cascades
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId((curr) => (curr !== null ? null : curr));
      return;
    }
    setSelectedId((curr) => {
      if (curr !== null && filtered.some((r) => r.id === curr)) {
        return curr;
      }
      return filtered[0].id;
    });
  }, [filtered]);

  const selected = useMemo(() => filtered.find((r) => r.id === selectedId) ?? null, [filtered, selectedId]);

  // ─── Aggregations ─────────────────────────────────────────────────────────
  const sum = (k: keyof AdRow) => filtered.reduce((acc, r) => acc + Number((r[k] as number) ?? 0), 0);
  const totalSpend = sum("total_spend");
  const totalConversas = sum("total_conversas_iniciadas");
  const totalLeads = sum("total_leads_meta");
  const totalImpressions = sum("total_impressions");
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
    <button
      type="button"
      onClick={() => setViewMode((v) => (v === "default" ? "creative-grid" : "default"))}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-2xl border text-xs font-semibold transition-all ${
        viewMode === "creative-grid"
          ? "border-emerald-500 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/40"
          : "border-white/10 bg-zinc-950/80 hover:border-white/20 text-zinc-300 hover:text-white"
      }`}
    >
      {viewMode === "creative-grid" ? <LayoutList className="size-4" /> : <LayoutGrid className="size-4" />}
      <span>{viewMode === "creative-grid" ? "Modo Lista & Detalhes" : "Galeria de Criativos"}</span>
    </button>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1540px] space-y-4 sm:space-y-6 p-3.5 sm:p-6 lg:p-10">
        
        {/* Top Header */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Visão de Performance & Criativos</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-4xl">
              Anúncios & Criativos
            </h1>
            <p className="hidden sm:block max-w-xl text-sm leading-relaxed text-zinc-400 font-light">
              Acompanhe a performance individual dos criativos, custo por lead e detalhes operacionais das campanhas ativas.
            </p>
          </div>

          <div className="hidden sm:block rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md px-4 py-3 shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Unidade ativa</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Building2 className="size-4 text-emerald-400 shrink-0" />
              <span>{selectedClient?.name ?? "Selecione uma unidade"}</span>
            </p>
          </div>
        </div>

        {/* Status / Fallback Alert Banner */}
        {dataSource === "supabase" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-5 text-zinc-200 backdrop-blur-xl shadow-lg shadow-black/20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                  <Database className="size-4 sm:size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-amber-300 text-xs sm:text-sm tracking-tight">
                      Exibindo anúncios do Banco de Dados (Supabase)
                    </span>
                    {isRateLimited ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                        Rate limit Meta ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-sky-300 border border-sky-500/30">
                        Modo Banco
                      </span>
                    )}
                  </div>
                  <p className="hidden sm:block text-xs text-zinc-300 font-light leading-relaxed max-w-3xl">
                    {isRateLimited
                      ? "A Meta Graph API atingiu o limite temporário de requisições. Para manter a visualização de criativos 100% disponível, os dados foram carregados diretamente do banco de dados."
                      : "Os dados de anúncios estão sendo carregados a partir do banco de dados oficial do Supabase."}
                  </p>
                  {lastSyncedAt && (
                    <p className="text-[11px] sm:text-xs text-amber-200/90 flex items-center gap-1.5 pt-0.5 font-mono">
                      <Clock className="size-3 text-amber-400 shrink-0" />
                      <span>Última atualização: <strong>{new Date(lastSyncedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:text-right shrink-0 rounded-xl bg-zinc-950/70 border border-white/10 px-3 py-2 sm:p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block sm:mb-1">Retorno ao vivo:</span>
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 ml-2 sm:ml-0">
                  <RefreshCw className={`size-3 text-amber-400 ${isRateLimited ? "animate-spin" : ""}`} />
                  {isRateLimited && cooldownRemainingSeconds && cooldownRemainingSeconds > 0
                    ? `Em ~${Math.max(1, Math.ceil(cooldownRemainingSeconds / 60))} min`
                    : "No próximo carregamento"}
                </span>
              </div>
            </div>
          </div>
        )}

        {dataSource === "meta_direct" && !isRateLimited && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs text-emerald-300 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-medium">Dados de anúncios sincronizados em tempo real via Meta Graph API</span>
            </div>
            {lastSyncedAt && (
              <span className="text-[11px] text-emerald-400/70 font-mono hidden sm:inline">
                Sincronizado às {new Date(lastSyncedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {/* Filter Control Deck */}
        <section className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-black/30">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar anúncio ou oferta…"
                className="h-11 pl-9 pr-4 rounded-2xl border border-white/10 bg-zinc-950/80 text-xs text-white placeholder:text-zinc-500 w-56 sm:w-64 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Exact Date Range Filter from Dashboard */}
            <Popover open={periodMenuOpen} onOpenChange={handlePeriodMenu}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Selecionar período das métricas"
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-left text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <CalendarRange className="size-4 text-emerald-400" />
                  <span className="max-w-52 truncate">{periodLabel}</span>
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl z-50">
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
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-left text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Building2 className="size-4 text-emerald-400" />
                  <span className="max-w-52 truncate">{unitMenu.label}</span>
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl z-50">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="font-display text-base font-bold">Unidades disponíveis</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Selecione a unidade para filtrar os anúncios.</p>
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

            {/* Status Filter (with Radix Popover Portal) */}
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <Filter className="size-3.5 text-emerald-400" />
                  <span>Status: {statusFilter === "todas" ? "Todas" : statusFilter === "ativas" ? "Ativas" : "Pausadas"}</span>
                  <ChevronDown className="size-3 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 rounded-3xl border border-white/10 bg-zinc-950/95 p-2 text-white shadow-2xl backdrop-blur-2xl z-50">
                {(["todas", "ativas", "pausadas"] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setStatusOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs hover:bg-white/5 text-left capitalize transition"
                  >
                    <span className={statusFilter === s ? "text-emerald-400 font-semibold" : "text-zinc-300"}>
                      {s === "todas" ? "Todas as ofertas" : s === "ativas" ? "Apenas ativas" : "Apenas pausadas"}
                    </span>
                    {statusFilter === s && <Check className="size-3.5 text-emerald-400" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Performance Filter (with Radix Popover Portal) */}
            <Popover open={perfOpen} onOpenChange={setPerfOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <Sparkles className="size-3.5 text-emerald-400" />
                  <span>Performance: {perfFilter === "todas" ? "Todas" : perfFilter}</span>
                  <ChevronDown className="size-3 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 rounded-3xl border border-white/10 bg-zinc-950/95 p-2 text-white shadow-2xl backdrop-blur-2xl z-50">
                {PERF_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPerfFilter(p);
                      setPerfOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs hover:bg-white/5 text-left transition"
                  >
                    <span className={perfFilter === p ? "text-emerald-400 font-semibold" : "text-zinc-300"}>
                      {p === "todas" ? "Todas as classificações" : p}
                    </span>
                    {perfFilter === p && <Check className="size-3.5 text-emerald-400" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Sorting Filter (with Radix Popover Portal) */}
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <ArrowUpDown className="size-3.5 text-emerald-400" />
                  <span>{currentSortLabel}</span>
                  <ChevronDown className="size-3 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-60 rounded-3xl border border-white/10 bg-zinc-950/95 p-2 text-white shadow-2xl backdrop-blur-2xl z-50">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortKey(opt.value);
                      setSortOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs hover:bg-white/5 text-left transition"
                  >
                    <span className={sortKey === opt.value ? "text-emerald-400 font-semibold" : "text-zinc-300"}>
                      {opt.label}
                    </span>
                    {sortKey === opt.value && <Check className="size-3.5 text-emerald-400" />}
                  </button>
                ))}
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs hover:bg-white/5 text-left text-zinc-400 hover:text-white transition"
                >
                  <span>Ordem</span>
                  <span className="font-semibold text-emerald-400">{sortDir === "desc" ? "↓ Decrescente" : "↑ Crescente"}</span>
                </button>
              </PopoverContent>
            </Popover>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-all"
            >
              <HelpCircle className="size-3.5 text-zinc-400" />
              <span>Legenda</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchOffers}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-400/80" />
              <span>
                {loading || clientsLoading
                  ? "Carregando anúncios da unidade…"
                  : !selectedClientId
                  ? "Selecione uma unidade para consultar os criativos."
                  : notSynced
                  ? "Nenhuma sincronização encontrada para o período."
                  : `${filtered.length} ${groupByCreative ? "criativo(s) consolidado(s)" : "anúncio(s)"} localizado(s)`}
              </span>
            </div>

            {/* View Mode & Grouping Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
                  title="Gerar card executivo de criativos em alta resolução para enviar no WhatsApp"
                >
                  <Download className="size-4" />
                  <span>Exportar Card WhatsApp (HD)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setGroupByCreative((g) => !g)}
                className={`inline-flex items-center gap-1.5 h-11 px-3.5 rounded-2xl border text-xs font-semibold transition-all ${
                  groupByCreative
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-sm"
                    : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:text-white"
                }`}
                title="Consolidar anúncios com o mesmo criativo rodando em múltiplos conjuntos"
              >
                <Layers className="size-3.5" />
                <span>{groupByCreative ? "Consolidado por Criativo" : "Exibir por Conjunto"}</span>
              </button>
              <div>{gridToggleBtn}</div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Não foi possível carregar os anúncios: {error}
          </div>
        )}

        {/* ─── Creative Grid mode ─────────────────────────────────────────────── */}
        {viewMode === "creative-grid" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-400" />
                  <span>{activeImages.length} Criativos Ativos</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-light">Imagens em veiculação nas campanhas ativas da unidade.</p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-950/30"
                >
                  <Download className="size-3.5" />
                  <span>Baixar / Copiar Card HD</span>
                </button>
              )}
            </div>


            {loading && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-12 text-center text-sm text-zinc-400">
                <RefreshCw className="size-5 animate-spin mx-auto text-emerald-400 mb-2" />
                Carregando criativos…
              </div>
            )}

            {!loading && activeImages.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/20 p-12 text-center text-sm text-zinc-500">
                Nenhum criativo ativo com imagem encontrado para os filtros atuais.
              </div>
            )}

            {!loading && activeImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeImages.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id);
                      setViewMode("default");
                    }}
                    className="group aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-950/80 relative cursor-pointer transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/30"
                  >
                    <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="contain" className="w-full h-full p-2 transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3.5 pt-8">
                      <p className="text-xs font-semibold text-white truncate">{cleanDisplayName(r)}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{n(r.total_conversas_iniciadas)} conv.</span>
                        <span className="text-[10px] text-zinc-400">· {brl(r.total_spend)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Default mode ───────────────────────────────────────────────────── */}
        {viewMode === "default" && (
          <>

            {loading && (
              <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
                <RefreshCw className="size-5 animate-spin mx-auto text-emerald-400 mb-2" />
                Carregando dados dos anúncios…
              </div>
            )}

            {/* Split view */}
            {!loading && !error && (
              <section className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6">
                
                {/* Left: list */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl overflow-hidden flex flex-col shadow-xl shadow-black/30">
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.015]">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="font-display text-sm font-bold text-white">Lista de Anúncios</h2>
                      <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                        {filtered.length}
                      </span>
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="p-10 text-center text-xs text-zinc-500 font-light">
                      {rows.length === 0 ? "Nenhum anúncio cadastrado." : "Nenhum anúncio localizado para estes filtros."}
                    </div>
                  ) : (
                    <div className="max-h-[750px] overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
                      {filtered.map((r) => {
                        const isSel = r.id === selectedId;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelectedId(r.id)}
                            className={`w-full text-left p-3 rounded-2xl flex gap-3.5 transition-all duration-200 group ${
                              isSel
                                ? "bg-emerald-500/10 border border-emerald-500/30 shadow-md shadow-emerald-950/20"
                                : "hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            <div className="shrink-0 size-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 p-1">
                              <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="cover" className="w-full h-full rounded-xl" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-emerald-300 transition" title={cleanDisplayName(r)}>
                                {cleanDisplayName(r)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <StatusBadge value={r.status_formatado} />
                                <PerfBadge value={r.performance_status} />
                                {r.ad_count && r.ad_count > 1 ? (
                                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                                    {r.ad_count} conjuntos
                                  </span>
                                ) : r.adset_name ? (
                                  <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono text-zinc-400 truncate max-w-28" title={r.adset_name}>
                                    {r.adset_name}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 text-[11px] text-zinc-400 grid grid-cols-2 gap-x-2 font-mono">
                                <span>Conv: <span className="text-emerald-400 font-bold">{n(r.total_conversas_iniciadas)}</span></span>
                                <span>Gasto: <span className="text-zinc-200">{brl(r.total_spend)}</span></span>
                                <span>Custo/c: <span className="text-zinc-200">{r.custo_por_conversa != null ? brl(r.custo_por_conversa) : "—"}</span></span>
                                <span>Leads: <span className="text-zinc-200">{n(r.total_leads_meta)}</span></span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: preview */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl overflow-hidden flex flex-col shadow-xl shadow-black/30">
                  <div className="px-5 py-4 border-b border-white/10 bg-white/[0.015]">
                    <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-400" />
                      <span>Prévia & Detalhes do Anúncio</span>
                    </h2>
                  </div>

                  {!selected ? (
                    <div className="p-16 text-center text-xs text-zinc-500 font-light">
                      Selecione um anúncio ao lado para visualizar os detalhes e o criativo.
                    </div>
                  ) : (
                    <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[800px]">
                      {/* Creative Image Preview */}
                      <div className="rounded-3xl bg-zinc-950/80 border border-white/10 p-2 overflow-hidden shadow-inner flex items-center justify-center">
                        <div className="w-full max-h-[400px] aspect-square sm:aspect-video flex items-center justify-center">
                          <SafeImage src={selected.ad_image_url} alt={cleanDisplayName(selected)} fit="contain" className="w-full h-full max-h-[400px] rounded-2xl" />
                        </div>
                      </div>

                      {/* Info Metadata */}
                      <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                        <InfoRow label="Nome do anúncio" value={cleanDisplayName(selected)} />
                        <InfoRow label="Oferta comercial" value={selected.offer_name ?? "—"} />
                        <InfoRow label="Criativo" value={selected.creative_name ?? "—"} />
                        <InfoRow label="Campanha Meta" value={selected.campaign_name ?? "—"} />
                        <InfoRow
                          label="Conjunto(s) de Anúncios"
                          value={selected.adset_names && selected.adset_names.length > 0 ? selected.adset_names.join(" · ") : selected.adset_name ?? "—"}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 w-32 shrink-0 text-xs font-light">Status</span>
                          <StatusBadge value={selected.status_formatado} />
                        </div>
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <span className="text-zinc-500 w-32 shrink-0 pt-0.5 text-xs font-light">Classificação</span>
                          <div className="flex flex-col gap-1 min-w-0">
                            <PerfBadge value={selected.performance_status} />
                            {selected.performance_reason && (
                              <span className="text-[11px] text-zinc-400 leading-snug">{selected.performance_reason}</span>
                            )}
                          </div>
                        </div>
                        <InfoRow label="Período sincronizado" value={`${dateBR(selected.date_start)} → ${dateBR(selected.date_stop)}`} />
                        <InfoRow label="Última atualização" value={dateTimeBR(selected.synced_at)} />
                      </div>

                      {/* Detailed Metric Tiles Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        <MetricTile label="Conversas iniciadas" value={n(selected.total_conversas_iniciadas)} accent="success" />
                        <MetricTile label="Valor investido" value={brl(selected.total_spend)} accent="warning" />
                        <MetricTile label="Custo por conversa" value={selected.custo_por_conversa != null ? brl(selected.custo_por_conversa) : "—"} accent="warning" />
                        <MetricTile label="Leads Meta" value={n(selected.total_leads_meta)} />
                        <MetricTile label="CPL Meta" value={selected.cpl_meta != null ? brl(selected.cpl_meta) : "—"} />
                        <MetricTile label="Impressões" value={n(selected.total_impressions)} />
                        <MetricTile label="Alcance" value={n(selected.alcance)} />
                        <MetricTile label="Cliques no link" value={n(selected.total_link_clicks)} />
                        <MetricTile label="CTR" value={pct(selected.avg_ctr)} />
                        <MetricTile label="CPC" value={brl(selected.avg_cpc)} />
                        <MetricTile label="CPM" value={brl(selected.avg_cpm)} />
                        <MetricTile label="Frequência" value={selected.frequency != null ? Number(selected.frequency).toFixed(2) : "—"} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Charts Section */}
            {!loading && filtered.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-xl shadow-black/30">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="size-4 text-emerald-400" />
                    <h3 className="font-display text-sm font-bold text-white">Conversas por Anúncio (Top 15)</h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversasChart} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#71717a"
                          tick={{ fill: "#d4d4d8", fontSize: 11 }}
                          width={160}
                          tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                        />
                        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle} formatter={(v: number) => [n(v), "Conversas"]} />
                        <Bar dataKey="value" fill="#10B981" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-xl shadow-black/30">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="size-4 text-purple-400" />
                    <h3 className="font-display text-sm font-bold text-white">Investimento por Anúncio (Top 15)</h3>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendChart} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => brl(v)} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#71717a"
                          tick={{ fill: "#d4d4d8", fontSize: 11 }}
                          width={160}
                          tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                        />
                        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={tooltipStyle} formatter={(v: number) => [brl(v), "Investimento"]} />
                        <Bar dataKey="value" fill="#A855F7" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}

            {/* Full Data Table */}
            {!loading && filtered.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/30">
                <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between bg-white/[0.015]">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-emerald-400" />
                    <h3 className="font-display text-sm font-bold text-white">Dados Consolidados dos Anúncios</h3>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">{filtered.length} registro(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[1100px]">
                    <thead>
                      <tr className="text-zinc-400 border-b border-white/10">
                        <th className="text-left font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Imagem</th>
                        <th className="text-left font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Nome</th>
                        <th className="text-left font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Oferta</th>
                        <th className="text-left font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Status</th>
                        <th className="text-left font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Classificação</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Conversas</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Investimento</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Custo/conv</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Leads</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">Impressões</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CTR</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CPC</th>
                        <th className="text-right font-semibold py-3.5 px-3 text-[11px] uppercase tracking-wider">CPM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                          onClick={() => setSelectedId(r.id)}
                        >
                          <td className="py-2.5 px-3">
                            <div className="size-11 rounded-xl overflow-hidden border border-white/10 bg-zinc-950 p-0.5">
                              <SafeImage src={r.ad_image_url} alt={cleanDisplayName(r)} fit="cover" className="w-full h-full rounded-lg" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px] truncate font-semibold text-zinc-200" title={cleanDisplayName(r)}>
                            {cleanDisplayName(r)}
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px] truncate text-zinc-400" title={r.offer_name ?? ""}>
                            {r.offer_name ?? "—"}
                          </td>
                          <td className="py-2.5 px-3"><StatusBadge value={r.status_formatado} /></td>
                          <td className="py-2.5 px-3"><PerfBadge value={r.performance_status} /></td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono font-semibold text-emerald-400">{n(r.total_conversas_iniciadas)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-300">{brl(r.total_spend)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-300">{r.custo_por_conversa != null ? brl(r.custo_por_conversa) : "—"}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-400">{n(r.total_leads_meta)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-400">{n(r.total_impressions)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-300">{pct(r.avg_ctr)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-400">{brl(r.avg_cpc)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-mono text-zinc-400">{brl(r.avg_cpm)}</td>
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

      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setHelpOpen(false)}>
          <div className="bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold text-white mb-1">Como a performance é calculada?</h2>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Cada oferta recebe uma classificação automática baseada no custo por conversa (CPL) registrado no período selecionado.
            </p>
            <div className="space-y-2.5">
              {PERF_EXPLANATIONS.map((p) => (
                <div key={p.label} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-3">
                  <div className="shrink-0"><Badge tone={p.tone}>{p.label}</Badge></div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">{p.description}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="mt-6 w-full rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-all"
            >
              Fechar Legenda
            </button>
          </div>
        </div>
      )}

      {/* Weekly Creative Export Modal (Admin Only) */}
      {isAdmin && (
        <WeeklyCreativeExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          unitName={selectedClient?.name ?? "Todas as Unidades"}
          periodLabel={periodLabel}
          creatives={rows.filter((r) => {
            const isAtivo = 
              r.status_formatado === "Ativa" || 
              r.offer_status === "ACTIVE" || 
              (r as any).effective_status === "ACTIVE" ||
              (r as any).status === "ACTIVE";
            return Boolean(r.ad_image_url) && isAtivo;
          })}
          kpis={{
            totalLeads,
            totalConversas,
            totalSpend,
            totalImpressions,
            custoPorConversa,
          }}
        />
      )}
    </AppLayout>
  );
}


