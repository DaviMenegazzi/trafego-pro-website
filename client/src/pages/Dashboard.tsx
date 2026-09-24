import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/AppLayout";
import { DashboardMetricsExportModal } from "@/components/DashboardMetricsExportModal";
import { DashboardState } from "@/components/DashboardState";
import { canSeeAdminFeedbacks } from "@/components/adminNavigationPolicy";
import { PredictiveAnalysis, PredictiveSummaryCard, usePredictiveProfile } from "@/components/DeepAnalyticsAccordion";
import {
  Button, DateRangePicker, IconButton, InlineNotice, MenuButton, Page, PageHeader, SegmentedControl, StatTile, StatusBadge,
  Surface, SurfaceHeader, Tooltip, type Accent, type BadgeTone,
} from "@/components/ds";
import { useClientContext } from "@/contexts/ClientContext";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";
import { CHART, CHART_CHROME, chartAxisTick, chartTooltipStyle } from "@/lib/chartPalette";
import { CUSTOM_PERIOD, formatDashboardDateRange, getPresetDashboardDateRange } from "@/lib/dashboardDateRange";
import { calculateResponseRate } from "@/lib/dashboardPresentation";
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { MetricsSessionError, readMetricsResponse } from "@/lib/metricsResponse";
import { createRequestGate } from "@/lib/requestGate";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, ChevronDown, Download, FileSpreadsheet, Image as ImageIcon, Database, AlertTriangle, Wallet, MessageCircle, Target, Reply } from "lucide-react";

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
const n = (v: number) => formatNumber(v);
const brl = (v: number) => formatCurrency(v);
const pct = (v: number) => formatPercent(v, 2);
const num = (v: number | null | undefined) => Number(v ?? 0);

// Faixas de custo por conversa usadas nos selos de status (Positivo/Atenção/Crítico).
function statusFor(custo: number): "Positivo" | "Atenção" | "Crítico" {
  if (custo > 0 && custo <= 8) return "Positivo";
  if (custo <= 15) return "Atenção";
  return "Crítico";
}
const STATUS_TONE: Record<ReturnType<typeof statusFor>, BadgeTone> = { Positivo: "good", Atenção: "warning", Crítico: "critical" };

type PeriodValue = "7" | "30" | "90" | typeof CUSTOM_PERIOD;
const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];
const PERIOD_LABEL: Record<string, string> = { "7": "últimos 7 dias", "30": "últimos 30 dias", "90": "últimos 90 dias" };

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

function ChartPanel({ title, description, children, className, icon, accent }: { title: string; description?: string; children: React.ReactNode; className?: string; icon?: React.ReactNode; accent?: Accent }) {
  return (
    <Surface className={className}>
      <SurfaceHeader title={title} description={description} icon={icon} accent={accent} />
      <div className="h-[220px] w-full px-3 pb-3 pt-4 sm:h-[260px]">{children}</div>
    </Surface>
  );
}

