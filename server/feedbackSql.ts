import { getSiteSupabase, unwrap } from "./siteSupabase.js";

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

type FeedbackRow = {
  id: number | string;
  unit: string;
  responsible: string;
  week_start: string;
  week_end: string;
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
  submitted_at: string;
  submitted_by_user_id: string | null;
  submitted_by_email: string;
  created_at: string;
};

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

const SELECT_COLUMNS =
  "id, unit, responsible, week_start, week_end, total_leads, leads_contacted, leads_responded, leads_converted, leads_lost, leads_in_negotiation, loss_reason, lead_quality, observations, agency_satisfaction, communication_clarity, agency_adjustment, submitted_at, submitted_by_user_id, submitted_by_email, created_at";

export async function createFeedbackLeadSql(input: SqlFeedbackLeadInput): Promise<SqlFeedbackLead> {
  const row = unwrap(await getSiteSupabase().from("feedback_leads").insert({
    unit: input.unit, responsible: input.responsible, week_start: input.weekStart, week_end: input.weekEnd,
    total_leads: input.totalLeads, leads_contacted: input.leadsContacted, leads_responded: input.leadsResponded,
    leads_converted: input.leadsConverted, leads_lost: input.leadsLost, leads_in_negotiation: input.leadsInNegotiation,
    main_reason: input.lossReason, loss_reason: input.lossReason, lead_quality: input.leadQuality, creative_feedback: "",
    general_observations: input.observations, observations: input.observations, agency_satisfaction: input.agencySatisfaction,
    communication_clarity: input.communicationClarity, agency_adjustment: input.agencyAdjustment, support_needed: input.agencyAdjustment,
    submitted_at: new Date(input.submittedAt).toISOString(), submitted_by_user_id: input.submittedByUserId, submitted_by_email: input.submittedByEmail,
  }).select(SELECT_COLUMNS).single());
  return mapRow(row as FeedbackRow);
}

export async function getFeedbackLeadSqlById(id: number): Promise<SqlFeedbackLead | null> {
  const row = unwrap(await getSiteSupabase().from("feedback_leads").select(SELECT_COLUMNS).eq("id", id).maybeSingle());
  return row ? mapRow(row as FeedbackRow) : null;
}

export async function listFeedbackLeadsSql(filters: { unit?: string; weekStart?: string; weekEnd?: string } = {}): Promise<SqlFeedbackLead[]> {
  let query = getSiteSupabase().from("feedback_leads").select(SELECT_COLUMNS);
  if (filters.unit) query = query.eq("unit", filters.unit);
  if (filters.weekStart) query = query.gte("week_start", filters.weekStart);
  if (filters.weekEnd) query = query.lte("week_end", filters.weekEnd);
  const rows = unwrap(await query.order("week_start", { ascending: false }).order("created_at", { ascending: false }).limit(500));
  return (rows as FeedbackRow[]).map(mapRow);
}

export async function listAllFeedbackLeadsForExportSql(): Promise<SqlFeedbackLead[]> {
  const all: FeedbackRow[] = [];
  for (let from = 0; ; from += 1000) {
    const page = unwrap(await getSiteSupabase().from("feedback_leads").select(SELECT_COLUMNS)
      .order("week_start", { ascending: false }).order("created_at", { ascending: false }).range(from, from + 999)) as FeedbackRow[];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all.map(mapRow);
}

export async function deleteFeedbackLeadSql(id: number): Promise<void> {
  unwrap(await getSiteSupabase().from("feedback_leads").delete().eq("id", id));
}

export function resetFeedbackSqlPoolForTests(): void {}
