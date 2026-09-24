import type {
  Cliente, Cobranca, ChecklistItemState, Despesa, Ata, Caixa,
  DespesaFixa, ClienteArquivado, DatabaseState,
} from "../types";

async function financialRequest(path: string, method = "GET", body?: unknown): Promise<Response> {
  const token = localStorage.getItem("tp_token");
  if (!token) throw new Error("Sessão expirada");
  const response = await fetch(`/api/finance${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Falha ao acessar os dados financeiros");
  }
  return response;
}

function normalizedState(value: Partial<DatabaseState> | null): DatabaseState {
  return {
    clientes: value?.clientes || {}, cobrancas: value?.cobrancas || {},
    checklists: value?.checklists || {}, arquivados: value?.arquivados || {},
    despesas: value?.despesas || {}, atas: value?.atas || {},
    caixa: value?.caixa || { saldo: 0, metaFimAno: 0 },
    despFixas: value?.despFixas || {}, logs: value?.logs || [],
  };
}

export function subscribeToFinancialDB(
  onData: (data: DatabaseState) => void,
  onError?: (err: Error) => void,
): () => void {
  let active = true;
  let loading = false;
  const refresh = async () => {
    if (!active || loading) return;
    loading = true;
    try {
      const response = await financialRequest("");
      const value = await response.json() as Partial<DatabaseState> | null;
      if (active) onData(normalizedState(value));
    } catch (error) {
      if (active) onError?.(error instanceof Error ? error : new Error("Falha ao carregar dados financeiros"));
    } finally {
      loading = false;
    }
  };
  void refresh();
  const interval = window.setInterval(() => { void refresh(); }, 15_000);
  return () => { active = false; window.clearInterval(interval); };
}

async function put(path: string, value: unknown): Promise<void> {
  await financialRequest(`/item/${path.split("/").map(encodeURIComponent).join("/")}`, "PUT", value);
}

async function remove(path: string): Promise<void> {
  await financialRequest(`/item/${path.split("/").map(encodeURIComponent).join("/")}`, "DELETE");
}

export async function fetchEntireFinancialState(): Promise<DatabaseState | null> {
  try {
    const response = await financialRequest("");
    return normalizedState(await response.json());
  } catch {
    return null;
  }
}

export async function saveEntireFinancialState(state: Partial<DatabaseState>): Promise<void> {
  await financialRequest("/state", "PUT", normalizedState(state));
}

export const saveCliente = (cliente: Cliente) => put(`clientes/${cliente.id}`, cliente);
export const saveCobranca = (cid: string, mesKey: string, cobranca: Cobranca) => put(`cobrancas/${cid}/${mesKey}`, cobranca);
export const saveChecklistItem = (cid: string, itemId: string, state: ChecklistItemState) => put(`checklists/${cid}/${itemId}`, state);
export const deleteChecklistItem = (cid: string, itemId: string) => remove(`checklists/${cid}/${itemId}`);
export const saveDespesa = (despesa: Despesa) => put(`despesas/${despesa.id}`, despesa);
export const deleteDespesa = (id: string) => remove(`despesas/${id}`);
export const saveAta = (ata: Ata) => put(`atas/${ata.id}`, ata);
export const deleteAta = (id: string) => remove(`atas/${id}`);
export const saveCaixa = (caixa: Caixa) => put("caixa", caixa);
export const saveDespesaFixa = (df: DespesaFixa) => put(`despFixas/${df.id}`, df);
export const deleteDespesaFixa = (id: string) => remove(`despFixas/${id}`);

export async function deleteClienteAndArchive(cid: string, archiveData: ClienteArquivado): Promise<void> {
  await financialRequest(`/archive/${encodeURIComponent(cid)}`, "POST", archiveData);
}
