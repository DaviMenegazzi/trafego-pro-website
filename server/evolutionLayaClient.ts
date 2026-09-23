import { resilientFetch } from "./resilientFetch.js";
import type { EvolutionCrmStage, EvolutionMessage } from "./evolutionSupabaseStore.js";

export const LAYA_MODEL_NAME = "laya";

export type LayaClassification = {
  proposedStage: EvolutionCrmStage;
  confidence: number;
};

const CRM_STAGES: EvolutionCrmStage[] = [
  "lead_not_responded",
  "lead_responded",
  "follow_up",
  "lead_replied",
  "negotiation",
  "closed_won",
  "closed_lost",
];

type LayaResponseBody = {
  proposedStage?: string;
  confidence?: number;
  error?: string;
};

export async function classifyLeadStageWithLaya(
  input: {
    leadId: string;
    instanceName: string;
    currentStage: EvolutionCrmStage;
    messages: Pick<EvolutionMessage, "direction" | "bodyText" | "sentAt">[];
  },
  options: { serviceUrl?: string; serviceSecret?: string; fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<LayaClassification> {
  const serviceUrl = options.serviceUrl ?? process.env.LAYA_SERVICE_URL;
  const serviceSecret = options.serviceSecret ?? process.env.LAYA_SERVICE_SECRET;
  if (!serviceUrl) throw new Error("LAYA_SERVICE_URL não configurada");
  if (!serviceSecret) throw new Error("LAYA_SERVICE_SECRET não configurada");

  const fetcher = options.fetcher ?? resilientFetch;
  const response = await fetcher(`${serviceUrl.replace(/\/$/, "")}/classify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceSecret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      leadId: input.leadId,
      instanceName: input.instanceName,
      currentStage: input.currentStage,
      messages: input.messages.map((message) => ({ direction: message.direction, bodyText: message.bodyText, sentAt: message.sentAt })),
    }),
    // Em CPU limitada a inferência leva ~3-9s e o serviço processa uma por vez (fila).
    timeoutMs: options.timeoutMs ?? 45000,
    maxRetries: 1,
  } as RequestInit & { timeoutMs?: number; maxRetries?: number });

  const rawBody = await response.text();
  let body: LayaResponseBody = {};
  try { body = JSON.parse(rawBody) as LayaResponseBody; } catch { /* handled below */ }
  if (!response.ok) throw new Error(body.error || `Serviço Laya respondeu com HTTP ${response.status}`);
  if (typeof body.proposedStage !== "string" || !CRM_STAGES.includes(body.proposedStage as EvolutionCrmStage)) {
    throw new Error("Serviço Laya retornou uma etapa de CRM inválida");
  }
  if (typeof body.confidence !== "number" || !Number.isFinite(body.confidence) || body.confidence < 0 || body.confidence > 1) {
    throw new Error("Serviço Laya retornou uma confiança inválida");
  }
  return { proposedStage: body.proposedStage as EvolutionCrmStage, confidence: body.confidence };
}
