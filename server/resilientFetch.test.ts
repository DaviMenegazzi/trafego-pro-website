import { describe, expect, it, vi } from "vitest";
import { resilientFetch } from "./resilientFetch.js";

describe("ResilientFetch com Retry e Backoff", () => {
  it("retorna com sucesso na primeira tentativa para respostas 200 OK", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    try {
      const response = await resilientFetch("https://api.example.com/test", { maxRetries: 2 });
      expect(response.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("realiza retry automático em caso de 429 Too Many Requests", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: "rate limit" }), {
          status: 429,
          headers: { "retry-after": "0.01" },
        });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    try {
      const response = await resilientFetch("https://api.example.com/rate-limited", {
        maxRetries: 3,
        initialDelayMs: 10,
      });
      expect(response.status).toBe(200);
      expect(callCount).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("realiza retry automático em caso de erro 503 do servidor", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: "service unavailable" }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    try {
      const response = await resilientFetch("https://api.example.com/service", {
        maxRetries: 3,
        initialDelayMs: 10,
      });
      expect(response.status).toBe(200);
      expect(callCount).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
