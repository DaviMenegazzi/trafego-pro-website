import { Router, type Request } from "express";
import * as XLSX from "xlsx";
import { getSupabaseForRequest, hasUnitAccess, isAdmin, requireAdmin, requireAuth } from "../auth.js";
import {
  createFeedbackLeadSql,
  getLastFeedbackLeadSql,
  listAllFeedbackLeadsForExportSql,
  listFeedbackLeadsSql,
} from "../feedbackSql.js";
import { getLastKnownClients, getMetaDirectClients, normalizeUnitString } from "../metaDirectService.js";
import { checkUserHasMetaAccountAccess } from "./metricsRoutes.js";

export const feedbackRouter = Router();

/** A unidade enviada (nome) é a mesma conta do painel (clientId)? Os nomes da Meta e do cadastro diferem ("Vida Card | Bento"). */
async function unitMatchesClient(req: Request, unit: string, clientId: string): Promise<boolean> {
  const target = normalizeUnitString(unit);
  if (!target) return false;
  const meta = await getMetaDirectClients().catch(() => getLastKnownClients());
  const account = meta.find((c) => c.id === clientId || c.account_id === clientId || `act_${c.account_id}` === clientId);
  if (account && normalizeUnitString(account.name) === target) return true;
  const sb = getSupabaseForRequest(req);
  if (!sb) return false;
  const column = clientId.startsWith("act_") ? "meta_account_id" : "id";
  const { data } = await sb.from("clients").select("name").eq(column, clientId).maybeSingle();
  return Boolean(data && normalizeUnitString(data.name) === target);
}

/**
 * Admin acessa tudo; os demais só as unidades liberadas na sessão. Com clientId, usa a mesma regra
 * das métricas do painel; sem ele (tela antiga em cache), cai na busca pelo nome no cadastro.
 * Devolve o status de erro, ou null se pode.
 */
async function unitAccessError(req: Request, unit: string, clientId = ""): Promise<{ status: number; error: string } | null> {
  if (isAdmin(req.claims!)) return null;
  if (clientId) {
    if (!(await checkUserHasMetaAccountAccess(req, clientId)) || !(await unitMatchesClient(req, unit, clientId))) {
      return { status: 403, error: "Sem acesso a essa unidade" };
    }
    return null;
  }
  const sb = getSupabaseForRequest(req);
  if (!sb) return { status: 403, error: "Sem acesso a essa unidade" };
  const { data: client, error } = await sb.from("clients").select("id").eq("name", unit).maybeSingle();
  if (error) return { status: 502, error: "Não foi possível validar a unidade autorizada" };
  if (!client || !hasUnitAccess(client.id, req.claims!)) return { status: 403, error: "Sem acesso a essa unidade" };
  return null;
}

// ─── GET /api/feedback-leads/last?unit= ─────────────────────────────────────
// Último envio da unidade, para o aviso no formulário. Liberado para quem tem acesso à unidade.
feedbackRouter.get("/feedback-leads/last", requireAuth, async (req, res) => {
  const unit = typeof req.query.unit === "string" ? req.query.unit.trim() : "";
  if (!unit) {
    res.status(400).json({ error: "Unidade obrigatória" });
    return;
  }
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId.trim() : "";
  const denied = await unitAccessError(req, unit, clientId);
  if (denied) {
    res.status(denied.status).json({ error: denied.error });
    return;
  }
  try {
    const last = await getLastFeedbackLeadSql(unit);
    res.json(last ? { submittedAt: last.submittedAt, weekStart: last.weekStart, weekEnd: last.weekEnd, responsible: last.responsible } : null);
  } catch (error) {
    console.error("[feedback-leads] Falha ao buscar último feedback:", error);
    res.status(503).json({ error: "Não foi possível carregar o último feedback" });
  }
});

