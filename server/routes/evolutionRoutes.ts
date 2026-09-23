import { Router, type Request, type Response } from "express";
import {
  getSupabaseForRequest,
  listDashboardClientsFromSupabase,
  requireAuth,
  requirePixelAccess,
  requireSupabaseAdmin,
} from "../auth.js";
import { authenticateScheduledTask } from "../manusScheduleAuth.js";
import { normalizeEvolutionWebhook, webhookSecretMatches } from "../evolutionWebhook.js";
import {
  cleanupExpiredQuarantineLeadsSupabase,
  deleteEvolutionInstanceProfileSupabase,
  type EvolutionLeadClassification,
  findEvolutionLeadIdSupabase,
  getEvolutionAiAutomationSettingsSupabase,
  getEvolutionSummarySupabase,
  listEvolutionCrmStageHistorySupabase,
  listEvolutionEventsSupabase,
  listEvolutionInstancesByUnitSupabase,
  listEvolutionInstancesSupabase,
  listEvolutionLeadsByInstancesSupabase,
  listEvolutionLeadsSupabase,
  getEvolutionMetaAttributionForLeadSupabase,
  listEvolutionMessagesPageSupabase,
  listEvolutionMetaAttributionsForLeadsSupabase,
  listEvolutionMessagesSupabase,
  listEvolutionMetaAttributionsSupabase,
  moveEvolutionLeadCrmStageSupabase,
  recordEvolutionEventSupabase,
  updateEvolutionAiAutomationStatusSupabase,
  updateEvolutionContactNameSupabase,
  updateEvolutionInstanceProfileSupabase,
  updateEvolutionLeadSupabase,
  upsertEvolutionInstanceProfileSupabase,
  upsertEvolutionMetaAttributionSupabase,
  verifyLeadBelongsToUnitSupabase,
} from "../evolutionSupabaseStore.js";
import { runDailyEvolutionAiAutomation } from "../evolutionAiAutomation.js";
import { classifyLeadStageLive } from "../evolutionLiveClassification.js";
import {
  resolveEvolutionMetaAttribution,
  type MetaOfferRow,
} from "../evolutionMetaAttribution.js";
import { resolveAuthorizedEvolutionUnit } from "../evolutionUnitAssignment.js";
import {
  getMetaDirectClients,
  getMetaDirectOffers,
  isMetaDirectActive,
  isUserAllowedForMetaAccount,
} from "../metaDirectService.js";
import { isEvolutionAiAutomationRunning } from "../../shared/evolutionAiPolicy.js";
import { getAuthedSupabase } from "../supabase.js";
import {
  buildPixelInstanceName,
  connectEvolutionPixelInstance,
  createEvolutionPixelInstance,
  deleteEvolutionInstance,
  isEvolutionProvisioningConfigured,
  setEvolutionInstanceWebhook,
} from "../evolutionApiClient.js";
import { isVisiblePixelLead } from "../evolutionPixelPolicy.js";

export const evolutionRouter = Router();

class PixelRouteError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

// `vw_meta_ads_offer_ads.client_id` é uuid; `unit.metaAccountId` pode vir no formato
// da conta Meta (`act_...`) quando o Meta Direct está ativo. Só filtra por client_id
// quando o valor realmente é um uuid, senão a query inteira falha (42804/22P02).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

