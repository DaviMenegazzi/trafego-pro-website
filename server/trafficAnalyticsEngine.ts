/**
 * Motor de Análise Estatística Preditiva e Diagnóstico Baseado em Evidências.
 * Porting de alta performance em TypeScript com base nas regras do analise-dados-trafego.
 */

export interface DailyMetric {
  date: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  cpl: number;
}

export interface DataConfidence {
  level: "ALTA" | "MÉDIA" | "BAIXA";
  sampleLeads: number;
  sampleClicks: number;
  historyDays: number;
  description: string;
}

export interface ConfidenceInterval {
  conversionRate: number; // p
  lowerBound: number;
  upperBound: number;
  marginError: number;
  sampleSize: number;
  confidenceLevel: number;
}

export interface GoalProbability {
  totalTarget: number;
  currentLeads: number;
  remainingLeads: number;
  daysLeft: number;
  requiredLeadsPerDay: number;
  currentLeadsPerDay: number;
  dailyAvgClicks: number;
  projectedClicks: number;
  historicalConversion: number;
  probability: number; // 0.0 to 1.0
  riskLevel: "ALTA_PROBABILIDADE" | "MODERADA" | "RISCO_ALTO" | "META_ALCANCADA";
  paceExplanation: string;
}

export interface UnitScore {
  scoreFinal: number;
  grade: "A" | "B" | "C" | "D";
  notaCpl: number;
  notaConversao: number;
  notaTendencia: number;
  notaVolume: number;
  scoreSummary: string;
}

export interface CplMetrics {
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
}

export interface EvidenceDiagnosis {
  evidenceLevel: "Evidência Forte" | "Evidência Moderada" | "Evidência Fraca";
  hypothesisTitle: string;
  evidenceFacts: string[];
  actionPlan: string;
}

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
  confidence: DataConfidence;
  cplMetrics: CplMetrics;
  confidenceInterval: ConfidenceInterval;
  goalProbability: GoalProbability;
  score: UnitScore;
  diagnosis: EvidenceDiagnosis;
  statusFlag: "CRITICO" | "ATENCAO" | "NORMAL";
  sma7Series: Sma7Point[];
  dailyHistory: DailyMetric[];
  whatsAppCard: string;
}

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
  whatsAppConsolidatedReport: string;
}

export const DEFAULT_MONTHLY_TARGETS: Record<string, number> = {
  "act_2889337907990166": 240,  // Alegrete
  "act_918438482061312": 130,   // Bento Gonçalves
  "act_343587184793003": 15,    // BH Barreiro
  "act_2498975800561890": 400,  // Canela
  "act_827335518078085": 350,   // Caxias do Sul
  "act_2853331541612919": 190,  // Ijuí
  "act_3662817983996981": 110,  // Itaqui
  "act_282141710195066": 280,   // Júlio de Castilhos
  "act_1372787666543646": 200,  // Lajeado
  "act_2734549853534435": 250,  // Passo Fundo
  "act_1351209115630705": 140,  // Santo Ângelo
  "act_192733382826302": 300,   // Tupanciretã
  "act_242407284808237": 380,   // Uruguaiana
};

// ─── Funções Matemáticas e Estatísticas ──────────────────────────────────────

export function calculateDaysLeftInMonth(refDate = new Date()): number {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, lastDay - refDate.getDate());
}

export function evaluateDataConfidence(
  totalLeadsMonth: number,
  totalClicksMonth: number,
  historyDays: number,
): DataConfidence {
  if (totalLeadsMonth >= 80 && totalClicksMonth >= 500 && historyDays >= 20) {
    return {
      level: "ALTA",
      sampleLeads: totalLeadsMonth,
      sampleClicks: totalClicksMonth,
      historyDays,
      description: "Confiança Alta (Base sólida com volume representativo)",
    };
  }
  if (totalLeadsMonth >= 25 && totalClicksMonth >= 150 && historyDays >= 7) {
    return {
      level: "MÉDIA",
      sampleLeads: totalLeadsMonth,
      sampleClicks: totalClicksMonth,
      historyDays,
      description: "Confiança Média (Volume intermediário, tendência consistente)",
    };
  }
  return {
    level: "BAIXA",
    sampleLeads: totalLeadsMonth,
    sampleClicks: totalClicksMonth,
    historyDays,
    description: "Confiança Baixa (Dados preliminares / baixo volume para decisão agressiva)",
  };
}

