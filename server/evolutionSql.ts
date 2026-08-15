import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { NormalizedEvolutionEvent } from "./evolutionWebhook.js";

export type EvolutionLeadClassification = "pendente" | "lead" | "nao_lead";
export type EvolutionLeadStage = "novo" | "qualificado" | "negociacao" | "perdido" | "fechado";

export type EvolutionLead = {
  id: number;
  instanceName: string;
  phoneLast4: string | null;
  contactName: string | null;
  classification: EvolutionLeadClassification;
  funnelStage: EvolutionLeadStage;
  classificationNote: string | null;
  firstContactAt: string;
  lastMessageAt: string;
  messagesReceived: number;
  messagesSent: number;
  classifiedByEmail: string | null;
  classifiedAt: string | null;
};

export type EvolutionEvent = {
  id: number;
  instanceName: string;
  eventType: string;
  direction: string;
  messageType: string | null;
  messagePreview: string | null;
  occurredAt: string | null;
  receivedAt: string;
};

export type EvolutionInstance = {
  instanceName: string;
  displayName: string | null;
  unitName: string | null;
  connectionStatus: string;
  lastEventAt: string | null;
  lastMessageAt: string | null;
};

let pool: Pool | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada para o módulo Evolution");
  if (!pool) {
    pool = mysql.createPool({ uri: connectionString, waitForConnections: true, connectionLimit: 5, queueLimit: 0, enableKeepAlive: true });
  }
  return pool;
}

function toIso(value: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateTime(value: Date | null): Date {
  return value ?? new Date();
}

function asLead(row: RowDataPacket): EvolutionLead {
  return {
    id: Number(row.id), instanceName: row.instance_name, phoneLast4: row.phone_last4,
    contactName: row.contact_name, classification: row.classification,
    funnelStage: row.funnel_stage, classificationNote: row.classification_note,
    firstContactAt: toIso(row.first_contact_at)!, lastMessageAt: toIso(row.last_message_at)!,
    messagesReceived: Number(row.messages_received), messagesSent: Number(row.messages_sent),
    classifiedByEmail: row.classified_by_email, classifiedAt: toIso(row.classified_at),
  };
}

function asEvent(row: RowDataPacket): EvolutionEvent {
  return {
    id: Number(row.id), instanceName: row.instance_name, eventType: row.event_type,
    direction: row.direction, messageType: row.message_type, messagePreview: row.message_preview,
    occurredAt: toIso(row.occurred_at), receivedAt: toIso(row.received_at)!,
  };
}

export async function recordEvolutionEventSql(event: NormalizedEvolutionEvent): Promise<{ duplicate: boolean }> {
  const db = getPool();
  const occurredAt = toDateTime(event.occurredAt);
  const [insertResult] = await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO evolution_events (
      event_fingerprint, instance_name, event_type, message_id, remote_jid, direction,
      message_type, message_preview, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [event.fingerprint, event.instanceName, event.eventType, event.messageId, event.remoteJid,
      event.direction, event.messageType, event.messagePreview, occurredAt],
  );
  if (insertResult.affectedRows === 0) return { duplicate: true };

  const connectionStatus = event.connectionStatus ?? "unknown";
  const messageAt = event.eventType === "MESSAGES_UPSERT" ? occurredAt : null;
  await db.execute(
    `INSERT INTO evolution_instances (instance_name, connection_status, last_event_at, last_message_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       connection_status = IF(? = 'unknown', connection_status, ?),
       last_event_at = GREATEST(COALESCE(last_event_at, '1970-01-01'), VALUES(last_event_at)),
       last_message_at = IF(VALUES(last_message_at) IS NULL, last_message_at, GREATEST(COALESCE(last_message_at, '1970-01-01'), VALUES(last_message_at)))`,
    [event.instanceName, connectionStatus, occurredAt, messageAt, connectionStatus, connectionStatus],
  );

  if (event.contactKey && event.direction !== "system") {
    const receivedIncrement = event.direction === "incoming" ? 1 : 0;
    const sentIncrement = event.direction === "outgoing" ? 1 : 0;
    await db.execute(
      `INSERT INTO evolution_leads (
        instance_name, contact_key, phone_last4, contact_name, first_contact_at, last_message_at,
        messages_received, messages_sent, last_event_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        phone_last4 = COALESCE(VALUES(phone_last4), phone_last4),
        contact_name = COALESCE(VALUES(contact_name), contact_name),
        last_message_at = GREATEST(last_message_at, VALUES(last_message_at)),
        messages_received = messages_received + VALUES(messages_received),
        messages_sent = messages_sent + VALUES(messages_sent),
        last_event_id = VALUES(last_event_id)`,
      [event.instanceName, event.contactKey, event.phoneLast4, event.contactName, occurredAt, occurredAt,
        receivedIncrement, sentIncrement, insertResult.insertId],
    );
  }
  return { duplicate: false };
}

export async function listEvolutionInstancesSql(): Promise<EvolutionInstance[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT instance_name, display_name, unit_name, connection_status, last_event_at, last_message_at FROM evolution_instances ORDER BY last_event_at DESC, instance_name ASC",
  );
  return rows.map((row) => ({
    instanceName: row.instance_name, displayName: row.display_name, unitName: row.unit_name,
    connectionStatus: row.connection_status, lastEventAt: toIso(row.last_event_at), lastMessageAt: toIso(row.last_message_at),
  }));
}

