import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowUpRight,
  BarChart3,
  ShieldCheck,
  Percent,
  Sliders,
  Check,
  Zap,
  Clock,
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

export interface Sma7Point {
  date: string;
  sma7: number;
  cpl: number;
  spend: number;
  leads: number;
  mean30d: number;
  upperBound2Sigma: number;
}

export interface PredictiveUnitProfile {
  unitId: string;
  unitName: string;
  date: string;
  confidence: {
    level: "ALTA" | "MÉDIA" | "BAIXA";
    sampleLeads: number;
    sampleClicks: number;
    historyDays: number;
    description: string;
  };
  cplMetrics: {
    todaySpend: number;
    todayLeads: number;
    cplToday: number | null;
    cplTodayDisplay: string;
    mean30d: number;
    stdDev30d: number;
    upperBound2Sigma: number;
    lowerBound2Sigma: number;
    deviationVsMeanPct: number;
    deviationLabel: string;
    sma7Current: number;
    sma7Previous: number;
    trendDirection: "ALTA" | "QUEDA" | "ESTAVEL";
    trendPct7d: number;
    trendLabel: string;
  };
  confidenceInterval: {
    conversionRate: number;
    lowerBound: number;
    upperBound: number;
    marginError: number;
    sampleSize: number;
    confidenceLevel: number;
  };
  goalProbability: {
    totalTarget: number;
    currentLeads: number;
    remainingLeads: number;
    daysLeft: number;
    requiredLeadsPerDay: number;
    currentLeadsPerDay: number;
    dailyAvgClicks: number;
    projectedClicks: number;
    historicalConversion: number;
    probability: number;
    riskLevel: "ALTA_PROBABILIDADE" | "MODERADA" | "RISCO_ALTO" | "META_ALCANCADA";
    paceExplanation: string;
  };
  score: {
    scoreFinal: number;
    grade: "A" | "B" | "C" | "D";
    notaCpl: number;
    notaConversao: number;
    notaTendencia: number;
    notaVolume: number;
    scoreSummary: string;
  };
  diagnosis: {
    evidenceLevel: "Evidência Forte" | "Evidência Moderada" | "Evidência Fraca";
    hypothesisTitle: string;
    evidenceFacts: string[];
    actionPlan: string;
  };
  statusFlag: "CRITICO" | "ATENCAO" | "NORMAL";
  sma7Series: Sma7Point[];
}

const axisTick = { fontSize: 11, fill: "#71717a" };
const tooltipStyle: React.CSSProperties = {
  background: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 14,
  fontSize: 12,
  color: "#f4f4f5",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
};

function isUserAdmin(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    return user?.role === "admin";
  } catch {
    return false;
  }
}