export function calculateConfidenceInterval(
  clicks: number,
  leads: number,
  confidenceLevel = 0.95,
): ConfidenceInterval {
  if (clicks <= 0) {
    return {
      conversionRate: 0,
      lowerBound: 0,
      upperBound: 0,
      marginError: 0,
      sampleSize: 0,
      confidenceLevel,
    };
  }

  const p = leads / clicks;
  const z = 1.96; // 95% intervalo de confiança z-score

  if (p === 0) {
    const pSmooth = 1.0 / (clicks + 2.0);
    const margin = z * Math.sqrt((pSmooth * (1.0 - pSmooth)) / clicks);
    return {
      conversionRate: 0,
      lowerBound: 0,
      upperBound: Math.min(1.0, Number(margin.toFixed(4))),
      marginError: Number(margin.toFixed(4)),
      sampleSize: clicks,
      confidenceLevel,
    };
  }

  const margin = z * Math.sqrt((p * (1.0 - p)) / clicks);
  const lower = Math.max(0, p - margin);
  const upper = Math.min(1.0, p + margin);

  return {
    conversionRate: Number(p.toFixed(4)),
    lowerBound: Number(lower.toFixed(4)),
    upperBound: Number(upper.toFixed(4)),
    marginError: Number(margin.toFixed(4)),
    sampleSize: clicks,
    confidenceLevel,
  };
}

/**
 * Função de distribuição cumulativa da Normal padrão (aproximação de Abramowitz & Stegun).
 */
function standardNormalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * Math.abs(z));
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const phi = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
  const cdf = 1.0 - phi * poly;
  return z >= 0 ? cdf : 1.0 - cdf;
}

export function calculateGoalProbability(
  totalTarget: number,
  currentLeads: number,
  daysLeft: number,
  dailyAvgClicks: number,
  recentConversion: number,
  recentLeads7d: number,
): GoalProbability {
  const remainingLeads = Math.max(0, totalTarget - currentLeads);
  const validDays = Math.max(1, daysLeft);
  const requiredPace = Number((remainingLeads / validDays).toFixed(1));
  const currentPace = recentLeads7d > 0 ? Number((recentLeads7d / 7.0).toFixed(1)) : 0;
  const projectedClicks = Math.round(validDays * dailyAvgClicks);

  if (remainingLeads === 0) {
    return {
      totalTarget,
      currentLeads,
      remainingLeads: 0,
      daysLeft,
      requiredLeadsPerDay: 0,
      currentLeadsPerDay: currentPace,
      dailyAvgClicks: Number(dailyAvgClicks.toFixed(1)),
      projectedClicks,
      historicalConversion: Number(recentConversion.toFixed(4)),
      probability: 1.0,
      riskLevel: "META_ALCANCADA",
      paceExplanation: "Meta mensal atingida antecipadamente!",
    };
  }

  if (projectedClicks < remainingLeads || recentConversion <= 0) {
    return {
      totalTarget,
      currentLeads,
      remainingLeads,
      daysLeft,
      requiredLeadsPerDay: requiredPace,
      currentLeadsPerDay: currentPace,
      dailyAvgClicks: Number(dailyAvgClicks.toFixed(1)),
      projectedClicks,
      historicalConversion: Number(recentConversion.toFixed(4)),
      probability: 0.0,
      riskLevel: "RISCO_ALTO",
      paceExplanation: `Faltam ${remainingLeads} leads em ${daysLeft}d. Ritmo necessário de ${requiredPace} leads/dia é incompatível com o volume projetado (${projectedClicks} cliques com conversão de ${(recentConversion * 100).toFixed(1)}%).`,
    };
  }

  // Aproximação Normal para a distribuição Binomial B(n, p) com correção de continuidade
  const n = projectedClicks;
  const p = Math.min(0.99, Math.max(0.001, recentConversion));
  const mu = n * p;
  const sigma = Math.sqrt(n * p * (1 - p));

  let probability = 0.5;
  if (sigma > 0) {
    const z = (remainingLeads - 0.5 - mu) / sigma;
    probability = 1.0 - standardNormalCdf(z);
  } else {
    probability = mu >= remainingLeads ? 1.0 : 0.0;
  }

  const cleanProb = Number(Math.max(0, Math.min(1.0, probability)).toFixed(4));
  let risk: "ALTA_PROBABILIDADE" | "MODERADA" | "RISCO_ALTO" = "RISCO_ALTO";
  let explanation = "";

  if (cleanProb >= 0.75) {
    risk = "ALTA_PROBABILIDADE";
    explanation = `Faltam ${remainingLeads} leads em ${daysLeft}d (Nec: ${requiredPace}/dia | Atual: ${currentPace}/dia). Ritmo suficiente para fechar a meta.`;
  } else if (cleanProb >= 0.40) {
    risk = "MODERADA";
    explanation = `Faltam ${remainingLeads} leads em ${daysLeft}d (Nec: ${requiredPace}/dia | Atual: ${currentPace}/dia). Ritmo próximo do limite; requer atenção.`;
  } else {
    risk = "RISCO_ALTO";
    explanation = `Faltam ${remainingLeads} leads em ${daysLeft}d (Nec: ${requiredPace}/dia | Atual: ${currentPace}/dia). Ritmo recente insuficiente sem aumento de investimento/conversão.`;
  }

  return {
    totalTarget,
    currentLeads,
    remainingLeads,
    daysLeft,
    requiredLeadsPerDay: requiredPace,
    currentLeadsPerDay: currentPace,
    dailyAvgClicks: Number(dailyAvgClicks.toFixed(1)),
    projectedClicks,
    historicalConversion: Number(recentConversion.toFixed(4)),
    probability: cleanProb,
    riskLevel: risk,
    paceExplanation: explanation,
  };
}

