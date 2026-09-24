import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_DATABASE_URL = "https://trafegopro-5206e-default-rtdb.firebaseio.com";

/** Subconjunto do Realtime Database usado pelas rotas /api/finance. */
export type FinancialRef = {
  get(): Promise<{ val(): unknown }>;
  set(value: unknown): Promise<void>;
  remove(): Promise<void>;
  update(values: Record<string, unknown>): Promise<void>;
};
export type FinancialDatabase = { ref(path?: string): FinancialRef };

let database: FinancialDatabase | null = null;

function databaseUrl(): string {
  return (process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/+$/, "");
}

/**
 * Sem conta de serviço (não temos acesso de dono ao projeto Firebase), o servidor fala
 * com o Realtime Database pela API REST, que funciona enquanto as regras do banco forem
 * abertas. O acesso pelo site continua protegido pelo login de admin do Supabase nas rotas.
 */
function restDatabase(): FinancialDatabase {
  const base = databaseUrl();
  const call = async (path: string, method: string, body?: unknown) => {
    const url = `${base}/${path.replace(/^\/+|\/+$/g, "")}.json`;
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Firebase REST ${method} ${path || "/"}: HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  };
  return {
    ref(path = "") {
      return {
        async get() { const value = await call(path, "GET"); return { val: () => value }; },
        async set(value) { await call(path, "PUT", value); },
        async remove() { await call(path, "DELETE"); },
        async update(values) { await call(path, "PATCH", values); },
      };
    },
  };
}

function adminDatabase(serviceAccountJson: string): FinancialDatabase {
  const app = getApps().find((item) => item.name === "financial") ?? initializeApp({
    credential: cert(JSON.parse(serviceAccountJson)),
    databaseURL: databaseUrl(),
  }, "financial");
  return getDatabase(app) as unknown as FinancialDatabase;
}

export function getFinancialDatabase(): FinancialDatabase {
  if (database) return database;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  database = serviceAccountJson ? adminDatabase(serviceAccountJson) : restDatabase();
  return database;
}