async function resolvePixelUnit(req: Request, rawUnitId: unknown) {
  const unitId = typeof rawUnitId === "string" ? rawUnitId.trim() : "";
  if (!unitId || unitId.length > 160) throw new PixelRouteError(400, "Selecione uma unidade válida.");
  const sb = getSupabaseForRequest(req);
  if (!sb) throw new PixelRouteError(401, "Sessão Supabase expirada.");
  const catalog = await listDashboardClientsFromSupabase(sb, req.claims!);
  if (catalog.error) throw new PixelRouteError(502, "Não foi possível carregar as unidades autorizadas.");

  if (isMetaDirectActive()) {
    try {
      const metaUnits = (await getMetaDirectClients())
        .filter((metaAccount) => isUserAllowedForMetaAccount(metaAccount, catalog.clients, req.claims))
        .map((metaAccount) => ({
          id: metaAccount.id,
          name: metaAccount.name,
          metaAccountId: metaAccount.id,
          aliases: [metaAccount.account_id, `act_${metaAccount.account_id}`],
        }));
      const metaUnit = resolveAuthorizedEvolutionUnit(unitId, metaUnits);
      if (metaUnit) return metaUnit;
    } catch (error) {
      console.warn("[evolution-pixel] Não foi possível validar a unidade no catálogo Meta:", error);
    }
  }

  const unit = resolveAuthorizedEvolutionUnit(unitId, catalog.clients);
  if (!unit) throw new PixelRouteError(403, "Você não tem acesso a esta unidade.");
  return { ...unit, metaAccountId: unit.id };
}

async function getPixelUnitScope(unitId: string) {
  const instances = await listEvolutionInstancesByUnitSupabase(unitId);
  const leads = await listEvolutionLeadsByInstancesSupabase(instances.map((instance) => instance.instanceName));
  return { instances, leads: leads.filter(isVisiblePixelLead) };
}

type CreativeRankingRow = {
  creativeId: string | null;
  creativeName: string | null;
  adId: string | null;
  adName: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adImageUrl: string | null;
  pixelConfirmedLeads: number;
  metaConversasIniciadas: number | null;
  metaSpend: number | null;
  metaLeadsMeta: number | null;
};

// Imagens de criativo da Meta são URLs assinadas que expiram — o valor salvo em
// evolution_meta_attributions.ad_image_url fica velho com o tempo. A aba Anúncios
// contorna isso buscando ao vivo na Graph API a cada carregamento; fazemos o mesmo
// aqui na hora de exibir, com o valor salvo como último recurso.
async function resolveFreshAdImages(metaAccountId: string | undefined, adIds: string[]): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  if (adIds.length === 0) return images;

  if (isMetaDirectActive() && metaAccountId) {
    try {
      const offers = await getMetaDirectOffers(metaAccountId);
      for (const offer of offers) {
        if (offer.ad_id && offer.ad_image_url && adIds.includes(offer.ad_id)) images.set(offer.ad_id, offer.ad_image_url);
      }
    } catch (error) {
      console.warn("[evolution-pixel] Não foi possível atualizar imagens via Meta Direct:", error);
    }
  }

  const missing = adIds.filter((id) => !images.has(id));
  if (missing.length > 0) {
    try {
      const meta = await getAuthedSupabase();
      if (meta) {
        let query = meta.from("vw_meta_ads_offer_ads").select("ad_id, ad_image_url").in("ad_id", missing).not("ad_image_url", "is", null);
        if (isUuid(metaAccountId)) query = query.eq("client_id", metaAccountId);
        const { data, error } = await query;
        if (!error) {
          for (const row of (data ?? []) as { ad_id: string; ad_image_url: string | null }[]) {
            if (row.ad_image_url && !images.has(row.ad_id)) images.set(row.ad_id, row.ad_image_url);
          }
        }
      }
    } catch (error) {
      console.warn("[evolution-pixel] Não foi possível buscar imagens de fallback no Supabase:", error);
    }
  }

  return images;
}

