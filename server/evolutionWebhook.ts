import crypto from "crypto";
import { extractEvolutionOrigin, type EvolutionOrigin } from "./evolutionOrigin.js";

export type NormalizedEvolutionEvent = {
  fingerprint: string;
  instanceName: string;
  eventType: string;
  messageId: string | null;
  remoteJid: string | null;
  direction: "incoming" | "outgoing" | "system";
  messageType: string | null;
  messagePreview: string | null;
  messageBody: string | null;
  occurredAt: Date | null;
  contactKey: string | null;
  phoneLast4: string | null;
  contactName: string | null;
  connectionStatus: string | null;
  contactUpdate: { contactKey: string; contactName: string } | null;
  origin: EvolutionOrigin;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractMessageText(message: UnknownRecord): string | null {
  const conversation = asString(message.conversation);
  if (conversation) return conversation;
  const extended = asRecord(message.extendedTextMessage);
  const extendedText = asString(extended.text);
  if (extendedText) return extendedText;
  const image = asRecord(message.imageMessage);
  const imageCaption = asString(image.caption);
  if (imageCaption) return imageCaption;
  const video = asRecord(message.videoMessage);
  const videoCaption = asString(video.caption);
  return videoCaption;
}

function normalizePhoneFromJid(jid: string | null): string | null {
  if (!jid || jid.includes("@g.us") || jid.includes("status@broadcast") || jid.includes("@newsletter")) return null;
  const phone = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
  return phone.length >= 8 ? phone : null;
}

function safePreview(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function parseOccurredAt(value: unknown): Date | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const parsed = new Date(milliseconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractContactUpdate(eventType: string, instanceName: string, data: UnknownRecord, root: UnknownRecord): { contactKey: string; contactName: string } | null {
  if (eventType !== "CONTACTS_UPSERT" && eventType !== "CONTACTS_UPDATE") return null;
  const contactJid = asString(data.id) ?? asString(data.remoteJid) ?? asString(root.sender);
  const phone = normalizePhoneFromJid(contactJid);
  const contactName = asString(data.pushName) ?? asString(data.name) ?? asString(data.verifiedName);
  if (!phone || !contactName) return null;
  return {
    contactKey: crypto.createHash("sha256").update(`${instanceName}:${phone}`).digest("hex"),
    contactName,
  };
}

export function normalizeEvolutionWebhook(payload: unknown): NormalizedEvolutionEvent | null {
  const root = asRecord(payload);
  const eventType = asString(root.event)?.toUpperCase().replace(/[.-]/g, "_");
  const instanceName = asString(root.instance);
  if (!eventType || !instanceName || instanceName.length > 120) return null;

  const data = asRecord(root.data);
  const key = asRecord(data.key);
  const message = asRecord(data.message);
  const remoteJid = asString(key.remoteJid) ?? asString(root.sender);
  const messageId = asString(key.id);
  const fromMe = key.fromMe === true;
  const isMessage = eventType === "MESSAGES_UPSERT";
  const directPhone = normalizePhoneFromJid(remoteJid);
  const direction: NormalizedEvolutionEvent["direction"] = isMessage
    ? (fromMe ? "outgoing" : "incoming")
    : "system";
  const messageText = extractMessageText(message);
  const origin = extractEvolutionOrigin(root, data, message);
  const timestamp = parseOccurredAt(data.messageTimestamp);
  const contactUpdate = extractContactUpdate(eventType, instanceName, data, root);
  const stableId = messageId ?? `${eventType}:${instanceName}:${remoteJid ?? "none"}:${timestamp?.toISOString() ?? "none"}`;
  const fingerprint = crypto.createHash("sha256").update(`${instanceName}|${stableId}|${direction}`).digest("hex");

  return {
    fingerprint,
    instanceName,
    eventType,
    messageId,
    remoteJid,
    direction,
    messageType: asString(data.messageType),
    messagePreview: safePreview(messageText),
    messageBody: messageText?.slice(0, 4000) ?? null,
    occurredAt: timestamp,
    contactKey: isMessage && directPhone ? crypto.createHash("sha256").update(`${instanceName}:${directPhone}`).digest("hex") : null,
    phoneLast4: directPhone ? directPhone.slice(-4) : null,
    // `pushName` em eventos fromMe pode ser o nome do próprio perfil da instância.
    // Só nomes recebidos do contato remoto entram no cadastro do lead.
    contactName: direction === "incoming" ? asString(data.pushName) : null,
    connectionStatus: eventType === "CONNECTION_UPDATE" ? asString(data.state) : null,
    contactUpdate,
    origin,
  };
}

export function webhookSecretMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
