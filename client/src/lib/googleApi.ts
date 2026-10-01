import type { Ga4LandingPage, Ga4LandingPageInput, Ga4LandingPagesResponse, Ga4Report } from "../../../shared/google";

export class GoogleRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function googleFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("tp_token");
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GoogleRequestError(0, "Sem conexão com o servidor. Verifique a internet e tente novamente.");
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new GoogleRequestError(response.status, data.error || "Não foi possível carregar os dados do Google.");
  return data as T;
}

export function fetchLandingPages(unitId: string, signal?: AbortSignal) {
  return googleFetch<Ga4LandingPagesResponse>(`/api/google/landing-pages?${new URLSearchParams({ unitId })}`, { signal });
}

export function createLandingPageRequest(input: Ga4LandingPageInput) {
  return googleFetch<{ landingPage: Ga4LandingPage; verified: boolean }>("/api/google/landing-pages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteLandingPageRequest(id: string) {
  return googleFetch<{ landingPage: Ga4LandingPage }>(`/api/google/landing-pages/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchGa4Report(
  params: { unitId: string; landingPageId: string; start: string; end: string; fresh?: boolean },
  signal?: AbortSignal,
) {
  const { fresh, ...rest } = params;
  const query = new URLSearchParams({ ...rest, ...(fresh ? { fresh: "1" } : {}) });
  return googleFetch<Ga4Report>(`/api/google/report?${query}`, { signal });
}
