import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedEvolutionEvent } from "./evolutionWebhook.js";

export type EvolutionLeadClassification = "pendente" | "lead" | "nao_lead";
export type EvolutionLeadStage = "novo" | "qualificado" | "negociacao" | "perdido" | "fechado";

export type EvolutionLead = {
  id: string;
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
  originPlatform: string;
  originEvidence: string;
  metaCtwaClid: string | null;
  googleClickId: string | null;
  originDetectedAt: string | null;
};

export type EvolutionEvent = {
  id: string;
  instanceName: string;
  eventType: string;
  direction: string;
  messageType: string | null;
  messagePreview: string | null;
  occurredAt: string | null;
  receivedAt: string;
  originPlatform: string;
  originEvidence: string;
  metaCtwaClid: string | null;
  metaSourceId: string | null;
  metaSourceType: string | null;
  googleClickId: string | null;
  attributionPayload: Record<string, string> | null;
};

export type EvolutionInstance = {
  instanceName: string;
  displayName: string | null;
  unitName: string | null;
  connectionStatus: string;
  lastEventAt: string | null;
  lastMessageAt: string | null;
};

type Row = Record<string, unknown>;
let client: SupabaseClient | null = null;

function getEvolutionSupabase(): SupabaseClient {
  const url = process.env.EVOLUTION_SUPABASE_URL;
  const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase exclusivo do Evolution não configurado");
  if (!client) {
    client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

function iso(value: unknown): string | null {
  return typeof value === "string" && value ? new Date(value).toISOString() : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function originPlatform(value: unknown): string {
  return value === "meta" || value === "google_ads" || value === "mixed" ? value : "unknown";
}

function originEvidence(value: unknown): string {
  return value === "verified" || value === "observed" ? value : "none";
}

function attributionPayload(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value as Row).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function asLead(row: Row): EvolutionLead {
  return {
    id: String(row.id), instanceName: String(row.instance_name), phoneLast4: text(row.phone_last4), contactName: text(row.contact_name),
    classification: (text(row.classification) as EvolutionLeadClassification | null) ?? "pendente",
    funnelStage: (text(row.funnel_stage) as EvolutionLeadStage | null) ?? "novo",
    classificationNote: text(row.classification_note), firstContactAt: iso(row.first_contact_at)!, lastMessageAt: iso(row.last_message_at)!,
    messagesReceived: number(row.messages_received), messagesSent: number(row.messages_sent), classifiedByEmail: text(row.classified_by_email),
    classifiedAt: iso(row.classified_at), originPlatform: originPlatform(row.origin_platform), originEvidence: originEvidence(row.origin_evidence),
    metaCtwaClid: text(row.meta_ctwa_clid), googleClickId: text(row.google_click_id), originDetectedAt: iso(row.origin_detected_at),
  };
}

function asEvent(row: Row): EvolutionEvent {
  return {
    id: String(row.id), instanceName: String(row.instance_name), eventType: String(row.event_type), direction: String(row.direction),
    messageType: text(row.message_type), messagePreview: text(row.message_preview), occurredAt: iso(row.occurred_at), receivedAt: iso(row.received_at)!,
    originPlatform: originPlatform(row.origin_platform), originEvidence: originEvidence(row.origin_evidence), metaCtwaClid: text(row.meta_ctwa_clid),
    metaSourceId: text(row.meta_source_id), metaSourceType: text(row.meta_source_type), googleClickId: text(row.google_click_id),
    attributionPayload: attributionPayload(row.attribution_payload_json),
  };
}

export async function recordEvolutionEventSupabase(event: NormalizedEvolutionEvent): Promise<{ duplicate: boolean }> {
  const { data, error } = await getEvolutionSupabase().rpc("record_evolution_event", {
    p_event_fingerprint: event.fingerprint,
    p_instance_name: event.instanceName,
    p_event_type: event.eventType,
    p_message_id: event.messageId,
    p_remote_jid: event.remoteJid,
    p_direction: event.direction,
    p_message_type: event.messageType,
    p_message_preview: event.messagePreview,
    p_connection_status: event.connectionStatus,
    p_contact_key: event.contactKey,
    p_phone_last4: event.phoneLast4,
    p_contact_name: event.contactName,
    p_origin_platform: event.origin.platform,
    p_origin_evidence: event.origin.evidence,
    p_meta_ctwa_clid: event.origin.metaCtwaClid,
    p_meta_source_id: event.origin.metaSourceId,
    p_meta_source_type: event.origin.metaSourceType,
    p_google_click_id: event.origin.googleClickId,
    p_attribution_payload_json: event.origin.payload,
    p_occurred_at: event.occurredAt?.toISOString() ?? null,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || typeof (result as Row).duplicate !== "boolean") throw new Error("Resposta inválida do Supabase Evolution");
  return { duplicate: Boolean((result as Row).duplicate) };
}

export async function listEvolutionInstancesSupabase(): Promise<EvolutionInstance[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_instances").select("instance_name, display_name, unit_name, connection_status, last_event_at, last_message_at").order("last_event_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ instanceName: row.instance_name, displayName: row.display_name, unitName: row.unit_name, connectionStatus: row.connection_status, lastEventAt: iso(row.last_event_at), lastMessageAt: iso(row.last_message_at) }));
}

export async function listEvolutionEventsSupabase(limit = 40): Promise<EvolutionEvent[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const { data, error } = await getEvolutionSupabase().from("evolution_events").select("id, instance_name, event_type, direction, message_type, message_preview, origin_platform, origin_evidence, meta_ctwa_clid, meta_source_id, meta_source_type, google_click_id, attribution_payload_json, occurred_at, received_at").order("received_at", { ascending: false }).limit(safeLimit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asEvent(row));
}

export async function listEvolutionLeadsSupabase(): Promise<EvolutionLead[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_leads").select("id, instance_name, phone_last4, contact_name, classification, funnel_stage, classification_note, first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at, origin_platform, origin_evidence, meta_ctwa_clid, google_click_id, origin_detected_at").order("last_message_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asLead(row));
}

