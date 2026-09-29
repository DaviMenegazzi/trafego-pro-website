// Contrato do CRM Kanban do Pixel, compartilhado entre servidor e navegador.
// O cartão é uma projeção de evolution_leads: mesmo id, mesmos códigos de etapa.

export const CRM_STAGES = [
  "lead_not_responded",
  "lead_responded",
  "follow_up",
  "lead_replied",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];
export type CrmStageMode = "automatic" | "manual";
export type CrmTemperature = "HOT" | "WARM" | "COLD";
export type CrmTemperatureFilter = CrmTemperature | "unrated";
export type CrmClassificationFilter = "pendente" | "lead";

export const CRM_STAGE_LABELS: Record<CrmStage, string> = {
  lead_not_responded: "Não respondido",
  lead_responded: "Atendimento iniciado",
  follow_up: "Follow-up",
  lead_replied: "Lead respondeu",
  negotiation: "Negociação",
  closed_won: "Ganho",
  closed_lost: "Perdido",
};

export const CRM_FINAL_STAGES: ReadonlySet<CrmStage> = new Set<CrmStage>(["closed_won", "closed_lost"]);

export const CRM_TEMPERATURE_LABELS: Record<CrmTemperature, string> = { HOT: "Quente", WARM: "Morno", COLD: "Frio" };

export const CRM_BOARD_PAGE_SIZE = 25;
export const CRM_LIST_MAX_LIMIT = 100;
export const CRM_NOTE_MAX_LENGTH = 500;

export type CrmLead = {
  id: string;
  instanceName: string;
  instanceDisplayName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  phoneLast4: string | null;
  classification: "pendente" | "lead";
  crmStage: CrmStage;
  crmStageMode: CrmStageMode;
  crmVersion: number;
  crmStageUpdatedAt: string;
  crmStageUpdatedBy: string | null;
  temperature: CrmTemperature | null;
  leadScore: number | null;
  leadScoreUpdatedAt: string | null;
  firstContactAt: string;
  lastMessageAt: string;
  messagesReceived: number;
  messagesSent: number;
  originPlatform: string;
  originEvidence: string;
};

export type CrmColumn = { items: CrmLead[]; total: number; nextCursor: string | null; hasMore: boolean };

export type CrmInstance = { instanceName: string; displayName: string | null; connectionStatus: string };

export type CrmBoard = {
  unit: { id: string; name: string };
  instances: CrmInstance[];
  columns: Record<CrmStage, CrmColumn>;
  total: number;
  generatedAt: string;
};

export type CrmLeadPage = { items: CrmLead[]; total: number; nextCursor: string | null; hasMore: boolean };

export type CrmHistoryEvent = {
  id: string;
  eventType: "stage_changed" | "automation_resumed";
  fromStage: CrmStage | null;
  toStage: CrmStage;
  fromMode: CrmStageMode | null;
  toMode: CrmStageMode | null;
  actorType: "user" | "automation" | null;
  actorLabel: string;
  changedAt: string;
  note: string | null;
};

export type CrmHistoryPage = { items: CrmHistoryEvent[]; nextCursor: string | null };

export type CrmFilters = {
  instanceName?: string;
  temperature?: CrmTemperatureFilter;
  classification?: CrmClassificationFilter;
  q?: string;
};

export type CrmErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "REQUEST_CONFLICT"
  | "INVALID_REQUEST"
  | "DISABLED"
  | "UNAVAILABLE";

export type CrmErrorBody = { error: { code: CrmErrorCode; message: string; requestId: string } };

export function isCrmStage(value: unknown): value is CrmStage {
  return typeof value === "string" && (CRM_STAGES as readonly string[]).includes(value);
}

/** Destino de um drop no quadro; null quando não há mudança de etapa. */
export function resolveCrmDrop<T extends { id: string; crmStage: CrmStage }>(
  leads: T[], activeId: string, targetId: string | null,
): { lead: T; stage: CrmStage } | null {
  const lead = leads.find((candidate) => candidate.id === activeId);
  if (!lead || !isCrmStage(targetId)) return null;
  return lead.crmStage === targetId ? null : { lead, stage: targetId };
}

/** Reabrir um lead encerrado (Ganho/Perdido) pede confirmação explícita. */
export function isCrmReopen(from: CrmStage, to: CrmStage): boolean {
  return CRM_FINAL_STAGES.has(from) && !CRM_FINAL_STAGES.has(to);
}

/** Telefone legível; nunca derivado de identificadores internos (JID/LID). */
export function formatCrmPhone(lead: Pick<CrmLead, "contactPhone" | "phoneLast4">): { label: string; partial: boolean; copyValue: string | null } {
  const digits = lead.contactPhone?.replace(/\D/g, "") ?? "";
  if (digits.length >= 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    const split = local.length === 9 ? 5 : 4;
    return { label: `+55 (${ddd}) ${local.slice(0, split)}-${local.slice(split)}`, partial: false, copyValue: `+${digits}` };
  }
  if (digits.length >= 8) return { label: `+${digits}`, partial: false, copyValue: `+${digits}` };
  if (lead.phoneLast4) return { label: `Final ${lead.phoneLast4}`, partial: true, copyValue: null };
  return { label: "Número indisponível", partial: true, copyValue: null };
}