export function DeepAnalyticsAccordion({
  unitId,
  unitName,
}: {
  unitId: string | null;
  unitName?: string;
}) {
  const isAdmin = isUserAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PredictiveUnitProfile | null>(null);

  useEffect(() => {
    if (!isAdmin || !unitId) {
      setData(null);
      return;
    }

    let isMounted = true;
    const token = localStorage.getItem("tp_token");
    setLoading(true);

    fetch(`/api/analytics/predictive?unit_id=${encodeURIComponent(unitId)}`, {
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar análise");
        return res.json();
      })
      .then((profile) => {
        if (isMounted) {
          setData(profile);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Erro ao carregar análise preditiva:", err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  const chartData = useMemo(() => {
    if (!data?.sma7Series) return [];
    return data.sma7Series.map((pt) => ({
      d: pt.date ? pt.date.slice(5).split("-").reverse().join("/") : "",
      cpl: pt.cpl > 0 ? pt.cpl : null,
      sma7: pt.sma7 > 0 ? pt.sma7 : null,
      media30d: pt.mean30d > 0 ? pt.mean30d : null,
      teto2sigma: pt.upperBound2Sigma > 0 ? pt.upperBound2Sigma : null,
      spend: pt.spend,
      leads: pt.leads,
    }));
  }, [data]);

  if (!isAdmin || !unitId) return null;

  const scoreBadgeColor =
    data?.score.grade === "A"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
      : data?.score.grade === "B"
      ? "border-teal-500/30 bg-teal-500/15 text-teal-300"
      : data?.score.grade === "C"
      ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
      : "border-rose-500/30 bg-rose-500/15 text-rose-400";

  const statusBadge =
    data?.statusFlag === "CRITICO"
      ? { label: "Gatilho Crítico (Atenção Imediata)", cls: "border-rose-500/30 bg-rose-500/15 text-rose-400", icon: AlertCircle }
      : data?.statusFlag === "ATENCAO"
      ? { label: "Gatilho de Tendência (Fadiga em Observação)", cls: "border-amber-500/30 bg-amber-500/15 text-amber-400", icon: AlertTriangle }
      : { label: "Operação em Estabilidade", cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400", icon: CheckCircle2 };

  const StatusIcon = statusBadge.icon;

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">
      {/* Botão de disparo da Sanfona */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 font-mono">
                Análise Avançada & Projeções
              </span>
              {data && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${scoreBadgeColor}`}>
                  Score: {data.score.scoreFinal} ({data.score.grade})
                </span>
              )}
            </div>
            <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>{isOpen ? "Ocultar análise profunda e projeções" : "Abrir análise profunda e projeções"}</span>
            </h2>
          </div>
        </div>

        {/* Badges rápidos na barra fechada */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {data && (
            <>
              <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${statusBadge.cls}`}>
                <StatusIcon className="size-3.5" />
                <span>{statusBadge.label}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                <Target className="size-3.5 text-emerald-400" />
                <span>Prob. Meta: <strong>{(data.goalProbability.probability * 100).toFixed(0)}%</strong></span>
              </div>
            </>
          )}
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <ChevronDown className="size-4" />
          </div>
        </div>
      </button>

      {/* Conteúdo Expansível da Sanfona */}
      {isOpen && (
        <div className="border-t border-white/10 p-5 sm:p-7 space-y-6 animate-in fade-in-50 duration-300">
          {loading && !data ? (
            <div className="py-12 text-center text-sm text-zinc-400 flex flex-col items-center justify-center gap-3">
              <Activity className="size-6 animate-spin text-emerald-400" />
              <span>Processando modelagem estatística e séries de dados...</span>
            </div>
          ) : !data ? (
            <div className="py-8 text-center text-sm text-zinc-400">
              Dados insuficientes para gerar a análise estatística desta unidade.
            </div>
          ) : (
            <>
              {/* Bloco 1: Diagnóstico Baseado em Evidências & Ação Recomendada */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-md shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Diagnóstico Algorítmico</span>
                      <h3 className="font-display text-base font-bold text-white">{data.diagnosis.hypothesisTitle}</h3>
                    </div>
                  </div>
                  <span className="self-start sm:self-center text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-zinc-300">
                    {data.diagnosis.evidenceLevel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-400">Fatos Estatísticos Identificados:</p>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {data.diagnosis.evidenceFacts.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <ArrowUpRight className="size-4" />
                      Plano de Ação Recomendado:
                    </p>
                    <p className="mt-1.5 text-sm text-emerald-100 font-medium leading-relaxed">
                      {data.diagnosis.actionPlan}
                    </p>
                    <p className="mt-2 text-[11px] text-emerald-400/80">
                      {data.confidence.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Decomposição do Score de Saúde (4 Pilares) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400 font-mono flex items-center gap-2">
                    <BarChart3 className="size-3.5 text-emerald-400" />
                    Score Ponderado de Saúde ({data.score.scoreFinal}/100 • Nota {data.score.grade})
                  </h4>
                  <span className="text-[11px] text-zinc-500">{data.score.scoreSummary}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3.5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">1. Eficiência CPL (35%)</span>
                      <strong className="text-white">{data.score.notaCpl}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${data.score.notaCpl}%` }} />
                    </div>
                    <p className="text-[11px] text-zinc-500">Média 30d: R$ {data.cplMetrics.mean30d.toFixed(2)}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3.5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">2. Conversão Clique→Conversa (25%)</span>
                      <strong className="text-white">{data.score.notaConversao}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${data.score.notaConversao}%` }} />
                    </div>
                    <p className="text-[11px] text-zinc-500">Taxa: {(data.confidenceInterval.conversionRate * 100).toFixed(1)}%</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3.5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">3. Tendência SMA 7 (20%)</span>
                      <strong className="text-white">{data.score.notaTendencia}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${data.score.notaTendencia}%` }} />
                    </div>
                    <p className="text-[11px] text-zinc-500">{data.cplMetrics.trendLabel}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3.5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">4. Ritmo da Meta (20%)</span>
                      <strong className="text-white">{data.score.notaVolume}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${data.score.notaVolume}%` }} />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {data.goalProbability.currentLeads}/{data.goalProbability.totalTarget} leads
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Projeção de Meta Mensal e Ritmo Diário */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 font-mono">
                      Projeção Binomial de Fechamento da Meta
                    </h4>
                  </div>
                  <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Clock className="size-3.5 text-zinc-500" />
                    <span>Restam <strong>{data.goalProbability.daysLeft} dias</strong> no mês</span>
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                    <span className="text-[11px] text-zinc-500">Meta Mensal</span>
                    <p className="mt-0.5 text-lg font-bold text-white">{data.goalProbability.totalTarget} leads</p>
                    <span className="text-[11px] text-emerald-400">
                      {Math.round((data.goalProbability.currentLeads / Math.max(1, data.goalProbability.totalTarget)) * 100)}% atingido
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                    <span className="text-[11px] text-zinc-500">Leads Realizados</span>
                    <p className="mt-0.5 text-lg font-bold text-white">{data.goalProbability.currentLeads} leads</p>
                    <span className="text-[11px] text-zinc-400">Faltam {data.goalProbability.remainingLeads}</span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                    <span className="text-[11px] text-zinc-500">Ritmo Diário Atual</span>
                    <p className="mt-0.5 text-lg font-bold text-teal-300">{data.goalProbability.currentLeadsPerDay} leads/dia</p>
                    <span className="text-[11px] text-zinc-500">Média últimos 7 dias</span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                    <span className="text-[11px] text-zinc-500">Ritmo Necessário</span>
                    <p className="mt-0.5 text-lg font-bold text-amber-300">{data.goalProbability.requiredLeadsPerDay} leads/dia</p>
                    <span className="text-[11px] text-zinc-500">Para 100% da meta</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-300">Probabilidade Estatística de Atingimento:</span>
                      <strong className="text-sm font-bold text-white">
                        {(data.goalProbability.probability * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <p className="text-xs text-zinc-400">{data.goalProbability.paceExplanation}</p>
                  </div>
                  <div className="w-full sm:w-48">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          data.goalProbability.probability >= 0.75
                            ? "bg-emerald-400"
                            : data.goalProbability.probability >= 0.4
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                        style={{ width: `${Math.max(5, data.goalProbability.probability * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco 4: Gráfico de Variações de CPL, Média Móvel (SMA 7) e Bandas */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 font-mono flex items-center gap-2">
                      <TrendingUp className="size-3.5 text-emerald-400" />
                      Gráfico de Variação: CPL Diário vs. Média Móvel (SMA 7) vs. Teto 2σ
                    </h4>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Banda de controle estatístico [μ: R$ {data.cplMetrics.mean30d.toFixed(2)} | Teto μ+2σ: R$ {data.cplMetrics.upperBound2Sigma.toFixed(2)}]
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-amber-400" /> CPL Diário Real
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400" /> Média Móvel 7d (SMA 7)
                    </span>
                    {data.cplMetrics.upperBound2Sigma > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 border-b border-dashed border-rose-400" /> Teto Crítico 2σ
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
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
                      {data.cplMetrics.upperBound2Sigma > 0 && (
                        <ReferenceLine
                          y={data.cplMetrics.upperBound2Sigma}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{ value: `Teto: R$ ${data.cplMetrics.upperBound2Sigma.toFixed(2)}`, fill: "#ef4444", fontSize: 10 }}
                        />
                      )}
                      {data.cplMetrics.mean30d > 0 && (
                        <ReferenceLine
                          y={data.cplMetrics.mean30d}
                          stroke="#71717a"
                          strokeDasharray="2 2"
                          label={{ value: `Média: R$ ${data.cplMetrics.mean30d.toFixed(2)}`, fill: "#a1a1aa", fontSize: 10 }}
                        />
                      )}
                      <Bar dataKey="cpl" name="CPL Diário" fill="#f59e0b" opacity={0.4} radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="sma7"
                        name="SMA 7 (Média 7d)"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#10b981" }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bloco 5: Parâmetros Algorítmicos, Dispersão & Intervalo de Confiança */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Sliders className="size-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 font-mono">
                    Parâmetros Estatísticos, Dispersão e Intervalo de Confiança
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Intervalo de Confiança Normal (IC 95%) */}
                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Percent className="size-3.5 text-teal-400" />
                        Taxa de Conversão (IC 95%)
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 text-teal-300">
                        {data.confidence.level}
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl font-bold font-display text-white">
                        {(data.confidenceInterval.conversionRate * 100).toFixed(1)}%
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Margem de erro: ±{(data.confidenceInterval.marginError * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Limite Inferior:</span>
                        <strong className="text-zinc-200">{(data.confidenceInterval.lowerBound * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Limite Superior:</span>
                        <strong className="text-zinc-200">{(data.confidenceInterval.upperBound * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                        <span>Amostra analisada:</span>
                        <span>{data.confidenceInterval.sampleSize} cliques</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Bandas Normais de Flutuação de CPL */}
                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <BarChart3 className="size-3.5 text-amber-400" />
                        Bandas de Controle (μ ± 2σ)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">Janela 30d</span>
                    </div>

                    <div>
                      <div className="text-2xl font-bold font-display text-white">
                        R$ {data.cplMetrics.mean30d.toFixed(2)}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Desvio padrão (σ): R$ {data.cplMetrics.stdDev30d.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-rose-400">Teto Crítico (μ + 2σ):</span>
                        <strong className="text-rose-300">R$ {data.cplMetrics.upperBound2Sigma.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Piso Eficiente (μ - 2σ):</span>
                        <strong className="text-emerald-300">R$ {data.cplMetrics.lowerBound2Sigma.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                        <span>CPL Referência 7d:</span>
                        <span className="text-zinc-200 font-bold">R$ {data.cplMetrics.sma7Current.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Monitor de Gatilhos de Tráfego */}
                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Zap className="size-3.5 text-emerald-400" />
                        Monitor de Gatilhos
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">Status em Tempo Real</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-zinc-300">Anomalia CPL &gt; 2σ</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          data.cplMetrics.sma7Current > data.cplMetrics.upperBound2Sigma && data.cplMetrics.upperBound2Sigma > 0
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {data.cplMetrics.sma7Current > data.cplMetrics.upperBound2Sigma && data.cplMetrics.upperBound2Sigma > 0 ? "Disparado" : "Normal"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-zinc-300">Tendência de Fadiga (SMA 7)</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          data.cplMetrics.trendDirection === "ALTA"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {data.cplMetrics.trendDirection === "ALTA" ? "Em Alta" : "Estável"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-zinc-300">Atingimento da Meta</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          data.goalProbability.probability >= 0.75
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : data.goalProbability.probability >= 0.4
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}>
                          {(data.goalProbability.probability * 100).toFixed(0)}% Prob.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