// Ranking pequeno para a tela do Pixel: cruza as conversas confirmadas pelo WhatsApp
// (todo lead que saiu da quarentena, isto é, chegou com evidência de campanha — a
// classificação manual "lead"/"não lead" é um passo de CRM à parte, não afeta essa
// contagem) com as métricas que a própria Meta reporta para o mesmo anúncio, por criativo.
async function buildEvolutionCreativeRanking(
  unit: { id: string; metaAccountId?: string },
  scope: { leads: Awaited<ReturnType<typeof getPixelUnitScope>>["leads"] },
): Promise<CreativeRankingRow[]> {
  if (scope.leads.length === 0) return [];
  const leadById = new Map(scope.leads.map((lead) => [lead.id, lead]));
  const attributions = await listEvolutionMetaAttributionsForLeadsSupabase(scope.leads.map((lead) => lead.id));

  const groups = new Map<string, { rep: (typeof attributions)[number]; total: number }>();
  for (const attribution of attributions) {
    const lead = leadById.get(attribution.leadId);
    if (!lead) continue;
    const key = attribution.creativeId ?? attribution.adId ?? attribution.campaignId ?? "sem-identificacao";
    const existing = groups.get(key);
    if (existing) existing.total += 1;
    else groups.set(key, { rep: attribution, total: 1 });
  }

  const ranked = Array.from(groups.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  const adIds = Array.from(new Set(ranked.map((entry) => entry.rep.adId).filter((id): id is string => Boolean(id))));

  const metaMetricsByAdId = new Map<string, { conversas: number; spend: number; leadsMeta: number }>();
  if (adIds.length > 0) {
    try {
      const meta = await getAuthedSupabase();
      if (meta) {
        let query = meta.from("vw_meta_ads_offer_ads").select("ad_id, total_conversas_iniciadas, total_spend, total_leads_meta").in("ad_id", adIds);
        if (isUuid(unit.metaAccountId)) query = query.eq("client_id", unit.metaAccountId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        for (const row of (data ?? []) as { ad_id: string; total_conversas_iniciadas: number | null; total_spend: number | null; total_leads_meta: number | null }[]) {
          const current = metaMetricsByAdId.get(row.ad_id) ?? { conversas: 0, spend: 0, leadsMeta: 0 };
          current.conversas += row.total_conversas_iniciadas ?? 0;
          current.spend += row.total_spend ?? 0;
          current.leadsMeta += row.total_leads_meta ?? 0;
          metaMetricsByAdId.set(row.ad_id, current);
        }
      }
    } catch (error) {
      console.warn("[evolution-pixel] Não foi possível carregar métricas Meta para o ranking de criativos:", error);
    }
  }

  const freshImages = await resolveFreshAdImages(unit.metaAccountId, adIds);

  return ranked.map((entry) => {
    const metaMetrics = entry.rep.adId ? metaMetricsByAdId.get(entry.rep.adId) : undefined;
    return {
      creativeId: entry.rep.creativeId,
      creativeName: entry.rep.creativeName,
      adId: entry.rep.adId,
      adName: entry.rep.adName,
      campaignName: entry.rep.campaignName,
      adsetName: entry.rep.adsetName,
      adImageUrl: (entry.rep.adId && freshImages.get(entry.rep.adId)) || entry.rep.adImageUrl,
      pixelConfirmedLeads: entry.total,
      metaConversasIniciadas: metaMetrics?.conversas ?? null,
      metaSpend: metaMetrics?.spend ?? null,
      metaLeadsMeta: metaMetrics?.leadsMeta ?? null,
    };
  });
}

function sendPixelError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PixelRouteError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Evolution API não configurada") || message.startsWith("Defina EVOLUTION_WEBHOOK")) {
    res.status(503).json({ error: message });
    return;
  }
  console.error(`[evolution-pixel] ${fallback}:`, error);
  res.status(503).json({ error: fallback });
}

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
        "client_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_id, creative_name, ad_image_url",
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
    if (result.ignored) {
      res.status(202).json({ accepted: true, duplicate: false, ignored: true });
      return;
    }
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
        if (result.eventId) await persistEvolutionMetaAttribution(event, result.eventId);
      } catch (attributionError) {
        console.warn("[evolution] Falha na atribuição Meta:", attributionError);
      }
      if (event.direction === "incoming" && event.contactKey) {
        try {
          const leadId = await findEvolutionLeadIdSupabase(event.instanceName, event.contactKey);
          if (leadId) {
            classifyLeadStageLive(leadId).catch((liveClassificationError) => {
              console.warn("[evolution] Falha ao classificar lead ao vivo:", liveClassificationError);
            });
          }
        } catch (liveClassificationError) {
          console.warn("[evolution] Falha ao disparar classificação ao vivo:", liveClassificationError);
        }
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

// ─── POST /api/scheduled/evolution-quarantine-cleanup ──────────────────────
// Job diário: remove leads em quarentena (sem evidência de anúncio) há mais de 48h.
evolutionRouter.post("/scheduled/evolution-quarantine-cleanup", async (req, res) => {
  try {
    await authenticateScheduledTask(req);
    const deleted = await cleanupExpiredQuarantineLeadsSupabase();
    res.json({ ok: true, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[evolution-quarantine] Falha na limpeza diária:", message);
    const status = message.includes("autorizado") || message.includes("task_uid") ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

// ─── GET /api/evolution/overview ────────────────────────────────────────────
// Pixel da dashboard: toda leitura e mutação é limitada à unidade autorizada.
evolutionRouter.get("/evolution/pixel/overview", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const scope = await getPixelUnitScope(unit.id);
    const creativeRanking = await buildEvolutionCreativeRanking(unit, scope);
    res.json({
      unit: { id: unit.id, name: unit.name, metaAccountId: unit.metaAccountId ?? unit.id },
      provisioningConfigured: isEvolutionProvisioningConfigured(),
      instances: scope.instances,
      leads: scope.leads,
      creativeRanking,
      summary: {
        connectedInstances: scope.instances.filter((instance) => ["open", "connected"].includes(instance.connectionStatus)).length,
        totalInstances: scope.instances.length,
        visibleLeads: scope.leads.length,
        unreadConversations: 0,
      },
    });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível carregar o Pixel desta unidade.");
  }
});

evolutionRouter.post("/evolution/pixel/instances", requireAuth, requirePixelAccess, async (req, res) => {
  const body = req.body as { unitId?: string; metaAccountId?: string; displayName?: string };
  try {
    const unit = await resolvePixelUnit(req, body.unitId);
    if (body.metaAccountId && body.metaAccountId !== (unit.metaAccountId ?? unit.id)) {
      throw new PixelRouteError(403, "A conta Meta precisa pertencer à unidade selecionada.");
    }
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 2 || displayName.length > 80) {
      throw new PixelRouteError(400, "Informe um nome de 2 a 80 caracteres para o WhatsApp.");
    }
    const instanceName = buildPixelInstanceName(unit.name);
    const created = await createEvolutionPixelInstance(instanceName);
    let instance;
    try {
      instance = await upsertEvolutionInstanceProfileSupabase(instanceName, {
        displayName,
        unitId: unit.id,
        unitName: unit.name,
        metaAccountId: unit.metaAccountId ?? unit.id,
      });
    } catch (persistError) {
      const rolledBack = await deleteEvolutionInstance(instanceName);
      console.error(
        `[evolution-pixel] Falha ao gravar instância ${instanceName} no Supabase; rollback na Evolution API ${rolledBack ? "concluído" : "FALHOU"}.`,
        persistError,
      );
      throw persistError;
    }
    res.status(201).json({
      instance,
      qrDataUrl: created.qrDataUrl,
      unit: { id: unit.id, name: unit.name, metaAccountId: unit.metaAccountId ?? unit.id },
    });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível criar a instância na Evolution API.");
  }
});

// ─── POST /api/evolution/pixel/simulate-message (somente fora de produção) ──
// Painel de teste: injeta uma mensagem sintética pelo MESMO pipeline do webhook
// real (normalizeEvolutionWebhook + recordEvolutionEventSupabase), permitindo
// simular canal de origem e classificação sem depender de um WhatsApp real.
const SIMULATION_CHANNELS = ["meta_verified", "meta_observed", "google_ads", "organic"] as const;
type SimulationChannel = (typeof SIMULATION_CHANNELS)[number];

// Busca um anúncio real já sincronizado da unidade para que a simulação resolva para
// criativo/campanha de verdade (em vez de um ID fictício sem correspondência).
async function pickSimulatedMetaAd(metaAccountId?: string): Promise<string | null> {
  try {
    const meta = await getAuthedSupabase();
    if (!meta) return null;
    let query = meta.from("vw_meta_ads_offer_ads").select("ad_id").not("ad_id", "is", null).limit(1);
    if (isUuid(metaAccountId)) query = query.eq("client_id", metaAccountId);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    return String((data[0] as { ad_id: string }).ad_id);
  } catch {
    return null;
  }
}

async function simulatedReferral(channel: SimulationChannel, metaAccountId?: string, explicitAdId?: string): Promise<Record<string, unknown> | undefined> {
  const stamp = Date.now().toString(36);
  if (channel === "organic") return undefined;
  if (channel === "google_ads") {
    return { source_url: `https://trafego.pro/simulacao?gclid=sim-gclid-${stamp}&utm_source=google&utm_campaign=simulacao` };
  }
  const realAdId = explicitAdId || (await pickSimulatedMetaAd(metaAccountId));
  const sourceId = realAdId ?? `sim-ad-${stamp}`;
  return channel === "meta_verified"
    ? { ctwa_clid: `sim-ctwa-${stamp}`, source_id: sourceId, source_type: "ad" }
    : { source_id: sourceId, source_type: "ad" };
}

// ─── GET /api/evolution/pixel/simulate-ads (somente fora de produção) ───────
// Lista os anúncios Meta já sincronizados da unidade, para o operador escolher
// exatamente qual campanha/anúncio testar no emulador (em vez de um aleatório).
evolutionRouter.get("/evolution/pixel/simulate-ads", requireAuth, requirePixelAccess, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Não encontrado" });
    return;
  }
  try {
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const meta = await getAuthedSupabase();
    if (!meta) {
      res.json({ ads: [] });
      return;
    }
    let query = meta
      .from("vw_meta_ads_offer_ads")
      .select("ad_id, ad_name, campaign_name, adset_name, creative_name, ad_image_url, total_spend, total_conversas_iniciadas")
      .not("ad_id", "is", null)
      .order("total_spend", { ascending: false })
      .limit(200);
    if (isUuid(unit.metaAccountId)) query = query.eq("client_id", unit.metaAccountId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    type OfferRow = { ad_id: string; ad_name: string | null; campaign_name: string | null; adset_name: string | null; creative_name: string | null; ad_image_url: string | null; total_spend: number | null; total_conversas_iniciadas: number | null };
    const seen = new Set<string>();
    const ads: { adId: string; adName: string | null; campaignName: string | null; adsetName: string | null; creativeName: string | null; adImageUrl: string | null; totalSpend: number | null; totalConversas: number | null }[] = [];
    for (const row of (data ?? []) as OfferRow[]) {
      if (seen.has(row.ad_id) || ads.length >= 30) continue;
      seen.add(row.ad_id);
      ads.push({
        adId: row.ad_id,
        adName: row.ad_name,
        campaignName: row.campaign_name,
        adsetName: row.adset_name,
        creativeName: row.creative_name,
        adImageUrl: row.ad_image_url,
        totalSpend: row.total_spend,
        totalConversas: row.total_conversas_iniciadas,
      });
    }
    res.json({ ads });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível carregar os anúncios da unidade.");
  }
});

evolutionRouter.post("/evolution/pixel/simulate-message", requireAuth, requirePixelAccess, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Não encontrado" });
    return;
  }
  const body = req.body as {
    unitId?: string;
    instanceName?: string;
    channel?: string;
    text?: string;
    classification?: EvolutionLeadClassification;
    adId?: string;
  };
  try {
    const instanceName = body.instanceName ?? "";
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) throw new PixelRouteError(400, "Instância inválida.");
    const channel = body.channel as SimulationChannel;
    if (!SIMULATION_CHANNELS.includes(channel)) throw new PixelRouteError(400, "Canal de simulação inválido.");
    const classification = body.classification;
    if (classification && !["pendente", "lead", "nao_lead"].includes(classification)) {
      throw new PixelRouteError(400, "Classificação inválida.");
    }
    const text = (body.text ?? "Mensagem de teste simulada").slice(0, 300);

    const unit = await resolvePixelUnit(req, body.unitId);
    const scope = await getPixelUnitScope(unit.id);
    const belongsToUnit = scope.instances.some((instance) => instance.instanceName === instanceName);
    if (!belongsToUnit) {
      // Fora de uma instância real da unidade, só cria automaticamente uma instância
      // "fantasma" (prefixo sim-) para testes — nunca sequestra o nome de uma instância existente.
      if (!instanceName.startsWith("sim-")) {
        throw new PixelRouteError(404, "Instância não encontrada nesta unidade. Use uma instância existente ou um nome iniciado com \"sim-\" para criar uma instância de teste.");
      }
      await upsertEvolutionInstanceProfileSupabase(instanceName, {
        displayName: "Instância de teste (simulação)",
        unitId: unit.id,
        unitName: unit.name,
        metaAccountId: unit.metaAccountId ?? unit.id,
      });
    }

    const stamp = Date.now();
    const remoteJid = `5599${String(stamp).slice(-9)}@s.whatsapp.net`;
    const event = normalizeEvolutionWebhook({
      event: "messages.upsert",
      instance: instanceName,
      data: {
        key: { id: `sim-${stamp}`, remoteJid, fromMe: false },
        message: { conversation: text },
        messageTimestamp: Math.floor(stamp / 1000),
        pushName: "Lead simulado",
        referral: await simulatedReferral(channel, unit.metaAccountId, body.adId?.trim() || undefined),
      },
    });
    if (!event) throw new PixelRouteError(400, "Não foi possível montar o evento simulado.");

    const result = await recordEvolutionEventSupabase(event);
    if (!result.ignored && !result.duplicate && result.eventId) {
      try {
        await persistEvolutionMetaAttribution(event, result.eventId);
      } catch (attributionError) {
        console.warn("[evolution-pixel] Falha na atribuição Meta da simulação:", attributionError);
      }
    }
    let leadId: string | null = null;
    if (event.contactKey) {
      leadId = await findEvolutionLeadIdSupabase(instanceName, event.contactKey);
      if (leadId && classification && classification !== "pendente") {
        await updateEvolutionLeadSupabase(leadId, {
          classification,
          funnelStage: "novo",
          note: "Classificado via simulação de teste (Pixel dev)",
          classifiedByEmail: req.claims!.email,
        });
      }
    }

    res.status(201).json({ ok: true, duplicate: result.duplicate, leadId });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível simular a mensagem.");
  }
});

