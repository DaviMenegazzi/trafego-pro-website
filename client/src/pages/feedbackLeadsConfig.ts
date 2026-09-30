export const FALLBACK_UNITS = [
  "Ijuí",
  "Passo Fundo",
  "Bento Gonçalves",
  "Canela",
  "Tupanciretã",
  "Júlio de Castilhos",
  "Belo Horizonte/Barreiro",
  "Lajeado",
  "Sant'Ana do Livramento",
  "Santa Maria",
  "Santo Ângelo",
  "Alegrete",
  "Caxias do Sul",
  "Chapecó",
  "Erechim",
  "Itaqui",
  "Uruguaiana",
] as const;

export const LOSS_REASONS = [
  "Preço",
  "Não respondeu",
  "Não tinha interesse",
  "Fora do perfil",
  "Outro",
] as const;

export const COMMUNICATION_OPTIONS = ["Sim", "Parcialmente", "Não"] as const;
export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export const FEEDBACK_LAYOUT = {
  page: "mx-auto max-w-5xl space-y-8 px-4 py-7 sm:px-8 sm:py-10",
  form: "space-y-6",
  identityGrid: "grid grid-cols-1 gap-4 md:grid-cols-3",
  metricsGrid: "grid grid-cols-1 gap-4 md:grid-cols-2",
  fieldMinHeight: 44,
} as const;

export type AuthorizedUnitClient = {
  id: string | number;
  name: string;
};

export function getAuthorizedUnitNames(
  clients: AuthorizedUnitClient[],
  _fallbackUnits: readonly string[],
  allowedClientIds: readonly string[] = [],
  role = "",
): string[] {
  const hasFullAccess = role === "admin" || allowedClientIds.includes("*");
  if (clients.length === 0) return [];

  const allowed = new Set(allowedClientIds.map(String));
  return clients
    .filter((client) => hasFullAccess || allowed.has(String(client.id)))
    .map((client) => client.name)
    .filter((name, index, names) => Boolean(name) && names.indexOf(name) === index);
}

export type FeedbackCounts = {
  totalLeads: string;
  leadsConverted: string;
  leadsLost: string;
  leadsInNegotiation: string;
};

/**
 * Coerência da semana: fecharam + perdidos + em negociação não passam dos
 * leads recebidos. Campos vazios não geram erro aqui (o obrigatório é
 * tratado à parte).
 */
export function validateFeedbackCounts(counts: FeedbackCounts): Partial<Record<keyof FeedbackCounts, string>> {
  const value = (key: keyof FeedbackCounts) => (counts[key] === "" ? null : Number(counts[key]));
  const errors: Partial<Record<keyof FeedbackCounts, string>> = {};
  // Lista fixa: o formulário passa o objeto inteiro, com unidade e semana junto.
  (["totalLeads", "leadsConverted", "leadsLost", "leadsInNegotiation"] as const).forEach((key) => {
    const v = value(key);
    if (v !== null && (!Number.isInteger(v) || v < 0)) errors[key] = "Use um número inteiro, zero ou maior.";
  });
  if (Object.keys(errors).length > 0) return errors;

  const total = value("totalLeads");
  const outcomes = (["leadsConverted", "leadsLost", "leadsInNegotiation"] as const).map(value);
  if (total === null) return errors;
  const filled = outcomes.filter((v): v is number => v !== null);
  const sum = filled.reduce((a, b) => a + b, 0);
  if (sum > total) {
    errors.leadsInNegotiation = filled.length === 3
      ? `Fecharam + perdidos + em negociação somam ${sum}, mais que os ${total} recebidos.`
      : `Já passa dos ${total} recebidos.`;
  }
  return errors;
}

export type FeedbackWeek = {
  /** Início e fim no formato AAAA-MM-DD. */
  start: string;
  end: string;
  /** Posição da semana no mês (1 a 5), a mesma das colunas S1–S5 da aba Tráfego. */
  number: number;
  /** Ex.: "26 a 30/09". */
  label: string;
};

const FRIDAY = 5;
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Semanas de um mês (m de 0 a 11), na regra da aba Tráfego: semanas de sábado
 * a sexta; a primeira vai do dia 1 até a primeira sexta e a última do sábado
 * seguinte à última sexta até o fim do mês. Um pedaço de ponta com 3 dias ou
 * menos se junta à semana vizinha; com 4 ou mais vale como semana própria.
 */
export function monthWeeks(year: number, month: number): FeedbackWeek[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const ranges: [number, number][] = [];
  let start = 1;
  for (let day = 1; day <= lastDay; day += 1) {
    if (new Date(year, month, day).getDay() === FRIDAY) {
      ranges.push([start, day]);
      start = day + 1;
    }
  }
  if (start <= lastDay) ranges.push([start, lastDay]);

  const days = ([a, b]: [number, number]) => b - a + 1;
  if (ranges.length > 1 && days(ranges[0]) <= 3) ranges.splice(0, 2, [ranges[0][0], ranges[1][1]]);
  const n = ranges.length;
  if (n > 1 && days(ranges[n - 1]) <= 3) ranges.splice(n - 2, 2, [ranges[n - 2][0], ranges[n - 1][1]]);

  return ranges.map(([a, b], index) => ({
    start: isoOf(year, month, a),
    end: isoOf(year, month, b),
    number: index + 1,
    label: `${pad(a)} a ${pad(b)}/${pad(month + 1)}`,
  }));
}

/** Semana (na regra do mês) que contém a data. */
export function feedbackWeekFor(date: Date): FeedbackWeek {
  const iso = isoOf(date.getFullYear(), date.getMonth(), date.getDate());
  return monthWeeks(date.getFullYear(), date.getMonth()).find((w) => w.start <= iso && iso <= w.end)!;
}

/** Semana imediatamente anterior (pode ser a última do mês passado). */
export function previousFeedbackWeek(week: FeedbackWeek): FeedbackWeek {
  const [y, m, d] = week.start.split("-").map(Number);
  return feedbackWeekFor(new Date(y, m - 1, d - 1));
}
