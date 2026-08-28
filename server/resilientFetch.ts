import { logger } from "./logger.js";

export interface ResilientFetchOptions extends RequestInit {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetch(
  url: string | URL,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 400,
    maxDelayMs = 8000,
    backoffFactor = 2,
    timeoutMs = 15000,
    ...fetchOptions
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const mergedSignal = fetchOptions.signal
        ? AbortSignal.any([fetchOptions.signal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        ...fetchOptions,
        signal: mergedSignal,
      });

      clearTimeout(timeoutId);

      // Status 429: Too Many Requests -> Respeita Retry-After se fornecido
      if (response.status === 429 && attempt <= maxRetries) {
        const retryAfterHeader = response.headers.get("retry-after");
        let retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
        if (retryAfterSeconds == null || Number.isNaN(retryAfterSeconds) || retryAfterSeconds <= 0) {
          retryAfterSeconds = (delay * (1 + Math.random() * 0.2)) / 1000;
        }

        logger.warn(`[resilient-fetch] 429 Rate Limit ao acessar ${url.toString()} — aguardando ${retryAfterSeconds}s (tentativa ${attempt}/${maxRetries})`);
        await sleep(Math.min(retryAfterSeconds * 1000, maxDelayMs));
        delay = Math.min(delay * backoffFactor, maxDelayMs);
        continue;
      }

      // Status 5xx transitórios: tenta novamente
      if ([500, 502, 503, 504].includes(response.status) && attempt <= maxRetries) {
        logger.warn(`[resilient-fetch] Status ${response.status} ao acessar ${url.toString()} — retry em ${delay}ms (tentativa ${attempt}/${maxRetries})`);
        await sleep(delay * (1 + Math.random() * 0.2));
        delay = Math.min(delay * backoffFactor, maxDelayMs);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetwork = error instanceof TypeError || isAbort;

      if (isNetwork && attempt <= maxRetries) {
        logger.warn(`[resilient-fetch] Erro de rede/timeout ao acessar ${url.toString()}: ${error instanceof Error ? error.message : String(error)} — retry em ${delay}ms (tentativa ${attempt}/${maxRetries})`);
        await sleep(delay * (1 + Math.random() * 0.2));
        delay = Math.min(delay * backoffFactor, maxDelayMs);
        continue;
      }

      throw error;
    }
  }
}
