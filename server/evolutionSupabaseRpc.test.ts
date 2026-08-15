import { afterEach, describe, expect, it } from "vitest";

const projectUrl = process.env.EVOLUTION_SUPABASE_URL!;
const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY!;
const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
const instanceName = `__vitest_evolution_${Date.now()}`;
const fingerprint = `vitest-rpc-${Date.now()}`;
const contactKey = `vitest-contact-${Date.now()}`;

async function removeTestRows() {
  await fetch(`${projectUrl}/rest/v1/evolution_leads?instance_name=eq.${encodeURIComponent(instanceName)}&contact_key=eq.${encodeURIComponent(contactKey)}`, { method: "DELETE", headers });
  await fetch(`${projectUrl}/rest/v1/evolution_events?event_fingerprint=eq.${encodeURIComponent(fingerprint)}`, { method: "DELETE", headers });
  await fetch(`${projectUrl}/rest/v1/evolution_instances?instance_name=eq.${encodeURIComponent(instanceName)}`, { method: "DELETE", headers });
}

describe("RPC de gravação Evolution no Supabase separado", () => {
  afterEach(async () => { await removeTestRows(); });

  it("grava uma entrega e reconhece a repetição sem duplicar", async () => {
    const payload = {
      p_event_fingerprint: fingerprint,
      p_instance_name: instanceName,
      p_event_type: "MESSAGES_UPSERT",
      p_message_id: "vitest-message",
      p_remote_jid: "5511999999999@s.whatsapp.net",
      p_direction: "incoming",
      p_message_type: "conversation",
      p_message_preview: "Teste técnico",
      p_message_body: "Teste técnico",
      p_connection_status: "open",
      p_contact_key: contactKey,
      p_phone_last4: "9999",
      p_contact_name: "Teste técnico",
      p_origin_platform: "meta",
      p_origin_evidence: "verified",
      p_meta_ctwa_clid: "ctwa-vitest",
      p_meta_source_id: "ad-vitest",
      p_meta_source_type: "ad",
      p_google_click_id: null,
      p_attribution_payload_json: { ctwa_clid: "ctwa-vitest" },
      p_occurred_at: new Date().toISOString(),
    };

    const first = await fetch(`${projectUrl}/rest/v1/rpc/record_evolution_event`, { method: "POST", headers, body: JSON.stringify(payload) });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual([expect.objectContaining({ duplicate: false })]);

    const storedLead = await fetch(`${projectUrl}/rest/v1/evolution_leads?select=contact_phone&instance_name=eq.${encodeURIComponent(instanceName)}&contact_key=eq.${encodeURIComponent(contactKey)}`, { headers });
    expect(await storedLead.json()).toEqual([expect.objectContaining({ contact_phone: "5511999999999" })]);

    const second = await fetch(`${projectUrl}/rest/v1/rpc/record_evolution_event`, { method: "POST", headers, body: JSON.stringify(payload) });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual([expect.objectContaining({ duplicate: true })]);
  });

  it("move um lead apenas dentro da instância informada e registra o histórico", async () => {
    const crmFingerprint = `${fingerprint}-crm`;
    const payload = {
      p_event_fingerprint: crmFingerprint,
      p_instance_name: instanceName,
      p_event_type: "MESSAGES_UPSERT",
      p_message_id: "vitest-message-crm",
      p_remote_jid: "5511999999999@s.whatsapp.net",
      p_direction: "incoming",
      p_message_type: "conversation",
      p_message_preview: "Teste CRM",
      p_message_body: "Teste CRM",
      p_connection_status: "open",
      p_contact_key: contactKey,
      p_phone_last4: "9999",
      p_contact_name: "Teste CRM",
      p_origin_platform: "unknown",
      p_origin_evidence: "none",
      p_meta_ctwa_clid: null,
      p_meta_source_id: null,
      p_meta_source_type: null,
      p_google_click_id: null,
      p_attribution_payload_json: {},
      p_occurred_at: new Date().toISOString(),
    };
    const created = await fetch(`${projectUrl}/rest/v1/rpc/record_evolution_event`, { method: "POST", headers, body: JSON.stringify(payload) });
    expect(created.status).toBe(200);
    const leadResponse = await fetch(`${projectUrl}/rest/v1/evolution_leads?select=id&instance_name=eq.${encodeURIComponent(instanceName)}&contact_key=eq.${encodeURIComponent(contactKey)}`, { headers });
    const [lead] = await leadResponse.json() as Array<{ id: string }>;
    const moved = await fetch(`${projectUrl}/rest/v1/rpc/move_evolution_lead_stage`, { method: "POST", headers, body: JSON.stringify({ p_lead_id: lead.id, p_instance_name: instanceName, p_to_stage: "follow_up", p_changed_by: "vitest@trafego.pro", p_note: "Teste de pipeline" }) });
    const movedBody = await moved.text();
    expect(moved.status, movedBody).toBe(200);
    expect(JSON.parse(movedBody)).toEqual([expect.objectContaining({ lead_id: lead.id, crm_stage: "follow_up" })]);
    const history = await fetch(`${projectUrl}/rest/v1/evolution_crm_stage_history?select=to_stage,instance_name&lead_id=eq.${lead.id}`, { headers });
    expect(await history.json()).toEqual([expect.objectContaining({ to_stage: "follow_up", instance_name: instanceName })]);
  });
});
