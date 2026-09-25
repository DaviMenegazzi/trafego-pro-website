/**
 * Projeção de leads do mês por regressão linear múltipla (log-log).
 *
 *   ln(leads + 1) = β0 + β1·ln(spend + 1) + β2·fimDeSemana + β3·t + ε
 *
 * β1 é a elasticidade leads × investimento (retorno decrescente), β2 o efeito
 * de sábado/domingo e β3 a tendência. A incerteza vem de bootstrap dos
 * resíduos, então não assumimos normalidade. Módulo puro: roda no servidor
 * (ajuste) e no navegador (cenário "e se eu investir R$ X/dia").
 */

export interface ProjectionDay {
  date: string; // YYYY-MM-DD
  spend: number;
  leads: number;
}

export interface LeadModel {
  /** [β0, β1, β2, β3] */
  coefficients: number[];
  /** Resíduos do ajuste (escala log), usados no bootstrap. */
  residuals: number[];
  /** Fator de correção de Duan para voltar da escala log. */
  smearing: number;
  r2Adjusted: number;
  sampleDays: number;
  /** Data de referência para t = 0. */
  originDate: string;
  maxObservedSpend: number;
}

export interface ProjectionBacktest {
  /** Erro absoluto médio (leads em 7 dias) do modelo. */
  modelMae: number;
  /** Mesmo erro para o método atual (ritmo dos últimos 7 dias). */
  baselineMae: number;
  windows: number;
}

export interface ProjectionInput {
  currentLeads: number;
  target: number;
  /** Dias ainda por acontecer no mês (YYYY-MM-DD). */
  futureDates: string[];
}

export interface ProjectionResult {
  dailySpend: number;
  expectedLeads: number;
  lowLeads: number; // percentil 10
  highLeads: number; // percentil 90
  probability: number;
  expectedCpl: number | null;
  futureSpend: number;
  /** Investimento acima do maior valor já observado: a reta está extrapolando. */
  extrapolating: boolean;
}

export const MIN_MODEL_DAYS = 21;
export const MIN_MODEL_LEADS = 30;
const RIDGE_LAMBDA = 0.5;
/** Peso de cada dia cai pela metade a cada N dias: o modelo acompanha mudanças de patamar. */
export const RECENCY_HALF_LIFE_DAYS = 21;
const SIMULATIONS = 2000;
const DAY_MS = 86_400_000;

