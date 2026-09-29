import crypto from "crypto";
import {
  AI_AUTOMATION_ACTOR,
  AI_AUTOMATION_ACTOR_LAYA,
  AI_AUTOMATION_ACTOR_TEXT_RULE,
} from "../shared/evolutionAiPolicy.js";
import {
  CRM_BOARD_PAGE_SIZE,
  CRM_LIST_MAX_LIMIT,
  CRM_NOTE_MAX_LENGTH,
  CRM_STAGES,
  isCrmStage,
  type CrmBoard,
  type CrmColumn,
  type CrmErrorCode,
  type CrmFilters,
  type CrmHistoryEvent,
  type CrmHistoryPage,
  type CrmLead,
  type CrmLeadPage,
  type CrmStage,
} from "../shared/crm.js";
import {
  getCrmBoardSupabase,
  getCrmLeadSupabase,
  listCrmLeadHistorySupabase,
  listCrmLeadsSupabase,
  moveCrmLeadStageSupabase,
  setCrmLeadAutomaticSupabase,
  type CrmMutationResult,
  type CrmRpcFilters,
} from "./evolutionSupabaseStore.js";

export class CrmError extends Error {
  constructor(public readonly status: number, public readonly code: CrmErrorCode, message: string, public readonly lead?: CrmLead) {
    super(message);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSTANCE_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;
const TEMPERATURES = new Set(["HOT", "WARM", "COLD", "unrated"]);
const CLASSIFICATIONS = new Set(["pendente", "lead"]);
const FILTER_KEY_LIST = ["instanceName", "temperature", "classification", "q"] as const;
const FILTER_KEYS = new Set<string>(FILTER_KEY_LIST);

function invalid(message: string): CrmError {
  return new CrmError(422, "INVALID_REQUEST", message);
}

export function parseLeadId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw invalid("Lead inválido.");
  return value.toLowerCase();
}

// ─── Filtros ────────────────────────────────────────────────────────────────
function queryString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalid("Filtro inválido.");
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseCrmFilters(query: Record<string, unknown>): CrmFilters {
  const filters: CrmFilters = {};
  const instanceName = queryString(query.instanceName);
  if (instanceName) {
    if (!INSTANCE_PATTERN.test(instanceName)) throw invalid("Instância inválida.");
    filters.instanceName = instanceName;
  }
  const temperature = queryString(query.temperature);
  if (temperature) {
    if (!TEMPERATURES.has(temperature)) throw invalid("Temperatura inválida.");
    filters.temperature = temperature as CrmFilters["temperature"];
  }
  const classification = queryString(query.classification);
  if (classification) {
    if (!CLASSIFICATIONS.has(classification)) throw invalid("Classificação inválida.");
    filters.classification = classification as CrmFilters["classification"];
  }
  const q = queryString(query.q);
  if (q) {
    if (q.length > 80) throw invalid("Busca muito longa.");
    filters.q = q;
  }
  return filters;
}

// Busca vai para um ILIKE: curingas e barras invertidas do usuário viram texto comum (removidos).
export function toRpcFilters(filters: CrmFilters): CrmRpcFilters {
  const rpc: CrmRpcFilters = {};
  if (filters.instanceName) rpc.instanceName = filters.instanceName;
  if (filters.temperature) rpc.temperature = filters.temperature;
  if (filters.classification) rpc.classification = filters.classification;
  if (filters.q) {
    const text = filters.q.replace(/[%_\\]/g, "").trim();
    const digits = filters.q.replace(/\D/g, "");
    if (text) rpc.q = text;
    if (digits.length >= 4) rpc.qDigits = digits;
  }
  return rpc;
}

function filterKey(unitId: string, scope: string, filters: CrmFilters): string {
  const normalized = FILTER_KEY_LIST.map((key) => `${key}=${filters[key] ?? ""}`).join("&");
  return crypto.createHash("sha256").update(`${unitId}|${scope}|${normalized}`).digest("base64url").slice(0, 16);
}

// ─── Cursor opaco ───────────────────────────────────────────────────────────
// Posição (data + id) amarrada à unidade, à etapa e aos filtros: um cursor não serve para outra
// consulta. Não é segredo; a autorização continua vindo da unidade validada.
type CursorPosition = { at: string; id: string };

export function encodeCursor(key: string, position: CursorPosition): string {
  return Buffer.from(JSON.stringify({ k: key, a: position.at, i: position.id })).toString("base64url");
}

export function decodeCursor(key: string, raw: unknown): CursorPosition | null {
  if (raw === undefined || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 400) throw invalid("Cursor inválido.");
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { k?: unknown; a?: unknown; i?: unknown };
    if (parsed.k !== key || typeof parsed.a !== "string" || Number.isNaN(Date.parse(parsed.a)) ||
        typeof parsed.i !== "string" || !UUID_PATTERN.test(parsed.i)) {
      throw new Error("mismatch");
    }
    return { at: parsed.a, id: parsed.i };
  } catch {
    throw invalid("Cursor inválido. Recarregue o quadro.");
  }
}

