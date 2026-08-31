import crypto from "crypto";
import type express from "express";
import jwt from "jsonwebtoken";
import { getSupabaseForAccessToken } from "./supabase.js";
import { uniqueGrantedClientIds } from "./clientAccess.js";

// ─── JWT Authentication (HS256 com validação estrita de expiração) ──────────
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET não definido. Defina a variável de ambiente antes de subir em produção.");
    }
    console.warn("[auth] JWT_SECRET ausente — usando segredo aleatório de desenvolvimento (tokens invalidam ao reiniciar).");
    return crypto.randomBytes(32).toString("hex");
  })();

export interface JwtClaims {
  email: string;
  name: string;
  role: string;
  id: string;
  allowedClientIds: string[]; // ["*"] = acesso total
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      claims?: JwtClaims;
      externalAiToken?: any;
      externalAiOutcome?: string;
    }
  }
}

export function signToken(payload: object, expiresIn: jwt.SignOptions["expiresIn"] = "2h"): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn,
  });
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return typeof decoded === "object" && decoded !== null ? (decoded as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ─── Roles e Permissões ─────────────────────────────────────────────────────
export function isAdminRole(role: string): boolean {
  return role === "admin";
}

export function isTeamRole(role: string): boolean {
  return ["viewer", "designer", "cs", "account_manager", "traffic_manager", "copywriter"].includes(role);
}

export function isAdmin(claims: JwtClaims): boolean {
  return isAdminRole(claims.role) || claims.allowedClientIds.includes("*");
}

export function hasUnitAccess(clientId: string | number, claims: Pick<JwtClaims, "role" | "allowedClientIds">): boolean {
  return isAdminRole(claims.role) || claims.allowedClientIds.includes("*") || claims.allowedClientIds.includes(String(clientId));
}

// ─── Consulta de Perfil e Acessos no Supabase ──────────────────────────────
export async function fetchUserAccess(
  supabaseUid: string,
  accessToken?: string,
  supabaseClient?: any,
): Promise<{
  role: string;
  allowedClientIds: string[];
  status?: string;
}> {
  const sb = supabaseClient || getSupabaseForAccessToken(accessToken);
  if (!sb) {
    return { role: "", allowedClientIds: [], status: "unauthenticated" };
  }

  // 1. Busca role no user_profiles
  const { data: profile, error: profileErr } = await sb
    .from("user_profiles")
    .select("role, status, email, full_name")
    .eq("id", supabaseUid)
    .single();

  if (profileErr || !profile) {
    console.warn(`[auth] Nenhum profile encontrado para uid=${supabaseUid}`);
    return { role: "", allowedClientIds: [], status: "not_found" };
  }

  if (profile.status !== "active") {
    console.warn(`[auth] Profile não ativo para ${profile.email} (status=${profile.status})`);
    return { role: "", allowedClientIds: [], status: profile.status || "inactive" };
  }

  const role = profile.role || "none";

  // 2. Admin vê tudo
  if (isAdminRole(role)) {
    return { role, allowedClientIds: ["*"] };
  }

  // 3. Roles de equipe (viewer, designer, cs, etc.)
  if (isTeamRole(role)) {
    const { data: accessRows } = await sb
      .from("user_client_access")
      .select("client_id")
      .eq("user_id", supabaseUid);

    if (accessRows && accessRows.length > 0) {
      const clientIds = accessRows.map((r: { client_id: string }) => r.client_id);
      return { role, allowedClientIds: clientIds };
    }

    return { role, allowedClientIds: ["*"] };
  }

  // 4. client_viewer: só vê o que está em user_client_access
  if (role === "client_viewer") {
    const { data: accessRows } = await sb
      .from("user_client_access")
      .select("client_id")
      .eq("user_id", supabaseUid);

    const clientIds = (accessRows ?? []).map((r: { client_id: string }) => r.client_id);
    return { role, allowedClientIds: clientIds };
  }

  // 5. Role "none" ou desconhecida = sem acesso
  return { role: "none", allowedClientIds: [] };
}

export type SupabaseDashboardClient = { id: string; name: string; client_group: string | null };

export async function listDashboardClientsFromSupabase(
  sb: any,
  claims: JwtClaims,
): Promise<{ clients: SupabaseDashboardClient[]; error?: string }> {
  let clientIds = claims.allowedClientIds.filter((id) => id !== "*");

  if (isAdminRole(claims.role)) {
    const { data: accessRows, error: accessError } = await sb
      .from("user_client_access")
      .select("client_id");
    if (accessError) return { clients: [], error: accessError.message };
    clientIds = uniqueGrantedClientIds(accessRows ?? []);
  }

  if (clientIds.length > 0) {
    const { data, error } = await sb
      .from("clients")
      .select("id, name, client_group")
      .in("id", clientIds)
      .order("name");
    if (error) return { clients: [], error: error.message };
    return { clients: data ?? [] };
  }

  if (claims.allowedClientIds.includes("*") && !isAdminRole(claims.role)) {
    const { data, error } = await sb
      .from("clients")
      .select("id, name, client_group")
      .eq("client_group", "marketing_pro")
      .order("name");
    if (error) return { clients: [], error: error.message };
    return { clients: data ?? [] };
  }

  return { clients: [] };
}

// ─── Cookies & Sessões ──────────────────────────────────────────────────────
export const SUPABASE_ACCESS_COOKIE = "tp_supabase_access";
export const SUPABASE_COOKIE_MAX_AGE_MS = 50 * 60 * 1000;

export function readCookie(req: express.Request, cookieName: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const value = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice(cookieName.length + 1));
  } catch {
    return undefined;
  }
}

export function getSupabaseForRequest(req: express.Request) {
  return getSupabaseForAccessToken(readCookie(req, SUPABASE_ACCESS_COOKIE));
}

// ─── Middlewares de Autorização ─────────────────────────────────────────────
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token) as JwtClaims | null;
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  if (!payload.allowedClientIds) {
    payload.allowedClientIds = ["*"];
    payload.role = payload.role || "admin";
  }

  req.claims = payload;
  next();
}

export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.claims || !isAdminRole(req.claims.role)) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}

export async function requireSupabaseAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.claims || !isAdminRole(req.claims.role)) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  const sb = getSupabaseForRequest(req);
  if (!sb) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || data.user.id !== req.claims.id) {
    res.status(401).json({ error: "Sessão Supabase expirada" });
    return;
  }
  next();
}
