import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { JWT_SECRET, hasUnitAccess, isAdmin, requireAuth, requireAdmin } from "../auth.js";
import {
  FORM_API_KEY_PREFIX,
  FORM_RATE_LIMIT_PER_MINUTE,
  formApiKeyPrefix,
  generateFormApiKey,
  hashFormApiKey,
  hashIp,
  isFormApiKeyActive,
  isFormApiKeyClientAllowed,
  isFormApiKeyOriginAllowed,
  validateFormApiKeyDraft,
  validateSubmissionPayload,
  type FormApiKeyRecord,
} from "../formSubmissionPolicy.js";
import {
  consumeFormRateLimitSql,
  createFormApiKeySql,
  createFormSubmissionSql,
  deleteFormSubmissionSql,
  findFormApiKeyByHashSql,
  getFormSubmissionSqlById,
  listFormApiKeysSql,
  listFormSubmissionsSql,
  revokeFormApiKeySql,
} from "../formSubmissionSql.js";

export const formRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// INGESTÃO — Endpoint público para receber submissões de formulários
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Middleware que valida a API Key de formulário (tpf_live_*)
 * Similar ao requireExternalAiToken de externalAiRoutes.ts
 */
function requireFormApiKey(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Chave de API ausente ou inválida" });
    return;
  }
  const rawKey = header.slice(7).trim();
  if (!rawKey.startsWith(FORM_API_KEY_PREFIX) || rawKey.length < 20) {
    res.status(401).json({ error: "Chave de API ausente ou inválida" });
    return;
  }

  // Buscar chave de forma assíncrona
  void (async () => {
    try {
      const keyRecord = await findFormApiKeyByHashSql(hashFormApiKey(rawKey));
      if (!keyRecord || !isFormApiKeyActive(keyRecord)) {
        res.status(401).json({ error: "Chave de API ausente, revogada ou expirada" });
        return;
      }

      // Verificar Origin
      const origin = req.headers.origin as string | undefined;
      if (!isFormApiKeyOriginAllowed(keyRecord, origin)) {
        res.status(403).json({ error: "Origem não autorizada para esta chave" });
        return;
      }

      // Rate limit
      const rate = await consumeFormRateLimitSql(keyRecord.id, FORM_RATE_LIMIT_PER_MINUTE);
      res.setHeader("X-RateLimit-Limit", String(FORM_RATE_LIMIT_PER_MINUTE));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, FORM_RATE_LIMIT_PER_MINUTE - rate.count)));
      if (!rate.allowed) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({ error: "Limite de envios excedido. Tente novamente em 1 minuto." });
        return;
      }

      // Anexar chave ao request para uso nas rotas
      (req as any)._formApiKey = keyRecord;
      next();
    } catch (error) {
      console.error("[forms] Falha ao validar chave de API:", error);
      res.status(503).json({ error: "Serviço temporariamente indisponível" });
    }
  })();
}

