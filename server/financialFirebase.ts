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
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON é obrigatória para acesso ao financeiro");
  }
  database = adminDatabase(serviceAccountJson);
  return database;
}
