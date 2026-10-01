import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ExternalLink, FileSpreadsheet, Globe, Link2, MapPin, MessageCircle, MousePointerClick, RefreshCw, Settings2, Target, Timer, UsersRound, Wallet } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LandingPageManager } from "@/components/google/LandingPageManager";
import {
  ACCENTS, Button, DateRangePicker, toast, EmptyState, IconButton, InlineNotice, Page, PageHeader, SegmentedControl, Select,
  StatTile, Surface, SurfaceHeader, type Accent, type Delta,
} from "@/components/ds";
import { useClientContext } from "@/contexts/ClientContext";
import { CHART, CHART_CHROME, chartAxisTick, chartTooltipStyle } from "@/lib/chartPalette";
import { CUSTOM_PERIOD, formatDashboardDateRange, getPresetDashboardDateRange } from "@/lib/dashboardDateRange";
import { buildGa4Sheets, downloadGa4Workbook, ga4ExportFileName } from "@/lib/ga4Export";
import { fetchGa4Report, fetchLandingPages, GoogleRequestError } from "@/lib/googleApi";
import { ga4LinkRequestUrl } from "@/lib/support";
import { formatCurrency, formatNumber, formatRatio, formatShortDate, formatTime } from "@/lib/format";
import type { Ga4LandingPage, Ga4LandingPagesResponse, Ga4Report } from "../../../shared/google";

type PeriodValue = "7" | "30" | "90" | typeof CUSTOM_PERIOD;
const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!localStorage.getItem("tp_token")) setLocation("/login");
  }, [setLocation]);
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

const periodDays = (start: string, end: string) => Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;

/** 86 → "1min 26s"; 14 → "14s". */
function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const rest = total % 60;
  return rest ? `${Math.floor(total / 60)}min ${rest}s` : `${Math.floor(total / 60)}min`;
}

function ChartPanel({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: Accent; children: React.ReactNode }) {
  return (
    <Surface>
      <SurfaceHeader title={title} icon={icon} accent={accent} />
      <div className="h-[220px] w-full px-3 pb-3 pt-4 sm:h-[260px]">{children}</div>
    </Surface>
  );
}