// ─── POST /api/forms/submit ─────────────────────────────────────────────────
// Endpoint público — autenticado por API Key (tpf_live_*)
formRouter.post("/forms/submit", requireFormApiKey, async (req: Request, res: Response) => {
  try {
    const keyRecord: FormApiKeyRecord = (req as any)._formApiKey;

    // Validar e sanitizar payload
    const validation = validateSubmissionPayload(req.body);
    if (!validation.ok) {
      res.status(validation.status ?? 400).json({ error: validation.error });
      return;
    }

    const { clientId, fields, metadata } = validation.value;

    // Verificar se a chave permite essa unidade
    if (!isFormApiKeyClientAllowed(keyRecord, clientId)) {
      res.status(403).json({ error: "Esta chave de API não tem permissão para esta unidade" });
      return;
    }

    // Hash do IP para auditoria
    const ip = req.ip || req.socket.remoteAddress || "";
    const ipHash = ip ? hashIp(ip, JWT_SECRET) : null;

    // Criar submissão
    const submission = await createFormSubmissionSql({
      formKeyId: keyRecord.id,
      formName: keyRecord.name,
      clientId,
      fields,
      metadata,
      ipHash,
    });

    // CORS — permitir a origin se ela está na lista
    const origin = req.headers.origin;
    if (origin && isFormApiKeyOriginAllowed(keyRecord, origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    res.status(201).json({
      id: submission.id,
      receivedAt: submission.submittedAt,
    });
  } catch (error) {
    console.error("[forms] Falha ao processar submissão:", error);
    res.status(503).json({ error: "Não foi possível registrar a submissão" });
  }
});

// ─── OPTIONS /api/forms/submit — CORS Preflight ────────────────────────────
formRouter.options("/forms/submit", (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — Endpoints protegidos por login (requireAuth)
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/forms/submissions ─────────────────────────────────────────────
// Lista submissões filtradas por unidade/data, respeitando hasUnitAccess
formRouter.get("/forms/submissions", requireAuth, async (req: Request, res: Response) => {
  try {
    const claims = req.claims!;
    const query = req.query as Record<string, string>;

    const clientId = query.clientId?.trim();
    const formKeyId = query.formKeyId?.trim();
    const from = query.from?.trim();
    const to = query.to?.trim();
    const limit = Math.min(Number(query.limit) || 100, 500);
    const offset = Math.max(Number(query.offset) || 0, 0);

    // Verificar acesso à unidade
    if (clientId && !hasUnitAccess(clientId, claims)) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }

    // Se não é admin e não especificou clientId, filtrar pelas unidades do usuário
    let clientIds: string[] | undefined;
    if (!clientId && !isAdmin(claims)) {
      clientIds = claims.allowedClientIds.filter((id) => id !== "*");
      if (clientIds.length === 0) {
        res.json({ submissions: [], total: 0 });
        return;
      }
    }

    const result = await listFormSubmissionsSql({
      clientId,
      clientIds,
      formKeyId,
      from,
      to,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    console.error("[forms] Falha ao listar submissões:", error);
    res.status(503).json({ error: "Não foi possível carregar as submissões" });
  }
});

// ─── GET /api/forms/submissions/export ──────────────────────────────────────
// Exporta submissões como CSV, respeitando acesso por unidade
formRouter.get("/forms/submissions/export", requireAuth, async (req: Request, res: Response) => {
  try {
    const claims = req.claims!;
    const query = req.query as Record<string, string>;
    const clientId = query.clientId?.trim();
    const from = query.from?.trim();
    const to = query.to?.trim();

    if (clientId && !hasUnitAccess(clientId, claims)) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }

    let clientIds: string[] | undefined;
    if (!clientId && !isAdmin(claims)) {
      clientIds = claims.allowedClientIds.filter((id) => id !== "*");
    }

    const result = await listFormSubmissionsSql({
      clientId,
      clientIds,
      from,
      to,
      limit: 5000,
      offset: 0,
    });

    // Construir CSV
    if (result.submissions.length === 0) {
      res.status(200).json({ submissions: [], total: 0, message: "Sem submissões para exportar" });
      return;
    }

    // Coletar todas as chaves de fields dinamicamente
    const allFieldKeys = new Set<string>();
    for (const sub of result.submissions) {
      for (const key of Object.keys(sub.fields)) {
        allFieldKeys.add(key);
      }
    }
    const fieldKeysArray = Array.from(allFieldKeys);

    // Cabeçalhos
    const headers = ["ID", "Formulário", "Unidade (clientId)", "Data", ...fieldKeysArray, "utm_source", "utm_medium", "utm_campaign", "source_url"];
    const escCsv = (val: unknown) => {
      const str = val == null ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = result.submissions.map((sub) => {
      const meta = sub.metadata ?? {};
      return [
        sub.id,
        sub.formName,
        sub.clientId,
        sub.submittedAt,
        ...fieldKeysArray.map((k) => sub.fields[k] ?? ""),
        meta.utm_source ?? "",
        meta.utm_medium ?? "",
        meta.utm_campaign ?? "",
        meta.source_url ?? "",
      ].map(escCsv).join(",");
    });

    const csv = [headers.map(escCsv).join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="formularios-submissoes.csv"');
    res.send("\uFEFF" + csv); // BOM para Excel
  } catch (error) {
    console.error("[forms] Falha ao exportar submissões:", error);
    res.status(503).json({ error: "Não foi possível exportar as submissões" });
  }
});

// ─── GET /api/forms/submissions/:id ─────────────────────────────────────────
formRouter.get("/forms/submissions/:id", requireAuth, async (req: Request, res: Response) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const submission = await getFormSubmissionSqlById(req.params.id);
    if (!submission) {
      res.status(404).json({ error: "Submissão não encontrada" });
      return;
    }
    if (!hasUnitAccess(submission.clientId, req.claims!)) {
      res.status(403).json({ error: "Sem acesso a esta unidade" });
      return;
    }
    res.json(submission);
  } catch (error) {
    console.error("[forms] Falha ao buscar submissão:", error);
    res.status(503).json({ error: "Não foi possível carregar a submissão" });
  }
});

// ─── DELETE /api/forms/submissions/:id ──────────────────────────────────────
formRouter.delete("/forms/submissions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const deleted = await deleteFormSubmissionSql(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Submissão não encontrada" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[forms] Falha ao deletar submissão:", error);
    res.status(503).json({ error: "Não foi possível deletar a submissão" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GERENCIAMENTO DE CHAVES — Admin only
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /api/forms/keys ───────────────────────────────────────────────────
formRouter.post("/forms/keys", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const validated = validateFormApiKeyDraft(req.body as Record<string, unknown>);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }
  try {
    const rawKey = generateFormApiKey();
    const key = await createFormApiKeySql({
      name: validated.value.name,
      keyPrefix: formApiKeyPrefix(rawKey),
      keyHash: hashFormApiKey(rawKey),
      clientIds: validated.value.clientIds,
      allowedOrigins: validated.value.allowedOrigins,
      createdBy: req.claims!.email,
      expiresAt: validated.value.expiresAt,
    });

    const { keyHash: _h, ...metadata } = key;
    res.status(201).json({
      key: rawKey, // Retornada uma única vez!
      metadata,
    });
  } catch (error) {
    console.error("[forms] Falha ao criar chave:", error);
    res.status(503).json({ error: "Não foi possível criar a chave" });
  }
});

// ─── GET /api/forms/keys ────────────────────────────────────────────────────
formRouter.get("/forms/keys", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const keys = await listFormApiKeysSql();
    res.json({
      keys: keys.map(({ keyHash: _h, ...k }) => k),
    });
  } catch (error) {
    console.error("[forms] Falha ao listar chaves:", error);
    res.status(503).json({ error: "Não foi possível carregar as chaves" });
  }
});

// ─── DELETE /api/forms/keys/:id ─────────────────────────────────────────────
formRouter.delete("/forms/keys/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const revoked = await revokeFormApiKeySql(req.params.id);
    if (!revoked) {
      res.status(404).json({ error: "Chave não encontrada ou já revogada" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[forms] Falha ao revogar chave:", error);
    res.status(503).json({ error: "Não foi possível revogar a chave" });
  }
});
