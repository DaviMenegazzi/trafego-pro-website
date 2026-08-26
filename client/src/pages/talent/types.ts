export type Unit = {
  id: string;
  name: string;
};

export type TalentFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "cpf"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file";

export type TalentSubmissionStatus =
  | "novo"
  | "em_analise"
  | "entrevista"
  | "aprovado"
  | "reprovado"
  | "banco";

export type TalentFieldOption = {
  label: string;
  value: string;
};

export type TalentField = {
  id?: string;
  fieldKey: string;
  label: string;
  fieldType: TalentFieldType;
  isRequired: boolean;
  orderIndex: number;
  placeholder: string | null;
  helpText: string | null;
  options: TalentFieldOption[];
  validationRules: Record<string, unknown>;
};

export type TalentForm = {
  id: string;
  clientId: string;
  publicSlug: string;
  title: string;
  subtitle: string;
  bannerUrl: string | null;
  lgpdDisclaimer: string;
  successTitle: string;
  successMessage: string;
  isPublished: boolean;
  fields: TalentField[];
  createdAt?: string;
  candidateCount?: number;
};

export type TalentAttachment = {
  fieldKey: string;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
};

export type TalentSubmission = {
  id: string;
  formId: string;
  clientId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  answers: Record<string, unknown>;
  attachments: TalentAttachment[];
  status: TalentSubmissionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const TALENT_FIELD_TYPES: { type: TalentFieldType; label: string; description: string }[] = [
  { type: "text", label: "Texto Curto", description: "Linha única para respostas curtas" },
  { type: "textarea", label: "Parágrafo", description: "Área de texto para respostas longas" },
  { type: "email", label: "E-mail", description: "Validação de endereço de e-mail" },
  { type: "phone", label: "Telefone / WhatsApp", description: "Formatação com DDD" },
  { type: "cpf", label: "CPF", description: "Formatação e validação de CPF" },
  { type: "number", label: "Número", description: "Apenas caracteres numéricos" },
  { type: "select", label: "Lista Suspensa", description: "Menu dropdown para escolher uma opção" },
  { type: "radio", label: "Múltipla Escolha", description: "Botões de opção (única escolha)" },
  { type: "checkbox", label: "Caixas de Seleção", description: "Permite selecionar múltiplas opções" },
  { type: "date", label: "Data", description: "Seletor de data" },
  { type: "file", label: "Anexo / Currículo", description: "Envio de arquivo PDF ou DOCX" },
];

export const TALENT_STATUS_CONFIG: Record<
  TalentSubmissionStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  novo: {
    label: "Novo",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  em_analise: {
    label: "Em Análise",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  entrevista: {
    label: "Entrevista",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
  },
  aprovado: {
    label: "Aprovado",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  reprovado: {
    label: "Reprovado",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  banco: {
    label: "Banco de Talentos",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
    dot: "bg-zinc-400",
  },
};
