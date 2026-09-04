import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/AppLayout";
import { DashboardMetricsExportModal } from "@/components/DashboardMetricsExportModal";
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
import { toast } from "sonner";
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
  Database,
  Clock,
  AlertTriangle,
  Download,
  Sparkles,
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

// ─── Cache SWR em Memória (Stale-While-Revalidate) ──────────────────────────
type DashboardCacheEntry = {
  daily: DailyRow[];
  campaigns: CampaignRow[];
  source: "meta_direct" | "supabase" | null;
  rateLimited: boolean;
  cooldownRemainingSeconds: number | null;
  lastSyncedAt: string | null;
  timestamp: number;
};

const dashboardMemoryCache = new Map<string, DashboardCacheEntry>();

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
  const [mobilePeriodMenuOpen, setMobilePeriodMenuOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [mobileUnitMenuOpen, setMobileUnitMenuOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [dataSource, setDataSource] = useState<"meta_direct" | "supabase" | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const { clients: clientOpts, selectedClientId, selectedClient, setSelectedClientId, loading: clientsLoading, refetch: refetchClients } = useClientContext();
  const metricsRequestGate = useRef(createRequestGate());

  const token = typeof window !== "undefined" ? localStorage.getItem("tp_token") : null;
  // Evita recriar o objeto de headers após cada resposta. Sem esta
  // estabilização, o efeito de métricas era reiniciado continuamente e podia
  // sobrescrever a solicitação disparada ao mudar o período.
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );
  const activeRange = useMemo(
    () => period === CUSTOM_PERIOD ? customRange : getPresetDashboardDateRange(period),
    [customRange, period],
  );
  const periodLabel = period === CUSTOM_PERIOD
    ? `Personalizado · ${formatDashboardDateRange(activeRange)}`
    : (PERIOD_SHORTCUTS.find((item) => item.value === period)?.label ?? "Últimos 30 dias");
  const unitMenu = getDashboardUnitMenuState(clientOpts, selectedClientId, clientsLoading);
  const isAdmin = useMemo(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      return storedUser?.role === "admin" || storedUser?.allowedClientIds?.includes("*");
    } catch {
      return false;
    }
  }, [token]);

  const selectPresetPeriod = (value: string) => {
    setPeriod(value);
    setCustomRangeError(null);
    setPeriodMenuOpen(false);
    setMobilePeriodMenuOpen(false);
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
    setMobilePeriodMenuOpen(false);
  };

  const handlePeriodMenu = (open: boolean) => {
    setPeriodMenuOpen(open);
    if (open) {
      setDraftStart(activeRange.start);
      setDraftEnd(activeRange.end);
      setCustomRangeError(null);
    }
  };

  const handleMobilePeriodMenu = (open: boolean) => {
    setMobilePeriodMenuOpen(open);
    if (open) {
      setDraftStart(activeRange.start);
      setDraftEnd(activeRange.end);
      setCustomRangeError(null);
    }
  };

  const selectUnit = (clientId: string) => {
    if (selectAuthorizedDashboardUnit(clientOpts, clientId, setSelectedClientId)) {
      setUnitMenuOpen(false);
      setMobileUnitMenuOpen(false);
    }
  };

  // Carrega métricas ao mudar período/cliente (Otimizado com SWR e Dashboard-Bundle)
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

    const cacheKey = `${selectedClientId}:${start}:${end}`;
    const cached = dashboardMemoryCache.get(cacheKey);

    // Se temos dados em cache e não é um refresh forçado manual (refreshIndex === 0):
    // RENDERIZAÇÃO INSTANTÂNEA (0 milissegundos de tela branca!)
    if (cached && refreshIndex === 0) {
      setDaily(cached.daily);
      setCampaigns(cached.campaigns);
      setConfigured(true);
      setDataSource(cached.source);
      setIsRateLimited(cached.rateLimited);
      setCooldownRemainingSeconds(cached.cooldownRemainingSeconds);
      setLastSyncedAt(cached.lastSyncedAt);
      setLoading(false);

      // Se os dados foram carregados há menos de 3 minutos, não precisa revalidar imediatamente
      if (Date.now() - cached.timestamp < 3 * 60 * 1000) {
        return () => controller.abort();
      }
    } else if (!cached) {
      setLoading(true);
    }
    setError(null);

    // Função que tenta o endpoint unificado dashboard-bundle com fallback para os endpoints legados
    const fetchMetricsBundle = async () => {
      try {
        const bundleRes = await fetch(`/api/metrics/dashboard-bundle?${qs}`, {
          headers: authHeaders,
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (bundleRes.ok) {
          const bundleData = await readMetricsResponse<{
            configured?: boolean;
            daily?: DailyRow[];
            campaigns?: CampaignRow[];
            source?: "meta_direct" | "supabase";
            rateLimited?: boolean;
            cooldownRemainingSeconds?: number;
            lastSyncedAt?: string | null;
            error?: string;
          }>(bundleRes, "Falha no bundle");

          return {
            ok: bundleData.configured !== false,
            daily: Array.isArray(bundleData.daily) ? bundleData.daily : [],
            campaigns: Array.isArray(bundleData.campaigns) ? bundleData.campaigns : [],
            source: bundleData.source || null,
            rateLimited: Boolean(bundleData.rateLimited),
            cooldownRemainingSeconds: bundleData.cooldownRemainingSeconds ?? null,
            lastSyncedAt: bundleData.lastSyncedAt || null,
            error: bundleData.error || null,
          };
        }
      } catch (err: any) {
        if (controller.signal.aborted) throw err;
        console.warn("[dashboard] Fallback para endpoints legados:", err?.message || err);
      }

      // Fallback para endpoints legados caso o novo endpoint unificado não responda
      const [d, c] = await Promise.all([
        fetch(`/api/metrics/daily?${qs}`, { headers: authHeaders, credentials: "same-origin", signal: controller.signal })
          .then((response) => readMetricsResponse<{ configured?: boolean; rows?: DailyRow[]; source?: "meta_direct" | "supabase"; rateLimited?: boolean; cooldownRemainingSeconds?: number; lastSyncedAt?: string | null; error?: string }>(response, "Não foi possível carregar as métricas diárias")),
        fetch(`/api/metrics/campaigns?${qs}`, { headers: authHeaders, credentials: "same-origin", signal: controller.signal })
          .then((response) => readMetricsResponse<{ rows?: CampaignRow[]; source?: "meta_direct" | "supabase"; rateLimited?: boolean; cooldownRemainingSeconds?: number; lastSyncedAt?: string | null; error?: string }>(response, "Não foi possível carregar as campanhas")),
      ]);

      return {
        ok: d.configured !== false,
        daily: Array.isArray(d.rows) ? d.rows : [],
        campaigns: Array.isArray(c.rows) ? c.rows : [],
        source: d.source || c.source || null,
        rateLimited: Boolean(d.rateLimited || c.rateLimited),
        cooldownRemainingSeconds: d.cooldownRemainingSeconds ?? c.cooldownRemainingSeconds ?? null,
        lastSyncedAt: d.lastSyncedAt || c.lastSyncedAt || null,
        error: d.error ?? c.error ?? null,
      };
    };

    fetchMetricsBundle()
      .then((result) => {
        if (!isCurrentRequest()) return;
        setConfigured(result.ok);
        setDataSource(result.source);
        setIsRateLimited(result.rateLimited);
        setCooldownRemainingSeconds(result.cooldownRemainingSeconds);
        setLastSyncedAt(result.lastSyncedAt);

        setDaily(result.daily);
        setCampaigns(result.campaigns);
        if (result.error) setError(result.error);

        // Salva os dados no cache SWR em memória para reutilização instantânea
        if (result.ok) {
          dashboardMemoryCache.set(cacheKey, {
            daily: result.daily,
            campaigns: result.campaigns,
            source: result.source,
            rateLimited: result.rateLimited,
            cooldownRemainingSeconds: result.cooldownRemainingSeconds,
            lastSyncedAt: result.lastSyncedAt,
            timestamp: Date.now(),
          });
        }
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

  const hasMetrics = daily.length > 0 || campaigns.length > 0;
  const canExport = Boolean(selectedClientId);

  const exportMetricsForActiveUnit = () => {
    if (!selectedClientId) return;
    if (!daily.length && !campaigns.length) {
      toast.error("Não há métricas disponíveis para exportar neste período.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const unitName = selectedClient?.name || selectedClientId;
    const metadataRows = [{
      unidade: unitName,
      conta_meta: selectedClientId,
      período: formatDashboardDateRange(activeRange),
      fonte: dataSource === "meta_direct" ? "Meta Graph API" : dataSource === "supabase" ? "Supabase" : "Não informada",
      exportado_em: new Date().toLocaleString("pt-BR"),
    }];
    const summaryRows = [{
      total_investido: kpi.spend,
      conversas_iniciadas: kpi.conv,
      custo_por_conversa: kpi.custoConversa,
      primeiras_respostas: kpi.primeiras,
      conversas_respondidas: kpi.respondidas,
      taxa_de_resposta: responseRate,
      conexões_de_mensagens: kpi.connections,
      leads_meta: kpi.leads,
      impressões: kpi.impressions,
      cliques: kpi.clicks,
      ctr: kpi.ctr,
      cpc: kpi.cpc,
      cpm: kpi.cpm,
      frequência: kpi.frequency,
    }];
    const dailyRows = daily.map((row) => ({
      data: row.date_start,
      investimento: num(row.total_spend),
      conversas_iniciadas: num(row.total_conversas_iniciadas),
      conexões_de_mensagens: num(row.total_messaging_connections),
      primeiras_respostas: num(row.total_primeiras_respostas),
      conversas_respondidas: num(row.total_conversas_respondidas),
      leads_meta: num(row.total_leads_meta),
      impressões: num(row.total_impressions),
      cliques: num(row.total_clicks),
      custo_por_conversa: num(row.custo_por_conversa),
      cpc: num(row.avg_cpc),
      cpm: num(row.avg_cpm),
      ctr: num(row.avg_ctr),
      frequência: num(row.avg_frequency),
    }));
    const campaignRows = campaigns.map((row) => ({
      campanha: row.campaign_name,
      investimento: num(row.total_spend),
      conversas_iniciadas: num(row.total_conversas_iniciadas),
      custo_por_conversa: num(row.custo_por_conversa),
      leads_meta: num(row.total_leads_meta),
      impressões: num(row.total_impressions),
      cliques: num(row.total_clicks),
      ctr: num(row.avg_ctr),
      cpc: num(row.avg_cpc),
      cpm: num(row.avg_cpm),
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadataRows), "Referência");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumo");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), "Métricas diárias");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(campaignRows), "Campanhas");
    const slug = unitName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    XLSX.writeFile(workbook, `metricas-trafego-${slug}-${activeRange.start}-a-${activeRange.end}.xlsx`);
    toast.success(`Excel de métricas de ${unitName} gerado.`);
  };

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
      <div className="mx-auto max-w-[1440px] space-y-4 sm:space-y-6 p-3.5 sm:p-6 lg:p-10">
        
        {/* Top Header Banner: Desktop & Mobile */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Visão de Performance & Mídia</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-4xl">
              Dashboard de Resultados
            </h1>
            <p className="hidden sm:block max-w-xl text-sm leading-relaxed text-zinc-400 font-light">
              Acompanhe os principais indicadores de investimento, geração de conversas e retorno de campanhas por unidade.
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
                      Exibindo dados do Banco de Dados (Supabase)
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
                      ? "A Meta Graph API atingiu o limite temporário de requisições. Para manter a visualização 100% disponível sem falhas, os dados foram carregados com segurança a partir do banco de dados."
                      : "Os dados desta unidade estão sendo carregados a partir do banco de dados oficial do Supabase."}
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
              <span className="font-medium">Dados sincronizados em tempo real via Meta Graph API</span>
            </div>
            {lastSyncedAt && (
              <span className="text-[11px] text-emerald-400/70 font-mono hidden sm:inline">
                Sincronizado às {new Date(lastSyncedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {/* Filter Control Deck */}
        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-3 sm:p-5 shadow-xl shadow-black/30">
          
          {/* Mobile View: Units, Quick Chips & Refresh Action */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              {/* Unit Selector Mobile */}
              <Popover open={mobileUnitMenuOpen} onOpenChange={(isOpen) => { setMobileUnitMenuOpen(isOpen); if (!isOpen) setUnitSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Selecionar unidade das métricas"
                    className="flex-1 inline-flex min-h-10 items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-left text-xs font-medium text-zinc-200 transition-all active:scale-[0.99] hover:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="size-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{unitMenu.label}</span>
                    </div>
                    <ChevronDown className="size-3 text-zinc-500 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[100] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="font-display text-sm font-bold">Unidades disponíveis</p>
                    {clientOpts.length > 5 && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          placeholder="Filtrar unidade…"
                          className="h-8 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
                        />
                      </div>
                    )}
                  </div>
                  {clientsLoading ? (
                    <div className="flex items-center gap-2.5 px-4 py-5 text-xs text-zinc-400">
                      <RefreshCw className="size-3.5 animate-spin text-emerald-400" /> Carregando unidades…
                    </div>
                  ) : clientOpts.length === 0 ? (
                    <div className="px-4 py-5 text-center space-y-2">
                      <p className="text-xs leading-5 text-zinc-400">{unitMenu.emptyMessage}</p>
                      <button
                        type="button"
                        onClick={() => refetchClients()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold active:scale-95"
                      >
                        <RefreshCw className="size-3" /> Tentar recarregar
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto p-1.5">
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
                              className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-all ${
                                selected
                                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-950/30"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <span className="truncate">{client.name}</span>
                              {selected && <span className="shrink-0 text-[9px] uppercase tracking-wider font-extrabold">Ativa</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Refresh Action Mobile */}
              <button
                onClick={() => {
                  if (selectedClientId) {
                    const cacheKey = `${selectedClientId}:${activeRange.start}:${activeRange.end}`;
                    dashboardMemoryCache.delete(cacheKey);
                  }
                  setRefreshIndex((value) => value + 1);
                }}
                disabled={loading || clientsLoading || !selectedClientId}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-zinc-200 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`size-3 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>
              {canExport && (
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  disabled={loading || !hasMetrics}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 transition-all active:scale-95 hover:bg-zinc-800 disabled:opacity-50"
                  title="Gerar print executivo para WhatsApp"
                >
                  <Sparkles className="size-3.5 text-emerald-400" />
                  <span>Print</span>
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={exportMetricsForActiveUnit}
                  disabled={loading || !hasMetrics}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition-all active:scale-95 hover:bg-emerald-500 hover:text-zinc-950 disabled:opacity-50"
                  title="Exportar métricas da unidade em Excel (XLSX)"
                >
                  <Download className="size-3.5" />
                  <span>Excel</span>
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {PERIOD_SHORTCUTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectPresetPeriod(item.value)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    period === item.value
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                      : "border border-white/10 bg-zinc-950/80 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Popover trigger for Custom Date Mobile */}
              <Popover open={mobilePeriodMenuOpen} onOpenChange={handleMobilePeriodMenu}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                      period === CUSTOM_PERIOD
                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                        : "border border-white/10 bg-zinc-950/80 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <CalendarRange className="size-3" />
                    <span>{period === CUSTOM_PERIOD ? formatDashboardDateRange(activeRange) : "Customizado"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[100] w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="font-display text-sm font-bold">Data personalizada</p>
                    <p className="mt-0.5 text-xs text-zinc-400">Escolha o intervalo inicial e final.</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <label className="block space-y-1 text-xs text-zinc-400">
                      <span>Data inicial</span>
                      <input
                        type="date"
                        value={draftStart}
                        max={draftEnd || undefined}
                        onChange={(e) => setDraftStart(e.target.value)}
                        className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </label>
                    <label className="block space-y-1 text-xs text-zinc-400">
                      <span>Data final</span>
                      <input
                        type="date"
                        value={draftEnd}
                        min={draftStart || undefined}
                        onChange={(e) => setDraftEnd(e.target.value)}
                        className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </label>
                    {customRangeError && <p className="text-xs text-rose-400">{customRangeError}</p>}
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-zinc-900/40 p-3">
                    <button type="button" onClick={() => setMobilePeriodMenuOpen(false)} className="rounded-xl px-3 py-1.5 text-xs text-zinc-400">Cancelar</button>
                    <button type="button" onClick={applyCustomRange} className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950">Aplicar</button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Desktop View: Popovers and Action Buttons */}
          <div className="hidden md:flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              
              {/* Period Filter Desktop */}
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
                <PopoverContent align="start" className="z-[100] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
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

              {/* Unit Filter Desktop */}
              <Popover open={unitMenuOpen} onOpenChange={(isOpen) => { setUnitMenuOpen(isOpen); if (!isOpen) setUnitSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Selecionar unidade das métricas"
                    className="inline-flex min-h-11 items-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-left text-xs font-medium text-zinc-200 transition-all hover:border-white/20 hover:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <Building2 className="size-4 text-emerald-400" />
                    <span className="max-w-52 truncate">{unitMenu.label}</span>
                    <ChevronDown className="size-3.5 text-zinc-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[100] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
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
                    <div className="px-5 py-6 text-center space-y-2.5">
                      <p className="text-xs leading-5 text-zinc-400">{unitMenu.emptyMessage}</p>
                      <button
                        type="button"
                        onClick={() => refetchClients()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20"
                      >
                        <RefreshCw className="size-3" /> Recarregar unidades
                      </button>
                    </div>
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

            <div className="flex items-center gap-2">
              {canExport && (
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  disabled={loading || !hasMetrics}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500 hover:text-zinc-950 shadow-md shadow-emerald-950/20 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Gerar print executivo em alta resolução para enviar no WhatsApp"
                >
                  <Sparkles className="size-3.5 text-emerald-400" />
                  <span>Gerar Print (WhatsApp)</span>
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={exportMetricsForActiveUnit}
                  disabled={loading || !hasMetrics}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 text-xs font-semibold text-zinc-300 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title="Exportar métricas da unidade em Excel (XLSX)"
                >
                  <Download className="size-3.5" />
                  <span>Exportar Excel</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (selectedClientId) {
                    const cacheKey = `${selectedClientId}:${activeRange.start}:${activeRange.end}`;
                    dashboardMemoryCache.delete(cacheKey);
                  }
                  setRefreshIndex((value) => value + 1);
                }}
                disabled={loading || clientsLoading || !selectedClientId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar dados</span>
              </button>
            </div>
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
            {/* Primary KPI Cards Grid: 2x2 on Mobile, 4 columns on Desktop */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {primaryKpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/50 p-3.5 sm:p-6 backdrop-blur-xl shadow-xl shadow-black/30 transition-all duration-200 hover:border-white/20 hover:bg-zinc-900/80"
                  >
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-[0.16em] text-zinc-400 font-mono truncate">
                        {k.label}
                      </span>
                      <div className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl border p-1 sm:p-1.5 ${k.indicator}`}>
                        <Icon className="size-3.5 sm:size-4" />
                      </div>
                    </div>
                    <div className={`mt-2 sm:mt-3 font-display text-xl sm:text-3xl font-bold tracking-tight ${k.accent} tabular-nums`}>
                      {k.value}
                    </div>
                    <div className="mt-1 sm:mt-2 text-[11px] sm:text-xs text-zinc-500 font-light truncate">
                      {k.note}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complementary Metrics Section */}
            <section className="overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/30 backdrop-blur-xl p-4 sm:p-6 shadow-xl shadow-black/20">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Layers className="size-3.5 sm:size-4 text-emerald-400" />
                <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-zinc-400 font-mono">
                  Métricas Complementares & Tráfego
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8 sm:gap-3">
                {supportingKpis.map((k) => (
                  <div key={k.label} className="rounded-xl sm:rounded-2xl border border-white/5 bg-zinc-950/60 p-2.5 sm:p-3">
                    <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">{k.label}</p>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Análise Profunda e Projeções (Sanfona Inteligente) */}
            <DeepAnalyticsAccordion unitId={selectedClientId} unitName={selectedClient?.name} />

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Panel title="Conversas iniciadas por dia" note="Evolução diária de leads" icon={TrendingUp}>
                <div className="h-[210px] sm:h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart} margin={{ left: -22, right: 4, top: 8 }}>
                      <defs>
                        <linearGradient id="gConversas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.green} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="conversas"
                        stroke={CHART.green}
                        strokeWidth={3}
                        fill="url(#gConversas)"
                        dot={{ r: 2.5, fill: CHART.green, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        name="Conversas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Investimento x Conversas" note="Relação de custo e volume" icon={BarChart3}>
                <div className="h-[210px] sm:h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ left: -22, right: 4, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                      <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line
                        yAxisId="l"
                        type="monotone"
                        dataKey="investimento"
                        stroke={CHART.orange}
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: CHART.orange, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        name="Investimento (R$)"
                      />
                      <Line
                        yAxisId="r"
                        type="monotone"
                        dataKey="conversas"
                        stroke={CHART.green}
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: CHART.green, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        name="Conversas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            {/* Charts Row 2: Custo por conversa */}
            <div>
              <Panel title="Custo por conversa" note="R$ por conversa iniciada" icon={Target}>
                <div className="h-[200px] sm:h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart} margin={{ left: -22, right: 4, top: 8 }}>
                      <defs>
                        <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.red} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={CHART.orange} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v))} />
                      <Area
                        type="monotone"
                        dataKey="custo"
                        stroke={CHART.red}
                        strokeWidth={2.5}
                        fill="url(#gCusto)"
                        dot={{ r: 2.5, fill: CHART.red, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        name="Custo/conversa"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            {/* Campaigns Table / Cards Panel */}
            <Panel title="Desempenho por campanha" note="Resultados no período selecionado" icon={Layers}>
              {/* Desktop View: Full Data Table */}
              <div className="hidden md:block overflow-x-auto -m-2 p-2">
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

              {/* Mobile View: Interactive Campaign Cards */}
              <div className="md:hidden space-y-3">
                {campaigns.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-500 font-light">
                    Nenhuma campanha com dados registrada neste período.
                  </p>
                ) : (
                  campaigns.map((c) => {
                    const custo = num(c.custo_por_conversa) || (num(c.total_conversas_iniciadas) > 0 ? num(c.total_spend) / num(c.total_conversas_iniciadas) : 0);
                    const st = statusFor(custo);
                    const isExpanded = expandedCampaign === c.campaign_name;

                    return (
                      <div
                        key={c.campaign_name}
                        className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3.5 shadow-sm transition-all"
                      >
                        <div
                          className="flex items-start justify-between gap-2 cursor-pointer"
                          onClick={() => setExpandedCampaign(isExpanded ? null : c.campaign_name)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-100 leading-snug line-clamp-2">{c.campaign_name}</p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${STATUS_CLS[st]}`}>
                                {st}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                                {n(num(c.total_conversas_iniciadas))} conv.
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {brl(custo)}/conv
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs font-bold text-zinc-200 font-mono">{brl(num(c.total_spend))}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                              {isExpanded ? "Menos" : "Mais"}
                              <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3.5 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center animate-in fade-in duration-200">
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">CTR</span>
                              <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">{pct(num(c.avg_ctr))}</span>
                            </div>
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">CPC</span>
                              <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">{brl(num(c.avg_cpc))}</span>
                            </div>
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">CPM</span>
                              <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">{brl(num(c.avg_cpm))}</span>
                            </div>
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Impressões</span>
                              <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">{n(num(c.total_impressions))}</span>
                            </div>
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Cliques</span>
                              <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">{n(num(c.total_clicks))}</span>
                            </div>
                            <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">Leads Meta</span>
                              <span className="text-xs font-bold text-zinc-300 font-mono mt-0.5 block">{n(num(c.total_leads_meta))}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </>
        )}
      </div>

      <DashboardMetricsExportModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        unitName={selectedClient?.name ?? "Unidade"}
        periodLabel={periodLabel}
        kpis={{
          spend: kpi.spend,
          conv: kpi.conv,
          custoConversa: kpi.custoConversa,
          primeiras: kpi.primeiras,
          respondidas: kpi.respondidas,
          connections: kpi.connections,
          leads: kpi.leads,
          impressions: kpi.impressions,
          clicks: kpi.clicks,
          ctr: kpi.ctr,
          cpc: kpi.cpc,
          cpm: kpi.cpm,
          frequency: kpi.frequency,
          responseRate,
        }}
        campaigns={campaigns}
      />
    </AppLayout>
  );
}
