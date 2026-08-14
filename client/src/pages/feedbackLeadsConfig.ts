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

export const REASONS = [
  "Preço/Objeção de valor",
  "Cliente pediu tempo para decidir",
  "Sem resposta do lead",
  "Fora da área de atuação",
  "Já é cliente/duplicado",
  "Outro",
] as const;


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
  fallbackUnits: readonly string[],
  allowedClientIds: readonly string[] = [],
  role = "",
): string[] {
  const hasFullAccess = role === "admin" || allowedClientIds.includes("*");

  if (clients.length > 0) {
    const allowed = new Set(allowedClientIds.map(String));
    return clients
      .filter((client) => hasFullAccess || allowed.has(String(client.id)))
      .map((client) => client.name)
      .filter((name, index, names) => Boolean(name) && names.indexOf(name) === index);
  }

  // Sem clientes devolvidos pelo backend, não há disponibilidade comprovada.
  // O formulário deve permanecer vazio em vez de expor a lista global.
  return [];
}
