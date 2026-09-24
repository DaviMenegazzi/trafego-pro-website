import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer } from "./index.js";
import { normalizeEvolutionWebhook } from "./evolutionWebhook.js";
import {
  cleanupExpiredQuarantineLeadsSupabase,
  deleteEvolutionSupabaseTestRows,
  findEvolutionLeadIdSupabase,
  listEvolutionLeadsSupabase,
  listEvolutionMessagesPageSupabase,
  upsertEvolutionInstanceProfileSupabase,
  verifyLeadBelongsToUnitSupabase,
} from "./evolutionSupabaseStore.js";

let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;
let baseUrl = "";
const testRows: Array<{ instanceName: string; contactKey: string | null; fingerprint: string }> = [];

beforeAll(async () => {
  const started = await startServer({ listen: false });
  server = started.server;
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await Promise.all(testRows.map(deleteEvolutionSupabaseTestRows));
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
});

async function postWebhookMessage(body: unknown): Promise<void> {
  const event = normalizeEvolutionWebhook(body);
  if (!event) throw new Error("Evento de teste não foi normalizado");
  testRows.push({ instanceName: event.instanceName, contactKey: event.contactKey, fingerprint: event.fingerprint });
  const response = await fetch(`${baseUrl}/api/evolution/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EVOLUTION_WEBHOOK_SECRET}` },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(202);
}

describe("verifyLeadBelongsToUnitSupabase (verificação O(1) via SQL)", () => {
  it("confirma posse quando o lead pertence à unidade autorizada e nega para outra unidade", async () => {
    const instanceName = `__evolution_verify_${Date.now()}`;
    const unitId = `unit-${Date.now()}`;

    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "verify-msg-1", remoteJid: "5511988887777@s.whatsapp.net", fromMe: false },
        message: { conversation: "Quero saber mais" },
        messageTimestamp: 1_700_001_000,
        referral: { ctwa_clid: "ctwa-verify", source_id: "ad-verify", source_type: "ad" },
      },
    });

    await upsertEvolutionInstanceProfileSupabase(instanceName, {
      displayName: "Instância de teste",
      unitId,
      unitName: "Unidade de teste",
      metaAccountId: unitId,
    });

    const contactKey = testRows[testRows.length - 1].contactKey!;
    const leadId = await findEvolutionLeadIdSupabase(instanceName, contactKey);
    expect(leadId).toBeTruthy();

    await expect(verifyLeadBelongsToUnitSupabase(leadId!, unitId)).resolves.toBe(true);
    await expect(verifyLeadBelongsToUnitSupabase(leadId!, `${unitId}-outra`)).resolves.toBe(false);
  });

  it("nega posse para um lead inexistente", async () => {
    await expect(
      verifyLeadBelongsToUnitSupabase("00000000-0000-0000-0000-000000000000", "unit-qualquer"),
    ).resolves.toBe(false);
  });
});

describe("Quarentena e reconciliação tardia (100% determinística)", () => {
  it("guarda o primeiro contato sem evidência em quarentena e promove quando chega uma tag [REF:xyz]", async () => {
    const instanceName = `__evolution_quarantine_${Date.now()}`;
    const remoteJid = "5511966665555@s.whatsapp.net";

    // Mensagem 1: sem qualquer evidência de campanha — deve cair em quarentena, não ser descartada.
    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "quarantine-msg-1", remoteJid, fromMe: false },
        message: { conversation: "Oi, vi vocês no bairro" },
        messageTimestamp: 1_700_003_010,
      },
    });

    const contactKeyAfterFirst = testRows[testRows.length - 1].contactKey!;
    let lead = (await listEvolutionLeadsSupabase()).find((item) => item.instanceName === instanceName);
    expect(lead).toMatchObject({ isQuarantine: true, originEvidence: "none" });

    // Mensagem 2: chega a tag determinística de campanha — reconciliação tardia deve promover o lead.
    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "quarantine-msg-2", remoteJid, fromMe: false },
        message: { conversation: "Ah, vim pelo anúncio [REF:campanha-bairro]" },
        messageTimestamp: 1_700_003_020,
      },
    });

    lead = (await listEvolutionLeadsSupabase()).find((item) => item.instanceName === instanceName);
    expect(lead).toMatchObject({ isQuarantine: false, originEvidence: "observed", originPlatform: "google_ads" });

    const leadId = await findEvolutionLeadIdSupabase(instanceName, contactKeyAfterFirst);
    expect(leadId).toBeTruthy();
    await expect(verifyLeadBelongsToUnitSupabase(leadId!, "unidade-qualquer")).resolves.toBe(false);
  });
});

describe("cleanupExpiredQuarantineLeadsSupabase (expurgo diário)", () => {
  it("não remove leads em quarentena ainda dentro da janela de 48h", async () => {
    const instanceName = `__evolution_cleanup_${Date.now()}`;
    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "cleanup-msg-1", remoteJid: "5511955554444@s.whatsapp.net", fromMe: false },
        message: { conversation: "Oi" },
        messageTimestamp: Math.floor(Date.now() / 1000),
      },
    });

    await cleanupExpiredQuarantineLeadsSupabase(48);
    const lead = (await listEvolutionLeadsSupabase()).find((item) => item.instanceName === instanceName);
    expect(lead).toBeTruthy();
  });
});

describe("listEvolutionMessagesPageSupabase (janela deslizante por cursor)", () => {
  it("retorna as mensagens mais recentes em ordem cronológica e pagina para trás com `before`", async () => {
    const instanceName = `__evolution_page_${Date.now()}`;
    const remoteJid = "5511977778888@s.whatsapp.net";

    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "page-msg-1", remoteJid, fromMe: false },
        message: { conversation: "Mensagem 1" },
        messageTimestamp: 1_700_002_010,
        referral: { ctwa_clid: "ctwa-page", source_id: "ad-page", source_type: "ad" },
      },
    });
    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "page-msg-2", remoteJid, fromMe: false },
        message: { conversation: "Mensagem 2" },
        messageTimestamp: 1_700_002_020,
      },
    });
    await postWebhookMessage({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "page-msg-3", remoteJid, fromMe: false },
        message: { conversation: "Mensagem 3" },
        messageTimestamp: 1_700_002_030,
      },
    });

    const contactKey = testRows[testRows.length - 1].contactKey!;
    const leadId = await findEvolutionLeadIdSupabase(instanceName, contactKey);
    expect(leadId).toBeTruthy();

    const latest = await listEvolutionMessagesPageSupabase(leadId!, { limit: 2 });
    expect(latest.map((m) => m.bodyText)).toEqual(["Mensagem 2", "Mensagem 3"]);

    const older = await listEvolutionMessagesPageSupabase(leadId!, { limit: 2, before: latest[0].sentAt });
    expect(older.map((m) => m.bodyText)).toEqual(["Mensagem 1"]);
  });
});