function parseLimit(raw: unknown, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > CRM_LIST_MAX_LIMIT) throw invalid(`Limite deve ficar entre 1 e ${CRM_LIST_MAX_LIMIT}.`);
  return value;
}

// ─── Projeção ───────────────────────────────────────────────────────────────
const AUTOMATION_LABELS: Record<string, string> = {
  [AI_AUTOMATION_ACTOR_LAYA]: "Laya",
  [AI_AUTOMATION_ACTOR_TEXT_RULE]: "Regra de texto",
  [AI_AUTOMATION_ACTOR]: "IA diária",
};

// E-mails internos (movimentos antigos gravavam o e-mail) não são expostos no CRM.
function publicActorLabel(value: string | null): string | null {
  if (!value) return null;
  if (AUTOMATION_LABELS[value]) return AUTOMATION_LABELS[value];
  return value.includes("@") ? "Equipe" : value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function asIso(value: unknown): string | null {
  const text = asString(value);
  return text && !Number.isNaN(Date.parse(text)) ? new Date(text).toISOString() : null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toCrmLead(raw: unknown): CrmLead {
  const row = (raw ?? {}) as Record<string, unknown>;
  const id = asString(row.id);
  const stage = row.crmStage;
  if (!id || !isCrmStage(stage)) throw new Error("Lead CRM inválido retornado pelo Supabase Evolution");
  const temperature = row.temperature === "HOT" || row.temperature === "WARM" || row.temperature === "COLD" ? row.temperature : null;
  return {
    id,
    instanceName: String(row.instanceName ?? ""),
    instanceDisplayName: asString(row.instanceDisplayName),
    contactName: asString(row.contactName)?.trim() || null,
    contactPhone: asString(row.contactPhone),
    phoneLast4: asString(row.phoneLast4),
    classification: row.classification === "lead" ? "lead" : "pendente",
    crmStage: stage,
    crmStageMode: row.crmStageMode === "manual" ? "manual" : "automatic",
    crmVersion: asNumber(row.crmVersion) ?? 0,
    crmStageUpdatedAt: asIso(row.crmStageUpdatedAt) ?? new Date(0).toISOString(),
    crmStageUpdatedBy: publicActorLabel(asString(row.crmStageUpdatedBy)),
    temperature,
    leadScore: asNumber(row.leadScore),
    leadScoreUpdatedAt: asIso(row.leadScoreUpdatedAt),
    firstContactAt: asIso(row.firstContactAt) ?? new Date(0).toISOString(),
    lastMessageAt: asIso(row.lastMessageAt) ?? new Date(0).toISOString(),
    messagesReceived: asNumber(row.messagesReceived) ?? 0,
    messagesSent: asNumber(row.messagesSent) ?? 0,
    originPlatform: String(row.originPlatform ?? "unknown"),
    originEvidence: String(row.originEvidence ?? "none"),
  };
}

function toPage(key: string, rawItems: unknown, rawTotal: unknown): CrmColumn {
  const items = (Array.isArray(rawItems) ? rawItems : []).map(toCrmLead);
  const total = asNumber(rawTotal) ?? items.length;
  const last = items[items.length - 1];
  const hasMore = items.length > 0 && total > items.length;
  return { items, total, hasMore, nextCursor: hasMore && last ? encodeCursor(key, { at: last.crmStageUpdatedAt, id: last.id }) : null };
}

// ─── Leituras ───────────────────────────────────────────────────────────────
type Unit = { id: string; name: string };

export async function loadCrmBoard(unit: Unit, query: Record<string, unknown>): Promise<CrmBoard> {
  const filters = parseCrmFilters(query);
  const raw = await getCrmBoardSupabase(unit.id, toRpcFilters(filters), CRM_BOARD_PAGE_SIZE) as Record<string, unknown> | null;
  const rawColumns = (raw?.columns ?? {}) as Record<string, { items?: unknown; total?: unknown }>;
  const columns = {} as Record<CrmStage, CrmColumn>;
  let total = 0;
  for (const stage of CRM_STAGES) {
    const column = toPage(filterKey(unit.id, stage, filters), rawColumns[stage]?.items, rawColumns[stage]?.total);
    columns[stage] = column;
    total += column.total;
  }
  const instances = (Array.isArray(raw?.instances) ? raw.instances : []).map((item) => {
    const row = item as Record<string, unknown>;
    return { instanceName: String(row.instanceName ?? ""), displayName: asString(row.displayName), connectionStatus: String(row.connectionStatus ?? "unknown") };
  });
  return { unit: { id: unit.id, name: unit.name }, instances, columns, total, generatedAt: asIso(raw?.generatedAt) ?? new Date().toISOString() };
}

export async function loadCrmLeadPage(unit: Unit, query: Record<string, unknown>): Promise<CrmLeadPage> {
  const unknown = Object.keys(query).filter((key) => !FILTER_KEYS.has(key) && !["unitId", "stage", "cursor", "limit"].includes(key));
  if (unknown.length) throw invalid("Parâmetro desconhecido.");
  if (!isCrmStage(query.stage)) throw invalid("Etapa inválida.");
  const stage = query.stage;
  const filters = parseCrmFilters(query);
  const key = filterKey(unit.id, stage, filters);
  const cursor = decodeCursor(key, query.cursor);
  const limit = parseLimit(query.limit, CRM_BOARD_PAGE_SIZE);
  const raw = await listCrmLeadsSupabase({
    unitId: unit.id, stage, filters: toRpcFilters(filters), afterAt: cursor?.at ?? null, afterId: cursor?.id ?? null, limit,
  }) as Record<string, unknown> | null;
  const items = (Array.isArray(raw?.items) ? raw.items : []).map(toCrmLead);
  const total = asNumber(raw?.total) ?? 0;
  const last = items[items.length - 1];
  const hasMore = items.length === limit && Boolean(last);
  return { items, total, hasMore, nextCursor: hasMore && last ? encodeCursor(key, { at: last.crmStageUpdatedAt, id: last.id }) : null };
}

export async function loadCrmLead(unit: Unit, leadId: string): Promise<CrmLead> {
  const raw = await getCrmLeadSupabase(leadId, unit.id);
  if (!raw) throw new CrmError(404, "NOT_FOUND", "Lead não encontrado nesta unidade.");
  return toCrmLead(raw);
}

export async function loadCrmLeadHistory(
  unit: Unit, leadId: string, query: Record<string, unknown>, viewer: { id: string },
): Promise<CrmHistoryPage> {
  const key = filterKey(unit.id, `history:${leadId}`, {});
  const cursor = decodeCursor(key, query.cursor);
  const limit = parseLimit(query.limit, 30);
  const raw = await listCrmLeadHistorySupabase({ leadId, unitId: unit.id, afterAt: cursor?.at ?? null, afterId: cursor?.id ?? null, limit }) as Record<string, unknown> | null;
  if (!raw) throw new CrmError(404, "NOT_FOUND", "Lead não encontrado nesta unidade.");
  const items: CrmHistoryEvent[] = [];
  for (const item of Array.isArray(raw.items) ? raw.items : []) {
    const row = item as Record<string, unknown>;
    if (!isCrmStage(row.toStage)) continue;
    const changedBy = asString(row.changedBy);
    const actorType = row.actorType === "automation" || row.actorType === "user" ? row.actorType
      : changedBy && AUTOMATION_LABELS[changedBy] ? "automation" : "user";
    items.push({
      id: String(row.id),
      eventType: row.eventType === "automation_resumed" ? "automation_resumed" : "stage_changed",
      fromStage: isCrmStage(row.fromStage) ? row.fromStage : null,
      toStage: row.toStage,
      fromMode: row.fromMode === "manual" || row.fromMode === "automatic" ? row.fromMode : null,
      toMode: row.toMode === "manual" || row.toMode === "automatic" ? row.toMode : null,
      actorType,
      actorLabel: row.actorId === viewer.id ? "Você" : publicActorLabel(changedBy) ?? (actorType === "automation" ? "Automação" : "Equipe"),
      changedAt: asIso(row.changedAt) ?? new Date(0).toISOString(),
      note: asString(row.note),
    });
  }
  const last = items[items.length - 1];
  const hasMore = items.length === limit && Boolean(last);
  return { items, nextCursor: hasMore && last ? encodeCursor(key, { at: last.changedAt, id: last.id }) : null };
}

// ─── Mutações ───────────────────────────────────────────────────────────────
function rejectUnknownFields(body: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw invalid("Campo não permitido na requisição.");
}

function parseExpectedVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid("Versão do lead inválida.");
  return value;
}

function parseRequestId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw invalid("Identificador da requisição inválido.");
  return value.toLowerCase();
}