export function calculateNormalDistribution(
  history: DailyMetric[],
  windowDays = 30,
): { mean: number; stdDev: number; upperBound: number; lowerBound: number } {
  const valid = history.slice(-windowDays).filter((d) => d.spend > 0 && d.leads > 0);
  if (valid.length === 0) {
    return { mean: 0, stdDev: 0, upperBound: 0, lowerBound: 0 };
  }

  const totalSpend = valid.reduce((acc, d) => acc + d.spend, 0);
  const totalLeads = valid.reduce((acc, d) => acc + d.leads, 0);
  const mean = totalLeads > 0 ? totalSpend / totalLeads : 0;

  if (valid.length === 1) {
    return {
      mean: Number(mean.toFixed(2)),
      stdDev: 0,
      upperBound: Number((mean * 1.5).toFixed(2)),
      lowerBound: Number((mean * 0.5).toFixed(2)),
    };
  }

  const cpls = valid.map((d) => d.spend / d.leads);
  const variance = cpls.reduce((acc, cpl) => acc + Math.pow(cpl - mean, 2), 0) / (valid.length - 1);
  const stdDev = Math.sqrt(variance);

  const upperBound = Number((mean + 2 * stdDev).toFixed(2));
  const lowerBound = Number(Math.max(0, mean - 2 * stdDev).toFixed(2));

  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    upperBound,
    lowerBound,
  };
}

export function calculateSma7Series(
  history: DailyMetric[],
  mean30d: number,
  upperBound2Sigma: number,
): Sma7Point[] {
  const points: Sma7Point[] = [];

  for (let i = 0; i < history.length; i++) {
    const startIdx = Math.max(0, i - 6);
    const window = history.slice(startIdx, i + 1);
    const winSpend = window.reduce((a, b) => a + b.spend, 0);
    const winLeads = window.reduce((a, b) => a + b.leads, 0);
    const sma7 = winLeads > 0 ? winSpend / winLeads : window[window.length - 1].cpl || 0;

    points.push({
      date: history[i].date,
      sma7: Number(sma7.toFixed(2)),
      cpl: Number(history[i].cpl.toFixed(2)),
      spend: Number(history[i].spend.toFixed(2)),
      leads: history[i].leads,
      mean30d,
      upperBound2Sigma,
    });
  }

  return points;
}

