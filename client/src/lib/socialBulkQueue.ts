export type BulkContentFormat = "image" | "carousel" | "video" | "reel";

export type BulkQueueItem = {
  localId: string;
  unitId: string;
  connectionId: string;
  title: string;
  caption: string;
  contentFormat: BulkContentFormat;
  mediaUrls: string;
  linkUrl: string;
  targetFacebook: boolean;
  targetInstagram: boolean;
  scheduledFor: string;
  state: "draft" | "ready" | "sending" | "saved" | "error";
  serverPostId?: string;
  error?: string;
};

export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const SOCIAL_BULK_STORAGE_PREFIX = "tp_social_bulk_queue_v1";

export function bulkQueueStorageKey(ownerUserId: string): string { return `${SOCIAL_BULK_STORAGE_PREFIX}:${ownerUserId}`; }

export function newBulkQueueItem(unitId = ""): BulkQueueItem {
  return { localId: crypto.randomUUID(), unitId, connectionId: "", title: "", caption: "", contentFormat: "image", mediaUrls: "", linkUrl: "", targetFacebook: true, targetInstagram: true, scheduledFor: "", state: "draft" };
}

export function loadBulkQueue(storage: BrowserStorage, ownerUserId: string): BulkQueueItem[] {
  try {
    const raw = storage.getItem(bulkQueueStorageKey(ownerUserId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is BulkQueueItem => typeof item?.localId === "string" && typeof item?.title === "string").map((item) => ({ ...newBulkQueueItem(), ...item, state: item.state === "sending" ? "ready" : item.state }));
  } catch { return []; }
}

export function saveBulkQueue(storage: BrowserStorage, ownerUserId: string, items: BulkQueueItem[]): void {
  storage.setItem(bulkQueueStorageKey(ownerUserId), JSON.stringify(items.filter((item) => item.state !== "saved")));
}

export function validateBulkQueueItem(item: BulkQueueItem, now = new Date()): string | null {
  if (!item.unitId) return "Selecione a unidade";
  if (!item.title.trim()) return "Informe o título";
  if (!item.caption.trim()) return "Informe a legenda";
  if (!item.mediaUrls.trim()) return "Informe ao menos uma URL de mídia";
  if (!item.targetFacebook && !item.targetInstagram) return "Selecione Facebook ou Instagram";
  if (!item.scheduledFor) return "Defina data e horário";
  const date = new Date(item.scheduledFor);
  if (Number.isNaN(date.getTime()) || date.getTime() < now.getTime() + 10 * 60 * 1000) return "Agende com no mínimo 10 minutos de antecedência";
  const urls = item.mediaUrls.split("\n").map((value) => value.trim().replace(/^(image|video)\|/, "")).filter(Boolean);
  if (urls.some((url) => !/^https:\/\//i.test(url))) return "Use somente URLs HTTPS públicas";
  if (item.contentFormat === "carousel" && urls.length < 2) return "Carrossel precisa de pelo menos duas mídias";
  if (item.contentFormat !== "carousel" && urls.length !== 1) return "Imagem, vídeo e Reel aceitam uma mídia por linha";
  return null;
}

export function prepareBulkQueue(items: BulkQueueItem[], now = new Date()): BulkQueueItem[] {
  return items.map((item) => {
    if (item.state === "saved") return item;
    const error = validateBulkQueueItem(item, now);
    return { ...item, state: error ? "error" : "ready", error: error ?? undefined };
  });
}

export function chunkBulkQueue(items: BulkQueueItem[], chunkSize = 10): BulkQueueItem[][] {
  const ready = items.filter((item) => item.state === "ready");
  return Array.from({ length: Math.ceil(ready.length / chunkSize) }, (_, index) => ready.slice(index * chunkSize, (index + 1) * chunkSize));
}
