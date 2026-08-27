import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import {
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  RefreshCw,
  Search,
  Building2,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Sliders,
  ArrowUpRight,
  ChevronDown,
  Download,
  Percent,
  Zap,
  Info,
  HelpCircle,
  Compass,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { type PredictiveUnitProfile } from "@/components/DeepAnalyticsAccordion";

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

const axisTick = { fontSize: 10, fill: "#71717a" };
const tooltipStyle: React.CSSProperties = {
  background: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 14,
  fontSize: 12,
  color: "#f4f4f5",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
};

export default function AdminMetricsOverviewPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<GlobalAnalyticsReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICO" | "ATENCAO" | "NORMAL">("ALL");
  const [sortBy, setSortBy] = useState<"score" | "cpl" | "risk" | "name">("score");
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    document.title = "Tráfego Pro — Métricas Globais da Rede";
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
        toast.error("Não foi possível carregar as métricas globais.");
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
    toast.success("Métricas exportadas em CSV com sucesso!");
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-10">
        {/* Top Header Banner */}
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cockpit Estratégico de Tráfego & IA</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Métricas Globais & Projeções da Rede
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 font-light">
              Análise estatística contínua de custo por conversa (CPL), médias móveis de 7 dias, probabilidade de metas e diagnósticos de saturação para o gestor de tráfego.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              <HelpCircle className="size-3.5 text-teal-400" />
              <span>{showGuide ? "Ocultar Guia do Algoritmo" : "Guia do Algoritmo"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !report}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50"
            >
              <Download className="size-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setExpandAll(!expandAll)}
              disabled={loading || !report}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50"
            >
              <span>{expandAll ? "Recolher Todos" : "Expandir Todos"}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Guia Didático Expansível para o Gestor de Tráfego */}
        {showGuide && (
          <div className="rounded-3xl border border-emerald-500/30 bg-zinc-900/90 p-6 backdrop-blur-xl shadow-2xl animate-in fade-in-50 duration-300">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <Compass className="size-5 text-emerald-400" />
              <h3 className="font-display text-base font-bold text-white">
                Guia Rápido de Interpretação das Métricas para o Gestor
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-zinc-300 leading-relaxed">
              <div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-1.5">
                <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-emerald-400" /> Score de Saúde (0 a 100)
                </span>
                <p>
                  Classifica a franquia em <strong>A (≥80)</strong>, <strong>B (≥65)</strong>, <strong>C (≥50)</strong> ou <strong>D (&lt;50)</strong> combinando: CPL (35%), Conversão (25%), Tendência (20%) e Meta (20%).
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-1.5">
                <span className="font-bold text-teal-400 text-sm flex items-center gap-1.5">
                  <TrendingUp className="size-4 text-teal-400" /> SMA 7 (Média Móvel 7d)
                </span>
                <p>
                  Calcula o custo por conversa real dos últimos 7 dias. <em>Elimina a volatilidade natural do leilão diário do Meta Ads</em> e mostra a direção real do custo.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-1.5">
                <span className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
                  <AlertCircle className="size-4 text-rose-400" /> Teto Crítico (μ + 2σ)
                </span>
                <p>
                  Banda superior calculada por Distribuição Normal. Se o CPL ultrapassar esta linha vermelha, há <strong>97.5% de certeza estatística</strong> de que o público saturou ou o anúncio perdeu tração.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-1.5">
                <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <Target className="size-4 text-amber-400" /> Probabilidade Binomial
                </span>
                <p>
                  Projeta a chance real de bater a meta do mês com base na taxa de conversão recente e nos cliques restantes até o último dia do mês.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bloco de KPIs Globais da Rede */}
        {report && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-xl shadow-black/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                  Investimento Total Mês
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-300">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-bold tracking-tight text-amber-400">
                R$ {report.totalMonthSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-500 font-light">
                Verba consolidada em todas as contas ativas
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-xl shadow-black/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                  Leads / Meta da Rede
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                  <Target className="size-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-bold tracking-tight text-emerald-400">
                {report.totalMonthLeads.toLocaleString("pt-BR")} <span className="text-lg font-normal text-zinc-500">/ {report.totalNetworkTarget}</span>
              </div>
              <div className="mt-2 text-xs text-emerald-400/80 font-light">
                {report.networkGoalPacePct.toFixed(1)}% da meta total atingida
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-xl shadow-black/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                  CPL Médio da Rede
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-zinc-300">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
                R$ {report.avgNetworkCpl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-500 font-light">
                Custo médio por conversa ponderado
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-xl shadow-black/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 font-mono">
                  Status das Unidades
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/20 text-teal-300">
                  <Activity className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-bold text-rose-400">
                  <AlertCircle className="size-3.5" /> {report.summary.criticalUnitsCount} Críticas
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <AlertTriangle className="size-3.5" /> {report.summary.warningUnitsCount} Atenção
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> {report.summary.healthyUnitsCount} Saudáveis
                </span>
              </div>
              <div className="mt-2 text-xs text-zinc-500 font-light">
                {report.totalUnits} contas ativas • Restam {report.daysLeftInMonth} dias
              </div>
            </div>
          </div>
        )}

        {/* Filtros, Ordenação e Busca de Unidades */}
        <section className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                Todas ({report?.rankedProfiles.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CRITICO")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  statusFilter === "CRITICO"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-950/40"
                    : "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
                }`}
              >
                <AlertCircle className="size-3.5" />
                <span>Críticas ({report?.summary.criticalUnitsCount ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ATENCAO")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  statusFilter === "ATENCAO"
                    ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-950/40"
                    : "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
                }`}
              >
                <AlertTriangle className="size-3.5" />
                <span>Atenção / Fadiga ({report?.summary.warningUnitsCount ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NORMAL")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  statusFilter === "NORMAL"
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/40"
                    : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Saudáveis ({report?.summary.healthyUnitsCount ?? 0})</span>
              </button>
            </div>

            {/* Controles da Direita (Ordenação + Busca) */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-zinc-500 whitespace-nowrap">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="h-10 rounded-2xl border border-white/10 bg-zinc-950/80 px-3 text-xs text-white outline-none focus:border-emerald-500/60"
                >
                  <option value="score">Score de Saúde (Maior)</option>
                  <option value="risk">Maior Risco de Meta</option>
                  <option value="cpl">Menor CPL (7d)</option>
                  <option value="name">Nome da Unidade (A-Z)</option>
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar unidade / cliente…"
                  className="h-10 w-full rounded-2xl border border-white/10 bg-zinc-950/80 pl-10 pr-4 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Lista de Unidades */}
        {loading ? (
          <div className="py-20 text-center text-sm text-zinc-400 flex flex-col items-center justify-center gap-3">
            <Activity className="size-8 animate-spin text-emerald-400" />
            <span>Processando inteligência estatística e previsões de todas as unidades...</span>
          </div>
        ) : filteredAndSortedProfiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/30 p-12 text-center text-sm text-zinc-400">
            Nenhuma unidade encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedProfiles.map((p) => {
              const isExpanded = expandAll || expandedUnitId === p.unitId;
              const scoreBadgeColor =
                p.score.grade === "A"
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                  : p.score.grade === "B"
                  ? "border-teal-500/30 bg-teal-500/15 text-teal-300"
                  : p.score.grade === "C"
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                  : "border-rose-500/30 bg-rose-500/15 text-rose-400";

              const statusBadge =
                p.statusFlag === "CRITICO"
                  ? { label: "Gatilho Crítico", cls: "border-rose-500/30 bg-rose-500/15 text-rose-400", icon: AlertCircle }
                  : p.statusFlag === "ATENCAO"
                  ? { label: "Fadiga / Atenção", cls: "border-amber-500/30 bg-amber-500/15 text-amber-400", icon: AlertTriangle }
                  : { label: "Estável", cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400", icon: CheckCircle2 };

              const StatusIcon = statusBadge.icon;

              const chartMiniData = p.sma7Series.slice(-14).map((pt) => ({
                d: pt.date ? pt.date.slice(5).split("-").reverse().join("/") : "",
                cpl: pt.cpl > 0 ? pt.cpl : null,
                sma7: pt.sma7 > 0 ? pt.sma7 : null,
                upperBound: pt.upperBound2Sigma > 0 ? pt.upperBound2Sigma : null,
              }));

              return (
                <div
                  key={p.unitId}
                  className="rounded-3xl border border-white/10 bg-zinc-900/60 shadow-xl backdrop-blur-xl overflow-hidden transition-all hover:border-white/15"
                >
                  {/* Card Header Resumido */}
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-400 font-bold text-sm">
                        {p.score.grade}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-base font-bold text-white">{p.unitName}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${scoreBadgeColor}`}>
                            Score: {p.score.scoreFinal}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.cls}`}>
                            <StatusIcon className="size-3" />
                            <span>{statusBadge.label}</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {p.diagnosis.hypothesisTitle}
                        </p>
                      </div>
                    </div>

                    {/* KPIs Rápidos na Linha */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:flex lg:items-center lg:gap-6 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">CPL 7d (SMA)</span>
                        <p className="mt-0.5 font-bold text-white">R$ {p.cplMetrics.sma7Current.toFixed(2)}</p>
                        <span className="text-[10px] text-zinc-400">{p.cplMetrics.trendLabel}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">Meta Mensal</span>
                        <p className="mt-0.5 font-bold text-white">
                          {p.goalProbability.currentLeads} / {p.goalProbability.totalTarget}
                        </p>
                        <span className="text-[10px] text-emerald-400">
                          {Math.round((p.goalProbability.currentLeads / Math.max(1, p.goalProbability.totalTarget)) * 100)}% atingido
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">Prob. Meta</span>
                        <p className="mt-0.5 font-bold text-teal-300">
                          {(p.goalProbability.probability * 100).toFixed(0)}%
                        </p>
                        <span className="text-[10px] text-zinc-400">Ritmo: {p.goalProbability.currentLeadsPerDay}/d</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">Conversão</span>
                        <p className="mt-0.5 font-bold text-white">
                          {(p.confidenceInterval.conversionRate * 100).toFixed(1)}%
                        </p>
                        <span className="text-[10px] text-zinc-500">{p.confidence.level} conf.</span>
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="flex items-center gap-2 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => setExpandedUnitId(isExpanded && !expandAll ? null : p.unitId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/5 active:scale-95"
                      >
                        <span>{isExpanded ? "Ocultar Detalhes" : "Ver Análise"}</span>
                        <ChevronDown className={`size-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes Expansíveis da Unidade (Visão Nativa do Gestor de Tráfego) */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-5 sm:p-7 space-y-6 bg-black/25 animate-in fade-in-50 duration-200">
                      {/* Grid Principal: Fatos/Ação vs Gráfico com Legendas */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Coluna Esquerda: Diagnóstico & Plano de Ação Estratégico */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 space-y-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                              <Info className="size-3.5 text-emerald-400" />
                              Fatos Estatísticos Identificados
                            </span>
                            <ul className="space-y-2 text-xs text-zinc-300">
                              {p.diagnosis.evidenceFacts.map((fact, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                                  <span className="leading-relaxed">{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4.5 space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
                              <ArrowUpRight className="size-4" /> Plano de Ação do Gestor:
                            </span>
                            <p className="text-sm text-emerald-100 font-semibold leading-relaxed">
                              {p.diagnosis.actionPlan}
                            </p>
                            <p className="text-[11px] text-emerald-400/80 pt-1">
                              {p.confidence.description}
                            </p>
                          </div>
                        </div>

                        {/* Coluna Direita: Gráfico com Legendas Claras e Eixo Formatado */}
                        <div className="lg:col-span-7 rounded-2xl border border-white/5 bg-zinc-950/70 p-4.5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                            <div>
                              <span className="font-mono uppercase font-bold text-[10px] text-zinc-300">
                                Variação de CPL & Bandas de Controle Estatístico
                              </span>
                              <p className="text-[11px] text-zinc-500">
                                Média Histórica 30d: R$ {p.cplMetrics.mean30d.toFixed(2)} • Teto 2σ: R$ {p.cplMetrics.upperBound2Sigma.toFixed(2)}
                              </p>
                            </div>

                            {/* Legenda Visual Completa */}
                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-sm bg-amber-400" /> CPL Diário
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-400" /> SMA 7d
                              </span>
                              {p.cplMetrics.upperBound2Sigma > 0 && (
                                <span className="flex items-center gap-1.5">
                                  <span className="size-2 border-b border-dashed border-rose-400" /> Teto 2σ
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-52 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={chartMiniData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} />
                                <YAxis
                                  tick={axisTick}
                                  axisLine={false}
                                  tickLine={false}
                                  tickFormatter={(val) => `R$ ${val}`}
                                />
                                <Tooltip
                                  contentStyle={tooltipStyle}
                                  formatter={(val: any) => typeof val === "number" ? [`R$ ${val.toFixed(2)}`, ""] : [val, ""]}
                                />
                                {p.cplMetrics.upperBound2Sigma > 0 && (
                                  <ReferenceLine
                                    y={p.cplMetrics.upperBound2Sigma}
                                    stroke="#ef4444"
                                    strokeDasharray="4 4"
                                    label={{ value: `Teto: R$ ${p.cplMetrics.upperBound2Sigma.toFixed(2)}`, fill: "#ef4444", fontSize: 10 }}
                                  />
                                )}
                                {p.cplMetrics.mean30d > 0 && (
                                  <ReferenceLine
                                    y={p.cplMetrics.mean30d}
                                    stroke="#71717a"
                                    strokeDasharray="2 2"
                                  />
                                )}
                                <Bar dataKey="cpl" name="CPL Diário" fill="#f59e0b" opacity={0.4} radius={[3, 3, 0, 0]} />
                                <Line
                                  type="monotone"
                                  dataKey="sma7"
                                  name="Média 7d (SMA 7)"
                                  stroke="#10b981"
                                  strokeWidth={3}
                                  dot={{ r: 2.5, fill: "#10b981" }}
                                  activeDot={{ r: 5 }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Parâmetros Estratégicos & Intervalo de Confiança */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                            <BarChart3 className="size-3.5 text-emerald-400" />
                            Score Ponderado de Saúde
                          </span>
                          <p className="text-xs text-zinc-200 font-medium">{p.score.scoreSummary}</p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                            <Percent className="size-3.5 text-teal-400" />
                            Taxa de Conversão & IC 95%
                          </span>
                          <p className="text-xs text-zinc-200 font-medium">
                            {(p.confidenceInterval.conversionRate * 100).toFixed(1)}% [IC 95%: {(p.confidenceInterval.lowerBound * 100).toFixed(1)}% a {(p.confidenceInterval.upperBound * 100).toFixed(1)}%] • {p.confidenceInterval.sampleSize} cliques
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                            <Target className="size-3.5 text-amber-400" />
                            Ritmo & Fechamento de Meta
                          </span>
                          <p className="text-xs text-zinc-200 font-medium">
                            {p.goalProbability.paceExplanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
