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