export function calculateScoreDesdobrado(
  cplAtual: number,
  cplHistorico: number,
  conversaoAtual: number,
  metaAlcancadaPct: number,
  tendenciaCpl: "ALTA" | "QUEDA" | "ESTAVEL",
): UnitScore {
  // 1. Eficiência de CPL (35%)
  let notaCpl = 70;
  if (cplAtual > 0 && cplHistorico > 0) {
    const ratio = cplHistorico / cplAtual;
    notaCpl = Math.min(100, Math.max(0, (ratio - 0.5) * 100));
  }

  // 2. Taxa de Conversão Clique -> WhatsApp (25%)
  let notaConversao = 60;
  if (conversaoAtual > 0) {
    notaConversao = Math.min(100, Math.max(0, (conversaoAtual / 0.08) * 80));
  }

  // 3. Trajetória da Tendência (20%)
  let notaTendencia = 75;
  if (tendenciaCpl === "QUEDA") notaTendencia = 100;
  else if (tendenciaCpl === "ESTAVEL") notaTendencia = 80;
  else if (tendenciaCpl === "ALTA") notaTendencia = 35;

  // 4. Progresso de Meta (20%)
  const notaVolume = Math.min(100, Math.max(0, metaAlcancadaPct * 100));

  const scoreFinal = Number((
    notaCpl * 0.35 +
    notaConversao * 0.25 +
    notaTendencia * 0.20 +
    notaVolume * 0.20
  ).toFixed(1));

  let grade: "A" | "B" | "C" | "D" = "D";
  if (scoreFinal >= 80) grade = "A";
  else if (scoreFinal >= 65) grade = "B";
  else if (scoreFinal >= 50) grade = "C";

  return {
    scoreFinal,
    grade,
    notaCpl: Number(notaCpl.toFixed(1)),
    notaConversao: Number(notaConversao.toFixed(1)),
    notaTendencia: Number(notaTendencia.toFixed(1)),
    notaVolume: Number(notaVolume.toFixed(1)),
    scoreSummary: `Score ${scoreFinal} (Nota ${grade}) • CPL: ${notaCpl.toFixed(0)}/100 • Conv: ${notaConversao.toFixed(0)}/100 • Tend: ${notaTendencia.toFixed(0)}/100 • Meta: ${notaVolume.toFixed(0)}/100`,
  };
}

export function formulateHypothesisAndEvidence(
  cplMetrics: CplMetrics,
  ci: ConfidenceInterval,
  gp: GoalProbability,
  confidence: DataConfidence,
  smaSeries: Sma7Point[],
): EvidenceDiagnosis {
  const facts: string[] = [];
  let streakStr = "";
  let smaRising3d = false;

  if (smaSeries.length >= 3) {
    const s0 = smaSeries[smaSeries.length - 3].sma7;
    const s1 = smaSeries[smaSeries.length - 2].sma7;
    const s2 = smaSeries[smaSeries.length - 1].sma7;
    if (s2 > s1 && s1 > s0 && s0 > 0) {
      smaRising3d = true;
      streakStr = `R$ ${s0.toFixed(2)} ➔ R$ ${s1.toFixed(2)} ➔ R$ ${s2.toFixed(2)}`;
    }
  }

  // HIPÓTESE 1: Saturação de Público / Frequência Excessiva
  if (cplMetrics.upperBound2Sigma > 0 && cplMetrics.sma7Current > cplMetrics.upperBound2Sigma) {
    facts.push(`CPL médio de 7d (R$ ${cplMetrics.sma7Current.toFixed(2)}) ultrapassou o teto estatístico de R$ ${cplMetrics.upperBound2Sigma.toFixed(2)} (μ + 2σ).`);
    facts.push(`Desvio de ${cplMetrics.deviationVsMeanPct > 0 ? "+" : ""}${cplMetrics.deviationVsMeanPct.toFixed(1)}% em relação à média histórica (μ = R$ ${cplMetrics.mean30d.toFixed(2)}).`);
    return {
      evidenceLevel: confidence.level === "ALTA" ? "Evidência Forte" : "Evidência Moderada",
      hypothesisTitle: "Hipótese: Saturação de Público / Frequência Excessiva",
      evidenceFacts: facts,
      actionPlan: "Ampliar raio geográfico ou abrir para segmentação ampla (Advantage+) para oxigenar a audiência e reduzir a frequência.",
    };
  }

  // HIPÓTESE 2: Possível Fadiga de Criativo
  if (cplMetrics.trendPct7d >= 25.0 && smaRising3d) {
    facts.push(`SMA 7 apresentou alta contínua de +${cplMetrics.trendPct7d.toFixed(1)}% em 7 dias (${streakStr}).`);
    facts.push(`Taxa de efetivação de conversa em ${(ci.conversionRate * 100).toFixed(1)}% com amostra de ${ci.sampleSize} cliques.`);
    return {
      evidenceLevel: confidence.level === "ALTA" ? "Evidência Forte" : "Evidência Moderada",
      hypothesisTitle: "Hipótese: Possível Fadiga de Criativo",
      evidenceFacts: facts,
      actionPlan: "Renovar os criativos (novos vídeos e fotos dos especialistas) nos conjuntos de anúncios da filial.",
    };
  }

  // HIPÓTESE 3: Atrito no Início da Conversa
  if (ci.conversionRate < 0.035 && ci.sampleSize >= 50) {
    facts.push(`Taxa de efetivação de apenas ${(ci.conversionRate * 100).toFixed(1)}% [IC 95%: ${(ci.lowerBound * 100).toFixed(1)}% a ${(ci.upperBound * 100).toFixed(1)}%].`);
    facts.push(`Volume de ${ci.sampleSize} cliques resultando em poucos inícios reais de conversa.`);
    return {
      evidenceLevel: ci.sampleSize >= 100 ? "Evidência Forte" : "Evidência Moderada",
      hypothesisTitle: "Hipótese: Atrito na Iniciação de Conversa",
      evidenceFacts: facts,
      actionPlan: "Revisar mensagem inicial do anúncio e alinhar copy da página de destino.",
    };
  }

  // HIPÓTESE 4: Sub-investimento / Gargalo de Orçamento
  if (ci.conversionRate >= 0.09 && gp.riskLevel === "RISCO_ALTO") {
    facts.push(`Excelente taxa de conversão clique->conversa (${(ci.conversionRate * 100).toFixed(1)}%).`);
    facts.push(`Ritmo atual (${gp.currentLeadsPerDay} leads/dia) abaixo do necessário (${gp.requiredLeadsPerDay} leads/dia) para fechar em ${gp.totalTarget} leads.`);
    return {
      evidenceLevel: "Evidência Forte",
      hypothesisTitle: "Hipótese: Sub-investimento (Eficiência alta, volume insuficiente para meta)",
      evidenceFacts: facts,
      actionPlan: "Aumentar orçamento diário em +15% a +20% para aproveitar a boa eficiência e garantir o atingimento da meta.",
    };
  }

  // HIPÓTESE 5: Tendência de Alta em Observação
  if (cplMetrics.trendDirection === "ALTA") {
    facts.push(`SMA 7 subiu +${cplMetrics.trendPct7d.toFixed(1)}% em 7 dias.`);
    return {
      evidenceLevel: "Evidência Moderada",
      hypothesisTitle: "Hipótese: Tendência de alta no CPL em observação",
      evidenceFacts: facts,
      actionPlan: "Acompanhar próximos 2 dias antes de intervir nos conjuntos de anúncios.",
    };
  }

  // Operação Saudável
  facts.push(`CPL alinhado à média (${cplMetrics.deviationLabel}).`);
  facts.push(`Taxa de conversão saudável (${(ci.conversionRate * 100).toFixed(1)}%) com ritmo de meta em ${(gp.probability * 100).toFixed(1)}%.`);
  return {
    evidenceLevel: "Evidência Forte",
    hypothesisTitle: "Operação Saudável e no Ritmo da Meta",
    evidenceFacts: facts,
    actionPlan: "Manter escala e orçamentos atuais.",
  };
}

