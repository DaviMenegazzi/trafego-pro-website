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
      return;
    }
    onData({
      clientes: {}, cobrancas: {}, checklists: {}, arquivados: {}, despesas: {}, atas: {},
      caixa: { saldo: 0, metaFimAno: 0 }, despFixas: {}, logs: [],
    });
  };

  // Carregamento inicial por leitura pontual: evita que uma falha transitória da
  // conexão persistente deixe o painel vazio, mantendo a assinatura para atualizações.
  get(rootRef).then(emitSnapshot).catch((err) => {
    console.warn("Firebase financial initial read error:", err);
    onError?.(err);
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

export async function saveEntireFinancialState(state: Partial<DatabaseState>): Promise<void> {
  await set(ref(db, "trafegopro"), {
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
  await set(ref(db, `trafegopro/clientes/${cliente.id}`), cliente);
}

export async function deleteClienteAndArchive(
  cid: string,
  archiveData: ClienteArquivado
): Promise<void> {
  await set(ref(db, `trafegopro/arquivados/${cid}`), archiveData);
  await remove(ref(db, `trafegopro/clientes/${cid}`));
  await remove(ref(db, `trafegopro/cobrancas/${cid}`));
  await remove(ref(db, `trafegopro/checklists/${cid}`));
}

export async function saveCobranca(
  cid: string,
  mesKey: string,
  cobranca: Cobranca
): Promise<void> {
  await set(ref(db, `trafegopro/cobrancas/${cid}/${mesKey}`), cobranca);
}

export async function saveChecklistItem(
  cid: string,
  itemId: string,
  state: ChecklistItemState
): Promise<void> {
  await set(ref(db, `trafegopro/checklists/${cid}/${itemId}`), state);
}

export async function deleteChecklistItem(cid: string, itemId: string): Promise<void> {
  await remove(ref(db, `trafegopro/checklists/${cid}/${itemId}`));
}

export async function saveDespesa(despesa: Despesa): Promise<void> {
  await set(ref(db, `trafegopro/despesas/${despesa.id}`), despesa);
}

export async function deleteDespesa(id: string): Promise<void> {
  await remove(ref(db, `trafegopro/despesas/${id}`));
}

export async function saveAta(ata: Ata): Promise<void> {
  await set(ref(db, `trafegopro/atas/${ata.id}`), ata);
}

export async function deleteAta(id: string): Promise<void> {
  await remove(ref(db, `trafegopro/atas/${id}`));
}

export async function saveCaixa(caixa: Caixa): Promise<void> {
  await set(ref(db, "trafegopro/caixa"), caixa);
}

export async function saveDespesaFixa(df: DespesaFixa): Promise<void> {
  await set(ref(db, `trafegopro/despFixas/${df.id}`), df);
}

export async function deleteDespesaFixa(id: string): Promise<void> {
  await remove(ref(db, `trafegopro/despFixas/${id}`));
}
