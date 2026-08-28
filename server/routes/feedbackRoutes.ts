import { Router } from "express";
import * as XLSX from "xlsx";
import { getSupabaseForRequest, hasUnitAccess, isAdmin, requireAdmin, requireAuth } from "../auth.js";
import {
  createFeedbackLeadSql,
  listAllFeedbackLeadsForExportSql,
  listFeedbackLeadsSql,
} from "../feedbackSql.js";

export const feedbackRouter = Router();

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

  const countKeys = [
    "totalLeads",
    "leadsContacted",
    "leadsResponded",
    "leadsConverted",
    "leadsLost",
    "leadsInNegotiation",
  ] as const;
  const counts = {} as Record<(typeof countKeys)[number], number>;
  for (const key of countKeys) {
    const value = Number(body[key]);
    if (!Number.isInteger(value) || value < 0) {
      res.status(400).json({ error: "Os volumes de leads devem ser números inteiros não negativos" });
      return;
    }
    counts[key] = value;
  }

  const lossReason = typeof body.lossReason === "string" ? body.lossReason : "";
  const communicationClarity = typeof body.communicationClarity === "string" ? body.communicationClarity : "";
  const leadQuality = Number(body.leadQuality);
  const agencySatisfaction = Number(body.agencySatisfaction);
  if (!["Preço", "Não respondeu", "Não tinha interesse", "Fora do perfil", "Outro"].includes(lossReason)) {
    res.status(400).json({ error: "Motivo de perda inválido" });
    return;
  }
  if (!["Sim", "Parcialmente", "Não"].includes(communicationClarity)) {
    res.status(400).json({ error: "Resposta de comunicação inválida" });
    return;
  }
  if (![1, 2, 3, 4, 5].includes(leadQuality) || ![1, 2, 3, 4, 5].includes(agencySatisfaction)) {
    res.status(400).json({ error: "As avaliações devem estar entre 1 e 5" });
    return;
  }

  if (!isAdmin(req.claims!)) {
    const sb = getSupabaseForRequest(req);
    if (!sb) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
    const { data: client, error } = await sb.from("clients").select("id").eq("name", unit).maybeSingle();
    if (error) {
      res.status(502).json({ error: "Não foi possível validar a unidade autorizada" });
      return;
    }
    if (!client || !hasUnitAccess(client.id, req.claims!)) {
      res.status(403).json({ error: "Sem acesso a essa unidade" });
      return;
    }
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
