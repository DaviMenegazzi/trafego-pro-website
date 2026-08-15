import { AI_AUTOMATION_ACTOR } from "../shared/evolutionAiPolicy.js";
import type { EvolutionCrmStage, EvolutionMessage } from "./evolutionSupabaseStore.js";

export const OPENAI_LEAD_CLASSIFIER_MODEL = "gpt-5-nano";
export const AUTOMATION_ACTOR = AI_AUTOMATION_ACTOR;

export const CRM_STAGES: EvolutionCrmStage[] = [
  "lead_not_responded",
  "lead_responded",
  "follow_up",
  "lead_replied",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export type AiCrmClassification = {
  proposedStage: EvolutionCrmStage;
  confidence: number;
  rationale: string;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export function buildClassificationPrompt(input: {
  currentStage: EvolutionCrmStage;
  messages: Pick<EvolutionMessage, "direction" | "bodyText" | "sentAt">[];
}): string {
  const transcript = input.messages.map((message, index) => {
    const direction = message.direction === "incoming" ? "CONTATO" : "EQUIPE";
    return `${index + 1}. ${direction}: ${message.bodyText.slice(0, 1600)}`;
  }).join("\n");

  return [
    "Classifique de forma conservadora a etapa do funil com base somente na conversa abaixo.",
    "Não invente fatos. Não use ou solicite nome, telefone, campanhas, origem ou outros dados do contato.",
    "Etapas permitidas:",
    "- lead_not_responded: existe um lead, mas a equipe ainda não respondeu de forma útil.",
    "- lead_responded: a equipe respondeu, mas o contato ainda não respondeu à equipe.",
    "- follow_up: a equipe precisa retomar a conversa após ausência de resposta ou pendência.",
    "- lead_replied: o contato respondeu e há interesse/continuidade, sem negociação clara.",
    "- negotiation: há proposta, preço, condições, documentos, agendamento final ou negociação ativa.",
    "- closed_won: há confirmação clara de contratação, compra ou conversão.",
    "- closed_lost: há desistência clara, recusa definitiva ou perda confirmada.",
    `A etapa atual é ${input.currentStage}. Só proponha closed_won ou closed_lost com evidência explícita.`,
    "Quando a conversa for ambígua, mantenha a etapa atual e use confiança menor que 0.80.",
    "A justificativa deve ter no máximo 240 caracteres, em português, e citar somente fatos da conversa.",
    "CONVERSA:",
    transcript || "Sem mensagens de texto disponíveis.",
  ].join("\n");
}

export function parseAiCrmClassification(content: string): AiCrmClassification {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("A OpenAI não retornou uma classificação JSON válida");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("A OpenAI retornou uma classificação inválida");
  const record = raw as Record<string, unknown>;
  const proposedStage = record.proposedStage;
  const confidence = record.confidence;
  const rationale = record.rationale;
  if (typeof proposedStage !== "string" || !CRM_STAGES.includes(proposedStage as EvolutionCrmStage)) {
    throw new Error("A OpenAI retornou uma etapa de CRM inválida");
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("A OpenAI retornou uma confiança inválida");
  }
  if (typeof rationale !== "string" || !rationale.trim()) throw new Error("A OpenAI não retornou justificativa");
  return { proposedStage: proposedStage as EvolutionCrmStage, confidence, rationale: rationale.trim().slice(0, 240) };
}

export async function classifyEvolutionConversation(
  input: { currentStage: EvolutionCrmStage; messages: Pick<EvolutionMessage, "direction" | "bodyText" | "sentAt">[] },
  options: { apiKey?: string; fetcher?: typeof fetch } = {},
): Promise<AiCrmClassification> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_LEAD_CLASSIFIER_MODEL,
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: "Você é um classificador conservador de estágio de CRM. Retorne somente o JSON solicitado." },
        { role: "user", content: buildClassificationPrompt(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crm_lead_stage",
          strict: true,
          schema: {
            type: "object",
            properties: {
              proposedStage: { type: "string", enum: CRM_STAGES },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              rationale: { type: "string", minLength: 1, maxLength: 240 },
            },
            required: ["proposedStage", "confidence", "rationale"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const rawBody = await response.text();
  let body: OpenAiResponse = {};
  try { body = JSON.parse(rawBody) as OpenAiResponse; } catch { /* handled below */ }
  if (!response.ok) throw new Error(body.error?.message || `OpenAI respondeu com HTTP ${response.status}`);
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("A OpenAI não retornou conteúdo de classificação");
  return parseAiCrmClassification(content);
}
