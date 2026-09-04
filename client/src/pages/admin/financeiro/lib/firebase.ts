import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  remove,
  type Database,
} from "firebase/database";
import type {
  Cliente,
  Cobranca,
  ChecklistItemState,
  Despesa,
  Ata,
  Caixa,
  DespesaFixa,
  ClienteArquivado,
  DatabaseState,
} from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyACiztWfgQkccmONDKiQMNz2MR7gUwLZ8U",
  authDomain: "trafegopro-5206e.firebaseapp.com",
  databaseURL: "https://trafegopro-5206e-default-rtdb.firebaseio.com",
  projectId: "trafegopro-5206e",
  storageBucket: "trafegopro-5206e.firebasestorage.app",
  messagingSenderId: "363896618683",
  appId: "1:363896618683:web:136ac75134f8c90ed6739e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Database = getDatabase(app);

export function subscribeToFinancialDB(
  onData: (data: DatabaseState) => void,
  onError?: (err: Error) => void
): () => void {
  const rootRef = ref(db, "trafegopro");
  let receivedInitialData = false;
  const emitSnapshot = (snapshot: { exists: () => boolean; val: () => any }) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      onData({
        clientes: val.clientes || {},
        cobrancas: val.cobrancas || {},
        checklists: val.checklists || {},
        arquivados: val.arquivados || {},
        despesas: val.despesas || {},
        atas: val.atas || {},
        caixa: val.caixa || { saldo: 0, metaFimAno: 0 },
        despFixas: val.despFixas || {},
        logs: val.logs || [],
      });
      receivedInitialData = true;
      return;
    }
    if (receivedInitialData) return;
    onData({
      clientes: {}, cobrancas: {}, checklists: {}, arquivados: {}, despesas: {}, atas: {},
      caixa: { saldo: 0, metaFimAno: 0 }, despFixas: {}, logs: [],
    });
  };

  // O endpoint REST do Realtime Database é mais determinístico em browsers
  // corporativos/restritos do que a conexão persistente do SDK. Mantemos onValue
  // apenas para receber alterações após o snapshot inicial.
  fetch(`${firebaseConfig.databaseURL}/trafegopro.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Firebase respondeu ${response.status}`);
      const value = await response.json();
      emitSnapshot({ exists: () => value !== null, val: () => value });
    })
    .catch((err) => {
      console.warn("Firebase financial initial read error:", err);
      onError?.(err instanceof Error ? err : new Error("Falha ao carregar dados financeiros"));
    });

  const unsubscribe = onValue(
    rootRef,
    emitSnapshot,
    (err) => {
      console.warn("Firebase financial sync error:", err);
      if (onError) onError(err);
    }
  );
  return unsubscribe;
}

// Helper para escrita REST garantida e sem travamentos de WebSocket
async function restPut(path: string, data: any): Promise<void> {
  const url = `${firebaseConfig.databaseURL}/${path}.json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Firebase REST write failed with status ${res.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function restDelete(path: string): Promise<void> {
  const url = `${firebaseConfig.databaseURL}/${path}.json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: "DELETE",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Firebase REST delete failed with status ${res.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchEntireFinancialState(): Promise<DatabaseState | null> {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/trafegopro.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const val = await res.json();
    if (!val) return null;
    return {
      clientes: val.clientes || {},
      cobrancas: val.cobrancas || {},
      checklists: val.checklists || {},
      arquivados: val.arquivados || {},
      despesas: val.despesas || {},
      atas: val.atas || {},
      caixa: val.caixa || { saldo: 0, metaFimAno: 0 },
      despFixas: val.despFixas || {},
      logs: val.logs || [],
    };
  } catch (err) {
    console.warn("fetchEntireFinancialState error:", err);
    return null;
  }
}

export async function saveEntireFinancialState(state: Partial<DatabaseState>): Promise<void> {
  await restPut("trafegopro", {
    clientes: state.clientes || {},
    cobrancas: state.cobrancas || {},
    checklists: state.checklists || {},
    arquivados: state.arquivados || {},
    despesas: state.despesas || {},
    atas: state.atas || {},
    caixa: state.caixa || { saldo: 0, metaFimAno: 0 },
    despFixas: state.despFixas || {},
  });
}

export async function saveCliente(cliente: Cliente): Promise<void> {
  await restPut(`trafegopro/clientes/${cliente.id}`, cliente);
}

export async function deleteClienteAndArchive(
  cid: string,
  archiveData: ClienteArquivado
): Promise<void> {
  await restPut(`trafegopro/arquivados/${cid}`, archiveData);
  await Promise.allSettled([
    restDelete(`trafegopro/clientes/${cid}`),
    restDelete(`trafegopro/cobrancas/${cid}`),
    restDelete(`trafegopro/checklists/${cid}`),
  ]);
}

export async function saveCobranca(
  cid: string,
  mesKey: string,
  cobranca: Cobranca
): Promise<void> {
  await restPut(`trafegopro/cobrancas/${cid}/${mesKey}`, cobranca);
}

export async function saveChecklistItem(
  cid: string,
  itemId: string,
  state: ChecklistItemState
): Promise<void> {
  await restPut(`trafegopro/checklists/${cid}/${itemId}`, state);
}

export async function deleteChecklistItem(cid: string, itemId: string): Promise<void> {
  await restDelete(`trafegopro/checklists/${cid}/${itemId}`);
}

export async function saveDespesa(despesa: Despesa): Promise<void> {
  await restPut(`trafegopro/despesas/${despesa.id}`, despesa);
}

export async function deleteDespesa(id: string): Promise<void> {
  await restDelete(`trafegopro/despesas/${id}`);
}

export async function saveAta(ata: Ata): Promise<void> {
  await restPut(`trafegopro/atas/${ata.id}`, ata);
}

export async function deleteAta(id: string): Promise<void> {
  await restDelete(`trafegopro/atas/${id}`);
}

export async function saveCaixa(caixa: Caixa): Promise<void> {
  await restPut("trafegopro/caixa", caixa);
}

export async function saveDespesaFixa(df: DespesaFixa): Promise<void> {
  await restPut(`trafegopro/despFixas/${df.id}`, df);
}

export async function deleteDespesaFixa(id: string): Promise<void> {
  await restDelete(`trafegopro/despFixas/${id}`);
}
