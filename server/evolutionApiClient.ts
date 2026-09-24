import crypto from "crypto";
import QRCode from "qrcode";

const EVOLUTION_EVENTS = [
  "MESSAGES_UPSERT",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE",
  "CONNECTION_UPDATE",
] as const;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? value as UnknownRecord : {};
}

function configuredWebhookUrl(): string {
  const explicit = process.env.EVOLUTION_WEBHOOK_PUBLIC_URL?.trim();
  const appUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const value = explicit || (appUrl ? `${appUrl}/api/evolution/webhook` : "");
  if (!value) {
    throw new Error("Defina EVOLUTION_WEBHOOK_PUBLIC_URL (ou PUBLIC_APP_URL) para receber mensagens da Evolution.");
  }
  const parsed = new URL(value);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("O webhook da Evolution precisa usar HTTPS em produção.");
  }
  return parsed.toString();
}

function evolutionConfig(): { baseUrl: string; apiKey: string; webhookUrl: string; webhookSecret: string } {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!baseUrl || !apiKey || !webhookSecret) {
    throw new Error("Evolution API não configurada. Defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_WEBHOOK_SECRET.");
  }
  const parsed = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("EVOLUTION_API_URL inválida.");
  return { baseUrl, apiKey, webhookUrl: configuredWebhookUrl(), webhookSecret };
}

function errorMessage(payload: unknown, status: number): string {
  const root = asRecord(payload);
  const response = asRecord(root.response);
  const nested = response.message;
  if (Array.isArray(nested) && typeof nested[0] === "string") return nested[0].slice(0, 300);
  if (typeof nested === "string") return nested.slice(0, 300);
  if (typeof root.message === "string") return root.message.slice(0, 300);
  if (typeof root.error === "string") return root.error.slice(0, 300);
  return `Evolution API respondeu com status ${status}.`;
}

async function evolutionRequest(path: string, init?: RequestInit): Promise<unknown> {
  const { baseUrl, apiKey } = evolutionConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const raw = await response.text();
    let payload: unknown = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    if (!response.ok) throw new Error(errorMessage(payload, response.status));
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A Evolution API demorou demais para responder.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function isEvolutionProvisioningConfigured(): boolean {
  return Boolean(
    process.env.EVOLUTION_API_URL?.trim() &&
    process.env.EVOLUTION_API_KEY?.trim() &&
    process.env.EVOLUTION_WEBHOOK_SECRET?.trim() &&
    (process.env.EVOLUTION_WEBHOOK_PUBLIC_URL?.trim() || process.env.PUBLIC_APP_URL?.trim()),
  );
}

export function buildPixelInstanceName(unitName: string): string {
  const slug = unitName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "unidade";
  return `pixel-${slug}-${crypto.randomBytes(3).toString("hex")}`;
}

export function extractEvolutionQrValue(payload: unknown): string | null {
  const root = asRecord(payload);
  const qrcode = asRecord(root.qrcode);
  const candidates = [qrcode.base64, qrcode.code, root.base64, root.code];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}

export async function evolutionQrDataUrl(payload: unknown): Promise<string | null> {
  const value = extractEvolutionQrValue(payload);
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  return QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}

export async function createEvolutionPixelInstance(instanceName: string): Promise<{ payload: unknown; qrDataUrl: string | null }> {
  const { webhookUrl, webhookSecret } = evolutionConfig();
  const payload = await evolutionRequest("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      groupsIgnore: true,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        headers: {
          authorization: `Bearer ${webhookSecret}`,
          "Content-Type": "application/json",
        },
        events: EVOLUTION_EVENTS,
      },
    }),
  });
  const initialQr = await evolutionQrDataUrl(payload);
  if (initialQr) return { payload, qrDataUrl: initialQr };
  return { payload, qrDataUrl: await connectEvolutionPixelInstance(instanceName) };
}

export async function connectEvolutionPixelInstance(instanceName: string): Promise<string | null> {
  const payload = await evolutionRequest(`/instance/connect/${encodeURIComponent(instanceName)}`);
  return evolutionQrDataUrl(payload);
}

export async function deleteEvolutionInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionRequest(`/instance/delete/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.warn(`[evolution-api] Falha ao deletar instância ${instanceName}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

export async function logoutEvolutionInstance(instanceName: string): Promise<boolean> {
  try {
    await evolutionRequest(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.warn(`[evolution-api] Falha ao desconectar instância ${instanceName}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

export async function setEvolutionInstanceWebhook(instanceName: string): Promise<boolean> {
  const { webhookUrl, webhookSecret } = evolutionConfig();
  await evolutionRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        headers: {
          authorization: `Bearer ${webhookSecret}`,
          "Content-Type": "application/json",
        },
        events: EVOLUTION_EVENTS,
      },
    }),
  });
  return true;
}

