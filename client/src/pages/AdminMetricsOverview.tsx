import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Activity, ChevronDown, FileSpreadsheet, HelpCircle, MessageCircle, RefreshCw, Search, Target, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  ActionsMenu,
  EmptyState,
  IconButton,
  IconChip,
  Input,
  Meter,
  Page,
  PageHeader,
  Popover,
  SegmentedControl,
  Select,
  StatTile,
  StatusBadge,
  Surface,
} from "@/components/ds";
import { GRADE_STYLE, PredictiveAnalysis, STATUS_META, goalLabel, type PredictiveUnitProfile } from "@/components/DeepAnalyticsAccordion";
import { formatCurrency, formatNumber, formatRatio } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface GlobalAnalyticsReport {
  timestamp: string;
  date: string;
  totalUnits: number;
  daysLeftInMonth: number;
  totalMonthSpend: number;
  totalMonthLeads: number;
  avgNetworkCpl: number;
  totalNetworkTarget: number;
  networkGoalPacePct: number;
  summary: {
    criticalUnitsCount: number;
    warningUnitsCount: number;
    healthyUnitsCount: number;
  };
  rankedProfiles: PredictiveUnitProfile[];
}

type StatusFilter = "ALL" | "CRITICO" | "ATENCAO" | "NORMAL";
type SortBy = "score" | "cpl" | "risk" | "name";


/** Como ler os números da tela (antes um bloco fixo que empurrava a lista). */
function HowToRead() {
  return (
    <Popover
      align="end"
      className="w-[min(26rem,calc(100vw-2rem))]"
      tooltip="Como ler esta tela"
      trigger={<IconButton label="Como ler esta tela" icon={<HelpCircle />} />}
    >
      <div className="space-y-3 p-4 text-sm leading-6 text-zinc-300">
        <p className="font-medium text-white">Como ler</p>
        <p><strong className="font-medium text-zinc-100">Nota e saúde (0–100).</strong> A (80+), B (65+), C (50+) ou D. Combina custo por conversa (35%), conversão (25%), tendência do custo (20%) e ritmo da meta (20%).</p>
        <p><strong className="font-medium text-zinc-100">Custo por conversa, média de 7 dias.</strong> Suaviza a variação diária do leilão e mostra a direção do custo.</p>
        <p><strong className="font-medium text-zinc-100">Limite de atenção.</strong> Média de 30 dias mais dois desvios. Acima dele, o custo está fora do normal para esta unidade — vale investigar criativo e público. O número não diz a causa.</p>
        <p><strong className="font-medium text-zinc-100">Chance de bater a meta.</strong> Estimada pela taxa de conversão recente e pelos dias restantes. Unidades sem meta cadastrada usam a meta padrão, indicada ao lado do número.</p>
      </div>
    </Popover>
  );
}

