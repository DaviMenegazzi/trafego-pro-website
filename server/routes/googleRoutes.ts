import { Router, type Request, type Response } from "express";
import { isAdminRole, requireAdmin, requireAuth } from "../auth.js";
import {
  canAccessUnit,
  getGa4Report,
  getGa4ServiceAccountEmail,
  Ga4Error,
  isGa4Configured,
  normalizeUnitId,
  parseLandingPageInput,
  validateGa4Range,
  verifyGa4PropertyAccess,
} from "../ga4Service.js";
import { createLandingPage, deleteLandingPage, findLandingPage, listLandingPagesForUnit } from "../ga4LandingPageStore.js";
import type { Ga4LandingPagesResponse } from "../../shared/google.js";
import { checkUserHasMetaAccountAccess } from "./metricsRoutes.js";

// GA4 das Landing Pages e campanhas do Google Ads (via vínculo Ads ↔ GA4). Cada Landing Page é
// vinculada por um administrador à unidade (conta da Meta); a tela consulta pela unidade selecionada.
export const googleRouter = Router();

googleRouter.use("/google", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function sendError(res: Response, error: unknown) {
  if (error instanceof Ga4Error) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error("[ga4] Falha inesperada:", error);
  res.status(500).json({ error: "Não foi possível carregar os dados do Google." });
}

/** Acesso pela conta (act_…) nas claims; se o acesso foi gravado com o ID do cadastro, usa a mesma regra das métricas. */
async function requireUnit(req: Request): Promise<string> {
  const unitId = typeof req.query.unitId === "string" ? normalizeUnitId(req.query.unitId) : "";
  if (!unitId) throw new Ga4Error(400, "Selecione uma unidade.");
  if (!canAccessUnit(unitId, req.claims) && !(await checkUserHasMetaAccountAccess(req, unitId))) {
    throw new Ga4Error(403, "Sem acesso a essa unidade.");
  }
  return unitId;
}

// ─── GET /api/google/landing-pages?unitId= ──────────────────────────────────
// Lista vazia = unidade sem Landing Page vinculada (a tela mostra o contato do suporte).
googleRouter.get("/google/landing-pages", requireAuth, async (req, res) => {
  try {
    const unitId = await requireUnit(req);
    const canManage = isAdminRole(req.claims!.role);
    const body: Ga4LandingPagesResponse = {
      unitId,
      landingPages: await listLandingPagesForUnit(unitId),
      canManage,
      configured: isGa4Configured(),
      serviceAccountEmail: canManage ? getGa4ServiceAccountEmail() : null,
    };
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

// ─── POST /api/google/landing-pages (admin) ─────────────────────────────────
googleRouter.post("/google/landing-pages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const input = parseLandingPageInput(req.body);
    const verified = await verifyGa4PropertyAccess(input.propertyId).catch((error: unknown) => {
      if (error instanceof Ga4Error && error.status === 403) {
        throw new Ga4Error(422, "A conta de serviço do Google não tem acesso a esta propriedade. Confira o ID e adicione o e-mail da conta como Leitor no GA4.");
      }
      throw error;
    });
    const landingPage = await createLandingPage(input, req.claims!.email);
    res.status(201).json({ landingPage, verified });
  } catch (error) {
    sendError(res, error);
  }
});

// ─── DELETE /api/google/landing-pages/:id (admin) ───────────────────────────
googleRouter.delete("/google/landing-pages/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const landingPage = await findLandingPage(req.params.id);
    if (!landingPage) throw new Ga4Error(404, "Landing Page não encontrada.");
    await deleteLandingPage(landingPage.id);
    res.json({ landingPage });
  } catch (error) {
    sendError(res, error);
  }
});

// ─── GET /api/google/report?unitId=&landingPageId=&start=&end= ──────────────
googleRouter.get("/google/report", requireAuth, async (req, res) => {
  try {
    const unitId = await requireUnit(req);
    if (!isGa4Configured()) throw new Ga4Error(503, "A conexão com o Google Analytics ainda não foi ativada.");
    const landingPageId = typeof req.query.landingPageId === "string" ? req.query.landingPageId : "";
    const landingPage = await findLandingPage(landingPageId);
    if (!landingPage || landingPage.unitId !== unitId) {
      throw new Ga4Error(404, "Esta Landing Page não está vinculada a essa unidade.");
    }

    const { start, end } = validateGa4Range(req.query.start, req.query.end);
    const report = await getGa4Report(landingPage, start, end, { fresh: req.query.fresh === "1" });
    res.json(report);
  } catch (error) {
    sendError(res, error);
  }
});
