import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import {
  getSupabaseForRequest,
  JWT_SECRET,
  listDashboardClientsFromSupabase,
  requireAuth,
  requireSupabaseAdmin,
} from "../auth.js";
import { getMetaDirectClients, isMetaDirectEnabled } from "../metaDirectService.js";
import {
  getExternalAiAdsMetrics,
  getExternalAiCreatives,
  getExternalAiCrmSummary,
  getExternalAiLeadSummary,
  getExternalAiMetrics,
  getExternalAiUnit,
  listExternalAiUnits,
} from "../externalAiApiData.js";
import {
  createExternalAiApiToken,
  EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE,
  externalAiApiTokenPrefix,
  hasExternalAiApiScope,
  hashExternalAiApiToken,
  isExternalAiApiTokenActive,
  isExternalAiApiUnitAllowed,
  resolveExternalAiApiDateRange,
  validateExternalAiApiTokenDraft,
  type ExternalAiApiScope,
} from "../externalAiApiPolicy.js";
import {
  consumeExternalAiApiRateLimitSql,
  createExternalAiApiTokenSql,
  findExternalAiApiTokenByHashSql,
  listExternalAiApiTokensSql,
  recordExternalAiApiAuditSql,
  revokeExternalAiApiTokenSql,
} from "../externalAiApiSql.js";

export const externalAiRouter = Router();

function externalAiIpHash(req: Request): string | null {
  const ip = req.ip || req.socket.remoteAddress;
  return ip ? crypto.createHmac("sha256", JWT_SECRET).update(ip).digest("hex") : null;
}

function auditExternalAiRequest(req: Request, res: Response, tokenId: string): void {
  res.once("finish", () => {
    void recordExternalAiApiAuditSql({
      tokenId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      outcome: req.externalAiOutcome ?? (res.statusCode < 400 ? "success" : "error"),
      ipHash: externalAiIpHash(req),
    }).catch((error) => console.error("[external-ai] Falha de auditoria:", error));
  });
}

function requireExternalAiToken(scope?: ExternalAiApiScope) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token de API ausente ou inválido" });
      return;
    }
    const rawToken = header.slice(7).trim();
    if (!rawToken.startsWith("tpai_live_") || rawToken.length < 40) {
      res.status(401).json({ error: "Token de API ausente ou inválido" });
      return;
    }
    try {
      const token = await findExternalAiApiTokenByHashSql(hashExternalAiApiToken(rawToken));
      if (!token || !isExternalAiApiTokenActive(token)) {
        res.status(401).json({ error: "Token de API ausente ou inválido" });
        return;
      }
      if (scope && !hasExternalAiApiScope(token.scopes, scope)) {
        req.externalAiOutcome = "scope_denied";
        auditExternalAiRequest(req, res, token.id);
        res.status(403).json({ error: "O token não possui o escopo necessário" });
        return;
      }
      const rate = await consumeExternalAiApiRateLimitSql(token.id, EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE);
      res.setHeader("X-RateLimit-Limit", String(EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE));
      res.setHeader(
        "X-RateLimit-Remaining",
        String(Math.max(0, EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE - rate.count)),
      );
      if (!rate.allowed) {
        req.externalAiOutcome = "rate_limited";
        auditExternalAiRequest(req, res, token.id);
        res.setHeader("Retry-After", "60");
        res.status(429).json({ error: "Limite de chamadas excedido" });
        return;
      }
      req.externalAiToken = token;
      auditExternalAiRequest(req, res, token.id);
      next();
    } catch (error) {
      console.error("[external-ai] Falha de autenticação:", error);
      res.status(503).json({ error: "A API externa está temporariamente indisponível" });
    }
  };
}

function externalAiUnitId(req: Request, res: Response): string | null {
  const unitId = typeof req.query.unit_id === "string" ? req.query.unit_id.trim() : "";
  if (!/^[0-9a-f-]{36}$|^act_[0-9]+$|^[a-z0-9_-]{3,64}$/i.test(unitId)) {
    res.status(400).json({ error: "Informe um unit_id válido" });
    return null;
  }
  if (!req.externalAiToken || !isExternalAiApiUnitAllowed(req.externalAiToken.unitIds, unitId)) {
    req.externalAiOutcome = "unit_denied";
    res.status(403).json({ error: "O token não possui acesso a esta unidade" });
    return null;
  }
  return unitId;
}