function dayIndex(date: string, origin: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${origin}T00:00:00Z`)) / DAY_MS);
}

function isWeekend(date: string): boolean {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

function features(date: string, spend: number, origin: string): number[] {
  // t em semanas para manter os coeficientes na mesma ordem de grandeza.
  return [1, Math.log(spend + 1), isWeekend(date) ? 1 : 0, dayIndex(date, origin) / 7];
}

/** Resolve A·x = b por eliminação de Gauss com pivotamento parcial. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Ajusta o modelo. Dias sem investimento ficam de fora (campanha pausada não
 * diz nada sobre a relação investimento → leads). Retorna null quando não há
 * histórico suficiente para uma leitura estável.
 */
export function fitLeadModel(rows: ProjectionDay[], halfLifeDays = RECENCY_HALF_LIFE_DAYS): LeadModel | null {
  const days = rows.filter((d) => d.spend > 0).sort((a, b) => a.date.localeCompare(b.date));
  const totalLeads = days.reduce((acc, d) => acc + d.leads, 0);
  if (days.length < MIN_MODEL_DAYS || totalLeads < MIN_MODEL_LEADS) return null;

  const origin = days[0].date;
  const x = days.map((d) => features(d.date, d.spend, origin));
  const y = days.map((d) => Math.log(d.leads + 1));
  const k = x[0].length;
  const lastIdx = dayIndex(days[days.length - 1].date, origin);
  const w = days.map((d) => (halfLifeDays > 0 ? 0.5 ** ((lastIdx - dayIndex(d.date, origin)) / halfLifeDays) : 1));

  // Equações normais ponderadas com ridge nos coeficientes (exceto intercepto).
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  for (let i = 0; i < x.length; i++) {
    for (let a = 0; a < k; a++) {
      xty[a] += w[i] * x[i][a] * y[i];
      for (let b = 0; b < k; b++) xtx[a][b] += w[i] * x[i][a] * x[i][b];
    }
  }
  for (let a = 1; a < k; a++) xtx[a][a] += RIDGE_LAMBDA;
  const beta = solve(xtx, xty);
  if (!beta || beta.some((v) => !Number.isFinite(v))) return null;

  const fitted = x.map((row) => row.reduce((acc, v, j) => acc + v * beta[j], 0));
  const residuals = y.map((v, i) => v - fitted[i]);
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  const ssRes = residuals.reduce((acc, r) => acc + r * r, 0);
  const ssTot = y.reduce((acc, v) => acc + (v - meanY) ** 2, 0);
  const n = y.length;
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const r2Adjusted = 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - k);

  return {
    coefficients: beta,
    residuals,
    smearing: residuals.reduce((acc, r) => acc + Math.exp(r), 0) / n,
    r2Adjusted,
    sampleDays: n,
    originDate: origin,
    maxObservedSpend: Math.max(...days.map((d) => d.spend)),
  };
}

function linear(model: LeadModel, date: string, spend: number): number {
  return features(date, spend, model.originDate).reduce((acc, v, j) => acc + v * model.coefficients[j], 0);
}

/** Leads esperados em um dia com o investimento informado. */
export function predictDailyLeads(model: LeadModel, date: string, spend: number): number {
  if (spend <= 0) return 0;
  return Math.max(0, Math.exp(linear(model, date, spend)) * model.smearing - 1);
}

/** Gerador determinístico (mulberry32): a mesma entrada dá sempre a mesma resposta. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

export function projectMonth(model: LeadModel, input: ProjectionInput, dailySpend: number): ProjectionResult {
  const spend = Math.max(0, dailySpend);
  const futureSpend = spend * input.futureDates.length;
  const expectedFuture = input.futureDates.reduce((acc, d) => acc + predictDailyLeads(model, d, spend), 0);
  const expectedLeads = input.currentLeads + expectedFuture;

  const totals: number[] = [];
  if (spend > 0 && input.futureDates.length > 0) {
    const linears = input.futureDates.map((d) => linear(model, d, spend));
    const rand = rng(Math.round(spend * 100) + input.futureDates.length);
    const res = model.residuals;
    for (let s = 0; s < SIMULATIONS; s++) {
      let total = input.currentLeads;
      for (const l of linears) total += Math.max(0, Math.exp(l + res[Math.floor(rand() * res.length)]) - 1);
      totals.push(total);
    }
    totals.sort((a, b) => a - b);
  } else {
    totals.push(input.currentLeads);
  }

  const probability = input.target > 0 ? totals.filter((t) => t >= input.target).length / totals.length : 1;

  return {
    dailySpend: spend,
    expectedLeads,
    lowLeads: percentile(totals, 0.1),
    highLeads: percentile(totals, 0.9),
    probability,
    expectedCpl: expectedFuture > 0 ? futureSpend / expectedFuture : null,
    futureSpend,
    extrapolating: spend > model.maxObservedSpend * 1.1,
  };
}

/**
 * Menor investimento diário cuja projeção esperada fecha a meta. Busca só até
 * 3× o maior investimento já visto; acima disso a regressão não tem respaldo.
 */
export function requiredDailySpend(model: LeadModel, input: ProjectionInput): number | null {
  const remaining = input.target - input.currentLeads;
  if (remaining <= 0) return 0;
  if (input.futureDates.length === 0) return null;
  const expected = (spend: number) => input.futureDates.reduce((acc, d) => acc + predictDailyLeads(model, d, spend), 0);
  let hi = model.maxObservedSpend * 3;
  if (expected(hi) < remaining) return null;
  let lo = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (expected(mid) >= remaining) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

/**
 * Validação fora da amostra: em cada corte, ajusta só com o passado e prevê os
 * leads dos 7 dias seguintes usando o investimento que de fato aconteceu.
 * Compara com o método atual (média de leads dos últimos 7 dias × 7).
 */
export function backtestLeadModel(rows: ProjectionDay[], horizon = 7, halfLifeDays = RECENCY_HALF_LIFE_DAYS): ProjectionBacktest | null {
  const days = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let modelErr = 0;
  let baseErr = 0;
  let windows = 0;
  for (let cut = MIN_MODEL_DAYS + 7; cut + horizon <= days.length; cut += 3) {
    const model = fitLeadModel(days.slice(0, cut), halfLifeDays);
    if (!model) continue;
    const future = days.slice(cut, cut + horizon);
    const actual = future.reduce((acc, d) => acc + d.leads, 0);
    const predicted = future.reduce((acc, d) => acc + predictDailyLeads(model, d.date, d.spend), 0);
    const pace = days.slice(cut - 7, cut).reduce((acc, d) => acc + d.leads, 0);
    modelErr += Math.abs(predicted - actual);
    baseErr += Math.abs(pace - actual);
    windows++;
  }
  if (windows === 0) return null;
  return { modelMae: modelErr / windows, baselineMae: baseErr / windows, windows };
}

export interface LeadProjectionPayload {
  model: LeadModel;
  input: ProjectionInput;
  /** Média de investimento diário dos últimos 7 dias com veiculação. */
  baselineDailySpend: number;
  requiredDailySpend: number | null;
  backtest: ProjectionBacktest | null;
  /** O modelo errou menos que o ritmo de 7 dias no backtest. */
  beatsBaseline: boolean;
}

/** Monta o bloco de projeção da unidade; null quando o histórico não sustenta o modelo. */
export function buildLeadProjection(
  rows: ProjectionDay[],
  currentLeads: number,
  target: number,
  todayIso: string,
): LeadProjectionPayload | null {
  const past = rows.filter((d) => d.date <= todayIso);
  const model = fitLeadModel(past);
  if (!model) return null;

  const futureDates: string[] = [];
  const today = new Date(`${todayIso}T00:00:00Z`);
  for (let d = new Date(today.getTime() + DAY_MS); d.getUTCMonth() === today.getUTCMonth(); d = new Date(d.getTime() + DAY_MS)) {
    futureDates.push(d.toISOString().slice(0, 10));
  }

  const recent = past.filter((d) => d.spend > 0).slice(-7);
  const baselineDailySpend = recent.length > 0 ? recent.reduce((acc, d) => acc + d.spend, 0) / recent.length : 0;
  const input: ProjectionInput = { currentLeads, target, futureDates };
  const backtest = backtestLeadModel(past);

  return {
    model,
    input,
    baselineDailySpend: Math.round(baselineDailySpend * 100) / 100,
    requiredDailySpend: requiredDailySpend(model, input),
    backtest,
    beatsBaseline: backtest ? backtest.modelMae <= backtest.baselineMae : false,
  };
}
