import { resilientFetch } from "./resilientFetch.js";

// Cliente do serviço Laya compartilhado (services/laya-classifier), o mesmo que o SDR Flow usa
// via /predict. O serviço roda uma inferência por vez para os dois projetos, então quem chama
// precisa ficar fora do caminho do webhook e tolerar respostas lentas ou falhas.

export const LAYA_MODEL_NAME = "laya";

export type LayaConfig = {
  url: string;
  secret: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export type LayaQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } };

export type LayaAnswer = {
  type: "choice" | "score" | "noul";
  choice?: string;
  score?: number;
  noul?: number;
  confidence: number;
};

function isAnswer(value: unknown): value is LayaAnswer {
  const answer = value as LayaAnswer | null;
  if (!answer || typeof answer !== "object") return false;
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) return false;
  if (answer.type === "choice") return typeof answer.choice === "string";
  if (answer.type === "score") return Number.isFinite(answer.score);
  return answer.type === "noul" && Number.isFinite(answer.noul);
}

export function layaConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LayaConfig | null {
  const url = env.LAYA_SERVICE_URL?.trim();
  const secret = env.LAYA_SERVICE_SECRET?.trim();
  if (!url || !secret) return null;
  return { url, secret, timeoutMs: Number(env.LAYA_TIMEOUT_MS) || 45_000 };
}

/** A Laya trunca um state em lista pela esquerda, então as mensagens mais novas sobrevivem. */
export async function layaPredict(
  config: LayaConfig,
  state: string[],
  questions: Record<string, LayaQuestion>,
): Promise<Record<string, LayaAnswer>> {
  const fetcher = config.fetcher ?? resilientFetch;
  let response: Response;
  try {
    response = await fetcher(`${config.url.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state, questions }),
      // Em CPU limitada a inferência leva ~3-9s e o serviço processa uma por vez (fila).
      timeoutMs: config.timeoutMs ?? 45_000,
      maxRetries: 1,
    } as RequestInit & { timeoutMs?: number; maxRetries?: number });
  } catch {
    throw new Error("Laya indisponível ou tempo limite excedido.");
  }
  if (!response.ok) throw new Error(`Laya: HTTP ${response.status}.`);
  const body = await response.json().catch(() => null) as { answers?: Record<string, unknown> } | null;
  const answers: Record<string, LayaAnswer> = {};
  for (const id of Object.keys(questions)) {
    const answer = body?.answers?.[id];
    if (!isAnswer(answer) || answer.type !== questions[id]!.type) throw new Error(`Laya retornou uma resposta inválida para ${id}.`);
    answers[id] = answer;
  }
  return answers;
}
