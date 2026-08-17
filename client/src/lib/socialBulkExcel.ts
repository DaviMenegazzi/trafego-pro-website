import { newBulkQueueItem, type BulkContentFormat, type BulkQueueItem } from "./socialBulkQueue";

export type BulkExcelUnit = { id: string; name: string };
export type BulkExcelConnection = { id: string; unitId: string; facebookPageName: string; instagramUsername: string | null };
export type BulkExcelResult = { items: BulkQueueItem[]; errors: Array<{ row: number; message: string }> };

function normalize(value: unknown): string {
  return String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function readCell(row: Record<string, unknown>, names: string[]): unknown {
  const key = Object.keys(row).find((column) => names.includes(normalize(column)));
  return key ? row[key] : undefined;
}

function parseBool(value: unknown, defaultValue: boolean): boolean {
  const normalized = normalize(value);
  if (!normalized) return defaultValue;
  return ["sim", "s", "true", "1", "yes", "y"].includes(normalized);
}

function parseFormat(value: unknown): BulkContentFormat | null {
  const normalized = normalize(value);
  if (["imagem", "image", "foto"].includes(normalized)) return "image";
  if (["carrossel", "carousel"].includes(normalized)) return "carousel";
  if (["video", "vídeo"].includes(normalized)) return "video";
  if (["reel", "reels"].includes(normalized)) return "reel";
  return null;
}

function parseDateTime(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 16);
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = new Date(text);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 16);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+|T)(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}`;
}

function normalizeMedia(value: unknown): string {
  return String(value ?? "").split(/[\n;]+/).map((item) => item.trim()).filter(Boolean).join("\n");
}

export function mapSocialExcelRows(rows: Array<Record<string, unknown>>, units: BulkExcelUnit[], connections: BulkExcelConnection[]): BulkExcelResult {
  const items: BulkQueueItem[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const unitValue = readCell(row, ["unidade", "unit"]);
    const unit = units.find((item) => normalize(item.name) === normalize(unitValue) || item.id === String(unitValue ?? "").trim());
    if (!unit) { errors.push({ row: rowNumber, message: "Unidade não encontrada ou não autorizada" }); return; }
    const pageValue = readCell(row, ["pagina meta", "página meta", "pagina", "página", "page", "conta meta"]);
    const unitConnections = connections.filter((item) => item.unitId === unit.id);
    const connection = pageValue ? unitConnections.find((item) => normalize(item.facebookPageName) === normalize(pageValue) || item.id === String(pageValue).trim()) : unitConnections.length === 1 ? unitConnections[0] : undefined;
    if (pageValue && !connection) { errors.push({ row: rowNumber, message: "Página Meta não conectada para esta unidade" }); return; }
    if (!pageValue && unitConnections.length > 1) { errors.push({ row: rowNumber, message: "Informe a Página Meta quando a unidade tiver mais de uma conexão" }); return; }
    const contentFormat = parseFormat(readCell(row, ["formato", "format"]));
    if (!contentFormat) { errors.push({ row: rowNumber, message: "Formato inválido: use Imagem, Carrossel, Vídeo ou Reel" }); return; }
    const scheduledFor = parseDateTime(readCell(row, ["data e horario", "data e horário", "agendamento", "scheduled for", "data"]));
    if (!scheduledFor) { errors.push({ row: rowNumber, message: "Data e horário inválidos" }); return; }
    const item = newBulkQueueItem(unit.id);
    items.push({ ...item, connectionId: connection?.id ?? "", title: String(readCell(row, ["titulo", "título", "title"]) ?? "").trim(), caption: String(readCell(row, ["legenda", "caption"]) ?? "").trim(), contentFormat, mediaUrls: normalizeMedia(readCell(row, ["midias", "mídias", "media", "media urls", "urls"])), linkUrl: String(readCell(row, ["link", "url de destino", "destination url"]) ?? "").trim(), targetFacebook: parseBool(readCell(row, ["facebook"]), true), targetInstagram: parseBool(readCell(row, ["instagram"]), true), scheduledFor });
  });
  return { items, errors };
}

export const SOCIAL_EXCEL_HEADERS = ["Unidade", "Página Meta", "Título", "Legenda", "Formato", "Mídias", "Link", "Facebook", "Instagram", "Data e horário"];
export const SOCIAL_EXCEL_EXAMPLE = ["Vida Card | Exemplo", "Página Vida Card", "Título da publicação", "Legenda com chamada para ação", "Imagem", "https://cdn.exemplo.com/post.jpg", "https://exemplo.com", "Sim", "Sim", "30/09/2030 10:00"];