export function formatUnitCleanName(name: string): string {
  if (!name) return "Unidade";
  return name.replace(/^Vida Card\s*[\|\-]\s*/i, "").replace(/^Vida Card\s*/i, "").trim();
}

export function formatUnitWhatsAppCard(
  unitName: string,
  p: {
    score: UnitScore;
    goalProbability: GoalProbability;
    cplMetrics: CplMetrics;
    confidenceInterval: ConfidenceInterval;
    diagnosis: EvidenceDiagnosis;
    confidence: DataConfidence;
  },
  todayLeads: number,
): string {
  const cleanName = formatUnitCleanName(unitName);
  const gp = p.goalProbability;
  const cpl = p.cplMetrics;
  const ci = p.confidenceInterval;
  const diag = p.diagnosis;
  const score = p.score;

  const pctMeta = gp.totalTarget > 0 ? Math.round((gp.currentLeads / gp.totalTarget) * 100) : 0;
  const probEmoji = gp.probability >= 0.75 ? "🟢" : gp.probability >= 0.40 ? "🟡" : "🔴";
  const probStr = (gp.probability * 100).toFixed(1);

  const trendEmoji = cpl.trendDirection === "ALTA" ? "📈" : cpl.trendDirection === "QUEDA" ? "📉" : "➡️";
  const varSma7 = cpl.trendDirection === "ALTA" ? `+${cpl.trendPct7d.toFixed(1)}% em 7d` : cpl.trendDirection === "QUEDA" ? `${cpl.trendPct7d.toFixed(1)}% em 7d` : "Estável";

  const factDetail = diag.evidenceFacts[0] || "Variação detectada nos indicadores";

  return [
    `🏢 *${cleanName}* — \`Score: ${score.scoreFinal.toFixed(1)} (${score.grade})\``,
    `* *Leads Hoje:* \`${todayLeads}\``,
    `    └ *Meta:* ${gp.currentLeads}/${gp.totalTarget} (${pctMeta}%) • Faltam ${gp.remainingLeads} em ${gp.daysLeft}d`,
    `    └ *Prob:* \`${probStr}%\` ${probEmoji} (Ritmo atual ${gp.currentLeadsPerDay}/d vs Nec ${gp.requiredLeadsPerDay}/d)`,
    `* *Custo:* CPL Hoje: \`${cpl.cplTodayDisplay}\``,
    `    └ SMA 7: \`R$ ${cpl.sma7Current.toFixed(2)}\` ${trendEmoji} (${varSma7})`,
    `    └ Histórico: Média 30d \`R$ ${cpl.mean30d.toFixed(2)}\` (${cpl.deviationLabel})`,
    `* *Conversão:* \`${(ci.conversionRate * 100).toFixed(1)}%\` _(IC 95%: ${(ci.lowerBound * 100).toFixed(1)}% a ${(ci.upperBound * 100).toFixed(1)}% • ${ci.sampleSize} cliques)_`,
    `* *Diagnóstico:* ${diag.hypothesisTitle} _(${diag.evidenceLevel})_`,
    `    └ ${factDetail}`,
    `> 👉 *Ação:* ${diag.actionPlan} _(Confiança: ${p.confidence.level})_`,
  ].join("\n");
}

