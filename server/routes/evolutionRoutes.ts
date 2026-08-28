import { Router } from "express";
import {
  getSupabaseForRequest,
  listDashboardClientsFromSupabase,
  requireAuth,
  requireSupabaseAdmin,
} from "../auth.js";
import { authenticateScheduledTask } from "../manusScheduleAuth.js";
import { normalizeEvolutionWebhook, webhookSecretMatches } from "../evolutionWebhook.js";
import {
  findEvolutionLeadIdSupabase,
  getEvolutionAiAutomationSettingsSupabase,
  getEvolutionSummarySupabase,
  listEvolutionCrmStageHistorySupabase,
  listEvolutionEventsSupabase,
  listEvolutionInstancesSupabase,
  listEvolutionLeadsSupabase,
  listEvolutionMessagesSupabase,
  listEvolutionMetaAttributionsSupabase,
  moveEvolutionLeadCrmStageSupabase,
  recordEvolutionEventSupabase,
  updateEvolutionAiAutomationStatusSupabase,
  updateEvolutionContactNameSupabase,
  updateEvolutionInstanceProfileSupabase,
  updateEvolutionLeadSupabase,
  upsertEvolutionMetaAttributionSupabase,
} from "../evolutionSupabaseStore.js";
import { runDailyEvolutionAiAutomation } from "../evolutionAiAutomation.js";
import {
  resolveEvolutionMetaAttribution,
  type MetaOfferRow,
} from "../evolutionMetaAttribution.js";
import { resolveAuthorizedEvolutionUnit } from "../evolutionUnitAssignment.js";
import { isEvolutionAiAutomationRunning } from "../../shared/evolutionAiPolicy.js";
import { getAuthedSupabase } from "../supabase.js";

export const evolutionRouter = Router();

async function persistEvolutionMetaAttribution(
  event: NonNullable<ReturnType<typeof normalizeEvolutionWebhook>>,
  eventId: string,
): Promise<void> {
  if (!event.contactKey || event.origin.platform !== "meta") return;
  const leadId = await findEvolutionLeadIdSupabase(event.instanceName, event.contactKey);
  if (!leadId) return;

  const sourceId = event.origin.metaSourceId;
  let offers: MetaOfferRow[] = [];
  const meta = await getAuthedSupabase();
  if (meta && sourceId) {
    let query = meta
      .from("vw_meta_ads_offer_ads")
      .select(
        "client_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_id, creative_name",
      )
      .limit(50);
    const sourceType = event.origin.metaSourceType?.toLowerCase();
    if (sourceType === "campaign") query = query.eq("campaign_id", sourceId);
    else if (sourceType === "adset") query = query.eq("adset_id", sourceId);
    else if (sourceType === "creative") query = query.eq("creative_id", sourceId);
    else query = query.eq("ad_id", sourceId);
    const { data, error } = await query;
    if (error) console.warn("[evolution] Não foi possível consultar a referência Meta:", error.message);
    else offers = (data ?? []) as MetaOfferRow[];
  }

  const attribution = resolveEvolutionMetaAttribution(event, leadId, eventId, offers);
  if (attribution) await upsertEvolutionMetaAttributionSupabase(attribution);
}

// ─── POST /api/evolution/webhook ────────────────────────────────────────────
evolutionRouter.post("/evolution/webhook", async (req, res) => {
  const authorization = req.headers.authorization;
  const receivedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!webhookSecretMatches(receivedSecret, process.env.EVOLUTION_WEBHOOK_SECRET)) {
    res.status(401).json({ error: "Webhook Evolution não autorizado" });
    return;
  }

  const event = normalizeEvolutionWebhook(req.body);
  if (!event) {
    res.status(400).json({ error: "Evento Evolution inválido" });
    return;
  }

  try {
    const result = await recordEvolutionEventSupabase(event);
    if (!result.duplicate) {
      if (event.contactUpdate) {
        try {
          await updateEvolutionContactNameSupabase(
            event.instanceName,
            event.contactUpdate.contactKey,
            event.contactUpdate.contactName,
          );
        } catch (contactError) {
          console.warn("[evolution] Falha ao atualizar nome do contato:", contactError);
        }
      }
      try {
        await persistEvolutionMetaAttribution(event, result.eventId);
      } catch (attributionError) {
        console.warn("[evolution] Falha na atribuição Meta:", attributionError);
      }
    }
    res.status(202).json({ accepted: true, duplicate: result.duplicate });
  } catch (error) {
    console.error("[evolution] Falha ao processar webhook:", error);
    res.status(503).json({ error: "Não foi possível processar o evento Evolution" });
  }
});