// ─── GET /api/feedback-leads/export ─────────────────────────────────────────
feedbackRouter.get("/feedback-leads/export", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const feedbacks = await listAllFeedbackLeadsForExportSql();
    const rows = feedbacks.map((item) => ({
      ID: item.id,
      Unidade: item.unit,
      Responsável: item.responsible,
      "Semana início": item.weekStart,
      "Semana fim": item.weekEnd,
      "Leads recebidos": item.totalLeads,
      "Origem dos recebidos": item.totalLeadsSource === "dashboard" ? "Dashboard" : item.totalLeadsSource === "manual" ? "Manual" : "",
      "Sugestão da Dashboard": item.totalLeadsSuggested ?? "",
      "Leads contatados": item.leadsContacted,
      "Leads respondidos": item.leadsResponded,
      "Leads convertidos": item.leadsConverted,
      "Leads perdidos": item.leadsLost,
      "Leads em negociação": item.leadsInNegotiation,
      "Motivo de perda": item.lossReason,
      "Qualidade dos leads (1-5)": item.leadQuality,
      Observações: item.observations,
      "Satisfação com a agência (1-5)": item.agencySatisfaction,
      "Comunicação clara": item.communicationClarity,
      "Ajustes para próxima semana": item.agencyAdjustment,
      "Enviado por": item.submittedByEmail,
      "Enviado em": item.submittedAt,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Feedbacks semanais");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="feedbacks-semanais-completo.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error("[feedback-leads] Falha ao exportar feedbacks SQL:", error);
    res.status(503).json({ error: "Não foi possível exportar os feedbacks" });
  }
});

// ─── GET /api/feedback-leads ────────────────────────────────────────────────
feedbackRouter.get("/feedback-leads", requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = req.query as { unit?: string; weekStart?: string; weekEnd?: string };
    const feedbacks = await listFeedbackLeadsSql({
      unit: typeof query.unit === "string" && query.unit ? query.unit : undefined,
      weekStart: typeof query.weekStart === "string" && query.weekStart ? query.weekStart : undefined,
      weekEnd: typeof query.weekEnd === "string" && query.weekEnd ? query.weekEnd : undefined,
    });
    res.json(feedbacks);
  } catch (error) {
    console.error("[feedback-leads] Falha ao listar feedbacks SQL:", error);
    res.status(503).json({ error: "Não foi possível carregar os feedbacks" });
  }
});