function StatusMix({ summary, total }: { summary: GlobalAnalyticsReport["summary"]; total: number }) {
  const parts = [
    { label: "críticas", n: summary.criticalUnitsCount, cls: "bg-rose-400" },
    { label: "em atenção", n: summary.warningUnitsCount, cls: "bg-amber-400" },
    { label: "estáveis", n: summary.healthyUnitsCount, cls: "bg-emerald-400" },
  ];
  const sum = Math.max(1, parts.reduce((s, p) => s + p.n, 0));
  return (
    <div className="ds-rise min-w-0 rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-400">Situação das unidades</p>
        <IconChip icon={<Activity />} accent="violet" size="sm" />
      </div>
      <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-white sm:text-[28px]">{formatNumber(total)}</p>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        {parts.map((p) => <div key={p.label} className={p.cls} style={{ width: `${(p.n / sum) * 100}%` }} />)}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-zinc-400">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1"><span className={cn("size-1.5 rounded-full", p.cls)} aria-hidden />{p.n} {p.label}</span>
        ))}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium tabular-nums text-zinc-100">{value}</p>
      {hint && <p className="truncate text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function AdminMetricsOverviewPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<GlobalAnalyticsReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Tráfego Pro — Métricas da Rede";
    const token = localStorage.getItem("tp_token");
    if (!token) {
      setLocation("/login");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      if (user?.role !== "admin") {
        toast.error("Acesso restrito a administradores.");
        setLocation("/dashboard");
        return;
      }
    } catch {
      setLocation("/dashboard");
      return;
    }

    loadData();
  }, [setLocation]);

  const loadData = () => {
    const token = localStorage.getItem("tp_token");
    setLoading(true);

    fetch("/api/analytics/overview", {
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar métricas globais");
        return res.json();
      })
      .then((data: GlobalAnalyticsReport) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar relatório global:", err);
        toast.error("Não foi possível carregar as métricas da rede.");
        setLoading(false);
      });
  };

  const handleExportCsv = () => {
    if (!report?.rankedProfiles || report.rankedProfiles.length === 0) return;
    const headers = [
      "Unidade",
      "Score",
      "Grade",
      "Status",
      "CPL 7d (SMA)",
      "Média 30d",
      "Teto 2sigma",
      "Meta Mensal",
      "Leads Realizados",
      "Probabilidade Meta (%)",
      "Ritmo Atual (leads/dia)",
      "Ritmo Necessario (leads/dia)",
      "Taxa Conversao (%)",
      "Diagnostico",
      "Acao Recomendada",
    ];

    const rows = report.rankedProfiles.map((p) => [
      `"${p.unitName.replace(/"/g, '""')}"`,
      p.score.scoreFinal,
      p.score.grade,
      p.statusFlag,
      p.cplMetrics.sma7Current.toFixed(2),
      p.cplMetrics.mean30d.toFixed(2),
      p.cplMetrics.upperBound2Sigma.toFixed(2),
      p.goalProbability.totalTarget,
      p.goalProbability.currentLeads,
      (p.goalProbability.probability * 100).toFixed(1),
      p.goalProbability.currentLeadsPerDay,
      p.goalProbability.requiredLeadsPerDay,
      (p.confidenceInterval.conversionRate * 100).toFixed(1),
      `"${p.diagnosis.hypothesisTitle.replace(/"/g, '""')}"`,
      `"${p.diagnosis.actionPlan.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `metricas_rede_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Planilha exportada");
  };

  const filteredAndSortedProfiles = useMemo(() => {
    if (!report?.rankedProfiles) return [];
    let list = report.rankedProfiles.filter((p) => {
      const matchSearch =
        !searchTerm.trim() ||
        p.unitName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
          searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
      const matchStatus = statusFilter === "ALL" || p.statusFlag === statusFilter;
      return matchSearch && matchStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "score") return b.score.scoreFinal - a.score.scoreFinal;
      if (sortBy === "cpl") return a.cplMetrics.sma7Current - b.cplMetrics.sma7Current;
      if (sortBy === "risk") return a.goalProbability.probability - b.goalProbability.probability;
      if (sortBy === "name") return a.unitName.localeCompare(b.unitName);
      return 0;
    });

    return list;
  }, [report, searchTerm, statusFilter, sortBy]);

  const allExpanded = filteredAndSortedProfiles.length > 0 && filteredAndSortedProfiles.every((p) => expanded.has(p.unitId));
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Métricas da Rede"
          subtitle={report ? `${report.totalUnits} unidades · faltam ${report.daysLeftInMonth} dias para fechar o mês` : "Quais unidades precisam de atenção hoje."}
          actions={
            <>
              <HowToRead />
              <IconButton label="Atualizar" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={loadData} disabled={loading} />
              <ActionsMenu
                label="Mais ações"
                items={[
                  { label: "Exportar planilha (CSV)", icon: <FileSpreadsheet />, disabled: !report, onSelect: handleExportCsv },
                  {
                    label: allExpanded ? "Recolher todas as análises" : "Abrir todas as análises",
                    disabled: !report,
                    onSelect: () => setExpanded(allExpanded ? new Set() : new Set(filteredAndSortedProfiles.map((p) => p.unitId))),
                  },
                ]}
              />
            </>
          }
        />

        {report && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Investimento no mês" icon={<Wallet />} accent="blue" value={formatCurrency(report.totalMonthSpend)} hint="Todas as contas ativas" />
            <div className="ds-rise min-w-0 rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-400">Leads no mês</p>
                <IconChip icon={<MessageCircle />} accent="aqua" size="sm" />
              </div>
              <p className="mt-1.5 font-display text-2xl font-semibold text-white sm:text-[28px]">{formatNumber(report.totalMonthLeads)}</p>
              <Meter className="mt-2" value={report.networkGoalPacePct / 100} tone="brand" label="Leads em relação à meta da rede" />
              <p className="mt-1.5 text-xs text-zinc-500">{formatNumber(report.networkGoalPacePct, 1)}% de {formatNumber(report.totalNetworkTarget)} da meta</p>
            </div>
            <StatTile label="Custo médio por conversa" icon={<Target />} accent="orange" value={formatCurrency(report.avgNetworkCpl)} hint="Ponderado pelo volume" />
            <StatusMix summary={report.summary} total={report.totalUnits} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Input leading={<Search />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar unidade" aria-label="Buscar unidade" />
          </div>
          <SegmentedControl
            aria-label="Situação"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: "ALL", label: "Todas", count: report?.rankedProfiles.length ?? 0 },
              { value: "CRITICO", label: "Críticas", count: report?.summary.criticalUnitsCount ?? 0, tone: "danger" },
              { value: "ATENCAO", label: "Atenção", count: report?.summary.warningUnitsCount ?? 0, tone: "warning" },
              { value: "NORMAL", label: "Estáveis", count: report?.summary.healthyUnitsCount ?? 0, tone: "success" },
            ]}
          />
          <Select
            aria-label="Ordenar por"
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortBy)}
            className="w-full sm:ml-auto sm:w-56"
            options={[
              { value: "score", label: "Maior nota de saúde" },
              { value: "risk", label: "Maior risco de meta" },
              { value: "cpl", label: "Menor custo por conversa" },
              { value: "name", label: "Nome (A–Z)" },
            ]}
          />
        </div>

        {loading && !report ? (
          <Surface><EmptyState title="Calculando as métricas das unidades…" /></Surface>
        ) : filteredAndSortedProfiles.length === 0 ? (
          <Surface><EmptyState title="Nenhuma unidade encontrada" description="Ajuste a busca ou a situação." /></Surface>
        ) : (
          <Surface className="divide-y divide-white/[0.06] overflow-hidden">
            {filteredAndSortedProfiles.map((p) => {
              const isOpen = expanded.has(p.unitId);
              const status = STATUS_META[p.statusFlag];
              const gp = p.goalProbability;
              const pct = gp.totalTarget > 0 ? gp.currentLeads / gp.totalTarget : 0;
              return (
                <div key={p.unitId}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(p.unitId)}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-4 text-left outline-none transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.04] lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,2fr)_auto]"
                  >
                    <span
                      className={cn("flex size-10 items-center justify-center rounded-xl font-display text-base font-semibold ring-1 ring-inset", GRADE_STYLE[p.score.grade] ?? "bg-white/[0.04] text-zinc-200 ring-white/10")}
                      aria-label={`Nota ${p.score.grade}, ${p.score.scoreFinal} de 100`}
                    >
                      {p.score.grade}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-100">{p.unitName}</span>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-400">{p.diagnosis.hypothesisTitle}</span>
                    </span>
                    <span className="col-span-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-1">
                      <Kpi label="Custo 7 dias" value={formatCurrency(p.cplMetrics.sma7Current)} hint={p.cplMetrics.trendLabel} />
                      <Kpi label="Leads / meta" value={`${formatNumber(gp.currentLeads)} / ${goalLabel(gp)}`} hint={`${formatRatio(pct, 0)} atingido`} />
                      <div className="min-w-0">
                        <Kpi label="Chance da meta" value={formatRatio(gp.probability, 0)} />
                        <Meter className="mt-1.5 max-w-[7rem]" value={gp.probability} tone={gp.probability >= 0.75 ? "good" : gp.probability >= 0.4 ? "warning" : "critical"} label={`Chance de bater a meta: ${formatRatio(gp.probability, 0)}`} />
                      </div>
                      <Kpi label="Conversão" value={formatRatio(p.confidenceInterval.conversionRate)} hint={`confiança ${p.confidence.level.toLowerCase()}`} />
                    </span>
                    <ChevronDown className={cn("col-start-3 row-start-1 size-4 text-zinc-500 transition-transform lg:col-start-4", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/[0.06] bg-black/20 p-4 sm:p-5">
                      <PredictiveAnalysis data={p} />
                    </div>
                  )}
                </div>
              );
            })}
          </Surface>
        )}
      </Page>
    </AppLayout>
  );
}