function mutationResult(result: CrmMutationResult): CrmLead {
  switch (result.status) {
    case "ok":
      return toCrmLead(result.lead);
    case "version_conflict":
      throw new CrmError(409, "VERSION_CONFLICT", "Este lead foi atualizado por outra pessoa ou pela automação. O cartão foi recarregado.", result.lead ? toCrmLead(result.lead) : undefined);
    case "request_conflict":
      throw new CrmError(409, "REQUEST_CONFLICT", "Esta requisição já foi usada com outros dados.");
    case "not_found":
      throw new CrmError(404, "NOT_FOUND", "Lead não encontrado nesta unidade.");
    default:
      throw invalid("Movimentação inválida.");
  }
}

export type CrmActor = { id: string; name: string };

export function actorLabel(actor: CrmActor): string {
  return actor.name?.trim().slice(0, 120) || "Usuário";
}

export function parseMoveBody(raw: unknown): { unitId: unknown; stage: CrmStage; expectedVersion: number; requestId: string; note: string | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("Corpo da requisição inválido.");
  const body = raw as Record<string, unknown>;
  rejectUnknownFields(body, ["unitId", "stage", "expectedVersion", "requestId", "note"]);
  if (!isCrmStage(body.stage)) throw invalid("Etapa inválida.");
  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string" || body.note.length > CRM_NOTE_MAX_LENGTH) throw invalid(`Observação deve ter até ${CRM_NOTE_MAX_LENGTH} caracteres.`);
    note = body.note.trim() || null;
  }
  return { unitId: body.unitId, stage: body.stage, expectedVersion: parseExpectedVersion(body.expectedVersion), requestId: parseRequestId(body.requestId), note };
}

