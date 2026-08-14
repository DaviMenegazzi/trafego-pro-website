import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

export type SqlFeedbackLeadInput = {
  unit: string;
  responsible: string;
  weekStart: string;
  totalLeads: number;
  leadsCard: number;
  leadsConsultation: number;
  leadsDentistry: number;
  leadsBusinessPJ: number;
  leadsOutOfArea: number;
  leadsAnswered: number;
  leadsNoAnswer: number;
  salesClosed: number;
  mainReason: string;
  creativeFeedback: string;
  generalObservations: string;
  supportNeeded: string;
  submittedAt: string;
  submittedByUserId: number | null;
  submittedByEmail: string;
};

export type SqlFeedbackLead = {
  id: number;
  unit: string;
  responsible: string;
  weekStart: string;
  totalLeads: number;
  leadsCard: number;
  leadsConsultation: number;
  leadsDentistry: number;
  leadsBusinessPJ: number;
  leadsOutOfArea: number;
  leadsAnswered: number;
  leadsNoAnswer: number;
  salesClosed: number;
  mainReason: string;
  creativeFeedback: string;
  generalObservations: string;
  supportNeeded: string;
  submittedAt: string;
  submittedByUserId: number | null;
  submittedByEmail: string;
  createdAt: string;
};

type FeedbackRow = RowDataPacket & {
  id: number | string;
  unit: string;
  responsible: string;
  week_start: string | Date;
  total_leads: number;
  leads_card: number;
  leads_consultation: number;
  leads_dentistry: number;
  leads_business_pj: number;
  leads_out_of_area: number;
  leads_answered: number;
  leads_no_answer: number;
  sales_closed: number;
  main_reason: string;
  creative_feedback: string;
  general_observations: string;
  support_needed: string;
  submitted_at: string | Date;
  submitted_by_user_id: number | string | null;
  submitted_by_email: string;
  created_at: string | Date;
};

let pool: Pool | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada para persistência SQL dos feedbacks");
  }
  if (!pool) {
    pool = mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
    });
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
    totalLeads: Number(row.total_leads),
    leadsCard: Number(row.leads_card),
    leadsConsultation: Number(row.leads_consultation),
    leadsDentistry: Number(row.leads_dentistry),
    leadsBusinessPJ: Number(row.leads_business_pj),
    leadsOutOfArea: Number(row.leads_out_of_area),
    leadsAnswered: Number(row.leads_answered),
    leadsNoAnswer: Number(row.leads_no_answer),
    salesClosed: Number(row.sales_closed),
    mainReason: row.main_reason,
    creativeFeedback: row.creative_feedback,
    generalObservations: row.general_observations,
    supportNeeded: row.support_needed,
    submittedAt: toIso(row.submitted_at),
    submittedByUserId: row.submitted_by_user_id == null ? null : Number(row.submitted_by_user_id),
    submittedByEmail: row.submitted_by_email,
    createdAt: toIso(row.created_at),
  };
}

const SELECT_COLUMNS = `
  id, unit, responsible, week_start, total_leads, leads_card, leads_consultation,
  leads_dentistry, leads_business_pj, leads_out_of_area, leads_answered, leads_no_answer,
  sales_closed, main_reason, creative_feedback, general_observations, support_needed,
  submitted_at, submitted_by_user_id, submitted_by_email, created_at
`;

export async function createFeedbackLeadSql(input: SqlFeedbackLeadInput): Promise<SqlFeedbackLead> {
  const db = getPool();
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO feedback_leads (
      unit, responsible, week_start, total_leads, leads_card, leads_consultation,
      leads_dentistry, leads_business_pj, leads_out_of_area, leads_answered, leads_no_answer,
      sales_closed, main_reason, creative_feedback, general_observations, support_needed,
      submitted_at, submitted_by_user_id, submitted_by_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.unit,
      input.responsible,
      input.weekStart,
      input.totalLeads,
      input.leadsCard,
      input.leadsConsultation,
      input.leadsDentistry,
      input.leadsBusinessPJ,
      input.leadsOutOfArea,
      input.leadsAnswered,
      input.leadsNoAnswer,
      input.salesClosed,
      input.mainReason,
      input.creativeFeedback,
      input.generalObservations,
      input.supportNeeded,
      new Date(input.submittedAt),
      input.submittedByUserId,
      input.submittedByEmail,
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

export async function listFeedbackLeadsSql(filters: {
  unit?: string;
  weekStart?: string;
  weekEnd?: string;
} = {}): Promise<SqlFeedbackLead[]> {
  const db = getPool();
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.unit) {
    clauses.push("unit = ?");
    values.push(filters.unit);
  }
  if (filters.weekStart) {
    clauses.push("week_start >= ?");
    values.push(filters.weekStart);
  }
  if (filters.weekEnd) {
    clauses.push("week_start <= ?");
    values.push(filters.weekEnd);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await db.query<FeedbackRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM feedback_leads ${where} ORDER BY week_start DESC, created_at DESC LIMIT 500`,
    values,
  );
  return rows.map(mapRow);
}

export async function deleteFeedbackLeadSql(id: number): Promise<void> {
  const db = getPool();
  await db.execute("DELETE FROM feedback_leads WHERE id = ?", [id]);
}

export function resetFeedbackSqlPoolForTests(): void {
  pool = null;
}
