import crypto from "crypto";
import type { Request, Response } from "express";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  const formatted = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
};

// ─── Trilha de Auditoria para Acesso a Dados Pessoais (LGPD Art. 37) ────────
export interface PiiAuditRecord {
  action: "view" | "download" | "export" | "anonymize" | "delete";
  resourceType: "candidate_resume" | "candidate_submission" | "lead_chat" | "feedback_export";
  resourceId: string;
  actorUserId?: string;
  actorEmail?: string;
  ipHash?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

export function auditPiiAccess(req: Request, record: Omit<PiiAuditRecord, "actorUserId" | "actorEmail" | "ipHash" | "userAgent">): void {
  const ip = req.ip || req.socket.remoteAddress;
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : null;
  const actorUserId = req.claims?.id;
  const actorEmail = req.claims?.email;
  const userAgent = req.get("user-agent") ?? null;

  logger.info("[AUDIT_PII_ACCESS]", {
    audit: {
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      actorUserId: actorUserId ?? "anonymous",
      actorEmail: actorEmail ?? "anonymous",
      ipHash,
      userAgent,
      details: record.details,
    },
  });
}