export function parseAutomationBody(raw: unknown): { unitId: unknown; expectedVersion: number; requestId: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("Corpo da requisição inválido.");
  const body = raw as Record<string, unknown>;
  rejectUnknownFields(body, ["unitId", "mode", "expectedVersion", "requestId"]);
  if (body.mode !== "automatic") throw invalid("Modo inválido.");
  return { unitId: body.unitId, expectedVersion: parseExpectedVersion(body.expectedVersion), requestId: parseRequestId(body.requestId) };
}

export async function moveCrmLead(
  unit: Unit, leadId: string, input: ReturnType<typeof parseMoveBody>, actor: CrmActor,
): Promise<CrmLead> {
  return mutationResult(await moveCrmLeadStageSupabase({
    leadId, unitId: unit.id, toStage: input.stage, expectedVersion: input.expectedVersion,
    actorId: actor.id, actorLabel: actorLabel(actor), requestId: input.requestId, note: input.note,
  }));
}

export async function resumeCrmLeadAutomation(
  unit: Unit, leadId: string, input: ReturnType<typeof parseAutomationBody>, actor: CrmActor,
): Promise<CrmLead> {
  return mutationResult(await setCrmLeadAutomaticSupabase({
    leadId, unitId: unit.id, expectedVersion: input.expectedVersion,
    actorId: actor.id, actorLabel: actorLabel(actor), requestId: input.requestId,
  }));
}