// ─── GET /api/external-ai/tokens ────────────────────────────────────────────
externalAiRouter.get("/external-ai/tokens", requireAuth, requireSupabaseAdmin, async (req, res) => {
  try {
    let units: Array<{ id: string; name: string; client_group?: string | null }> = [];
    if (isMetaDirectEnabled()) {
      const allMetaClients = await getMetaDirectClients();
      units = allMetaClients.map((c) => ({ id: c.id, name: c.name, client_group: c.client_group }));
    } else {
      const sb = getSupabaseForRequest(req);
      if (!sb) {
        res.status(401).json({ error: "Sessão Supabase expirada" });
        return;
      }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) {
        res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
        return;
      }
      units = catalog.clients;
    }
    const tokens = await listExternalAiApiTokensSql(req.claims!.id);
    res.json({
      scopes: ["metrics:read", "leads:summary:read", "crm:summary:read"],
      rateLimitPerMinute: EXTERNAL_AI_API_RATE_LIMIT_PER_MINUTE,
      units,
      tokens: tokens.map(({ tokenHash: _hash, ...token }) => token),
    });
  } catch (error) {
    console.error("[external-ai] Falha ao listar tokens:", error);
    res.status(503).json({ error: "Não foi possível carregar os tokens externos" });
  }
});

// ─── POST /api/external-ai/tokens ───────────────────────────────────────────
externalAiRouter.post("/external-ai/tokens", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const validated = validateExternalAiApiTokenDraft(req.body as Record<string, unknown>);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }
  try {
    let permitted: Set<string>;
    if (isMetaDirectEnabled()) {
      const allMeta = await getMetaDirectClients();
      permitted = new Set(allMeta.map((c) => c.id));
    } else {
      const sb = getSupabaseForRequest(req);
      if (!sb) {
        res.status(401).json({ error: "Sessão Supabase expirada" });
        return;
      }
      const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
      if (catalog.error) {
        res.status(502).json({ error: "Não foi possível carregar as unidades autorizadas" });
        return;
      }
      permitted = new Set(catalog.clients.map((unit) => unit.id));
    }
    if (!validated.value.unitIds.every((unitId) => permitted.has(unitId))) {
      res.status(403).json({ error: "O token só pode incluir unidades autorizadas" });
      return;
    }
    const rawToken = createExternalAiApiToken();
    const token = await createExternalAiApiTokenSql({
      ownerUserId: req.claims!.id,
      name: validated.value.name,
      tokenPrefix: externalAiApiTokenPrefix(rawToken),
      tokenHash: hashExternalAiApiToken(rawToken),
      scopes: validated.value.scopes,
      unitIds: validated.value.unitIds,
      expiresAt: validated.value.expiresAt,
    });
    const { tokenHash: _hash, ...metadata } = token;
    res.status(201).json({ token: rawToken, metadata });
  } catch (error) {
    console.error("[external-ai] Falha ao criar token:", error);
    res.status(503).json({ error: "Não foi possível criar o token externo" });
  }
});