function DailyArea({ data, dataKey, color, label }: { data: { d: string; [key: string]: number | string }[]; dataKey: string; color: string; label: string }) {
  const gradientId = `g-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
        <XAxis dataKey="d" tick={chartAxisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <ChartTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [formatNumber(Number(v)), label]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4 }} name={label} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type Column<T> = { label: string; align?: "right"; render: (row: T) => React.ReactNode };

function DataTable<T>({ rows, columns, rowKey, minWidth = 640 }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T, index: number) => string; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
            {columns.map((column, index) => (
              <th key={column.label} scope="col" className={`py-2.5 font-medium ${index === 0 ? "pl-5 pr-4" : "px-3"} ${column.align === "right" ? "text-right" : ""} ${index === columns.length - 1 ? "pr-5" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowKey(row, rowIndex)} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
              {columns.map((column, index) => (
                <td key={column.label} className={`py-2.5 ${index === 0 ? "max-w-[360px] truncate pl-5 pr-4 text-zinc-100" : "px-3 tabular-nums text-zinc-300"} ${column.align === "right" ? "text-right" : ""} ${index === columns.length - 1 ? "pr-5" : ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando dados do Google">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[118px] animate-pulse rounded-2xl bg-white/[0.04]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="h-[300px] animate-pulse rounded-2xl bg-white/[0.04]" />)}
      </div>
    </div>
  );
}

function LandingPageNotLinked({ unitName, canManage, onLink }: { unitName?: string | null; canManage: boolean; onLink: () => void }) {
  return (
    <Surface>
      <EmptyState
        icon={<Globe />}
        title="Conecte a Landing Page"
        description="Com a Landing Page vinculada, você acompanha aqui as visitas, conversões e campanhas do Google Ads. A equipe da Tráfego Pro faz o vínculo pra você."
        action={
          canManage ? (
            <Button variant="primary" onClick={onLink}>
              <Link2 />
              Vincular Landing Page
            </Button>
          ) : (
            <Button asChild variant="primary">
              <a href={ga4LinkRequestUrl(unitName)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                Falar com o suporte da Tráfego Pro
              </a>
            </Button>
          )
        }
      />
    </Surface>
  );
}

export default function DashboardGoogle() {
  useAuthGuard();
  const [, setLocation] = useLocation();
  useEffect(() => { document.title = "Tráfego Pro — Google Analytics"; }, []);
  const { selectedClientId, selectedClient, loading: clientsLoading } = useClientContext();

  // Landing Pages (propriedades do GA4) vinculadas à unidade (conta da Meta) selecionada no menu.
  const [links, setLinks] = useState<Ga4LandingPagesResponse | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksAttempt, setLinksAttempt] = useState(0);
  const [landingPageId, setLandingPageId] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>("30");
  const [customRange, setCustomRange] = useState(() => getPresetDashboardDateRange("30"));
  const range = useMemo(() => (period === CUSTOM_PERIOD ? customRange : getPresetDashboardDateRange(period)), [customRange, period]);

  const [report, setReport] = useState<Ga4Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLinks(null);
    setLinksError(null);
    setLandingPageId("");
    setReport(null);
    if (!selectedClientId) return;
    const controller = new AbortController();
    fetchLandingPages(selectedClientId, controller.signal)
      .then((data) => {
        setLinks(data);
        setLandingPageId(data.landingPages[0]?.id ?? "");
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        if (caught instanceof GoogleRequestError && caught.status === 401) { setLocation("/login"); return; }
        setLinksError(caught instanceof Error ? caught.message : "Não foi possível verificar a Landing Page desta unidade.");
      });
    return () => controller.abort();
  }, [linksAttempt, selectedClientId, setLocation]);

  const landingPages = links?.landingPages ?? null;
  const canManage = Boolean(links?.canManage);
  const googleConnected = Boolean(links?.configured);

  function updateLandingPages(next: Ga4LandingPage[]) {
    setLinks((current) => (current ? { ...current, landingPages: next } : current));
    setLandingPageId((current) => (next.some((item) => item.id === current) ? current : next[0]?.id ?? ""));
  }

  const load = useCallback((fresh = false) => {
    if (!landingPageId || !selectedClientId || !googleConnected) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    fetchGa4Report({ unitId: selectedClientId, landingPageId, start: range.start, end: range.end, fresh }, controller.signal)
      .then(setReport)
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados do Google.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, [googleConnected, landingPageId, range.end, range.start, selectedClientId]);

  useEffect(() => {
    setReport(null);
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const landingPage = landingPages?.find((item) => item.id === landingPageId);
  // Sem endereço cadastrado, o botão usa o domínio com mais visitas no período.
  const topHost = report?.landingPages.find((row) => row.hostName && row.hostName !== "(not set)")?.hostName;
  const landingPageUrl = landingPage?.siteUrl ?? (topHost ? `https://${topHost}/` : null);

  // Mesma regra da planilha de Meta Ads: exportação só para administradores.
  async function exportWorkbook() {
    if (!report || !selectedClientId) return;
    const unitName = selectedClient?.name ?? selectedClientId;
    setExporting(true);
    try {
      const sheets = buildGa4Sheets(report, {
        unitName,
        unitId: selectedClientId,
        landingPageName: landingPage?.name ?? null,
        siteUrl: landingPageUrl,
        periodLabel: formatDashboardDateRange({ start: report.start, end: report.end }),
      });
      await downloadGa4Workbook(sheets, ga4ExportFileName(unitName, report.start, report.end));
      toast.success(`Planilha do Google Analytics de ${unitName} gerada.`);
    } catch {
      toast.error("Não foi possível gerar a planilha. Tente de novo.");
    } finally {
      setExporting(false);
    }
  }
  const totals = report?.totals;
  const chart = useMemo(
    () => (report?.daily ?? []).map((row) => ({ d: formatShortDate(row.date), sessoes: row.sessions, eventos: row.keyEvents })),
    [report],
  );
  const hasAds = Boolean(report && (report.campaigns.length > 0 || report.totals.adCost > 0));

  let body: React.ReactNode;
  if (clientsLoading) {
    body = <ReportSkeleton />;
  } else if (!selectedClientId) {
    body = <Surface><EmptyState icon={<Globe />} title="Selecione uma unidade" description="Escolha a unidade no menu para ver o Google Analytics da Landing Page dela." /></Surface>;
  } else if (linksError) {
    body = (
      <Surface>
        <EmptyState
          icon={<AlertTriangle />}
          title="Não conseguimos verificar a Landing Page desta unidade"
          description={linksError}
          action={<Button size="sm" onClick={() => setLinksAttempt((n) => n + 1)}><RefreshCw />Tentar de novo</Button>}
        />
      </Surface>
    );
  } else if (landingPages === null) {
    body = <ReportSkeleton />;
  } else if (landingPages.length === 0) {
    body = <LandingPageNotLinked unitName={selectedClient?.name} canManage={canManage} onLink={() => setManagerOpen(true)} />;
  } else if (!googleConnected) {
    body = (
      <Surface>
        <EmptyState
          icon={<Globe />}
          title="Landing Page vinculada"
          description={
            canManage
              ? "Falta configurar a conta de serviço do Google no servidor (GA4_SERVICE_ACCOUNT_JSON). Os dados aparecem aqui assim que ela estiver ativa."
              : "Os dados da Landing Page aparecem aqui assim que a conexão com o Google Analytics for ativada pela equipe da Tráfego Pro."
          }
        />
      </Surface>
    );
  } else if (!report && loading) {
    body = <ReportSkeleton />;
  } else if (!report) {
    body = (
      <Surface>
        <EmptyState
          icon={<AlertTriangle />}
          title="Não conseguimos carregar o Google Analytics"
          description={error ?? undefined}
          action={<Button size="sm" onClick={() => load(true)}><RefreshCw />Tentar de novo</Button>}
        />
      </Surface>
    );
  } else {
    const current = report.totals;
    const previous = report.previousTotals;
    const deltaLabel = `vs. ${formatNumber(periodDays(report.start, report.end))} dias anteriores`;
    const delta = (now: number, before: number, goodWhen: "up" | "down" | "neutral" = "up"): Delta | undefined =>
      before > 0 ? { value: (now - before) / before, label: deltaLabel, goodWhen } : undefined;
    const adsKeyEvents = report.campaigns.reduce((sum, row) => sum + row.keyEvents, 0);
    const keyEventsHint = report.keyEventsByName.map((row) => `${row.label} ${formatNumber(row.count)}`).join(" · ") || undefined;
    body = (
      <>
        {current.sessions === 0 && (
          <InlineNotice tone="info" icon={<Globe />}>
            Nenhuma visita registrada neste período. Se a Landing Page está no ar, a tag do Google Analytics pode não estar instalada nela.
          </InlineNotice>
        )}
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <StatTile label="Sessões" value={formatNumber(current.sessions)} delta={delta(current.sessions, previous.sessions)} icon={<MousePointerClick />} accent="violet" trend={report.daily.map((d) => d.sessions)} />
          <StatTile label="Usuários" value={formatNumber(current.users)} delta={delta(current.users, previous.users)} hint={`${formatNumber(current.newUsers)} novos`} icon={<UsersRound />} accent="neutral" />
          <StatTile
            label="Taxa de engajamento"
            value={formatRatio(current.engagementRate)}
            delta={delta(current.engagementRate, previous.engagementRate)}
            hint={hasAds ? `tempo médio ${formatDuration(current.avgEngagementSeconds)}` : `${formatNumber(current.engagedSessions)} sessões engajadas`}
            icon={<Activity />}
            accent="violet"
          />
          <StatTile label="Conversões" value={formatNumber(current.keyEvents)} delta={delta(current.keyEvents, previous.keyEvents)} hint={keyEventsHint} icon={<Target />} accent="aqua" trend={report.daily.map((d) => d.keyEvents)} />
          <StatTile label="Taxa de conversão" value={formatRatio(current.conversionRate)} delta={delta(current.conversionRate, previous.conversionRate)} hint="sessões com conversão" icon={<Target />} accent="aqua" />
          {hasAds ? (
            <StatTile
              label="Investimento Google Ads"
              value={formatCurrency(current.adCost)}
              delta={delta(current.adCost, previous.adCost, "neutral")}
              hint={adsKeyEvents > 0 ? `${formatCurrency(current.adCost / adsKeyEvents)} por conversão` : `${formatNumber(current.adClicks)} cliques`}
              icon={<Wallet />}
              accent="blue"
            />
          ) : (
            <StatTile
              label="Tempo médio"
              value={formatDuration(current.avgEngagementSeconds)}
              delta={delta(current.avgEngagementSeconds, previous.avgEngagementSeconds)}
              hint="de engajamento por usuário"
              icon={<Timer />}
              accent="neutral"
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartPanel title="Sessões por dia" icon={<MousePointerClick />} accent="violet">
            <DailyArea data={chart} dataKey="sessoes" color={ACCENTS.violet.line} label="Sessões" />
          </ChartPanel>
          <ChartPanel title="Conversões por dia" icon={<Target />} accent="aqua">
            <DailyArea data={chart} dataKey="eventos" color={CHART.aqua} label="Conversões" />
          </ChartPanel>
        </div>

        <Surface>
          <SurfaceHeader
            title="Campanhas do Google Ads"
            description={hasAds ? `${report.campaigns.length} ${report.campaigns.length === 1 ? "campanha" : "campanhas"} no período` : undefined}
            icon={<Wallet />}
            accent="blue"
          />
          {report.campaignsError ? (
            <div className="p-4"><InlineNotice tone="warning" icon={<AlertTriangle />}>{report.campaignsError}</InlineNotice></div>
          ) : report.campaigns.length === 0 ? (
            <EmptyState
              title="Sem campanhas do Google Ads no período"
              description="Se a unidade anuncia no Google, confira se a conta do Google Ads está vinculada a esta propriedade do GA4 (Administrador → Vinculações de produtos)."
            />
          ) : (
            <DataTable
              rows={report.campaigns}
              rowKey={(row) => row.campaign}
              minWidth={820}
              columns={[
                { label: "Campanha", render: (row) => <span title={row.campaign}>{row.campaign}</span> },
                { label: "Investimento", align: "right", render: (row) => formatCurrency(row.cost) },
                { label: "Impressões", align: "right", render: (row) => formatNumber(row.impressions) },
                { label: "Cliques", align: "right", render: (row) => formatNumber(row.clicks) },
                { label: "CTR", align: "right", render: (row) => formatRatio(ratio(row.clicks, row.impressions)) },
                { label: "Conversões", align: "right", render: (row) => formatNumber(row.keyEvents) },
                { label: "Custo/conversão", align: "right", render: (row) => (row.keyEvents > 0 ? formatCurrency(row.cost / row.keyEvents) : "—") },
              ]}
            />
          )}
        </Surface>

        <Surface>
          <SurfaceHeader title="Páginas de entrada" description="Onde as sessões começaram" icon={<Globe />} accent="violet" />
          {report.landingPages.length === 0 ? (
            <EmptyState title="Sem sessões no período" />
          ) : (
            <DataTable
              rows={report.landingPages}
              rowKey={(row) => `${row.hostName}${row.landingPage}`}
              columns={[
                {
                  label: "Página",
                  render: (row) => (
                    <span title={`${row.hostName}${row.landingPage}`}>
                      {landingPage && landingPage.hostnames.length === 1 ? null : (
                        <span className="text-zinc-500">{row.hostName}{row.landingPage.startsWith("/") ? "" : " · "}</span>
                      )}
                      {row.landingPage.startsWith("/") ? row.landingPage : <span className="text-zinc-400">{row.landingPage}</span>}
                    </span>
                  ),
                },
                { label: "Sessões", align: "right", render: (row) => formatNumber(row.sessions) },
                { label: "Engajamento", align: "right", render: (row) => formatRatio(ratio(row.engagedSessions, row.sessions)) },
                { label: "Conversões", align: "right", render: (row) => formatNumber(row.keyEvents) },
                { label: "Taxa de conversão", align: "right", render: (row) => formatRatio(ratio(row.convertedSessions, row.sessions)) },
              ]}
            />
          )}
        </Surface>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Surface>
            <SurfaceHeader title="Cidades" description="De onde vêm as visitas. Confira se o tráfego está na região que a unidade atende." icon={<MapPin />} accent="violet" />
            {report.cities.length === 0 ? (
              <EmptyState title="Sem sessões no período" />
            ) : (
              <DataTable
                rows={report.cities}
                rowKey={(row) => row.city}
                minWidth={480}
                columns={[
                  { label: "Cidade", render: (row) => (row.city === "(cidade não identificada)" ? <span className="text-zinc-400">{row.city}</span> : row.city) },
                  { label: "Sessões", align: "right", render: (row) => formatNumber(row.sessions) },
                  { label: "% das sessões", align: "right", render: (row) => formatRatio(ratio(row.sessions, current.sessions)) },
                  { label: "Conversões", align: "right", render: (row) => formatNumber(row.keyEvents) },
                  { label: "Taxa de conversão", align: "right", render: (row) => formatRatio(ratio(row.convertedSessions, row.sessions)) },
                ]}
              />
            )}
          </Surface>

          <Surface>
            <SurfaceHeader title="Origem / mídia" icon={<MousePointerClick />} accent="neutral" />
            {report.sources.length === 0 ? (
              <EmptyState title="Sem sessões no período" />
            ) : (
              <DataTable
                rows={report.sources}
                rowKey={(row) => row.sourceMedium}
                minWidth={420}
                columns={[
                  { label: "Origem / mídia", render: (row) => row.sourceMedium },
                  { label: "Sessões", align: "right", render: (row) => formatNumber(row.sessions) },
                  { label: "Conversões", align: "right", render: (row) => formatNumber(row.keyEvents) },
                ]}
              />
            )}
          </Surface>
        </div>
      </>
    );
  }

  const subtitle = [selectedClient?.name ?? "Nenhuma unidade selecionada", landingPages && landingPages.length === 1 ? landingPage?.name : null, report ? `Atualizado às ${formatTime(report.fetchedAt)}` : null].filter(Boolean).join(" · ");

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Google Analytics"
          subtitle={subtitle}
          actions={
            <>
              {landingPages && landingPages.length > 1 && (
                <Select
                  aria-label="Landing Page"
                  value={landingPageId}
                  onValueChange={setLandingPageId}
                  options={landingPages.map((item) => ({ value: item.id, label: item.name }))}
                  className="w-64"
                />
              )}
              {landingPageUrl && (
                <Button asChild>
                  <a href={landingPageUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    Abrir Landing Page
                  </a>
                </Button>
              )}
              {canManage && landingPages && landingPages.length > 0 && googleConnected && (
                <Button disabled={!report || loading} loading={exporting} onClick={() => void exportWorkbook()}>
                  <FileSpreadsheet />
                  Planilha Excel
                </Button>
              )}
              {canManage && landingPages && landingPages.length > 0 && (
                <Button onClick={() => setManagerOpen(true)}>
                  <Settings2 />
                  Landing Pages
                </Button>
              )}
              <IconButton
                label="Atualizar"
                icon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
                onClick={() => load(true)}
                disabled={loading || !landingPageId || !googleConnected}
              />
            </>
          }
        >
          {googleConnected && landingPages && landingPages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl aria-label="Período" value={period} onValueChange={(value) => setPeriod(value)} options={PERIOD_OPTIONS} />
              <DateRangePicker
                aria-label="Período personalizado"
                value={period === CUSTOM_PERIOD ? customRange : { start: "", end: "" }}
                onChange={(next) => { setCustomRange(next); setPeriod(CUSTOM_PERIOD); }}
                placeholder="Personalizado"
                max={getPresetDashboardDateRange("1").end}
                className={period === CUSTOM_PERIOD ? "w-auto border-emerald-500/40" : "w-auto"}
              />
            </div>
          )}
        </PageHeader>

        {error && report && (
          <InlineNotice tone="warning" icon={<AlertTriangle />} action={<Button size="sm" variant="ghost" onClick={() => load(true)}>Tentar de novo</Button>}>
            {error} Mostrando a última consulta.
          </InlineNotice>
        )}

        {body}
      </Page>

      {canManage && selectedClientId && links && (
        <LandingPageManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          unitId={selectedClientId}
          unitName={selectedClient?.name ?? null}
          landingPages={links.landingPages}
          serviceAccountEmail={links.serviceAccountEmail}
          onChange={updateLandingPages}
        />
      )}
    </AppLayout>
  );
}