export default function DashboardPage() {
  useAuthGuard();
  const [, setLocation] = useLocation();
  useEffect(() => { document.title = "Tráfego Pro — Dashboard"; }, []);

  const [period, setPeriod] = useState<PeriodValue>("30");
  const [customRange, setCustomRange] = useState(() => getPresetDashboardDateRange("30"));
  const [view, setView] = useState<"overview" | "analysis">("overview");
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
  const { selectedClientId, selectedClient, clients: clientOpts, loading: clientsLoading, refetch: refetchClients } = useClientContext();
  const metricsRequestGate = useRef(createRequestGate());
  const predictive = usePredictiveProfile(selectedClientId);

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
  const periodLabel = period === CUSTOM_PERIOD ? formatDashboardDateRange(activeRange) : PERIOD_LABEL[period] ?? "últimos 30 dias";
  const isAdmin = useMemo(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      return canSeeAdminFeedbacks(storedUser);
    } catch {
      return false;
    }
  }, [token]);

  const refresh = () => {
    if (selectedClientId) {
      dashboardMemoryCache.delete(`${selectedClientId}:${activeRange.start}:${activeRange.end}`);
    }
    setRefreshIndex((value) => value + 1);
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
  const canExport = Boolean(isAdmin && selectedClientId);

  const exportMetricsForActiveUnit = () => {
    if (!isAdmin) {
      toast.error("Ação restrita a administradores.");
      return;
    }
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

  const costStatus = kpi.custoConversa > 0 ? statusFor(kpi.custoConversa) : null;

  // Variação dentro do próprio período (a API não traz o período anterior):
  // compara a 2ª metade dos dias com a 1ª, e o rótulo diz isso.
  const halves = useMemo(() => {
    const rows = [...daily].sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
    if (rows.length < 4) return null;
    const mid = Math.floor(rows.length / 2);
    const agg = (part: DailyRow[]) => {
      const spend = part.reduce((a, r) => a + num(r.total_spend), 0);
      const conv = part.reduce((a, r) => a + num(r.total_conversas_iniciadas), 0);
      const resp = part.reduce((a, r) => a + num(r.total_conversas_respondidas), 0);
      const conn = part.reduce((a, r) => a + num(r.total_messaging_connections), 0);
      return { spend, conv, cost: conv > 0 ? spend / conv : 0, rate: calculateResponseRate(resp, conn) };
    };
    return { a: agg(rows.slice(0, mid)), b: agg(rows.slice(rows.length - mid)) };
  }, [daily]);
  const change = (key: "spend" | "conv" | "cost" | "rate") =>
    halves && halves.a[key] > 0 ? (halves.b[key] - halves.a[key]) / halves.a[key] : undefined;
  const deltaLabel = "2ª metade vs. 1ª";
  const series = (pick: (r: DailyRow) => number) =>
    [...daily].sort((a, b) => String(a.date_start).localeCompare(String(b.date_start))).map(pick);

  const primaryKpis = [
    {
      label: "Total investido", value: brl(kpi.spend), hint: "verba Meta Ads no período",
      icon: <Wallet />, accent: "blue" as const, goodWhen: "neutral" as const, delta: change("spend"),
      trend: series((r) => num(r.total_spend)),
    },
    {
      label: "Conversas iniciadas", value: n(kpi.conv), hint: "inícios de conversa no WhatsApp",
      icon: <MessageCircle />, accent: "aqua" as const, goodWhen: "up" as const, delta: change("conv"),
      trend: series((r) => num(r.total_conversas_iniciadas)),
    },
    {
      label: "Custo por conversa",
      value: brl(kpi.custoConversa),
      hint: "investimento ÷ conversas",
      status: costStatus ? { tone: STATUS_TONE[costStatus] === "good" ? "good" as const : STATUS_TONE[costStatus] === "warning" ? "warning" as const : "critical" as const, label: costStatus } : undefined,
      icon: <Target />, accent: "orange" as const, goodWhen: "down" as const, delta: change("cost"),
      trend: series((r) => num(r.custo_por_conversa) || (num(r.total_conversas_iniciadas) > 0 ? num(r.total_spend) / num(r.total_conversas_iniciadas) : 0)),
    },
    {
      label: "Taxa de resposta", value: pct(responseRate), hint: "conversas respondidas",
      icon: <Reply />, accent: "violet" as const, goodWhen: "up" as const, delta: change("rate"),
      trend: series((r) => calculateResponseRate(num(r.total_conversas_respondidas), num(r.total_messaging_connections))),
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
    { label: "Frequência", value: formatNumber(kpi.frequency, 2) },
  ];

  const chart = useMemo(() => daily.map((r) => ({
    d: r.date_start ? r.date_start.slice(5).split("-").reverse().join("/") : "",
    conversas: num(r.total_conversas_iniciadas),
    investimento: num(r.total_spend),
    custo: num(r.custo_por_conversa) || (num(r.total_conversas_iniciadas) > 0 ? num(r.total_spend) / num(r.total_conversas_iniciadas) : 0),
  })), [daily]);

  const noUnits = !clientsLoading && clientOpts.length === 0;
  const dashboardState = clientsLoading || loading
    ? { title: "Atualizando indicadores", description: "Consultando as métricas mais recentes da unidade.", loading: true }
    : noUnits
      ? { title: "Nenhuma unidade disponível", description: "Sua conta ainda não tem unidades vinculadas. Fale com um administrador.", action: <Button size="sm" onClick={() => refetchClients()}>Tentar de novo</Button> }
      : !selectedClientId
        ? { title: "Selecione uma unidade", description: "Escolha uma unidade no menu para ver os indicadores de mídia e atendimento." }
        : error
          ? { title: "Não conseguimos buscar as métricas", description: "Isso não significa que não houve resultado. Tente atualizar em alguns instantes.", action: <Button size="sm" onClick={refresh}><RefreshCw />Tentar de novo</Button> }
          : !hasMetrics
            ? { title: "Sem dados para este período", description: "Não há métricas sincronizadas para a unidade no período escolhido.", action: period !== "90" ? <Button size="sm" onClick={() => setPeriod("90")}>Ver últimos 90 dias</Button> : undefined }
            : null;

  const tickFormatterCurrency = (v: number) => formatCurrencyCompact(v);

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Resultados"
          subtitle={`${selectedClient?.name ?? "Nenhuma unidade selecionada"} · ${periodLabel}`}
          actions={
            <>
              {lastSyncedAt && !loading && (
                <span className="hidden text-xs text-zinc-500 sm:inline">Atualizado às {formatTime(lastSyncedAt)}</span>
              )}
              <IconButton
                label="Atualizar dados"
                icon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
                onClick={refresh}
                disabled={loading || clientsLoading || !selectedClientId}
              />
              {canExport && (
                <MenuButton
                  label="Exportar"
                  icon={<Download />}
                  disabled={loading || !hasMetrics}
                  items={[
                    { label: "Imagem para WhatsApp", hint: "Resumo executivo em PNG", icon: <ImageIcon />, onSelect: () => setPrintModalOpen(true) },
                    { label: "Planilha Excel", hint: "Resumo, dias e campanhas", icon: <FileSpreadsheet />, onSelect: exportMetricsForActiveUnit },
                  ]}
                />
              )}
            </>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={cn("flex flex-wrap items-center gap-2", view === "analysis" && isAdmin && "invisible")} aria-hidden={view === "analysis" && isAdmin ? true : undefined}>
              <SegmentedControl
                aria-label="Período"
                value={period}
                onValueChange={(value) => setPeriod(value)}
                options={PERIOD_OPTIONS}
              />
              <DateRangePicker
                aria-label="Período personalizado"
                value={period === CUSTOM_PERIOD ? customRange : { start: "", end: "" }}
                onChange={(range) => { setCustomRange(range); setPeriod(CUSTOM_PERIOD); }}
                placeholder="Personalizado"
                max={getPresetDashboardDateRange("1").end}
                className={cn("w-auto", period === CUSTOM_PERIOD && "border-emerald-500/40")}
              />
            </div>
            {isAdmin && (
              <SegmentedControl
                aria-label="Visão"
                value={view}
                onValueChange={setView}
                options={[{ value: "overview", label: "Visão geral" }, { value: "analysis", label: "Análise" }]}
              />
            )}
          </div>
        </PageHeader>

        {dataSource === "supabase" && !loading && (
          <InlineNotice tone="warning" icon={<Database />}>
            {isRateLimited
              ? `Mostrando dados salvos${lastSyncedAt ? ` às ${formatTime(lastSyncedAt)}` : ""} — a Meta limitou as consultas. ${cooldownRemainingSeconds && cooldownRemainingSeconds > 0 ? `Nova tentativa em cerca de ${Math.max(1, Math.ceil(cooldownRemainingSeconds / 60))} min.` : "Nova tentativa no próximo carregamento."}`
              : `Mostrando dados salvos${lastSyncedAt ? ` às ${formatTime(lastSyncedAt)}` : ""}.`}
          </InlineNotice>
        )}

        {error && !dashboardState && (
          <InlineNotice tone="critical" icon={<AlertTriangle />} action={<Button size="sm" variant="ghost" onClick={refresh}>Tentar de novo</Button>}>
            Parte das métricas não carregou: {error}
          </InlineNotice>
        )}

        {view === "analysis" && isAdmin ? (
          <PredictiveAnalysis data={predictive.data} loading={predictive.loading} failed={predictive.failed} />
        ) : dashboardState ? (
          <DashboardState {...dashboardState} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {primaryKpis.map((k) => (
                <StatTile
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  hint={k.status || k.delta !== undefined ? undefined : k.hint}
                  status={k.status}
                  icon={k.icon}
                  accent={k.accent}
                  delta={k.delta !== undefined ? { value: k.delta, label: deltaLabel, goodWhen: k.goodWhen } : undefined}
                  trend={k.trend}
                />
              ))}
            </div>

            <Surface as="section" aria-label="Métricas complementares" className="grid grid-cols-2 divide-white/[0.06] sm:grid-cols-4 xl:grid-cols-8 [&>*]:border-white/[0.06] max-sm:[&>*:nth-child(odd)]:border-r sm:[&>*:not(:nth-child(4n))]:border-r xl:[&>*:not(:last-child)]:border-r xl:[&>*]:border-b-0 [&>*]:border-b sm:[&>*:nth-last-child(-n+4)]:border-b-0 max-sm:[&>*:nth-last-child(-n+2)]:border-b-0">
              {supportingKpis.map((k) => (
                <div key={k.label} className="min-w-0 px-4 py-3">
                  <p className="truncate text-xs text-zinc-500">{k.label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">{k.value}</p>
                </div>
              ))}
            </Surface>

            {isAdmin && <PredictiveSummaryCard data={predictive.data} loading={predictive.loading} onOpen={() => setView("analysis")} />}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartPanel title="Conversas iniciadas por dia" icon={<MessageCircle />} accent="aqua">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ left: 0, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="gConversas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.aqua} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={CHART.aqua} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                    <XAxis dataKey="d" tick={chartAxisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <ChartTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [n(Number(v)), "Conversas"]} />
                    <Area type="monotone" dataKey="conversas" stroke={CHART.aqua} strokeWidth={2} fill="url(#gConversas)" dot={false} activeDot={{ r: 4 }} name="Conversas" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Investimento por dia" icon={<Wallet />} accent="blue">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                    <XAxis dataKey="d" tick={chartAxisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={64} tickFormatter={tickFormatterCurrency} />
                    <ChartTooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => [brl(Number(v)), "Investimento"]} />
                    <Bar dataKey="investimento" fill={CHART.blue} radius={[4, 4, 0, 0]} maxBarSize={18} name="Investimento" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            <ChartPanel title="Custo por conversa" icon={<Target />} accent="orange" description={`Linha tracejada: média do período (${brl(kpi.custoConversa)})`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                  <XAxis dataKey="d" tick={chartAxisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={64} tickFormatter={tickFormatterCurrency} />
                  <ChartTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [brl(Number(v)), "Custo por conversa"]} />
                  {kpi.custoConversa > 0 && <ReferenceLine y={kpi.custoConversa} stroke={CHART_CHROME.reference} strokeDasharray="4 4" />}
                  <Line type="monotone" dataKey="custo" stroke={CHART.orange} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Custo por conversa" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <Surface>
              <SurfaceHeader title="Desempenho por campanha" description={`${campaigns.length} ${campaigns.length === 1 ? "campanha" : "campanhas"} no período`} />
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                      <th scope="col" className="py-2.5 pl-5 pr-4 font-medium">Campanha</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Investimento</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Conversas</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Custo/conversa</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads Meta</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">CTR</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">CPC</th>
                      <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">CPM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-zinc-500">Nenhuma campanha com dados neste período.</td>
                      </tr>
                    ) : (
                      campaigns.map((c) => {
                        const custo = num(c.custo_por_conversa) || (num(c.total_conversas_iniciadas) > 0 ? num(c.total_spend) / num(c.total_conversas_iniciadas) : 0);
                        const st = statusFor(custo);
                        return (
                          <tr key={c.campaign_name} className="whitespace-nowrap tabular-nums text-zinc-300 transition-colors hover:bg-white/[0.02]">
                            <td className="max-w-[320px] py-3 pl-5 pr-4">
                              <Tooltip content={c.campaign_name} side="top" align="start">
                                <span className="block truncate font-medium text-zinc-100">{c.campaign_name}</span>
                              </Tooltip>
                            </td>
                            <td className="px-3 py-3 text-right">{brl(num(c.total_spend))}</td>
                            <td className="px-3 py-3 text-right font-medium text-white">{n(num(c.total_conversas_iniciadas))}</td>
                            <td className="px-3 py-3 text-right">{num(c.total_conversas_iniciadas) > 0 ? brl(custo) : "—"}</td>
                            <td className="px-3 py-3">{num(c.total_conversas_iniciadas) > 0 ? <StatusBadge tone={STATUS_TONE[st]}>{st}</StatusBadge> : <StatusBadge tone="neutral">Sem conversas</StatusBadge>}</td>
                            <td className="px-3 py-3 text-right text-zinc-400">{n(num(c.total_leads_meta))}</td>
                            <td className="px-3 py-3 text-right text-zinc-400">{pct(num(c.avg_ctr))}</td>
                            <td className="px-3 py-3 text-right text-zinc-400">{brl(num(c.avg_cpc))}</td>
                            <td className="py-3 pl-3 pr-5 text-right text-zinc-400">{brl(num(c.avg_cpm))}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Celular: cartões expansíveis */}
              <div className="space-y-2 p-3 md:hidden">
                {campaigns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">Nenhuma campanha com dados neste período.</p>
                ) : (
                  campaigns.map((c) => {
                    const custo = num(c.custo_por_conversa) || (num(c.total_conversas_iniciadas) > 0 ? num(c.total_spend) / num(c.total_conversas_iniciadas) : 0);
                    const st = statusFor(custo);
                    const isExpanded = expandedCampaign === c.campaign_name;
                    const panelId = `camp-${c.campaign_name.replace(/[^a-z0-9]/gi, "")}`;
                    return (
                      <div key={c.campaign_name} className="rounded-xl border border-white/[0.08] bg-zinc-950/40">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          onClick={() => setExpandedCampaign(isExpanded ? null : c.campaign_name)}
                          className="flex w-full items-start justify-between gap-3 p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-xl"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-medium text-zinc-100">{c.campaign_name}</span>
                            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs tabular-nums text-zinc-400">
                              {num(c.total_conversas_iniciadas) > 0 ? <StatusBadge tone={STATUS_TONE[st]}>{st}</StatusBadge> : <StatusBadge tone="neutral">Sem conversas</StatusBadge>}
                              <span>{n(num(c.total_conversas_iniciadas))} conversas</span>
                              <span>{num(c.total_conversas_iniciadas) > 0 ? `${brl(custo)} cada` : ""}</span>
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-semibold tabular-nums text-zinc-100">{brl(num(c.total_spend))}</span>
                            <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />
                          </span>
                        </button>
                        {isExpanded && (
                          <dl id={panelId} className="grid grid-cols-3 gap-3 border-t border-white/[0.06] p-3.5 text-xs tabular-nums">
                            {[
                              ["CTR", pct(num(c.avg_ctr))], ["CPC", brl(num(c.avg_cpc))], ["CPM", brl(num(c.avg_cpm))],
                              ["Impressões", n(num(c.total_impressions))], ["Cliques", n(num(c.total_clicks))], ["Leads Meta", n(num(c.total_leads_meta))],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-zinc-500">{label}</dt>
                                <dd className="mt-0.5 font-medium text-zinc-200">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Surface>
          </>
        )}
      </Page>

      {isAdmin && printModalOpen && (
        <DashboardMetricsExportModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          unitName={selectedClient?.name ?? "Unidade"}
          periodLabel={period === CUSTOM_PERIOD ? formatDashboardDateRange(activeRange) : PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "30 dias"}
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
      )}
    </AppLayout>
  );
}
