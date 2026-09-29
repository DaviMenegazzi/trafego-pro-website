import crypto from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth, requireVerifiedPixelSession } from "../auth.js";
import {
  CrmError,
  loadCrmBoard,
  loadCrmLead,
  loadCrmLeadHistory,
  loadCrmLeadPage,
  moveCrmLead,
  parseAutomationBody,
  parseLeadId,
  parseMoveBody,
  resumeCrmLeadAutomation,
} from "../pixelCrmService.js";
import { scheduleLeadClassification } from "../evolutionLiveClassification.js";
import { PixelRouteError, resolvePixelUnit } from "./evolutionRoutes.js";
import type { CrmErrorBody, CrmErrorCode } from "../../shared/crm.js";

// CRM Kanban do Pixel. A autorização é a do Pixel (sessão Supabase validada + pixel_access +
// unidade do catálogo autorizado); PIXEL_CRM_ENABLED=false desliga as rotas sem afetar o Pixel.
export const pixelCrmRouter = Router();

export function isPixelCrmEnabled(): boolean {
  return process.env.PIXEL_CRM_ENABLED !== "false";
}

function crmHeaders(req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = crypto.randomUUID();
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-Id", res.locals.requestId);
  if (!isPixelCrmEnabled()) {
    sendCrmError(res, new CrmError(404, "DISABLED", "O CRM não está habilitado."));
    return;
  }
  next();
}

const guard = [crmHeaders, requireAuth, requireVerifiedPixelSession];

const PIXEL_STATUS_CODES: Record<number, { status: number; code: CrmErrorCode }> = {
  400: { status: 422, code: "INVALID_REQUEST" },
  401: { status: 401, code: "UNAUTHENTICATED" },
  403: { status: 403, code: "FORBIDDEN" },
  404: { status: 404, code: "NOT_FOUND" },
};

function sendCrmError(res: Response, error: unknown) {
  const requestId = String(res.locals.requestId ?? crypto.randomUUID());
  let status = 503;
  let code: CrmErrorCode = "UNAVAILABLE";
  let message = "Não foi possível acessar o CRM agora. Tente novamente.";
  let lead: unknown;
  if (error instanceof CrmError) {
    ({ status, code, message } = error);
    lead = error.lead;
  } else if (error instanceof PixelRouteError) {
    const mapped = PIXEL_STATUS_CODES[error.status] ?? { status: 503, code: "UNAVAILABLE" as const };
    ({ status, code } = mapped);
    message = error.message;
  } else {
    console.error(`[pixel-crm] Falha (requestId=${requestId}):`, error instanceof Error ? error.message : error);
  }
  const body: CrmErrorBody & { lead?: unknown } = { error: { code, message, requestId } };
  if (lead) body.lead = lead;
  res.status(status).json(body);
}

function actorFor(req: Request) {
  return { id: req.claims!.id, name: req.claims!.name };
}

pixelCrmRouter.get("/evolution/pixel/crm/board", ...guard, async (req, res) => {
  try {
    const unit = await resolvePixelUnit(req, req.query.unitId);
    res.json(await loadCrmBoard(unit, req.query as Record<string, unknown>));
  } catch (error) {
    sendCrmError(res, error);
  }
});

pixelCrmRouter.get("/evolution/pixel/crm/leads", ...guard, async (req, res) => {
  try {
    const unit = await resolvePixelUnit(req, req.query.unitId);
    res.json(await loadCrmLeadPage(unit, req.query as Record<string, unknown>));
  } catch (error) {
    sendCrmError(res, error);
  }
});

pixelCrmRouter.get("/evolution/pixel/crm/leads/:id", ...guard, async (req, res) => {
  try {
    const leadId = parseLeadId(req.params.id);
    const unit = await resolvePixelUnit(req, req.query.unitId);
    res.json(await loadCrmLead(unit, leadId));
  } catch (error) {
    sendCrmError(res, error);
  }
});

pixelCrmRouter.get("/evolution/pixel/crm/leads/:id/history", ...guard, async (req, res) => {
  try {
    const leadId = parseLeadId(req.params.id);
    const unit = await resolvePixelUnit(req, req.query.unitId);
    res.json(await loadCrmLeadHistory(unit, leadId, req.query as Record<string, unknown>, { id: req.claims!.id }));
  } catch (error) {
    sendCrmError(res, error);
  }
});

pixelCrmRouter.patch("/evolution/pixel/crm/leads/:id/stage", ...guard, async (req, res) => {
  try {
    const leadId = parseLeadId(req.params.id);
    const input = parseMoveBody(req.body);
    const unit = await resolvePixelUnit(req, input.unitId);
    res.json(await moveCrmLead(unit, leadId, input, actorFor(req)));
  } catch (error) {
    sendCrmError(res, error);
  }
});

// Devolve a etapa à automação e pede uma classificação nova na próxima varredura da Laya.
pixelCrmRouter.patch("/evolution/pixel/crm/leads/:id/automation", ...guard, async (req, res) => {
  try {
    const leadId = parseLeadId(req.params.id);
    const input = parseAutomationBody(req.body);
    const unit = await resolvePixelUnit(req, input.unitId);
    const lead = await resumeCrmLeadAutomation(unit, leadId, input, actorFor(req));
    scheduleLeadClassification(lead.id);
    res.json(lead);
  } catch (error) {
    sendCrmError(res, error);
  }
});