// ─── POST /api/feedback-leads ───────────────────────────────────────────────
feedbackRouter.post("/feedback-leads", requireAuth, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const unit = typeof body.unit === "string" ? body.unit.trim() : "";
  const responsible = typeof body.responsible === "string" ? body.responsible.trim() : "";
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : "";
  const weekEnd = typeof body.weekEnd === "string" ? body.weekEnd : "";
  if (!unit || !responsible || !weekStart || !weekEnd) {
    res.status(400).json({ error: "Campos obrigatórios faltando" });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd) || weekStart > weekEnd) {
    res.status(400).json({ error: "Período semanal inválido" });
    return;
  }

  // Contatados e responderam saíram do formulário enxuto; seguem aceitos
  // (e gravados como 0 quando ausentes) para não quebrar envios antigos.
  const countKeys = ["totalLeads", "leadsConverted", "leadsLost", "leadsInNegotiation"] as const;
  const optionalCountKeys = ["leadsContacted", "leadsResponded"] as const;
  const counts = {} as Record<(typeof countKeys)[number] | (typeof optionalCountKeys)[number], number>;
  for (const key of [...countKeys, ...optionalCountKeys]) {
    const optional = (optionalCountKeys as readonly string[]).includes(key);
    const raw = body[key];
    const value = optional && (raw === undefined || raw === null || raw === "") ? 0 : Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      res.status(400).json({ error: "Os volumes de leads devem ser números inteiros não negativos" });
      return;
    }
    counts[key] = value;
  }
  if (counts.leadsConverted + counts.leadsLost + counts.leadsInNegotiation > counts.totalLeads) {
    res.status(400).json({ error: "Fecharam + perdidos + em negociação não podem passar dos leads recebidos" });
    return;
  }

  // Recebidos: veio da sugestão da Dashboard ou foi digitado? Opcional para não quebrar envios antigos.
  const totalLeadsSource = body.totalLeadsSource === undefined || body.totalLeadsSource === null || body.totalLeadsSource === "" ? null : body.totalLeadsSource;
  if (totalLeadsSource !== null && totalLeadsSource !== "dashboard" && totalLeadsSource !== "manual") {
    res.status(400).json({ error: "Origem dos leads recebidos inválida" });
    return;
  }
  const totalLeadsSuggested = body.totalLeadsSuggested === undefined || body.totalLeadsSuggested === null || body.totalLeadsSuggested === "" ? null : Number(body.totalLeadsSuggested);
  if (totalLeadsSuggested !== null && (!Number.isInteger(totalLeadsSuggested) || totalLeadsSuggested < 0)) {
    res.status(400).json({ error: "Sugestão de leads recebidos inválida" });
    return;
  }
  if (totalLeadsSource === "dashboard" && totalLeadsSuggested !== counts.totalLeads) {
    res.status(400).json({ error: "Leads recebidos diferem do valor sugerido pela Dashboard" });
    return;
  }

  const lossReason = typeof body.lossReason === "string" ? body.lossReason : "";
  const communicationClarity = typeof body.communicationClarity === "string" ? body.communicationClarity : "";
  const leadQuality = Number(body.leadQuality);
  // Satisfação pode ser pulada no formulário: ausente vira 0 ("não respondeu").
  const agencySatisfaction = body.agencySatisfaction === undefined || body.agencySatisfaction === null || body.agencySatisfaction === "" ? 0 : Number(body.agencySatisfaction);
  const lossReasonAllowed = ["Preço", "Não respondeu", "Não tinha interesse", "Fora do perfil", "Outro"].includes(lossReason);
  if (counts.leadsLost > 0 ? !lossReasonAllowed : lossReason !== "" && !lossReasonAllowed) {
    res.status(400).json({ error: "Motivo de perda inválido" });
    return;
  }
  if (!["", "Sim", "Parcialmente", "Não"].includes(communicationClarity)) {
    res.status(400).json({ error: "Resposta de comunicação inválida" });
    return;
  }
  if (![1, 2, 3, 4, 5].includes(leadQuality) || ![0, 1, 2, 3, 4, 5].includes(agencySatisfaction)) {
    res.status(400).json({ error: "As avaliações devem estar entre 1 e 5" });
    return;
  }

  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const denied = await unitAccessError(req, unit, clientId);
  if (denied) {
    res.status(denied.status).json({ error: denied.error });
    return;
  }

  const submittedAt = typeof body.submittedAt === "string" ? new Date(body.submittedAt) : new Date();
  if (Number.isNaN(submittedAt.getTime())) {
    res.status(400).json({ error: "Data de envio inválida" });
    return;
  }

  try {
    const feedback = await createFeedbackLeadSql({
      unit,
      responsible,
      weekStart,
      weekEnd,
      totalLeads: counts.totalLeads,
      totalLeadsSource,
      totalLeadsSuggested,
      leadsContacted: counts.leadsContacted,
      leadsResponded: counts.leadsResponded,
      leadsConverted: counts.leadsConverted,
      leadsLost: counts.leadsLost,
      leadsInNegotiation: counts.leadsInNegotiation,
      lossReason,
      leadQuality,
      observations: typeof body.observations === "string" ? body.observations.trim() : "",
      agencySatisfaction,
      communicationClarity,
      agencyAdjustment: typeof body.agencyAdjustment === "string" ? body.agencyAdjustment.trim() : "",
      submittedAt: submittedAt.toISOString(),
      submittedByUserId: req.claims ? String(req.claims.id) : null,
      submittedByEmail: req.claims?.email ?? "",
    });
    res.status(201).json(feedback);
  } catch (error) {
    console.error("[feedback-leads] Falha ao guardar feedback SQL:", error);
    res.status(503).json({ error: "Não foi possível registar o feedback" });
  }
});