// ─── POST /api/scheduled/evolution-ai-daily ─────────────────────────────────
evolutionRouter.post("/scheduled/evolution-ai-daily", async (req, res) => {
  let taskUid: string | undefined;
  try {
    taskUid = await authenticateScheduledTask(req);
    const settings = await getEvolutionAiAutomationSettingsSupabase();
    if (settings.scheduleCronTaskUid && settings.scheduleCronTaskUid !== taskUid) {
      res.status(403).json({ error: "Tarefa agendada não autorizada" });
      return;
    }
    if (!settings.scheduleCronTaskUid) {
      await updateEvolutionAiAutomationStatusSupabase({ scheduleCronTaskUid: taskUid, status: "scheduled" });
    }
    const summary = await runDailyEvolutionAiAutomation();
    res.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[evolution-ai] Falha na rotina diária:", message);
    const status = message.includes("autorizado") || message.includes("task_uid") ? 403 : 500;
    res.status(status).json({
      error: message,
      context: { path: req.path, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── GET /api/evolution/overview ────────────────────────────────────────────
evolutionRouter.get("/evolution/overview", requireAuth, requireSupabaseAdmin, async (_req, res) => {
  try {
    const [summary, instances, events, leads, automation] = await Promise.all([
      getEvolutionSummarySupabase(),
      listEvolutionInstancesSupabase(),
      listEvolutionEventsSupabase(),
      listEvolutionLeadsSupabase(),
      getEvolutionAiAutomationSettingsSupabase(),
    ]);
    res.json({ summary, instances, events, leads, automation });
  } catch (error) {
    console.error("[evolution] Falha ao carregar painel:", error);
    res.status(503).json({ error: "Não foi possível carregar o painel Evolution" });
  }
});

// ─── GET /api/evolution/attributions ────────────────────────────────────────
evolutionRouter.get("/evolution/attributions", requireAuth, requireSupabaseAdmin, async (_req, res) => {
  try {
    res.json({ rows: await listEvolutionMetaAttributionsSupabase() });
  } catch (error) {
    console.error("[evolution] Falha ao carregar atribuições Meta:", error);
    res.status(503).json({ error: "Não foi possível carregar atribuições Meta" });
  }
});

// ─── GET /api/evolution/leads/:id/messages ──────────────────────────────────
evolutionRouter.get("/evolution/leads/:id/messages", requireAuth, requireSupabaseAdmin, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "Lead inválido" });
    return;
  }
  try {
    res.json({ rows: await listEvolutionMessagesSupabase(req.params.id) });
  } catch (error) {
    console.error("[evolution] Falha ao carregar conversas:", error);
    res.status(503).json({ error: "Não foi possível carregar conversas" });
  }
});

// ─── GET /api/evolution/leads/:id/crm-history ───────────────────────────────
evolutionRouter.get("/evolution/leads/:id/crm-history", requireAuth, requireSupabaseAdmin, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    res.status(400).json({ error: "Lead inválido" });
    return;
  }
  try {
    res.json({ rows: await listEvolutionCrmStageHistorySupabase(req.params.id) });
  } catch (error) {
    console.error("[evolution] Falha ao carregar histórico CRM:", error);
    res.status(503).json({ error: "Não foi possível carregar histórico CRM" });
  }
});

