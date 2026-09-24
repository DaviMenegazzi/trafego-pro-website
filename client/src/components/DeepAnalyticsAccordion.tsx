import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Target } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, EmptyState, StatusBadge, Surface, SurfaceHeader, type BadgeTone } from "@/components/ds";
import { CHART, CHART_CHROME, chartAxisTick, chartTooltipStyle } from "@/lib/chartPalette";
import { formatCurrency, formatNumber, formatRatio, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    targetIsDefault?: boolean;
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

function isUserAdmin(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    return user?.role === "admin";
  } catch {
    return false;
  }
}

export const STATUS_META: Record<PredictiveUnitProfile["statusFlag"], { label: string; tone: BadgeTone; icon: typeof AlertCircle }> = {
  CRITICO: { label: "Crítico", tone: "critical", icon: AlertCircle },
  ATENCAO: { label: "Atenção", tone: "warning", icon: AlertTriangle },
  NORMAL: { label: "Estável", tone: "good", icon: CheckCircle2 },
};

export function goalLabel(gp: PredictiveUnitProfile["goalProbability"]) {
  return gp.targetIsDefault ? `${formatNumber(gp.totalTarget)} (meta padrão)` : formatNumber(gp.totalTarget);
}

/** Busca a análise estatística da unidade (somente administradores). */
export function usePredictiveProfile(unitId: string | null) {
  const isAdmin = isUserAdmin();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [data, setData] = useState<PredictiveUnitProfile | null>(null);

  useEffect(() => {
    if (!isAdmin || !unitId) {
      setData(null);
      return;
    }
    let isMounted = true;
    const token = localStorage.getItem("tp_token");
    setLoading(true);
    setFailed(false);
    fetch(`/api/analytics/predictive?unit_id=${encodeURIComponent(unitId)}`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar análise");
        return res.json();
      })
      .then((profile) => {
        if (isMounted) setData(profile);
      })
      .catch((err) => {
        console.error("Erro ao carregar análise preditiva:", err);
        if (isMounted) {
          setData(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [unitId, isAdmin]);

  return { isAdmin, loading, failed, data };
}

/** Cartão-resumo na Visão geral: status, nota e chance de bater a meta. */
export function PredictiveSummaryCard({ data, loading, onOpen }: { data: PredictiveUnitProfile | null; loading: boolean; onOpen: () => void }) {
  if (!data) {
    if (!loading) return null;
    return <Surface className="h-[72px] animate-pulse" aria-label="Carregando análise">{null}</Surface>;
  }
  const status = STATUS_META[data.statusFlag];
  return (
    <Surface className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex min-w-[16rem] flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] font-display text-lg font-semibold text-white" aria-label={`Nota ${data.score.grade}`}>
          {data.score.grade}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-zinc-100">{data.diagnosis.hypothesisTitle}</p>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Saúde {formatNumber(data.score.scoreFinal)}/100 · chance de bater a meta de {goalLabel(data.goalProbability)} leads: {formatRatio(data.goalProbability.probability, 0)}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onOpen}>
        Ver análise
        <ArrowRight />
      </Button>
    </Surface>
  );
}

function Pillar({ label, weight, value, hint }: { label: string; weight: string; value: number; hint: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-zinc-300">
          {label} <span className="text-xs text-zinc-500">({weight})</span>
        </span>
        <span className="tabular-nums font-medium text-white">{formatNumber(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full bg-zinc-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/** Análise completa (aba "Análise" da Dashboard e detalhe em Métricas da Rede). */
export function PredictiveAnalysis({ data, loading, failed }: { data: PredictiveUnitProfile | null; loading?: boolean; failed?: boolean }) {
  const chartData = useMemo(
    () =>
      (data?.sma7Series ?? []).map((pt) => ({
        d: formatShortDate(pt.date),
        cpl: pt.cpl > 0 ? pt.cpl : null,
        sma7: pt.sma7 > 0 ? pt.sma7 : null,
      })),
    [data],
  );

  if (!data) {
    return (
      <Surface>
        <EmptyState
          title={loading ? "Calculando a análise da unidade…" : failed ? "Não foi possível carregar a análise" : "Dados insuficientes"}
          description={loading ? undefined : failed ? "Tente atualizar em alguns instantes." : "Ainda não há histórico suficiente para uma leitura estatística desta unidade."}
        />
      </Surface>
    );
  }

  const gp = data.goalProbability;
  const cpl = data.cplMetrics;
  const status = STATUS_META[data.statusFlag];
  const pctGoal = gp.totalTarget > 0 ? gp.currentLeads / gp.totalTarget : 0;
  const aboveCeiling = cpl.upperBound2Sigma > 0 && cpl.sma7Current > cpl.upperBound2Sigma;

  return (
    <div className="space-y-4">
      <Surface>
        <SurfaceHeader
          title={data.diagnosis.hypothesisTitle}
          description={`${data.diagnosis.evidenceLevel} · ${data.confidence.description}`}
          actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-zinc-200">O que os dados mostram</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-400">
              {data.diagnosis.evidenceFacts.map((fact, idx) => (
                <li key={idx} className="flex gap-2">
                  <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-zinc-500" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-zinc-200">Ação recomendada</p>
            <p className="mt-1.5 text-sm leading-6 text-zinc-300">{data.diagnosis.actionPlan}</p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SurfaceHeader title={`Saúde da unidade: ${formatNumber(data.score.scoreFinal)}/100 (nota ${data.score.grade})`} description={data.score.scoreSummary} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Pillar label="Custo por conversa" weight="35%" value={data.score.notaCpl} hint={`Média 30 dias: ${formatCurrency(cpl.mean30d)}`} />
            <Pillar label="Conversão de cliques" weight="25%" value={data.score.notaConversao} hint={`Taxa: ${formatRatio(data.confidenceInterval.conversionRate)}`} />
            <Pillar label="Tendência do custo" weight="20%" value={data.score.notaTendencia} hint={cpl.trendLabel} />
            <Pillar label="Ritmo da meta" weight="20%" value={data.score.notaVolume} hint={`${formatNumber(gp.currentLeads)} de ${goalLabel(gp)} leads`} />
          </div>
        </Surface>

        <Surface>
          <SurfaceHeader title="Meta do mês" description={`Faltam ${gp.daysLeft} dias para fechar o mês`} actions={<Target className="size-4 text-zinc-500" />} />
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Meta" value={goalLabel(gp)} hint={`${formatRatio(pctGoal, 0)} atingido`} />
              <Stat label="Realizado" value={formatNumber(gp.currentLeads)} hint={`faltam ${formatNumber(gp.remainingLeads)}`} />
              <Stat label="Ritmo atual" value={`${formatNumber(gp.currentLeadsPerDay, 1)}/dia`} hint="média dos últimos 7 dias" />
              <Stat label="Ritmo necessário" value={`${formatNumber(gp.requiredLeadsPerDay, 1)}/dia`} hint="para fechar a meta" />
            </div>
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-zinc-300">Chance de bater a meta</span>
                <span className="font-semibold tabular-nums text-white">{formatRatio(gp.probability)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={cn("h-full rounded-full", gp.probability >= 0.75 ? "bg-emerald-400" : gp.probability >= 0.4 ? "bg-amber-400" : "bg-rose-400")}
                  style={{ width: `${Math.max(2, gp.probability * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{gp.paceExplanation}</p>
              {gp.targetIsDefault && (
                <p className="mt-1 text-xs leading-5 text-amber-200/80">Esta unidade não tem meta cadastrada; o cálculo usa a meta padrão.</p>
              )}
            </div>
          </div>
        </Surface>
      </div>

      <Surface>
        <SurfaceHeader
          title="Custo por conversa: diário e média de 7 dias"
          description={`Média de 30 dias ${formatCurrency(cpl.mean30d)} · limite de atenção ${formatCurrency(cpl.upperBound2Sigma)} (média + 2 desvios)`}
        />
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: CHART.blue }} /> Custo diário</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: CHART.orange }} /> Média de 7 dias</span>
            {cpl.upperBound2Sigma > 0 && <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed" style={{ borderColor: CHART_CHROME.reference }} /> Limite de atenção</span>}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="d" tick={chartAxisTick} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v).replace(/,00$/, "")} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                {cpl.upperBound2Sigma > 0 && <ReferenceLine y={cpl.upperBound2Sigma} stroke={CHART_CHROME.reference} strokeDasharray="4 4" />}
                <Bar dataKey="cpl" name="Custo diário" fill={CHART.blue} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Line type="monotone" dataKey="sma7" name="Média de 7 dias" stroke={CHART.orange} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Surface>

      <Surface>
        <SurfaceHeader title="Indicadores estatísticos" description="Janela de 30 dias" />
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Taxa de conversão (IC 95%)"
            value={formatRatio(data.confidenceInterval.conversionRate)}
            hint={`entre ${formatRatio(data.confidenceInterval.lowerBound)} e ${formatRatio(data.confidenceInterval.upperBound)} · ${formatNumber(data.confidenceInterval.sampleSize)} cliques`}
          />
          <Stat label="Custo médio por conversa" value={formatCurrency(cpl.mean30d)} hint={`desvio padrão ${formatCurrency(cpl.stdDev30d)}`} />
          <Stat
            label="Média dos últimos 7 dias"
            value={formatCurrency(cpl.sma7Current)}
            hint={aboveCeiling ? "Acima do limite de atenção" : `Dentro do padrão (limite ${formatCurrency(cpl.upperBound2Sigma)})`}
          />
          <Stat label="Confiança da amostra" value={data.confidence.level === "MÉDIA" ? "Média" : data.confidence.level === "ALTA" ? "Alta" : "Baixa"} hint={`${formatNumber(data.confidence.sampleLeads)} conversas · ${data.confidence.historyDays} dias`} />
        </div>
      </Surface>
    </div>
  );
}
