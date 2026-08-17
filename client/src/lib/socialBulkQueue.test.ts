import { describe, expect, it } from "vitest";
import { chunkBulkQueue, loadBulkQueue, newBulkQueueItem, prepareBulkQueue, saveBulkQueue, type BrowserStorage } from "./socialBulkQueue";

function memoryStorage(): BrowserStorage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => void values.set(key, value), removeItem: (key) => void values.delete(key) };
}

describe("fila mensal de publicações", () => {
  it("persiste rascunhos por utilizador e recupera envios interrompidos como prontos", () => {
    const storage = memoryStorage();
    const item = { ...newBulkQueueItem("unit-1"), title: "Post", state: "sending" as const };
    saveBulkQueue(storage, "admin-1", [item]);
    expect(loadBulkQueue(storage, "admin-1")).toEqual([{ ...item, state: "ready" }]);
  });

  it("valida datas futuras, URLs HTTPS e carrosséis com duas mídias", () => {
    const item = { ...newBulkQueueItem("unit-1"), title: "Campanha", caption: "Legenda", contentFormat: "carousel" as const, mediaUrls: "https://cdn.example.com/1.jpg\nhttps://cdn.example.com/2.jpg", scheduledFor: "2030-01-01T12:00" };
    expect(prepareBulkQueue([item], new Date("2029-12-01T00:00:00Z"))[0]?.state).toBe("ready");
    expect(prepareBulkQueue([{ ...item, mediaUrls: "http://example.com/1.jpg" }], new Date("2029-12-01T00:00:00Z"))[0]?.error).toContain("HTTPS");
  });

  it("separa o envio gradual em lotes de até dez peças", () => {
    const items = Array.from({ length: 21 }, () => ({ ...newBulkQueueItem("unit-1"), state: "ready" as const }));
    expect(chunkBulkQueue(items).map((batch) => batch.length)).toEqual([10, 10, 1]);
  });
});