evolutionRouter.get("/evolution/pixel/instances/:instanceName/qr", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) throw new PixelRouteError(400, "Instância inválida.");
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const scope = await getPixelUnitScope(unit.id);
    if (!scope.instances.some((instance) => instance.instanceName === instanceName)) {
      throw new PixelRouteError(404, "Instância não encontrada nesta unidade.");
    }
    const qrDataUrl = await connectEvolutionPixelInstance(instanceName);
    if (!qrDataUrl) throw new PixelRouteError(409, "A Evolution não retornou um novo QR Code. A instância pode já estar conectada.");
    res.json({ qrDataUrl });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível gerar o QR Code.");
  }
});

evolutionRouter.delete("/evolution/pixel/instances/:instanceName", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) throw new PixelRouteError(400, "Instância inválida.");
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const scope = await getPixelUnitScope(unit.id);
    if (!scope.instances.some((instance) => instance.instanceName === instanceName)) {
      throw new PixelRouteError(404, "Instância não encontrada nesta unidade.");
    }
    await deleteEvolutionInstance(instanceName);
    await deleteEvolutionInstanceProfileSupabase(instanceName);
    res.status(204).end();
  } catch (error) {
    sendPixelError(res, error, "Não foi possível remover a instância.");
  }
});

evolutionRouter.post("/evolution/pixel/instances/:instanceName/sync-webhook", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(instanceName)) throw new PixelRouteError(400, "Instância inválida.");
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const scope = await getPixelUnitScope(unit.id);
    if (!scope.instances.some((instance) => instance.instanceName === instanceName)) {
      throw new PixelRouteError(404, "Instância não encontrada nesta unidade.");
    }
    await setEvolutionInstanceWebhook(instanceName);
    res.json({ ok: true });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível reconfigurar o webhook da instância.");
  }
});

