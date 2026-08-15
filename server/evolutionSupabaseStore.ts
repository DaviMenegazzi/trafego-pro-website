import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedEvolutionEvent } from "./evolutionWebhook.js";

export type EvolutionLeadClassification = "pendente" | "lead" | "nao_lead";
export type EvolutionLeadStage = "novo" | "qualificado" | "negociacao" | "perdido" | "fechado";
export type EvolutionCrmStage = "lead_not_responded" | "lead_responded" | "follow_up" | "lead_replied" | "negotiation" | "closed_won" | "closed_lost";

export type EvolutionLead = {
  id: string;
  instanceName: string;
  contactKey: string;
  contactPhone: string | null;
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
  crmStage: EvolutionCrmStage;
  crmStageUpdatedAt: string | null;
  crmStageUpdatedBy: string | null;
};

export type EvolutionCrmStageHistory = {
  id: string;
  leadId: string;
  instanceName: string;
  fromStage: EvolutionCrmStage | null;
  toStage: EvolutionCrmStage;
  changedBy: string | null;
  changedAt: string;
  note: string | null;
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

export type EvolutionMessage = {
  id: string;
  leadId: string;
  instanceName: string;
  direction: "incoming" | "outgoing";
  messageType: string | null;
  bodyText: string;
  sentAt: string;
};

export type EvolutionMetaAttribution = {
  leadId: string;
  sourceEventId: string | null;
  clientId: string | null;
  accountId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  creativeId: string | null;
  creativeName: string | null;
  matchedBy: string;
  matchStatus: "matched" | "unresolved";
  matchedAt: string;
};

export type EvolutionMetaAttributionInput = Omit<EvolutionMetaAttribution, "matchedAt">;

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
    id: String(row.id), instanceName: String(row.instance_name), contactKey: String(row.contact_key), contactPhone: text(row.contact_phone), phoneLast4: text(row.phone_last4), contactName: text(row.contact_name),
    classification: (text(row.classification) as EvolutionLeadClassification | null) ?? "pendente",
    funnelStage: (text(row.funnel_stage) as EvolutionLeadStage | null) ?? "novo",
    classificationNote: text(row.classification_note), firstContactAt: iso(row.first_contact_at)!, lastMessageAt: iso(row.last_message_at)!,
    messagesReceived: number(row.messages_received), messagesSent: number(row.messages_sent), classifiedByEmail: text(row.classified_by_email),
    classifiedAt: iso(row.classified_at), originPlatform: originPlatform(row.origin_platform), originEvidence: originEvidence(row.origin_evidence),
    metaCtwaClid: text(row.meta_ctwa_clid), googleClickId: text(row.google_click_id), originDetectedAt: iso(row.origin_detected_at),
    crmStage: (text(row.crm_stage) as EvolutionCrmStage | null) ?? "lead_not_responded",
    crmStageUpdatedAt: iso(row.crm_stage_updated_at), crmStageUpdatedBy: text(row.crm_stage_updated_by),
  };
}

function asCrmHistory(row: Row): EvolutionCrmStageHistory {
  return {
    id: String(row.id), leadId: String(row.lead_id), instanceName: String(row.instance_name),
    fromStage: text(row.from_stage) as EvolutionCrmStage | null,
    toStage: String(row.to_stage) as EvolutionCrmStage, changedBy: text(row.changed_by),
    changedAt: iso(row.changed_at)!, note: text(row.note),
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

function asMessage(row: Row): EvolutionMessage {
  return {
    id: String(row.id), leadId: String(row.lead_id), instanceName: String(row.instance_name),
    direction: row.direction === "outgoing" ? "outgoing" : "incoming", messageType: text(row.message_type),
    bodyText: String(row.body_text ?? ""), sentAt: iso(row.sent_at)!,
  };
}

function asAttribution(row: Row): EvolutionMetaAttribution {
  return {
    leadId: String(row.lead_id), sourceEventId: text(row.source_event_id), clientId: text(row.client_id), accountId: text(row.account_id),
    campaignId: text(row.campaign_id), campaignName: text(row.campaign_name), adsetId: text(row.adset_id), adsetName: text(row.adset_name),
    adId: text(row.ad_id), adName: text(row.ad_name), creativeId: text(row.creative_id), creativeName: text(row.creative_name),
    matchedBy: String(row.matched_by), matchStatus: row.match_status === "matched" ? "matched" : "unresolved", matchedAt: iso(row.matched_at)!,
  };
}

export async function recordEvolutionEventSupabase(event: NormalizedEvolutionEvent): Promise<{ eventId: string; duplicate: boolean }> {
  const { data, error } = await getEvolutionSupabase().rpc("record_evolution_event", {
    p_event_fingerprint: event.fingerprint,
    p_instance_name: event.instanceName,
    p_event_type: event.eventType,
    p_message_id: event.messageId,
    p_remote_jid: event.remoteJid,
    p_direction: event.direction,
    p_message_type: event.messageType,
    p_message_preview: event.messagePreview,
    p_message_body: event.messageBody,
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
  return { eventId: String((result as Row).event_id), duplicate: Boolean((result as Row).duplicate) };
}

export async function listEvolutionInstancesSupabase(): Promise<EvolutionInstance[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_instances").select("instance_name, display_name, unit_name, connection_status, last_event_at, last_message_at").order("last_event_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ instanceName: row.instance_name, displayName: row.display_name, unitName: row.unit_name, connectionStatus: row.connection_status, lastEventAt: iso(row.last_event_at), lastMessageAt: iso(row.last_message_at) }));
}

export async function updateEvolutionInstanceProfileSupabase(instanceName: string, input: { displayName: string; unitName: string }): Promise<EvolutionInstance | null> {
  const displayName = input.displayName.trim().slice(0, 120) || null;
  const unitName = input.unitName.trim().slice(0, 120) || null;
  const { data, error } = await getEvolutionSupabase()
    .from("evolution_instances")
    .update({ display_name: displayName, unit_name: unitName, updated_at: new Date().toISOString() })
    .eq("instance_name", instanceName)
    .select("instance_name, display_name, unit_name, connection_status, last_event_at, last_message_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? {
    instanceName: data.instance_name,
    displayName: data.display_name,
    unitName: data.unit_name,
    connectionStatus: data.connection_status,
    lastEventAt: iso(data.last_event_at),
    lastMessageAt: iso(data.last_message_at),
  } : null;
}

export async function listEvolutionEventsSupabase(limit = 40): Promise<EvolutionEvent[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const { data, error } = await getEvolutionSupabase().from("evolution_events").select("id, instance_name, event_type, direction, message_type, message_preview, origin_platform, origin_evidence, meta_ctwa_clid, meta_source_id, meta_source_type, google_click_id, attribution_payload_json, occurred_at, received_at").order("received_at", { ascending: false }).limit(safeLimit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asEvent(row));
}

export async function listEvolutionLeadsSupabase(): Promise<EvolutionLead[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_leads").select("id, instance_name, contact_key, contact_phone, phone_last4, contact_name, classification, funnel_stage, classification_note, first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at, origin_platform, origin_evidence, meta_ctwa_clid, google_click_id, origin_detected_at, crm_stage, crm_stage_updated_at, crm_stage_updated_by").order("last_message_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asLead(row));
}

