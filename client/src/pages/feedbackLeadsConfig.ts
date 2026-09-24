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
  leadsContacted: string;
  leadsResponded: string;
  leadsConverted: string;
  leadsLost: string;
  leadsInNegotiation: string;
};

/**
 * Coerência do funil semanal: ninguém é contatado sem ter chegado, ninguém
 * responde sem ter sido contatado, e o desfecho (fechou, perdeu, negociando)
 * não passa de quem respondeu. Campos vazios não geram erro aqui (o
 * obrigatório é tratado à parte).
 */
export function validateFeedbackCounts(counts: FeedbackCounts): Partial<Record<keyof FeedbackCounts, string>> {
  const value = (key: keyof FeedbackCounts) => (counts[key] === "" ? null : Number(counts[key]));
  const errors: Partial<Record<keyof FeedbackCounts, string>> = {};
  const total = value("totalLeads");
  const contacted = value("leadsContacted");
  const responded = value("leadsResponded");
  const converted = value("leadsConverted");
  const lost = value("leadsLost");
  const negotiating = value("leadsInNegotiation");

  (Object.keys(counts) as (keyof FeedbackCounts)[]).forEach((key) => {
    const v = value(key);
    if (v !== null && (!Number.isInteger(v) || v < 0)) errors[key] = "Use um número inteiro, zero ou maior.";
  });

  if (total !== null && contacted !== null && contacted > total && !errors.leadsContacted) {
    errors.leadsContacted = `Não pode passar dos ${total} recebidos.`;
  }
  if (contacted !== null && responded !== null && responded > contacted && !errors.leadsResponded) {
    errors.leadsResponded = `Não pode passar dos ${contacted} contatados.`;
  }
  if (responded !== null && converted !== null && lost !== null && negotiating !== null) {
    const outcome = converted + lost + negotiating;
    if (outcome > responded && !errors.leadsConverted && !errors.leadsLost && !errors.leadsInNegotiation) {
      errors.leadsInNegotiation = `Fecharam + perdidos + em negociação somam ${outcome}, mais que os ${responded} que responderam.`;
    }
  } else if (responded !== null && converted !== null && converted > responded && !errors.leadsConverted) {
    errors.leadsConverted = `Não pode passar dos ${responded} que responderam.`;
  }
  return errors;
}