export function generateConsolidatedWhatsAppReport(
  report: GlobalAnalyticsReport,
): string {
  const sections: string[] = [];

  // Cabeçalho
  sections.push(
    `📊 *RELATÓRIO PREDITIVO E ESTATÍSTICO DE TRÁFEGO — REDE*\n` +
    `📅 *Data:* ${report.date} | ⏱️ *Dias Restantes no Mês:* ${report.daysLeftInMonth}d\n` +
    `💰 *Investimento Total Mês:* R$ ${report.totalMonthSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `🎯 *Total de Leads Mês:* ${report.totalMonthLeads.toLocaleString("pt-BR")} / ${report.totalNetworkTarget.toLocaleString("pt-BR")} (${report.networkGoalPacePct.toFixed(1)}% da Meta Geral)\n` +
    `📈 *CPL Médio da Rede:* R$ ${report.avgNetworkCpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );

  const critical = report.rankedProfiles.filter((p) => p.statusFlag === "CRITICO");
  const warning = report.rankedProfiles.filter((p) => p.statusFlag === "ATENCAO");
  const healthy = report.rankedProfiles.filter((p) => p.statusFlag === "NORMAL");

  if (critical.length > 0) {
    const critCards = critical.map((p) => p.whatsAppCard).join("\n\n");
    sections.push(`🚨 *UNIDADES CRÍTICAS / GATILHO DE ATENÇÃO IMEDIATA (${critical.length})*\n\n${critCards}`);
  }

  if (warning.length > 0) {
    const warnCards = warning.map((p) => p.whatsAppCard).join("\n\n");
    sections.push(`⚠️ *UNIDADES EM OBSERVAÇÃO / TENDÊNCIA DE FADIGA (${warning.length})*\n\n${warnCards}`);
  }

  if (healthy.length > 0) {
    const healthyLines = healthy.map((p) => {
      const clean = formatUnitCleanName(p.unitName);
      return `• *${clean}*: Score \`${p.score.scoreFinal.toFixed(1)} (${p.score.grade})\` | CPL 7d \`R$ ${p.cplMetrics.sma7Current.toFixed(2)}\` | Meta: ${p.goalProbability.currentLeads}/${p.goalProbability.totalTarget} (\`${(p.goalProbability.probability * 100).toFixed(0)}%\`)`;
    }).join("\n");
    sections.push(`🟢 *UNIDADES EM ESTABILIDADE E SAUDÁVEIS (${healthy.length})*\n\n${healthyLines}`);
  }

  return sections.join("\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n");
}

export function buildPredictiveUnitProfile(
  unitId: string,
  unitName: string,
  dailyRows: DailyMetric[],
  monthlyTarget?: number,
  refDate = new Date(),
): PredictiveUnitProfile {
  const dateStr = refDate.toISOString().slice(0, 10);
  const daysLeft = calculateDaysLeftInMonth(refDate);
  const target = monthlyTarget ?? DEFAULT_MONTHLY_TARGETS[unitId] ?? 200;

  const currentMonthPrefix = dateStr.slice(0, 7);
  const monthDays = dailyRows.filter((d) => d.date.startsWith(currentMonthPrefix));
  const leadsMonth = monthDays.reduce((acc, d) => acc + d.leads, 0);
  const clicksMonth = monthDays.reduce((acc, d) => acc + d.clicks, 0);
  const spendMonth = monthDays.reduce((acc, d) => acc + d.spend, 0);

  const confidence = evaluateDataConfidence(leadsMonth, clicksMonth, dailyRows.length);

  const last7Days = dailyRows.slice(-7);
  const leads7d = last7Days.reduce((acc, d) => acc + d.leads, 0);
  const clicks7d = last7Days.reduce((acc, d) => acc + d.clicks, 0);
  const spend7d = last7Days.reduce((acc, d) => acc + d.spend, 0);

  const todayData = dailyRows[dailyRows.length - 1] ?? {
    date: dateStr,
    spend: 0,
    leads: 0,
    impressions: 0,
    clicks: 0,
    cpl: 0,
  };
  const todaySpend = todayData.spend;
  const todayLeads = todayData.leads;

  const { mean: mu, stdDev: sigma, upperBound, lowerBound } = calculateNormalDistribution(dailyRows, 30);
  const sma7Series = calculateSma7Series(dailyRows, mu, upperBound);
  const currentSma7 = sma7Series[sma7Series.length - 1]?.sma7 ?? 0;
  const prevSma7 = sma7Series[Math.max(0, sma7Series.length - 4)]?.sma7 ?? currentSma7;

  let cplToday: number | null = null;
  let cplTodayDisp = "R$ — (sem atividade hoje)";
  if (todayLeads > 0 && todaySpend > 0) {
    cplToday = Number((todaySpend / todayLeads).toFixed(2));
    cplTodayDisp = `R$ ${cplToday.toFixed(2)}`;
  } else if (todayLeads > 0 && todaySpend === 0) {
    cplTodayDisp = `R$ — (${todayLeads} lead • gasto em consolidação)`;
  } else if (todaySpend > 0 && todayLeads === 0) {
    cplToday = Number(todaySpend.toFixed(2));
    cplTodayDisp = `R$ — (R$ ${todaySpend.toFixed(2)} investidos hoje sem leads)`;
  }

  const cplReference = leads7d > 0 ? spend7d / leads7d : (cplToday ?? mu);

  let devPct = 0;
  let devLabel = `Alinhado à média 30d (μ: R$ ${mu.toFixed(2)})`;
  if (mu > 0 && cplReference > 0) {
    devPct = Number((((cplReference - mu) / mu) * 100).toFixed(1));
    const sign = devPct > 0 ? "+" : "";
    devLabel = `${sign}${devPct}% vs média 30d (μ: R$ ${mu.toFixed(2)})`;
  }

  let trendPct = 0;
  if (prevSma7 > 0 && currentSma7 > 0) {
    trendPct = Number((((currentSma7 - prevSma7) / prevSma7) * 100).toFixed(1));
  }

  let trendDir: "ALTA" | "QUEDA" | "ESTAVEL" = "ESTAVEL";
  let trendLabel = "Estável (oscilação normal do leilão)";
  if (trendPct >= 10) {
    trendDir = "ALTA";
    trendLabel = `Alta (+${trendPct.toFixed(1)}% no SMA 7)`;
  } else if (trendPct <= -10) {
    trendDir = "QUEDA";
    trendLabel = `Queda (${trendPct.toFixed(1)}% no SMA 7)`;
  }

  const cplMetrics: CplMetrics = {
    todaySpend,
    todayLeads,
    cplToday,
    cplTodayDisplay: cplTodayDisp,
    mean30d: mu,
    stdDev30d: sigma,
    upperBound2Sigma: upperBound,
    lowerBound2Sigma: lowerBound,
    deviationVsMeanPct: devPct,
    deviationLabel: devLabel,
    sma7Current: currentSma7,
    sma7Previous: prevSma7,
    trendDirection: trendDir,
    trendPct7d: trendPct,
    trendLabel,
  };

  const sampleClicks = Math.max(clicks7d, todayData.clicks);
  const sampleLeads = sampleClicks === clicks7d ? Math.max(leads7d, todayLeads) : todayLeads;
  const ci = calculateConfidenceInterval(sampleClicks, sampleLeads, 0.95);

  const dailyAvgClicks = monthDays.length > 0 ? clicksMonth / monthDays.length : 10;
  const convBase = ci.conversionRate > 0 ? ci.conversionRate : 0.05;
  const goalProbability = calculateGoalProbability(
    target,
    leadsMonth,
    daysLeft,
    dailyAvgClicks,
    convBase,
    leads7d,
  );

  const metaPct = target > 0 ? leadsMonth / target : 1.0;
  const score = calculateScoreDesdobrado(
    cplReference,
    mu,
    ci.conversionRate,
    metaPct,
    trendDir,
  );

  const diagnosis = formulateHypothesisAndEvidence(
    cplMetrics,
    ci,
    goalProbability,
    confidence,
    sma7Series,
  );

  let statusFlag: "CRITICO" | "ATENCAO" | "NORMAL" = "NORMAL";
  const isCriticalAnomaly = upperBound > 0 && todaySpend >= 15 && (cplToday !== null && cplToday > upperBound || (todayLeads === 0 && todaySpend > upperBound));
  if (isCriticalAnomaly || (upperBound > 0 && currentSma7 > upperBound) || goalProbability.riskLevel === "RISCO_ALTO" || score.scoreFinal < 45) {
    statusFlag = "CRITICO";
  } else if (trendDir === "ALTA" || goalProbability.riskLevel === "MODERADA" || score.scoreFinal < 65) {
    statusFlag = "ATENCAO";
  }

  const whatsAppCard = formatUnitWhatsAppCard(
    unitName,
    { score, goalProbability, cplMetrics, confidenceInterval: ci, diagnosis, confidence },
    todayLeads,
  );

  return {
    unitId,
    unitName,
    date: dateStr,
    confidence,
    cplMetrics,
    confidenceInterval: ci,
    goalProbability,
    score,
    diagnosis,
    statusFlag,
    sma7Series,
    dailyHistory: dailyRows,
    whatsAppCard,
  };
}

export function buildGlobalAnalyticsReport(
  profiles: PredictiveUnitProfile[],
  refDate = new Date(),
): GlobalAnalyticsReport {
  const dateStr = refDate.toISOString().slice(0, 10);
  const daysLeft = calculateDaysLeftInMonth(refDate);

  const ranked = [...profiles].sort((a, b) => b.score.scoreFinal - a.score.scoreFinal);

  const totalMonthSpend = profiles.reduce((acc, p) => {
    const mSpend = p.dailyHistory
      .filter((d) => d.date.startsWith(dateStr.slice(0, 7)))
      .reduce((a, b) => a + b.spend, 0);
    return acc + mSpend;
  }, 0);

  const totalMonthLeads = profiles.reduce((acc, p) => p.goalProbability.currentLeads, 0);
  const totalNetworkTarget = profiles.reduce((acc, p) => p.goalProbability.totalTarget, 0);
  const avgNetworkCpl = totalMonthLeads > 0 ? totalMonthSpend / totalMonthLeads : 0;
  const networkGoalPacePct = totalNetworkTarget > 0 ? (totalMonthLeads / totalNetworkTarget) * 100 : 0;

  const critical = ranked.filter((p) => p.statusFlag === "CRITICO");
  const warning = ranked.filter((p) => p.statusFlag === "ATENCAO");
  const healthy = ranked.filter((p) => p.statusFlag === "NORMAL");

  const reportObj: GlobalAnalyticsReport = {
    timestamp: refDate.toISOString(),
    date: dateStr,
    totalUnits: profiles.length,
    daysLeftInMonth: daysLeft,
    totalMonthSpend: Number(totalMonthSpend.toFixed(2)),
    totalMonthLeads,
    avgNetworkCpl: Number(avgNetworkCpl.toFixed(2)),
    totalNetworkTarget,
    networkGoalPacePct: Number(networkGoalPacePct.toFixed(1)),
    summary: {
      criticalUnitsCount: critical.length,
      warningUnitsCount: warning.length,
      healthyUnitsCount: healthy.length,
    },
    rankedProfiles: ranked,
    whatsAppConsolidatedReport: "",
  };

  reportObj.whatsAppConsolidatedReport = generateConsolidatedWhatsAppReport(reportObj);
  return reportObj;
}
