export class MetricsSessionError extends Error {
  readonly code = "SESSION_EXPIRED";

  constructor() {
    super("Sua sessão do Supabase expirou. Entre novamente para atualizar as métricas.");
    this.name = "MetricsSessionError";
  }
}

export async function readMetricsResponse<T = unknown>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (response.status === 401) {
    throw new MetricsSessionError();
  }

  if (!contentType.includes("application/json")) {
    throw new Error("O servidor retornou uma resposta inesperada ao consultar as métricas.");
  }

  let payload: unknown;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    throw new Error("O servidor retornou métricas em um formato inválido.");
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: unknown }).error || fallbackMessage)
      : fallbackMessage;
    throw new Error(message);
  }

  return payload as T;
}
