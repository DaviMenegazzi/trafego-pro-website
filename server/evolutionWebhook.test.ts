import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signToken, startServer } from "./index.js";
import { normalizeEvolutionWebhook } from "./evolutionWebhook.js";
import { deleteEvolutionSupabaseTestRows, listEvolutionEventsSupabase, listEvolutionLeadsSupabase, listEvolutionMessagesSupabase, recordEvolutionEventSupabase } from "./evolutionSupabaseStore.js";

let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;
let baseUrl = "";
const webhookTestRows: Array<{ instanceName: string; contactKey: string | null; fingerprint: string }> = [];

beforeAll(async () => {
  const started = await startServer({ listen: false });
  server = started.server;
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await Promise.all(webhookTestRows.map(deleteEvolutionSupabaseTestRows));
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
});

describe("Evolution webhook secret", () => {
  it("aceita a chamada autenticada com o segredo configurado antes de validar o evento", async () => {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
    expect(secret).toBeTruthy();
    const response = await fetch(`${baseUrl}/api/evolution/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Evento Evolution inválido" });
  });

  it("grava um evento autenticado no Supabase exclusivo do Evolution", async () => {
    const instanceName = `__evolution_endpoint_${Date.now()}`;
    const body = {
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: "endpoint-supabase", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Teste de ponta a ponta" },
        messageTimestamp: 1_700_000_002,
      },
    };
    const event = normalizeEvolutionWebhook(body);
    if (!event) throw new Error("Evento de teste não foi normalizado");
    webhookTestRows.push({ instanceName: event.instanceName, contactKey: event.contactKey, fingerprint: event.fingerprint });

    const response = await fetch(`${baseUrl}/api/evolution/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EVOLUTION_WEBHOOK_SECRET}` },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ accepted: true, duplicate: false });
    expect((await listEvolutionEventsSupabase(100)).some((item) => item.instanceName === instanceName)).toBe(true);
  });

  it("rejeita chamadas sem o segredo do webhook", async () => {
    const response = await fetch(`${baseUrl}/api/evolution/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    expect(response.status).toBe(401);
  });

  it("mantém a consulta do painel restrita a administradores", async () => {
    const viewerToken = signToken({ email: "viewer@trafego.pro", name: "Viewer", role: "viewer", id: "viewer", allowedClientIds: ["unit-1"] });
    const response = await fetch(`${baseUrl}/api/evolution/overview`, { headers: { Authorization: `Bearer ${viewerToken}` } });
    expect(response.status).toBe(403);
  });

  it("rejeita um JWT administrativo sem a sessão Supabase ativa", async () => {
    const adminToken = signToken({ email: "admin@trafego.pro", name: "Admin", role: "admin", id: "admin", allowedClientIds: ["*"] });
    const response = await fetch(`${baseUrl}/api/evolution/overview`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sessão Supabase expirada" });
  });
});

describe("Evolution webhook normalization", () => {
  it("normaliza mensagem recebida direta em um contato rastreável", () => {
    const event = normalizeEvolutionWebhook({
      event: "messages.upsert",
      instance: "vida-card-ijui",
      data: {
        key: { id: "message-123", remoteJid: "5599999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "  Olá, quero  saber mais  " },
        messageType: "conversation",
        messageTimestamp: 1_700_000_000,
        pushName: "Ana",
      },
    });
    expect(event).toMatchObject({
      instanceName: "vida-card-ijui", eventType: "MESSAGES_UPSERT", direction: "incoming",
      messageId: "message-123", messagePreview: "Olá, quero saber mais", messageBody: "Olá, quero  saber mais", phoneLast4: "9999", contactName: "Ana",
    });
    expect(event?.contactKey).toHaveLength(64);
    expect(event?.fingerprint).toHaveLength(64);
  });

  it("preserva no evento os sinais de origem que chegam no payload Evolution", () => {
    const event = normalizeEvolutionWebhook({
      event: "messages.upsert",
      instance: "vida-card-ijui",
      data: {
        key: { id: "message-origin", remoteJid: "5599999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Vim do anúncio" },
        referral: { ctwa_clid: "ctwa-live-123", source_id: "ad-456", source_type: "ad" },
      },
    });

    expect(event?.origin).toMatchObject({
      platform: "meta", evidence: "verified", metaCtwaClid: "ctwa-live-123", metaSourceId: "ad-456",
    });
  });

  it("não transforma eventos de grupos em contatos classificáveis", () => {
    const event = normalizeEvolutionWebhook({
      event: "MESSAGES_UPSERT",
      instance: "vida-card-ijui",
      data: { key: { id: "group-message", remoteJid: "12345-67890@g.us", fromMe: false }, message: { conversation: "Mensagem de grupo" } },
    });
    expect(event?.contactKey).toBeNull();
    expect(event?.phoneLast4).toBeNull();
  });

  it("ignora uma nova entrega do mesmo evento sem duplicar contato ou evento", async () => {
    const instanceName = `__evolution_test_${Date.now()}`;
    const event = normalizeEvolutionWebhook({
      event: "MESSAGES_UPSERT",
      instance: instanceName,
      data: { key: { id: "dedupe-message", remoteJid: "5599999999999@s.whatsapp.net", fromMe: false }, message: { conversation: "Teste isolado" }, messageTimestamp: 1_700_000_001 },
    });
    if (!event) throw new Error("Evento de teste não foi normalizado");
    webhookTestRows.push({ instanceName: event.instanceName, contactKey: event.contactKey, fingerprint: event.fingerprint });

    await expect(recordEvolutionEventSupabase(event)).resolves.toMatchObject({ duplicate: false });
    await expect(recordEvolutionEventSupabase(event)).resolves.toMatchObject({ duplicate: true });
  });

  it("persiste somente as tags de origem permitidas para auditoria administrativa", async () => {
    const instanceName = `__evolution_origin_${Date.now()}`;
    const event = normalizeEvolutionWebhook({
      event: "MESSAGES_UPSERT",
      instance: instanceName,
      data: {
        key: { id: "origin-persistence", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Mensagem de teste para auditoria" },
        referral: {
          ctwa_clid: "ctwa-persisted-123",
          source_id: "ad-persisted-456",
          source_type: "ad",
          source_url: "https://trafego.pro/contato?utm_source=facebook&ctwa_clid=ctwa-persisted-123",
        },
      },
    });
    if (!event) throw new Error("Evento de origem não foi normalizado");
    webhookTestRows.push({ instanceName: event.instanceName, contactKey: event.contactKey, fingerprint: event.fingerprint });

    await expect(recordEvolutionEventSupabase(event)).resolves.toMatchObject({ duplicate: false });
    const saved = (await listEvolutionEventsSupabase(100)).find((item) => item.instanceName === instanceName);
    expect(saved).toMatchObject({
      originPlatform: "meta", originEvidence: "verified", metaCtwaClid: "ctwa-persisted-123",
      metaSourceId: "ad-persisted-456",
    });
    expect(saved?.attributionPayload).toMatchObject({
      ctwa_clid: "ctwa-persisted-123", source_url: "https://trafego.pro/contato", utm_source: "facebook",
    });

    const lead = (await listEvolutionLeadsSupabase()).find((item) => item.instanceName === instanceName);
    expect(lead).toBeDefined();
    if (!lead) throw new Error("Lead de teste não encontrado");
    await expect(listEvolutionMessagesSupabase(lead.id)).resolves.toEqual([expect.objectContaining({ direction: "incoming", bodyText: "Mensagem de teste para auditoria" })]);
  });
});