evolutionRouter.get("/evolution/pixel/leads/:id/messages", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) throw new PixelRouteError(400, "Lead inválido.");
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const belongsToUnit = await verifyLeadBelongsToUnitSupabase(leadId, unit.id);
    if (!belongsToUnit) throw new PixelRouteError(404, "Conversa de lead não encontrada nesta unidade.");

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? rawLimit : undefined;
    const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : undefined;

    res.json({ rows: await listEvolutionMessagesPageSupabase(leadId, { limit, before }) });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível carregar a conversa.");
  }
});

// ─── GET /api/evolution/pixel/leads/:id/attribution ─────────────────────────
// Qual campanha/conjunto/anúncio/criativo Meta gerou essa conversa (quando disponível).
evolutionRouter.get("/evolution/pixel/leads/:id/attribution", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) throw new PixelRouteError(400, "Lead inválido.");
    const unit = await resolvePixelUnit(req, req.query.unitId);
    const belongsToUnit = await verifyLeadBelongsToUnitSupabase(leadId, unit.id);
    if (!belongsToUnit) throw new PixelRouteError(404, "Conversa de lead não encontrada nesta unidade.");

    const attribution = await getEvolutionMetaAttributionForLeadSupabase(leadId);
    if (attribution?.adId) {
      const freshImages = await resolveFreshAdImages(unit.metaAccountId, [attribution.adId]);
      const freshImage = freshImages.get(attribution.adId);
      if (freshImage) attribution.adImageUrl = freshImage;
    }
    res.json({ attribution });
  } catch (error) {
    sendPixelError(res, error, "Não foi possível carregar a atribuição do anúncio.");
  }
});