// ─── PUT /api/evolution/leads/:id/crm-stage ─────────────────────────────────
evolutionRouter.put("/evolution/leads/:id/crm-stage", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const id = req.params.id;
  const body = req.body as { instanceName?: string; stage?: string; note?: string };
  const stages = [
    "lead_not_responded",
    "lead_responded",
    "follow_up",
    "lead_replied",
    "negotiation",
    "closed_won",
    "closed_lost",
  ];
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    typeof body.instanceName !== "string" ||
    !/^[a-zA-Z0-9_-]{1,120}$/.test(body.instanceName) ||
    !stages.includes(body.stage ?? "")
  ) {
    res.status(400).json({ error: "Movimentação CRM inválida" });
    return;
  }
  try {
    if (isEvolutionAiAutomationRunning(await getEvolutionAiAutomationSettingsSupabase())) {
      res.status(409).json({
        error:
          "A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para mover contatos manualmente.",
      });
      return;
    }
    const moved = await moveEvolutionLeadCrmStageSupabase({
      leadId: id,
      instanceName: body.instanceName,
      toStage: body.stage as
        | "lead_not_responded"
        | "lead_responded"
        | "follow_up"
        | "lead_replied"
        | "negotiation"
        | "closed_won"
        | "closed_lost",
      changedBy: req.claims!.email,
      note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined,
    });
    res.json(moved);
  } catch (error) {
    console.error("[evolution] Falha ao mover CRM:", error);
    res.status(503).json({ error: "Não foi possível mover o lead no CRM" });
  }
});

// ─── PUT /api/evolution/instances/:instanceName ─────────────────────────────
evolutionRouter.put("/evolution/instances/:instanceName", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const instanceName = req.params.instanceName;
  const body = req.body as { displayName?: string; unitId?: string };
  const displayName = body.displayName;
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) {
    res.status(400).json({ error: "Instância inválida" });
    return;
  }
  if (typeof displayName !== "string") {
    res.status(400).json({ error: "Identificação da instância inválida" });
    return;
  }
  try {
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
    const unit = resolveAuthorizedEvolutionUnit(body.unitId, catalog.clients);
    if (!unit) {
      res.status(403).json({ error: "A instância só pode ser associada a uma unidade autorizada no Supabase" });
      return;
    }
    const instance = await updateEvolutionInstanceProfileSupabase(instanceName, {
      displayName,
      unitName: unit.name,
    });
    if (!instance) {
      res.status(404).json({ error: "Instância não encontrada" });
      return;
    }
    res.json(instance);
  } catch (error) {
    console.error("[evolution] Falha ao atualizar instância:", error);
    res.status(503).json({ error: "Não foi possível atualizar a instância" });
  }
});

// ─── PUT /api/evolution/leads/:id ───────────────────────────────────────────
evolutionRouter.put("/evolution/leads/:id", requireAuth, requireSupabaseAdmin, async (req, res) => {
  const id = req.params.id;
  const body = req.body as { classification?: string; funnelStage?: string; note?: string };
  const classifications = ["pendente", "lead", "nao_lead"];
  const stages = ["novo", "qualificado", "negociacao", "perdido", "fechado"];
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !classifications.includes(body.classification ?? "") ||
    !stages.includes(body.funnelStage ?? "")
  ) {
    res.status(400).json({ error: "Classificação ou etapa inválida" });
    return;
  }
  try {
    if (isEvolutionAiAutomationRunning(await getEvolutionAiAutomationSettingsSupabase())) {
      res.status(409).json({
        error:
          "A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para alterar classificações manualmente.",
      });
      return;
    }
    const lead = await updateEvolutionLeadSupabase(id, {
      classification: body.classification as "pendente" | "lead" | "nao_lead",
      funnelStage: body.funnelStage as "novo" | "qualificado" | "negociacao" | "perdido" | "fechado",
      note,
      classifiedByEmail: req.claims!.email,
    });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    res.json(lead);
  } catch (error) {
    console.error("[evolution] Falha ao atualizar lead:", error);
    res.status(503).json({ error: "Não foi possível atualizar o lead" });
  }
});
