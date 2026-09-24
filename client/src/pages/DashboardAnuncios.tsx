import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { canSeeAdminFeedbacks } from "@/components/adminNavigationPolicy";
import { WeeklyCreativeExportModal } from "@/components/WeeklyCreativeExportModal";
import {
  Button, DateRangePicker, EmptyState, IconButton, InlineNotice, Input, MenuButton, Page, PageHeader, Popover, SegmentedControl,
  Select, Sheet, StatusBadge, Surface, SurfaceHeader, SwitchField, type BadgeTone,
} from "@/components/ds";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import { CUSTOM_PERIOD, formatDashboardDateRange, getPresetDashboardDateRange } from "@/lib/dashboardDateRange";
import { AdRow, ConsolidatedAdRow, cleanDisplayName, consolidateAdsList, filterActiveCreativesWithConversations } from "@/lib/adConsolidation";
import { CHART, CHART_CHROME, chartAxisTick, chartTooltipStyle } from "@/lib/chartPalette";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";
import {
  ArrowDownWideNarrow, ArrowUpNarrowWide, Database, Download, HelpCircle, Image as ImageIcon, RefreshCw, Search, SlidersHorizontal, AlertTriangle,
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
type ViewMode = "lista" | "tabela" | "galeria";
type PeriodValue = "7" | "30" | "90" | typeof CUSTOM_PERIOD;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "total_conversas_iniciadas", label: "Conversas iniciadas" },
  { value: "total_leads_meta", label: "Leads Meta" },
  { value: "total_spend", label: "Valor investido" },
  { value: "custo_por_conversa", label: "Custo por conversa" },
  { value: "total_impressions", label: "Impressões" },
  { value: "avg_ctr", label: "CTR" },
  { value: "avg_cpc", label: "CPC" },
  { value: "avg_cpm", label: "CPM" },
];

const PERF_OPTIONS: { value: PerfFilter; label: string }[] = [
  { value: "todas", label: "Todas as classificações" },
  { value: "Excelente", label: "Excelente" },
  { value: "Positivo", label: "Positivo" },
  { value: "Atenção", label: "Atenção" },
  { value: "Crítico", label: "Crítico" },
  { value: "Sem conversas", label: "Sem conversas" },
  { value: "Residual", label: "Residual" },
];

const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];
const PERIOD_LABEL: Record<string, string> = { "7": "últimos 7 dias", "30": "últimos 30 dias", "90": "últimos 90 dias" };

const PERF_TONE: Record<string, BadgeTone> = {
  Excelente: "good",
  Positivo: "info",
  Atenção: "warning",
  Crítico: "critical",
  "Sem conversas": "critical",
  Residual: "neutral",
};

const PERF_EXPLANATIONS: { label: string; description: string }[] = [
  { label: "Excelente", description: "Custo por conversa abaixo de R$ 5,00." },
  { label: "Positivo", description: "Entre R$ 5,00 e R$ 9,00: bom resultado, com espaço para otimizar." },
  { label: "Atenção", description: "Entre R$ 9,00 e R$ 13,00: precisa ser acompanhado." },
  { label: "Crítico", description: "Acima de R$ 13,00." },
  { label: "Sem conversas", description: "Houve investimento, mas nenhuma conversa começou." },
  { label: "Residual", description: "Sem investimento atual, mas com conversas registradas no período." },
];

// ─── Formatação ───────────────────────────────────────────────────────────────
const n = (v: number | null | undefined) => formatNumber(v);
const brl = (v: number | null | undefined) => formatCurrency(v);
const pct = (v: number | null | undefined) => formatPercent(v, 2);
const num = (v: number | null | undefined) => Number(v ?? 0);

function PerfBadge({ value }: { value: string | null }) {
  if (!value) return <StatusBadge tone="neutral">Sem classificação</StatusBadge>;
  return <StatusBadge tone={PERF_TONE[value] ?? "neutral"}>{value}</StatusBadge>;
}