export async function listEvolutionEventsSql(limit = 40): Promise<EvolutionEvent[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, instance_name, event_type, direction, message_type, message_preview, occurred_at, received_at
     FROM evolution_events ORDER BY received_at DESC LIMIT ${safeLimit}`,
  );
  return rows.map(asEvent);
}

export async function listEvolutionLeadsSql(): Promise<EvolutionLead[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, instance_name, phone_last4, contact_name, classification, funnel_stage, classification_note,
      first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at
     FROM evolution_leads ORDER BY last_message_at DESC LIMIT 200`,
  );
  return rows.map(asLead);
}

export async function getEvolutionSummarySql(): Promise<{ totalLeads: number; pendingLeads: number; qualifiedLeads: number; closedLeads: number; eventsToday: number }> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS totalLeads,
      SUM(classification = 'pendente') AS pendingLeads,
      SUM(funnel_stage = 'qualificado') AS qualifiedLeads,
      SUM(funnel_stage = 'fechado') AS closedLeads,
      (SELECT COUNT(*) FROM evolution_events WHERE received_at >= UTC_DATE()) AS eventsToday
     FROM evolution_leads`,
  );
  const row = rows[0] ?? {};
  return {
    totalLeads: Number(row.totalLeads ?? 0), pendingLeads: Number(row.pendingLeads ?? 0),
    qualifiedLeads: Number(row.qualifiedLeads ?? 0), closedLeads: Number(row.closedLeads ?? 0),
    eventsToday: Number(row.eventsToday ?? 0),
  };
}

export async function updateEvolutionLeadSql(
  id: number,
  input: { classification: EvolutionLeadClassification; funnelStage: EvolutionLeadStage; note: string; classifiedByEmail: string },
): Promise<EvolutionLead | null> {
  const db = getPool();
  await db.execute(
    `UPDATE evolution_leads
     SET classification = ?, funnel_stage = ?, classification_note = ?, classified_by_email = ?, classified_at = NOW()
     WHERE id = ?`,
    [input.classification, input.funnelStage, input.note || null, input.classifiedByEmail, id],
  );
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id, instance_name, phone_last4, contact_name, classification, funnel_stage, classification_note,
      first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at
     FROM evolution_leads WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? asLead(rows[0]) : null;
}

export function resetEvolutionSqlPoolForTests(): void {
  pool = null;
}

export async function deleteEvolutionWebhookTestRows(input: { instanceName: string; contactKey: string | null; fingerprint: string }): Promise<void> {
  const db = getPool();
  if (input.contactKey) {
    await db.execute("DELETE FROM evolution_leads WHERE instance_name = ? AND contact_key = ?", [input.instanceName, input.contactKey]);
  }
  await db.execute("DELETE FROM evolution_events WHERE event_fingerprint = ?", [input.fingerprint]);
  await db.execute("DELETE FROM evolution_instances WHERE instance_name = ?", [input.instanceName]);
}
