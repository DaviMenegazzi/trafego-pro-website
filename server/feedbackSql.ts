import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

export type SqlFeedbackLeadInput = {
  unit: string;
  responsible: string;
  weekStart: string;
  weekEnd: string;
  totalLeads: number;
  leadsContacted: number;
  leadsResponded: number;
  leadsConverted: number;
  leadsLost: number;
  leadsInNegotiation: number;
  lossReason: string;
  leadQuality: number;
  observations: string;
  agencySatisfaction: number;
  communicationClarity: string;
  agencyAdjustment: string;
  submittedAt: string;
  submittedByUserId: string | null;
  submittedByEmail: string;
};

export type SqlFeedbackLead = SqlFeedbackLeadInput & {
  id: number;
  createdAt: string;
};

export type LegacyFeedbackBackfillInput = {
  weekStart: string;
  leadsAnswered: number;
  salesClosed: number;
  leadsNoAnswer: number;
  mainReason: string;
  generalObservations: string;
  supportNeeded: string;
};

export function planLegacyFeedbackBackfill(input: LegacyFeedbackBackfillInput) {
  const start = new Date(`${input.weekStart}T12:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  return {
    weekEnd: start.toISOString().slice(0, 10),
    leadsContacted: input.leadsAnswered,
    leadsResponded: input.leadsAnswered,
    leadsConverted: input.salesClosed,
    leadsLost: input.leadsNoAnswer,
    leadsInNegotiation: 0,
    lossReason: input.mainReason,
    observations: input.generalObservations,
    agencyAdjustment: input.supportNeeded,
  };
}

type FeedbackRow = RowDataPacket & {
  id: number | string;
  unit: string;
  responsible: string;
  week_start: string | Date;
  week_end: string | Date;
  total_leads: number;
  leads_contacted: number;
  leads_responded: number;
  leads_converted: number;
  leads_lost: number;
  leads_in_negotiation: number;
  loss_reason: string;
  lead_quality: number;
  observations: string | null;
  agency_satisfaction: number;
  communication_clarity: string;
  agency_adjustment: string | null;
  submitted_at: string | Date;
  submitted_by_user_id: number | string | null;
  submitted_by_email: string;
  created_at: string | Date;
};

let pool: Pool | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada para persistência SQL dos feedbacks");
  if (!pool) {
    pool = mysql.createPool({ uri: connectionString, waitForConnections: true, connectionLimit: 5, queueLimit: 0, enableKeepAlive: true });
  }
  return pool;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapRow(row: FeedbackRow): SqlFeedbackLead {
  return {
    id: Number(row.id),
    unit: row.unit,
    responsible: row.responsible,
    weekStart: toDateOnly(row.week_start),
    weekEnd: toDateOnly(row.week_end),
    totalLeads: Number(row.total_leads),
    leadsContacted: Number(row.leads_contacted),
    leadsResponded: Number(row.leads_responded),
    leadsConverted: Number(row.leads_converted),
    leadsLost: Number(row.leads_lost),
    leadsInNegotiation: Number(row.leads_in_negotiation),
    lossReason: row.loss_reason,
    leadQuality: Number(row.lead_quality),
    observations: row.observations ?? "",
    agencySatisfaction: Number(row.agency_satisfaction),
    communicationClarity: row.communication_clarity,
    agencyAdjustment: row.agency_adjustment ?? "",
    submittedAt: toIso(row.submitted_at),
    submittedByUserId: row.submitted_by_user_id == null ? null : String(row.submitted_by_user_id),
    submittedByEmail: row.submitted_by_email,
    createdAt: toIso(row.created_at),
  };
}

const SELECT_COLUMNS = `
  id, unit, responsible, week_start, week_end, total_leads, leads_contacted,
  leads_responded, leads_converted, leads_lost, leads_in_negotiation, loss_reason,
  lead_quality, observations, agency_satisfaction, communication_clarity,
  agency_adjustment, submitted_at, submitted_by_user_id, submitted_by_email, created_at
`;

export async function createFeedbackLeadSql(input: SqlFeedbackLeadInput): Promise<SqlFeedbackLead> {
  const db = getPool();
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO feedback_leads (
      unit, responsible, week_start, week_end, total_leads, leads_contacted,
      leads_responded, leads_converted, leads_lost, leads_in_negotiation,
      main_reason, loss_reason, lead_quality, creative_feedback, general_observations,
      observations, agency_satisfaction, communication_clarity, agency_adjustment,
      support_needed, submitted_at, submitted_by_user_id, submitted_by_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.unit, input.responsible, input.weekStart, input.weekEnd, input.totalLeads,
      input.leadsContacted, input.leadsResponded, input.leadsConverted, input.leadsLost,
      input.leadsInNegotiation, input.lossReason, input.lossReason, input.leadQuality, "",
      input.observations, input.observations, input.agencySatisfaction, input.communicationClarity,
      input.agencyAdjustment, input.agencyAdjustment, new Date(input.submittedAt),
      input.submittedByUserId, input.submittedByEmail,
    ],
  );
  const created = await getFeedbackLeadSqlById(Number(result.insertId));
  if (!created) throw new Error("O feedback foi inserido, mas não pôde ser lido novamente");
  return created;
}

export async function getFeedbackLeadSqlById(id: number): Promise<SqlFeedbackLead | null> {
  const db = getPool();
  const [rows] = await db.query<FeedbackRow[]>(`SELECT ${SELECT_COLUMNS} FROM feedback_leads WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listFeedbackLeadsSql(filters: { unit?: string; weekStart?: string; weekEnd?: string } = {}): Promise<SqlFeedbackLead[]> {
  const db = getPool();
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.unit) { clauses.push("unit = ?"); values.push(filters.unit); }
  if (filters.weekStart) { clauses.push("week_start >= ?"); values.push(filters.weekStart); }
  if (filters.weekEnd) { clauses.push("week_end <= ?"); values.push(filters.weekEnd); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await db.query<FeedbackRow[]>(`SELECT ${SELECT_COLUMNS} FROM feedback_leads ${where} ORDER BY week_start DESC, created_at DESC LIMIT 500`, values);
  return rows.map(mapRow);
}

export async function listAllFeedbackLeadsForExportSql(): Promise<SqlFeedbackLead[]> {
  const db = getPool();
  const [rows] = await db.query<FeedbackRow[]>(`SELECT ${SELECT_COLUMNS} FROM feedback_leads ORDER BY week_start DESC, created_at DESC`);
  return rows.map(mapRow);
}

export async function deleteFeedbackLeadSql(id: number): Promise<void> {
  await getPool().execute("DELETE FROM feedback_leads WHERE id = ?", [id]);
}

export function resetFeedbackSqlPoolForTests(): void {
  pool = null;
}