function AdStatus({ value }: { value: string | null }) {
  if (value === "Ativa") return <StatusBadge tone="good" dot>Ativa</StatusBadge>;
  if (value === "Pausada") return <StatusBadge tone="neutral">Pausada</StatusBadge>;
  return <StatusBadge tone="neutral">{value ?? "—"}</StatusBadge>;
}

/** Miniatura do criativo; sem imagem, mostra a inicial da oferta (em vez de "Sem imagem" repetido). */
function Thumb({ row, className, fit = "cover" }: { row: AdRow; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [row.ad_image_url]);
  if (!row.ad_image_url || failed) {
    const initial = (row.offer_name || cleanDisplayName(row) || "?").trim().charAt(0).toUpperCase();
    return (
      <div className={cn("flex items-center justify-center rounded-lg bg-white/[0.05] font-display font-semibold text-zinc-500", className)} aria-hidden>
        {initial}
      </div>
    );
  }
  return (
    <img
      src={row.ad_image_url}
      alt={cleanDisplayName(row)}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-lg bg-zinc-950", fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}

function AdDetail({ ad }: { ad: ConsolidatedAdRow }) {
  const metrics: [string, string][] = [
    ["Conversas iniciadas", n(ad.total_conversas_iniciadas)],
    ["Valor investido", brl(ad.total_spend)],
    ["Custo por conversa", ad.custo_por_conversa != null ? brl(ad.custo_por_conversa) : "—"],
    ["Leads Meta", n(ad.total_leads_meta)],
    ["CPL Meta", ad.cpl_meta != null ? brl(ad.cpl_meta) : "—"],
    ["Impressões", n(ad.total_impressions)],
    ["Alcance", n(ad.alcance)],
    ["Cliques no link", n(ad.total_link_clicks)],
    ["CTR", pct(ad.avg_ctr)],
    ["CPC", brl(ad.avg_cpc)],
    ["CPM", brl(ad.avg_cpm)],
    ["Frequência", ad.frequency != null ? formatNumber(ad.frequency, 2) : "—"],
  ];
  const info: [string, React.ReactNode][] = [
    ["Oferta", ad.offer_name ?? "—"],
    ["Criativo", ad.creative_name ?? "—"],
    ["Campanha", ad.campaign_name ?? "—"],
    ["Conjunto(s)", ad.adset_names && ad.adset_names.length > 0 ? ad.adset_names.join(" · ") : ad.adset_name ?? "—"],
    ["Período", `${formatDate(ad.date_start)} a ${formatDate(ad.date_stop)}`],
    ["Atualizado em", formatDateTime(ad.synced_at)],
  ];
  return (
    <div className="space-y-5">
      {ad.ad_image_url && (
        <div className="flex max-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-950/80 p-2">
          <Thumb row={ad} fit="contain" className="max-h-[340px] w-full" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <AdStatus value={ad.status_formatado} />
        <PerfBadge value={ad.performance_status} />
        {ad.ad_count && ad.ad_count > 1 ? <StatusBadge tone="neutral" dot={false}>{ad.ad_count} conjuntos</StatusBadge> : null}
      </div>
      {ad.performance_reason && <p className="text-sm text-zinc-400">{ad.performance_reason}</p>}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-xs text-zinc-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid gap-x-6 gap-y-2.5 border-t border-white/[0.06] pt-4 text-sm sm:grid-cols-[8rem_1fr]">
        {info.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="min-w-0 break-words text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PerfLegend() {
  return (
    <Popover
      align="start"
      className="w-80 p-0"
      trigger={<IconButton label="Como a classificação é calculada" icon={<HelpCircle />} />}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-medium text-white">Como a classificação é calculada</p>
        <p className="mt-0.5 text-xs text-zinc-400">Pelo custo por conversa de cada oferta no período.</p>
      </div>
      <ul className="space-y-2.5 p-4">
        {PERF_EXPLANATIONS.map((p) => (
          <li key={p.label} className="flex items-start gap-2.5 text-sm">
            <span className="shrink-0"><PerfBadge value={p.label} /></span>
            <span className="text-zinc-400">{p.description}</span>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

export default function DashboardAnunciosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Anúncios"; }, []);

  const { selectedClientId, selectedClient, loading: clientsLoading } = useClientContext();

  const [period, setPeriod] = useState<PeriodValue>("30");
  const [customRange, setCustomRange] = useState(() => getPresetDashboardDateRange("30"));
  const activeRange = useMemo(
    () => (period === CUSTOM_PERIOD ? customRange : getPresetDashboardDateRange(period)),
    [customRange, period],
  );
  const periodLabel = period === CUSTOM_PERIOD ? formatDashboardDateRange(activeRange) : PERIOD_LABEL[period] ?? `${period} dias`;

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = canSeeAdminFeedbacks(storedUser);

  const [refreshIndex, setRefreshIndex] = useState(0);
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

  // ─── Filtros e ordenação ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const raw = [...rows];
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

  // Mantém uma seleção válida sem cascata de renderizações
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId((curr) => (curr !== null ? null : curr));
      return;
    }
    setSelectedId((curr) => {
      if (curr !== null && filtered.some((r) => r.id === curr)) return curr;
      return filtered[0].id;
    });
  }, [filtered]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? activeImages.find((r) => r.id === selectedId) ?? null,
    [filtered, activeImages, selectedId],
  );

  // ─── Totais ───────────────────────────────────────────────────────────────
  const sum = (k: keyof AdRow) => filtered.reduce((acc, r) => acc + Number((r[k] as number) ?? 0), 0);
  const totalSpend = sum("total_spend");
  const totalConversas = sum("total_conversas_iniciadas");
  const totalLeads = sum("total_leads_meta");
  const totalImpressions = sum("total_impressions");
  const custoPorConversa = totalConversas > 0 ? totalSpend / totalConversas : 0;

  // Um gráfico só, com a métrica que a tela compara: custo por conversa dos
  // 15 anúncios com mais investimento (rótulo direto na ponta da barra).
  const costChart = useMemo(
    () =>
      [...filtered]
        .filter((r) => num(r.total_conversas_iniciadas) > 0)
        .sort((a, b) => num(b.total_spend) - num(a.total_spend))
        .slice(0, 15)
        .map((r) => ({ name: cleanDisplayName(r), value: num(r.custo_por_conversa) || num(r.total_spend) / Math.max(1, num(r.total_conversas_iniciadas)) }))
        .sort((a, b) => b.value - a.value),
    [filtered],
  );

  const openDetail = (id: number, inSheet: boolean) => {
    setSelectedId(id);
    if (inSheet) setDetailOpen(true);
  };
  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const activeFilterCount = (statusFilter !== "todas" ? 1 : 0) + (perfFilter !== "todas" ? 1 : 0) + (groupByCreative ? 0 : 1);
  const countLabel = `${formatNumber(filtered.length)} ${groupByCreative ? (filtered.length === 1 ? "criativo" : "criativos") : filtered.length === 1 ? "anúncio" : "anúncios"}`;

  const filterControls = (layout: "inline" | "stacked") => (
    <div className={cn(layout === "inline" ? "flex flex-wrap items-center gap-2" : "space-y-4 p-4")}>
      <SegmentedControl
        aria-label="Status"
        value={statusFilter}
        onValueChange={setStatusFilter}
        fullWidth={layout === "stacked"}
        options={[{ value: "todas", label: "Todas" }, { value: "ativas", label: "Ativas" }, { value: "pausadas", label: "Pausadas" }]}
      />
      <div className="flex items-center gap-1">
        <Select aria-label="Classificação" value={perfFilter} onValueChange={(v) => setPerfFilter(v as PerfFilter)} options={PERF_OPTIONS} className={layout === "inline" ? "w-56" : "flex-1"} />
        <PerfLegend />
      </div>
      <div className="flex items-center gap-1">
        <Select aria-label="Ordenar por" value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)} options={SORT_OPTIONS.map((o) => ({ value: o.value, label: `Ordenar: ${o.label}` }))} className={layout === "inline" ? "w-[17rem]" : "flex-1"} />
        <IconButton
          label={sortDir === "desc" ? "Ordem decrescente (clique para inverter)" : "Ordem crescente (clique para inverter)"}
          icon={sortDir === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
        />
      </div>
      {layout === "stacked" && (
        <SwitchField id="agrupar-criativo-m" label="Agrupar por criativo" description="Soma anúncios com a mesma peça em conjuntos diferentes." checked={groupByCreative} onCheckedChange={setGroupByCreative} />
      )}
    </div>
  );

  const bodyState = clientsLoading || (loading && rows.length === 0)
    ? <Surface><EmptyState title="Carregando anúncios da unidade…" /></Surface>
    : !selectedClientId
      ? <Surface><EmptyState title="Selecione uma unidade" description="Escolha a unidade no menu para ver os criativos." /></Surface>
      : error && rows.length === 0
        ? <Surface><EmptyState title="Não conseguimos buscar os anúncios" description="Isso não significa que não houve veiculação. Tente de novo em instantes." action={<Button size="sm" onClick={fetchOffers}><RefreshCw />Tentar de novo</Button>} /></Surface>
        : configured === false || rows.length === 0
          ? <Surface><EmptyState title="Nenhum anúncio no período" description="Não há anúncios sincronizados para a unidade no período escolhido." /></Surface>
          : null;

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Anúncios"
          subtitle={`${selectedClient?.name ?? "Nenhuma unidade selecionada"} · ${periodLabel}`}
          actions={
            <>
              {lastSyncedAt && !loading && <span className="hidden text-xs text-zinc-500 sm:inline">Atualizado às {formatTime(lastSyncedAt)}</span>}
              <IconButton label="Atualizar anúncios" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={fetchOffers} disabled={loading || !selectedClientId} />
              {isAdmin && (
                <MenuButton
                  label="Exportar"
                  icon={<Download />}
                  disabled={loading || rows.length === 0}
                  items={[{ label: "Imagem de criativos para WhatsApp", hint: "Criativos ativos com conversas", icon: <ImageIcon />, onSelect: () => setExportModalOpen(true) }]}
                />
              )}
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl aria-label="Período" value={period} onValueChange={setPeriod} options={PERIOD_OPTIONS} />
            <DateRangePicker
              aria-label="Período personalizado"
              value={period === CUSTOM_PERIOD ? customRange : { start: "", end: "" }}
              onChange={(range) => { setCustomRange(range); setPeriod(CUSTOM_PERIOD); }}
              placeholder="Personalizado"
              max={getPresetDashboardDateRange("1").end}
              className={cn("w-auto", period === CUSTOM_PERIOD && "border-emerald-500/40")}
            />
          </div>
        </PageHeader>

        {dataSource === "supabase" && !loading && (
          <InlineNotice tone="warning" icon={<Database />}>
            {isRateLimited
              ? `Mostrando anúncios salvos${lastSyncedAt ? ` às ${formatTime(lastSyncedAt)}` : ""} — a Meta limitou as consultas. ${cooldownRemainingSeconds && cooldownRemainingSeconds > 0 ? `Nova tentativa em cerca de ${Math.max(1, Math.ceil(cooldownRemainingSeconds / 60))} min.` : "Nova tentativa no próximo carregamento."}`
              : `Mostrando anúncios salvos${lastSyncedAt ? ` às ${formatTime(lastSyncedAt)}` : ""}.`}
          </InlineNotice>
        )}
        {error && rows.length > 0 && (
          <InlineNotice tone="critical" icon={<AlertTriangle />}>Parte dos anúncios não carregou: {error}</InlineNotice>
        )}

        {/* Barra de busca, filtros e visualização */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar anúncio ou oferta"
                aria-label="Buscar anúncio ou oferta"
                leading={<Search />}
              />
            </div>
            <div className="hidden lg:contents">{filterControls("inline")}</div>
            <div className="lg:hidden">
              <Popover
                align="start"
                className="w-[min(22rem,calc(100vw-2rem))] p-0"
                trigger={
                  <Button>
                    <SlidersHorizontal />
                    Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Button>
                }
              >
                {filterControls("stacked")}
              </Popover>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <p className="text-sm text-zinc-400" aria-live="polite">{loading ? "Atualizando…" : countLabel}</p>
              <div className="hidden lg:block">
                <SwitchField id="agrupar-criativo" label="Agrupar por criativo" checked={groupByCreative} onCheckedChange={setGroupByCreative} className="gap-2.5" />
              </div>
            </div>
            <SegmentedControl
              aria-label="Visualização"
              value={viewMode}
              onValueChange={setViewMode}
              options={[{ value: "lista", label: "Lista" }, { value: "tabela", label: "Tabela" }, { value: "galeria", label: "Galeria" }]}
            />
          </div>
        </div>

        {bodyState ?? (
          <>
            {viewMode === "lista" && (
              <>
                <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  <Surface className="flex min-w-0 flex-col overflow-hidden">
                    <SurfaceHeader title="Anúncios" description={countLabel} />
                    {filtered.length === 0 ? (
                      <EmptyState title="Nenhum anúncio com esses filtros" action={<Button size="sm" onClick={() => { setSearch(""); setStatusFilter("todas"); setPerfFilter("todas"); }}>Limpar filtros</Button>} />
                    ) : (
                      <ul className="max-h-[720px] space-y-0.5 overflow-y-auto p-2" aria-label="Lista de anúncios">
                        {filtered.map((r) => {
                          const isSel = r.id === selectedId;
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                aria-current={isSel ? "true" : undefined}
                                onClick={() => openDetail(r.id, !isDesktop())}
                                className={cn(
                                  "flex w-full gap-3 rounded-xl p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                                  isSel ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                                )}
                              >
                                <Thumb row={r} className="size-12 shrink-0 text-lg" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-zinc-100">{cleanDisplayName(r)}</span>
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <PerfBadge value={r.performance_status} />
                                    {r.status_formatado === "Pausada" && <AdStatus value={r.status_formatado} />}
                                  </span>
                                  <span className="mt-1.5 block text-xs tabular-nums text-zinc-400">
                                    {n(r.total_conversas_iniciadas)} conversas · {brl(r.total_spend)}
                                    {r.custo_por_conversa != null ? ` · ${brl(r.custo_por_conversa)} cada` : ""}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Surface>

                  <Surface className="hidden min-w-0 lg:block">
                    <SurfaceHeader title={selected ? cleanDisplayName(selected) : "Detalhes do anúncio"} />
                    <div className="max-h-[720px] overflow-y-auto p-5">
                      {selected ? <AdDetail ad={selected} /> : <p className="py-10 text-center text-sm text-zinc-500">Escolha um anúncio na lista.</p>}
                    </div>
                  </Surface>
                </section>

                {costChart.length > 0 && (
                  <Surface>
                    <SurfaceHeader title="Custo por conversa por anúncio" description="Os 15 anúncios com mais investimento no período" />
                    <div className="w-full px-3 pb-3 pt-2" style={{ height: Math.max(200, costChart.length * 30 + 40) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costChart} layout="vertical" margin={{ left: 8, right: 72, top: 4, bottom: 4 }}>
                          <CartesianGrid stroke={CHART_CHROME.grid} horizontal={false} />
                          <XAxis type="number" tick={chartAxisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => brl(v).replace(/,00$/, "")} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={230} interval={0} tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                            <text x={x} y={y} dy={4} textAnchor="end" fill="#d4d4d8" fontSize={11}>{payload.value.length > 32 ? `${payload.value.slice(0, 32)}…` : payload.value}</text>
                          )} />
                          <ChartTooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={chartTooltipStyle} formatter={(v: number) => [brl(v), "Custo por conversa"]} />
                          <Bar dataKey="value" fill={CHART.orange} radius={[0, 4, 4, 0]} maxBarSize={16}>
                            <LabelList dataKey="value" position="right" formatter={(v: number) => brl(v)} style={{ fill: "#d4d4d8", fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Surface>
                )}
              </>
            )}

            {viewMode === "tabela" && (
              <Surface className="overflow-hidden">
                <SurfaceHeader title="Tabela de anúncios" description={`${countLabel} · clique em uma linha para ver os detalhes`} />
                {filtered.length === 0 ? (
                  <EmptyState title="Nenhum anúncio com esses filtros" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                          <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Anúncio</th>
                          <th scope="col" className="px-3 py-2.5 font-medium">Oferta</th>
                          <th scope="col" className="px-3 py-2.5 font-medium">Classificação</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">Conversas</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">Investimento</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">Custo/conversa</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">CTR</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">CPC</th>
                          <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">CPM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {filtered.map((r) => (
                          <tr key={r.id} className="whitespace-nowrap tabular-nums text-zinc-300 transition-colors hover:bg-white/[0.02]">
                            <td className="max-w-[280px] py-2 pl-5 pr-3">
                              <button type="button" onClick={() => openDetail(r.id, true)} className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                                <Thumb row={r} className="size-9 shrink-0 text-sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-zinc-100">{cleanDisplayName(r)}</span>
                                  {r.status_formatado === "Pausada" && <span className="text-xs text-zinc-500">Pausada</span>}
                                </span>
                              </button>
                            </td>
                            <td className="max-w-[160px] truncate px-3 py-2 text-zinc-400">{r.offer_name ?? "—"}</td>
                            <td className="px-3 py-2"><PerfBadge value={r.performance_status} /></td>
                            <td className="px-3 py-2 text-right font-medium text-white">{n(r.total_conversas_iniciadas)}</td>
                            <td className="px-3 py-2 text-right">{brl(r.total_spend)}</td>
                            <td className="px-3 py-2 text-right">{r.custo_por_conversa != null ? brl(r.custo_por_conversa) : "—"}</td>
                            <td className="px-3 py-2 text-right text-zinc-400">{n(r.total_leads_meta)}</td>
                            <td className="px-3 py-2 text-right text-zinc-400">{pct(r.avg_ctr)}</td>
                            <td className="px-3 py-2 text-right text-zinc-400">{brl(r.avg_cpc)}</td>
                            <td className="py-2 pl-3 pr-5 text-right text-zinc-400">{brl(r.avg_cpm)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/[0.08] text-sm font-medium tabular-nums text-zinc-100">
                          <td className="py-2.5 pl-5 pr-3" colSpan={3}>Total ({countLabel})</td>
                          <td className="px-3 py-2.5 text-right">{n(totalConversas)}</td>
                          <td className="px-3 py-2.5 text-right">{brl(totalSpend)}</td>
                          <td className="px-3 py-2.5 text-right">{totalConversas > 0 ? brl(custoPorConversa) : "—"}</td>
                          <td className="px-3 py-2.5 text-right">{n(totalLeads)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Surface>
            )}

            {viewMode === "galeria" && (
              <section className="space-y-3">
                <p className="text-sm text-zinc-400">
                  {activeImages.length > 0
                    ? `${activeImages.length} ${activeImages.length === 1 ? "criativo ativo com imagem" : "criativos ativos com imagem"}`
                    : ""}
                </p>
                {activeImages.length === 0 ? (
                  <Surface><EmptyState title="Nenhum criativo ativo com imagem disponível" description="A Meta não enviou imagens dos anúncios ativos deste período." /></Surface>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {activeImages.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openDetail(r.id, true)}
                        className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 text-left outline-none transition-colors hover:border-white/20 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                      >
                        <Thumb row={r} fit="contain" className="h-full w-full p-2" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8">
                          <span className="block truncate text-sm font-medium text-white">{cleanDisplayName(r)}</span>
                          <span className="mt-0.5 block text-xs tabular-nums text-zinc-300">{n(r.total_conversas_iniciadas)} conversas · {brl(r.total_spend)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </Page>

      <Sheet open={detailOpen && Boolean(selected)} onOpenChange={setDetailOpen} title={selected ? cleanDisplayName(selected) : "Anúncio"}>
        {selected && <AdDetail ad={selected} />}
      </Sheet>

      {isAdmin && exportModalOpen && (
        <WeeklyCreativeExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          unitName={selectedClient?.name ?? "Todas as Unidades"}
          periodLabel={periodLabel}
          creatives={filterActiveCreativesWithConversations(rows)}
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