export async function getEvolutionSummarySupabase(): Promise<{ totalLeads: number; pendingLeads: number; qualifiedLeads: number; closedLeads: number; eventsToday: number }> {
  const sb = getEvolutionSupabase();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [total, pending, qualified, closed, eventsToday] = await Promise.all([
    sb.from("evolution_leads").select("id", { count: "exact", head: true }),
    sb.from("evolution_leads").select("id", { count: "exact", head: true }).eq("classification", "pendente"),
    sb.from("evolution_leads").select("id", { count: "exact", head: true }).eq("funnel_stage", "qualificado"),
    sb.from("evolution_leads").select("id", { count: "exact", head: true }).eq("funnel_stage", "fechado"),
    sb.from("evolution_events").select("id", { count: "exact", head: true }).gte("received_at", dayStart.toISOString()),
  ]);
  for (const result of [total, pending, qualified, closed, eventsToday]) if (result.error) throw new Error(result.error.message);
  return { totalLeads: total.count ?? 0, pendingLeads: pending.count ?? 0, qualifiedLeads: qualified.count ?? 0, closedLeads: closed.count ?? 0, eventsToday: eventsToday.count ?? 0 };
}

export async function updateEvolutionLeadSupabase(id: string, input: { classification: EvolutionLeadClassification; funnelStage: EvolutionLeadStage; note: string; classifiedByEmail: string }): Promise<EvolutionLead | null> {
  const { data, error } = await getEvolutionSupabase().from("evolution_leads").update({ classification: input.classification, funnel_stage: input.funnelStage, classification_note: input.note || null, classified_by_email: input.classifiedByEmail, classified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select("id, instance_name, phone_last4, contact_name, classification, funnel_stage, classification_note, first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at, origin_platform, origin_evidence, meta_ctwa_clid, google_click_id, origin_detected_at").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asLead(data) : null;
}

export async function deleteEvolutionSupabaseTestRows(input: { instanceName: string; contactKey: string | null; fingerprint: string }): Promise<void> {
  const sb = getEvolutionSupabase();
  if (input.contactKey) await sb.from("evolution_leads").delete().eq("instance_name", input.instanceName).eq("contact_key", input.contactKey);
  await sb.from("evolution_events").delete().eq("event_fingerprint", input.fingerprint);
  await sb.from("evolution_instances").delete().eq("instance_name", input.instanceName);
}

export function resetEvolutionSupabaseForTests(): void { client = null; }
