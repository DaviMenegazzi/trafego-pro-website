import { logger } from "./logger.js";

// Notificações push via ntfy (servidor próprio na VPS; o iPhone recebe pelo app ntfy).
// O tópico só aceita publicação com token; NTFY_TOKEN é de um usuário com acesso write-only.

export type NtfyMessage = {
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  click?: string;
};

type NtfyConfig = { url: string; topic: string; token: string | null };

export function ntfyConfigFromEnv(): NtfyConfig | null {
  const url = process.env.NTFY_URL?.trim().replace(/\/$/, "");
  const topic = process.env.NTFY_TOPIC?.trim();
  if (!url || !topic) return null;
  return { url, topic, token: process.env.NTFY_TOKEN?.trim() || null };
}

// Publica pelo formato JSON: título e texto vão no corpo, então acento e emoji não quebram cabeçalho HTTP.
export async function sendNtfyNotification(notification: NtfyMessage): Promise<boolean> {
  const config = ntfyConfigFromEnv();
  if (!config) return false;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({ topic: config.topic, ...notification }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      logger.warn("[ntfy] Falha ao enviar notificação", { status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn("[ntfy] Falha ao enviar notificação", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
