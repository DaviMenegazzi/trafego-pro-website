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

    const second = await fetch(`${projectUrl}/rest/v1/rpc/record_evolution_event`, { method: "POST", headers, body: JSON.stringify(payload) });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual([expect.objectContaining({ duplicate: true })]);
  });
});