// ─── DELETE /api/external-ai/tokens/:id ─────────────────────────────────────
externalAiRouter.delete("/external-ai/tokens/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }
  try {
    if (!(await revokeExternalAiApiTokenSql(req.params.id, req.claims!.id))) {
      res.status(404).json({ error: "Token não encontrado ou já revogado" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[external-ai] Falha ao revogar token:", error);
    res.status(503).json({ error: "Não foi possível revogar o token" });
  }
});

// ─── GET /api/external/v1/units ─────────────────────────────────────────────
externalAiRouter.get("/external/v1/units", requireExternalAiToken(), async (req, res) => {
  try {
    res.json({
      apiVersion: "v1",
      generatedAt: new Date().toISOString(),
      dataClassification: "aggregated",
      units: await listExternalAiUnits(req.externalAiToken!.unitIds),
    });
  } catch (error) {
    console.error("[external-ai] Falha ao listar unidades:", error);
    req.externalAiOutcome = "upstream_error";
    res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
  }
});

// ─── GET /api/external/v1/metrics ───────────────────────────────────────────
externalAiRouter.get("/external/v1/metrics", requireExternalAiToken("metrics:read"), async (req, res) => {
  const unitId = externalAiUnitId(req, res);
  if (!unitId) return;
  const period = resolveExternalAiApiDateRange(req.query.start, req.query.end);
  if (!period.ok) {
    res.status(400).json({ error: period.error });
    return;
  }
  try {
    const [unit, metrics] = await Promise.all([
      getExternalAiUnit(unitId),
      getExternalAiMetrics(unitId, period.start, period.end),
    ]);
    res.json({
      apiVersion: "v1",
      generatedAt: new Date().toISOString(),
      dataClassification: "aggregated",
      unit,
      metrics,
    });
  } catch (error) {
    console.error("[external-ai] Falha em métricas:", error);
    req.externalAiOutcome = "upstream_error";
    res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
  }
});

// ─── GET /api/external/v1/leads/summary ─────────────────────────────────────
externalAiRouter.get(
  "/external/v1/leads/summary",
  requireExternalAiToken("leads:summary:read"),
  async (req, res) => {
    const unitId = externalAiUnitId(req, res);
    if (!unitId) return;
    try {
      const unit = await getExternalAiUnit(unitId);
      res.json({
        apiVersion: "v1",
        generatedAt: new Date().toISOString(),
        dataClassification: "aggregated",
        unit,
        leads: await getExternalAiLeadSummary(unit.name),
      });
    } catch (error) {
      console.error("[external-ai] Falha em resumo de leads:", error);
      req.externalAiOutcome = "upstream_error";
      res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
    }
  },
);

// ─── GET /api/external/v1/crm/summary ───────────────────────────────────────
externalAiRouter.get("/external/v1/crm/summary", requireExternalAiToken("crm:summary:read"), async (req, res) => {
  const unitId = externalAiUnitId(req, res);
  if (!unitId) return;
  try {
    const unit = await getExternalAiUnit(unitId);
    res.json({
      apiVersion: "v1",
      generatedAt: new Date().toISOString(),
      dataClassification: "aggregated",
      unit,
      crm: await getExternalAiCrmSummary(unit.name),
    });
  } catch (error) {
    console.error("[external-ai] Falha em resumo CRM:", error);
    req.externalAiOutcome = "upstream_error";
    res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
  }
});

// ─── GET /api/external/v1/ads/metrics ───────────────────────────────────────
externalAiRouter.get("/external/v1/ads/metrics", requireExternalAiToken("ads:metrics:read"), async (req, res) => {
  const unitId = externalAiUnitId(req, res);
  if (!unitId) return;
  const period = resolveExternalAiApiDateRange(req.query.start_date, req.query.end_date);
  if (!period.ok) {
    res.status(400).json({ error: period.error });
    return;
  }
  try {
    res.json({
      apiVersion: "v1",
      generatedAt: new Date().toISOString(),
      ...(await getExternalAiAdsMetrics(unitId, period.start, period.end)),
    });
  } catch {
    req.externalAiOutcome = "upstream_error";
    res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
  }
});

// ─── GET /api/external/v1/creatives ─────────────────────────────────────────
externalAiRouter.get("/external/v1/creatives", requireExternalAiToken("creatives:read"), async (req, res) => {
  const unitId = typeof req.query.unit_id === "string" ? req.query.unit_id : undefined;
  if (unitId && !externalAiUnitId(req, res)) return;
  try {
    res.json({
      apiVersion: "v1",
      generatedAt: new Date().toISOString(),
      ...(await getExternalAiCreatives(unitId)),
    });
  } catch {
    req.externalAiOutcome = "upstream_error";
    res.status(503).json({ error: "Os dados estão temporariamente indisponíveis" });
  }
});

// ─── GET /api/external/v1/targets ───────────────────────────────────────────
externalAiRouter.get("/external/v1/targets", requireExternalAiToken("targets:read"), async (_req, res) => {
  res.json({
    apiVersion: "v1",
    generatedAt: new Date().toISOString(),
    targets: [],
    sourceStatus: "pending_provider_integration",
  });
});

// ─── GET /api/external/v1/leads ─────────────────────────────────────────────
externalAiRouter.get("/external/v1/leads", requireExternalAiToken("leads:read"), async (req, res) => {
  const unitId = externalAiUnitId(req, res);
  if (!unitId) return;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  res.json({
    apiVersion: "v1",
    generatedAt: new Date().toISOString(),
    dataClassification: "pseudonymous",
    pagination: { page, limit, total: 0 },
    leads: [],
    sourceStatus: "pending_provider_integration",
    unit_id: unitId,
  });
});
