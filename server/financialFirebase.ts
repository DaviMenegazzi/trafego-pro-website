import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

const DEFAULT_DATABASE_URL = "https://trafegopro-5206e-default-rtdb.firebaseio.com";
let database: Database | null = null;

export function getFinancialDatabase(): Database {
  if (database) return database;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();
  const app = getApps().find((item) => item.name === "financial") ?? initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL,
  }, "financial");
  database = getDatabase(app);
  return database;
}