export async function listEvolutionCrmStageHistorySupabase(leadId: string): Promise<EvolutionCrmStageHistory[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_crm_stage_history").select("id, lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note").eq("lead_id", leadId).order("changed_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asCrmHistory(row));
}

export async function moveEvolutionLeadCrmStageSupabase(input: { leadId: string; instanceName: string; toStage: EvolutionCrmStage; changedBy: string; note?: string }): Promise<{ leadId: string; crmStage: EvolutionCrmStage; crmStageUpdatedAt: string }> {
  const { data, error } = await getEvolutionSupabase().rpc("move_evolution_lead_stage", {
    p_lead_id: input.leadId, p_instance_name: input.instanceName, p_to_stage: input.toStage,
    p_changed_by: input.changedBy, p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Resposta CRM inválida do Supabase Evolution");
  return { leadId: String(row.lead_id), crmStage: String(row.crm_stage) as EvolutionCrmStage, crmStageUpdatedAt: iso(row.crm_stage_updated_at)! };
}

export async function listEvolutionMessagesSupabase(leadId: string): Promise<EvolutionMessage[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_messages").select("id, lead_id, instance_name, direction, message_type, body_text, sent_at").eq("lead_id", leadId).order("sent_at", { ascending: true }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asMessage(row));
}

export async function listEvolutionMetaAttributionsSupabase(): Promise<EvolutionMetaAttribution[]> {
  const { data, error } = await getEvolutionSupabase().from("evolution_meta_attributions").select("lead_id, source_event_id, client_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_id, creative_name, matched_by, match_status, matched_at").order("matched_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asAttribution(row));
}

export async function findEvolutionLeadIdSupabase(instanceName: string, contactKey: string): Promise<string | null> {
  const { data, error } = await getEvolutionSupabase().from("evolution_leads").select("id").eq("instance_name", instanceName).eq("contact_key", contactKey).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function updateEvolutionContactNameSupabase(instanceName: string, contactKey: string, contactName: string): Promise<void> {
  const safeName = contactName.trim().slice(0, 180);
  if (!safeName) return;
  const { error } = await getEvolutionSupabase()
    .from("evolution_leads")
    .update({ contact_name: safeName, updated_at: new Date().toISOString() })
    .eq("instance_name", instanceName)
    .eq("contact_key", contactKey);
  if (error) throw new Error(error.message);
}

export async function upsertEvolutionMetaAttributionSupabase(input: EvolutionMetaAttributionInput): Promise<void> {
  const { error } = await getEvolutionSupabase().from("evolution_meta_attributions").upsert({
    lead_id: input.leadId, source_event_id: input.sourceEventId, client_id: input.clientId, account_id: input.accountId,
    campaign_id: input.campaignId, campaign_name: input.campaignName, adset_id: input.adsetId, adset_name: input.adsetName,
    ad_id: input.adId, ad_name: input.adName, creative_id: input.creativeId, creative_name: input.creativeName,
    matched_by: input.matchedBy, match_status: input.matchStatus, updated_at: new Date().toISOString(),
  }, { onConflict: "lead_id" });
  if (error) throw new Error(error.message);
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
  const { data, error } = await getEvolutionSupabase().from("evolution_leads").update({ classification: input.classification, funnel_stage: input.funnelStage, classification_note: input.note || null, classified_by_email: input.classifiedByEmail, classified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select("id, instance_name, contact_key, contact_phone, phone_last4, contact_name, classification, funnel_stage, classification_note, first_contact_at, last_message_at, messages_received, messages_sent, classified_by_email, classified_at, origin_platform, origin_evidence, meta_ctwa_clid, google_click_id, origin_detected_at, crm_stage, crm_stage_updated_at, crm_stage_updated_by").maybeSingle();
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
