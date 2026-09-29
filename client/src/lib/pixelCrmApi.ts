import type {
  CrmBoard,
  CrmErrorCode,
  CrmFilters,
  CrmHistoryPage,
  CrmLead,
  CrmLeadPage,
  CrmStage,
} from "../../../shared/crm";

export class CrmRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: CrmErrorCode | "NETWORK",
    message: string,
    public readonly lead?: CrmLead,
  ) {
    super(message);
  }
}

const STATUS_CODES: Record<number, CrmErrorCode> = {
  401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "VERSION_CONFLICT", 422: "INVALID_REQUEST",
};

function authHeaders(json: boolean): HeadersInit {
  const token = typeof localStorage === "undefined" ? null : localStorage.getItem("tp_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

// As rotas do CRM respondem { error: { code, message } }; os middlewares de sessão, { error: "texto" }.
async function crmFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "include", cache: "no-store", headers: authHeaders(Boolean(init.body)) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new CrmRequestError(0, "NETWORK", "Sem conexão com o servidor. Verifique a internet e tente novamente.");
  }
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.ok) return data as T;
  const error = data.error;
  if (error && typeof error === "object") {
    const body = error as { code?: CrmErrorCode; message?: string };
    throw new CrmRequestError(response.status, body.code ?? STATUS_CODES[response.status] ?? "UNAVAILABLE", body.message ?? "Não foi possível concluir a operação.", data.lead as CrmLead | undefined);
  }
  throw new CrmRequestError(
    response.status,
    STATUS_CODES[response.status] ?? "UNAVAILABLE",
    typeof error === "string" ? error : response.status === 429 ? "Muitas requisições. Aguarde alguns segundos." : "Não foi possível concluir a operação.",
  );
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  return search.toString();
}

const BASE = "/api/evolution/pixel/crm";

export function fetchCrmBoard(unitId: string, filters: CrmFilters, signal?: AbortSignal): Promise<CrmBoard> {
  return crmFetch(`${BASE}/board?${query({ unitId, ...filters })}`, { signal });
}

export function fetchCrmLeadPage(unitId: string, stage: CrmStage, filters: CrmFilters, cursor: string, signal?: AbortSignal): Promise<CrmLeadPage> {
  return crmFetch(`${BASE}/leads?${query({ unitId, stage, cursor, ...filters })}`, { signal });
}

export function fetchCrmLead(unitId: string, leadId: string, signal?: AbortSignal): Promise<CrmLead> {
  return crmFetch(`${BASE}/leads/${leadId}?${query({ unitId })}`, { signal });
}

export function fetchCrmHistory(unitId: string, leadId: string, cursor?: string | null, signal?: AbortSignal): Promise<CrmHistoryPage> {
  return crmFetch(`${BASE}/leads/${leadId}/history?${query({ unitId, cursor })}`, { signal });
}

export function moveCrmLeadRequest(unitId: string, lead: CrmLead, stage: CrmStage, requestId: string, note?: string): Promise<CrmLead> {
  return crmFetch(`${BASE}/leads/${lead.id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ unitId, stage, expectedVersion: lead.crmVersion, requestId, ...(note ? { note } : {}) }),
  });
}

export function resumeCrmAutomationRequest(unitId: string, lead: CrmLead, requestId: string): Promise<CrmLead> {
  return crmFetch(`${BASE}/leads/${lead.id}/automation`, {
    method: "PATCH",
    body: JSON.stringify({ unitId, mode: "automatic", expectedVersion: lead.crmVersion, requestId }),
  });
}

// Painel do cartão reaproveita as rotas do Pixel (mesma validação de sessão e unidade).
export type CrmMessage = { id: string; direction: "incoming" | "outgoing"; bodyText: string; sentAt: string };
export type CrmAttribution = {
  campaignName: string | null; adsetName: string | null; adName: string | null; creativeName: string | null;
  adImageUrl: string | null; matchStatus: "matched" | "unresolved";
};

export async function fetchCrmMessages(unitId: string, leadId: string, signal?: AbortSignal): Promise<CrmMessage[]> {
  const data = await crmFetch<{ rows: CrmMessage[] }>(`/api/evolution/pixel/leads/${leadId}/messages?${query({ unitId, limit: 20 })}`, { signal });
  return data.rows ?? [];
}

export async function fetchCrmAttribution(unitId: string, leadId: string, signal?: AbortSignal): Promise<CrmAttribution | null> {
  const data = await crmFetch<{ attribution: CrmAttribution | null }>(`/api/evolution/pixel/leads/${leadId}/attribution?${query({ unitId })}`, { signal });
  return data.attribution ?? null;
}