// ─── PUT /api/evolution/pixel/leads/:id ──────────────────────────────────────
// Confirma ou descarta um lead direto da tela do Pixel, sem precisar do painel admin.
evolutionRouter.put("/evolution/pixel/leads/:id", requireAuth, requirePixelAccess, async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) throw new PixelRouteError(400, "Lead inválido.");
    const body = req.body as { unitId?: string; classification?: string; note?: string };
    const classifications = ["pendente", "lead", "nao_lead"];
    if (!classifications.includes(body.classification ?? "")) throw new PixelRouteError(400, "Classificação inválida.");

    const unit = await resolvePixelUnit(req, body.unitId);
    const belongsToUnit = await verifyLeadBelongsToUnitSupabase(leadId, unit.id);
    if (!belongsToUnit) throw new PixelRouteError(404, "Conversa de lead não encontrada nesta unidade.");

    if (isEvolutionAiAutomationRunning(await getEvolutionAiAutomationSettingsSupabase())) {
      throw new PixelRouteError(409, "A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para classificar manualmente.");
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    const lead = await updateEvolutionLeadSupabase(leadId, {
      classification: body.classification as "pendente" | "lead" | "nao_lead",
      funnelStage: "novo",
      note,
      classifiedByEmail: req.claims!.email,
    });
    if (!lead) throw new PixelRouteError(404, "Lead não encontrado.");
    res.json(lead);
  } catch (error) {
    sendPixelError(res, error, "Não foi possível classificar o lead.");
  }
});

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
      unitId: unit.id,
      unitName: unit.name,
      metaAccountId: unit.id,
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
