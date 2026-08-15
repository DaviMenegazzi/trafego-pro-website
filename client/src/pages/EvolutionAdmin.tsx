import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Activity, ArrowLeft, BadgeCheck, Bot, CheckCircle2, ChevronRight, CircleAlert, Clock3, Database, FileJson, MessageCircleMore, MousePointerClick, Phone, RefreshCw, ShieldCheck, Signal, Tag, UsersRound, Webhook, X } from "lucide-react";
import { canAccessEvolutionPanel } from "@/lib/evolutionAdminPolicy";
import { resolveCrmDrop, type CrmStage } from "@/lib/crmPipeline";
import { scopeEvolutionData } from "@/lib/evolutionScope";
import { isEvolutionAiAutomationRunning, wasLastCrmUpdateMadeByAi, type EvolutionAiAutomationState } from "../../../shared/evolutionAiPolicy";

type Summary = { totalLeads: number; pendingLeads: number; qualifiedLeads: number; closedLeads: number; eventsToday: number };
type Instance = { instanceName: string; displayName: string | null; unitName: string | null; connectionStatus: string; lastEventAt: string | null; lastMessageAt: string | null };
type OriginPlatform = "meta" | "google_ads" | "mixed" | "unknown";
type OriginEvidence = "verified" | "observed" | "none";
type EventItem = { id: string; instanceName: string; eventType: string; direction: string; messageType: string | null; messagePreview: string | null; occurredAt: string | null; receivedAt: string; originPlatform: OriginPlatform; originEvidence: OriginEvidence; metaCtwaClid: string | null; metaSourceId: string | null; metaSourceType: string | null; googleClickId: string | null; attributionPayload: Record<string, string> | null };
type Lead = { id: string; instanceName: string; contactKey: string; contactPhone: string | null; phoneLast4: string | null; contactName: string | null; classification: "pendente" | "lead" | "nao_lead"; funnelStage: "novo" | "qualificado" | "negociacao" | "perdido" | "fechado"; classificationNote: string | null; firstContactAt: string; lastMessageAt: string; messagesReceived: number; messagesSent: number; classifiedByEmail: string | null; classifiedAt: string | null; originPlatform: OriginPlatform; originEvidence: OriginEvidence; metaCtwaClid: string | null; googleClickId: string | null; originDetectedAt: string | null; crmStage: CrmStage; crmStageUpdatedAt: string | null; crmStageUpdatedBy: string | null };
type Overview = { summary: Summary; instances: Instance[]; events: EventItem[]; leads: Lead[]; automation: EvolutionAiAutomationState };
type MetaAttribution = { leadId: string; sourceEventId: string | null; clientId: string | null; accountId: string | null; campaignId: string | null; campaignName: string | null; adsetId: string | null; adsetName: string | null; adId: string | null; adName: string | null; creativeId: string | null; creativeName: string | null; matchedBy: string; matchStatus: "matched" | "unresolved"; matchedAt: string };
type ConversationMessage = { id: string; leadId: string; instanceName: string; direction: "incoming" | "outgoing"; messageType: string | null; bodyText: string; sentAt: string };
type CrmHistory = { id: string; leadId: string; instanceName: string; fromStage: CrmStage | null; toStage: CrmStage; changedBy: string | null; changedAt: string; note: string | null };
type View = "operacao" | "crm" | "origem" | "auditoria" | "atribuicao" | "conversas";

const stages: Array<{ value: Lead["funnelStage"]; label: string }> = [
  { value: "novo", label: "Novo" }, { value: "qualificado", label: "Qualificado" },
  { value: "negociacao", label: "Negociação" }, { value: "perdido", label: "Perdido" }, { value: "fechado", label: "Fechado" },
];

const crmStages: Array<{ value: CrmStage; label: string; color: string }> = [
  { value: "lead_not_responded", label: "Lead não respondido", color: "border-zinc-500/25 bg-zinc-400/[.06]" },
  { value: "lead_responded", label: "Lead respondido", color: "border-sky-400/25 bg-sky-400/[.07]" },
  { value: "follow_up", label: "Follow up", color: "border-amber-400/25 bg-amber-400/[.07]" },
  { value: "lead_replied", label: "Lead respondeu", color: "border-violet-400/25 bg-violet-400/[.07]" },
  { value: "negotiation", label: "Negociação", color: "border-indigo-400/25 bg-indigo-400/[.07]" },
  { value: "closed_won", label: "Lead fechou", color: "border-emerald-400/25 bg-emerald-400/[.07]" },
  { value: "closed_lost", label: "Lead perdido", color: "border-rose-400/25 bg-rose-400/[.07]" },
];

const emptyOverview: Overview = {
  summary: { totalLeads: 0, pendingLeads: 0, qualifiedLeads: 0, closedLeads: 0, eventsToday: 0 }, instances: [], events: [], leads: [], automation: { lastRunStatus: null, lastStartedAt: null, lastCompletedAt: null },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatAdminPhone(lead: Pick<Lead, "contactPhone" | "phoneLast4">): string {
  const digits = lead.contactPhone?.replace(/\D/g, "") ?? "";
  return digits ? `+${digits}` : lead.phoneLast4 ? `•••• ${lead.phoneLast4}` : "Número não disponível";
}

async function readEvolutionJson<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(response.status === 404 ? "A rota Evolution ainda não está disponível no servidor." : fallback);
  }
  return response.json() as Promise<T>;
}

function statusClass(status: string): string {
  if (status === "open" || status === "connected") return "bg-emerald-400/12 text-emerald-300 border-emerald-400/20";
  if (status === "close" || status === "disconnected") return "bg-rose-400/12 text-rose-300 border-rose-400/20";
  return "bg-white/6 text-zinc-400 border-white/10";
}

function classificationLabel(value: Lead["classification"]): string {
  return value === "lead" ? "Lead" : value === "nao_lead" ? "Não lead" : "Pendente";
}

function originLabel(platform: OriginPlatform): string {
  return platform === "meta" ? "Meta" : platform === "google_ads" ? "Google Ads" : platform === "mixed" ? "Múltiplas origens" : "Sem origem detectada";
}

function evidenceLabel(evidence: OriginEvidence): string {
  return evidence === "verified" ? "Verificado" : evidence === "observed" ? "Sinal observado" : "Sem evidência";
}

function originClass(evidence: OriginEvidence): string {
  return evidence === "verified" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : evidence === "observed" ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/[.04] text-zinc-500";
}

function OriginPill({ platform, evidence }: { platform: OriginPlatform; evidence: OriginEvidence }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.12em] ${originClass(evidence)}`}><Tag className="h-3 w-3" />{originLabel(platform)} · {evidenceLabel(evidence)}</span>;
}

function CrmLeadCard({ lead, attribution, moving, locked, onOpen }: { lead: Lead; attribution: MetaAttribution | undefined; moving: boolean; locked: boolean; onOpen: (lead: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled: locked });
  const aiUpdated = wasLastCrmUpdateMadeByAi(lead.crmStageUpdatedBy);
  return <button ref={setNodeRef} type="button" style={{ transform: CSS.Translate.toString(transform) }} {...attributes} {...listeners} onClick={() => void onOpen(lead)} className={`w-full touch-none rounded-xl border border-white/10 bg-[#101214]/95 p-3 text-left shadow-lg shadow-black/10 transition hover:border-cyan-300/40 hover:bg-[#14181a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${isDragging ? "cursor-grabbing opacity-35" : locked ? "cursor-not-allowed opacity-70" : "cursor-grab"}`}><p className="truncate text-sm text-zinc-100">{lead.contactName || "Contato sem nome"}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500"><Phone className="h-3 w-3" />{formatAdminPhone(lead)}</p><p className="mt-2 text-[10px] text-zinc-600">{lead.instanceName} · {lead.messagesReceived} recebidas / {lead.messagesSent} enviadas</p>{attribution?.campaignName ? <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-cyan-200">{attribution.campaignName}</p> : <p className="mt-2 text-[10px] text-zinc-600">{originLabel(lead.originPlatform)}</p>}{aiUpdated && <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-violet-200"><Bot className="h-3 w-3" />Atualizado pela IA da Tráfego Pro</p>}{moving && <p className="mt-2 text-[10px] text-cyan-300">Movendo…</p>}</button>;
}

function CrmStageColumn({ stage, leads, attributions, movingLeadId, locked, onOpen }: { stage: typeof crmStages[number]; leads: Lead[]; attributions: Map<string, MetaAttribution>; movingLeadId: string | null; locked: boolean; onOpen: (lead: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value, disabled: locked });
  return <article ref={setNodeRef} className={`min-h-[278px] rounded-2xl border p-3 transition-colors ${stage.color} ${isOver ? "ring-2 ring-cyan-300/60 ring-offset-2 ring-offset-[#090a0b]" : ""}`}><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-100">{stage.label}</h3><span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[10px] text-zinc-400">{leads.length}</span></div><div className="space-y-2">{leads.length === 0 ? <p className={`rounded-xl border border-dashed px-3 py-6 text-center text-xs ${isOver ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-zinc-600"}`}>{locked ? "Atualização automática em andamento" : "Solte o contato aqui"}</p> : leads.map((lead) => <CrmLeadCard key={lead.id} lead={lead} attribution={attributions.get(lead.id)} moving={movingLeadId === lead.id} locked={locked} onOpen={onOpen} />)}</div></article>;
}

export default function EvolutionAdmin() {
  const [, navigate] = useLocation();
  const [rawOverview, setRawOverview] = useState<Overview>(emptyOverview);
  const [view, setView] = useState<View>("operacao");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);
  const [rawAttributions, setRawAttributions] = useState<MetaAttribution[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [crmHistory, setCrmHistory] = useState<CrmHistory[]>([]);
  const [crmDetailLeadId, setCrmDetailLeadId] = useState<string | null>(null);
  const [movingCrmLead, setMovingCrmLead] = useState<string | null>(null);
  const [activeCrmLeadId, setActiveCrmLeadId] = useState<string | null>(null);
  const [unitScope, setUnitScope] = useState("all");
  const [instanceScope, setInstanceScope] = useState("all");
  const [savingInstance, setSavingInstance] = useState<string | null>(null);
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("tp_token"), []);
  const webhookUrl = useMemo(() => `${window.location.origin}/api/evolution/webhook`, []);
  const requestHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("tp_token") ?? ""}`, "Content-Type": "application/json" }), []);

  const scope = useMemo(() => scopeEvolutionData(rawOverview.instances, rawOverview.leads, rawOverview.events, unitScope, instanceScope), [instanceScope, rawOverview, unitScope]);
  const unitOptions = scope.unitOptions;
  const scopedInstances = scope.visibleInstances;
  const scopedLeads = scope.visibleLeads;
  const scopedEvents = scope.visibleEvents;
  const scopedAttributions = useMemo(() => rawAttributions.filter((item) => scopedLeads.some((lead) => lead.id === item.leadId)), [rawAttributions, scopedLeads]);
  const scopedSummary = useMemo<Summary>(() => ({
    totalLeads: scopedLeads.length,
    pendingLeads: scopedLeads.filter((lead) => lead.classification === "pendente").length,
    qualifiedLeads: scopedLeads.filter((lead) => lead.funnelStage === "qualificado").length,
    closedLeads: scopedLeads.filter((lead) => lead.funnelStage === "fechado").length,
    eventsToday: scopedEvents.filter((event) => new Date(event.receivedAt).toDateString() === new Date().toDateString()).length,
  }), [scopedEvents, scopedLeads]);
  const overview = useMemo<Overview>(() => ({ ...rawOverview, summary: scopedSummary, instances: scopedInstances, leads: scopedLeads, events: scopedEvents }), [rawOverview, scopedEvents, scopedInstances, scopedLeads, scopedSummary]);
  const attributions = scopedAttributions;
  const sourceStats = useMemo(() => ({
    verifiedMeta: scopedLeads.filter((lead) => lead.originPlatform === "meta" && lead.originEvidence === "verified").length,
    observedMeta: scopedLeads.filter((lead) => lead.originPlatform === "meta" && lead.originEvidence === "observed").length,
    observedGoogle: scopedLeads.filter((lead) => lead.originPlatform === "google_ads" && lead.originEvidence !== "none").length,
    withoutEvidence: scopedLeads.filter((lead) => lead.originEvidence === "none").length,
  }), [scopedLeads]);

  const originEvents = useMemo(() => scopedEvents.filter((event) => event.originEvidence !== "none"), [scopedEvents]);
  const selectedLead = useMemo(() => scopedLeads.find((lead) => lead.id === selectedLeadId) ?? scopedLeads[0] ?? null, [scopedLeads, selectedLeadId]);
  const crmDetailLead = useMemo(() => scopedLeads.find((lead) => lead.id === crmDetailLeadId) ?? null, [crmDetailLeadId, scopedLeads]);
  const attributionByLead = useMemo(() => new Map(attributions.map((item) => [item.leadId, item])), [attributions]);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeCrmLead = useMemo(() => scopedLeads.find((lead) => lead.id === activeCrmLeadId) ?? null, [activeCrmLeadId, scopedLeads]);
  const automationLocked = isEvolutionAiAutomationRunning(rawOverview.automation);
  const latestAiUpdate = useMemo(() => scopedLeads.filter((lead) => wasLastCrmUpdateMadeByAi(lead.crmStageUpdatedBy) && lead.crmStageUpdatedAt).sort((left, right) => new Date(right.crmStageUpdatedAt!).getTime() - new Date(left.crmStageUpdatedAt!).getTime())[0] ?? null, [scopedLeads]);

  const loadOverview = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/evolution/overview", { headers: requestHeaders() });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("tp_token");
        localStorage.removeItem("tp_user");
        navigate("/login");
        return;
      }
      const data = await response.json() as Overview | { error?: string };
      if (!response.ok || !("summary" in data)) throw new Error("error" in data ? data.error : "Não foi possível carregar o painel");
      setRawOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o painel Evolution");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, requestHeaders]);

  const loadAttributions = useCallback(async () => {
    try {
      const response = await fetch("/api/evolution/attributions", { headers: requestHeaders() });
      const data = await readEvolutionJson<{ rows?: MetaAttribution[]; error?: string }>(response, "Não foi possível carregar atribuições Meta");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar atribuições Meta");
      setRawAttributions(data.rows ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar atribuições Meta"); }
  }, [requestHeaders]);

  const loadConversation = useCallback(async (leadId: string) => {
    setConversationLoading(true);
    try {
      const response = await fetch(`/api/evolution/leads/${leadId}/messages`, { headers: requestHeaders() });
      const data = await readEvolutionJson<{ rows?: ConversationMessage[]; error?: string }>(response, "Não foi possível carregar conversa");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar conversa");
      setConversation(data.rows ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar conversa"); }
    finally { setConversationLoading(false); }
  }, [requestHeaders]);

  const loadCrmHistory = useCallback(async (leadId: string) => {
    try {
      const response = await fetch(`/api/evolution/leads/${leadId}/crm-history`, { headers: requestHeaders() });
      const data = await readEvolutionJson<{ rows?: CrmHistory[]; error?: string }>(response, "Não foi possível carregar histórico CRM");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar histórico CRM");
      setCrmHistory(data.rows ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar histórico CRM"); }
  }, [requestHeaders]);

  useEffect(() => {
    const storedUser = localStorage.getItem("tp_user");
    if (!canAccessEvolutionPanel(token, storedUser)) {
      navigate("/login");
      return;
    }
    loadOverview();
  }, [loadOverview, navigate, token]);

  useEffect(() => { if (view === "atribuicao") void loadAttributions(); }, [loadAttributions, view]);
  useEffect(() => { if (view === "conversas" && selectedLead) void loadConversation(selectedLead.id); }, [loadConversation, selectedLead, view]);
  useEffect(() => {
    if (!automationLocked) return;
    const interval = window.setInterval(() => void loadOverview(true), 15_000);
    return () => window.clearInterval(interval);
  }, [automationLocked, loadOverview]);

  async function updateLead(lead: Lead, classification: Lead["classification"], funnelStage: Lead["funnelStage"]) {
    if (automationLocked) { setError("A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para alterar classificações manualmente."); return; }
    setUpdatingLead(lead.id);
    setError("");
    try {
      const response = await fetch(`/api/evolution/leads/${lead.id}`, {
        method: "PUT", headers: requestHeaders(), body: JSON.stringify({ classification, funnelStage }),
      });
      const data = await response.json() as Lead | { error?: string };
      if (!response.ok || !("id" in data)) throw new Error("error" in data ? data.error : "Não foi possível atualizar o lead");
      setRawOverview((current) => ({ ...current, leads: current.leads.map((item) => item.id === data.id ? data : item) }));
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o lead");
    } finally {
      setUpdatingLead(null);
    }
  }

  async function updateInstanceProfile(event: React.FormEvent<HTMLFormElement>, instance: Instance) {
    event.preventDefault();
    setSavingInstance(instance.instanceName);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/evolution/instances/${instance.instanceName}`, {
        method: "PUT", headers: requestHeaders(), body: JSON.stringify({ displayName: fields.get("displayName"), unitName: fields.get("unitName") }),
      });
      const data = await readEvolutionJson<Instance & { error?: string }>(response, "Não foi possível atualizar a instância");
      if (!response.ok || !("instanceName" in data)) throw new Error(data.error ?? "Não foi possível atualizar a instância");
      setRawOverview((current) => ({ ...current, instances: current.instances.map((item) => item.instanceName === data.instanceName ? data : item) }));
      await loadOverview(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível atualizar a instância"); }
    finally { setSavingInstance(null); }
  }

  async function moveCrmLead(lead: Lead, stage: CrmStage) {
    if (automationLocked) { setError("A IA da Tráfego Pro está atualizando o CRM. Aguarde a conclusão para mover contatos manualmente."); return; }
    if (lead.crmStage === stage) return;
    setMovingCrmLead(lead.id);
    setError("");
    try {
      const response = await fetch(`/api/evolution/leads/${lead.id}/crm-stage`, { method: "PUT", headers: requestHeaders(), body: JSON.stringify({ instanceName: lead.instanceName, stage }) });
      const data = await readEvolutionJson<{ crmStage?: CrmStage; crmStageUpdatedAt?: string; error?: string }>(response, "Não foi possível mover o lead no CRM");
      if (!response.ok || !data.crmStage) throw new Error(data.error ?? "Não foi possível mover o lead no CRM");
      setRawOverview((current) => ({ ...current, leads: current.leads.map((item) => item.id === lead.id ? { ...item, crmStage: data.crmStage!, crmStageUpdatedAt: data.crmStageUpdatedAt ?? item.crmStageUpdatedAt } : item) }));
      if (crmDetailLeadId === lead.id) await loadCrmHistory(lead.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível mover o lead no CRM"); }
    finally { setMovingCrmLead(null); }
  }

  function handleCrmDragEnd(event: DragEndEvent) {
    setActiveCrmLeadId(null);
    if (automationLocked) return;
    const drop = resolveCrmDrop(scopedLeads, String(event.active.id), event.over ? String(event.over.id) : null);
    if (drop) void moveCrmLead(drop.lead, drop.stage);
  }

  async function openCrmDetail(lead: Lead) {
    setCrmDetailLeadId(lead.id);
    setSelectedLeadId(lead.id);
    await Promise.all([loadConversation(lead.id), loadCrmHistory(lead.id)]);
  }

  const metrics = [
    { label: "Eventos hoje", value: scopedSummary.eventsToday, icon: Activity, color: "text-cyan-300", bg: "bg-cyan-400/10" },
    { label: "Contatos rastreados", value: scopedSummary.totalLeads, icon: UsersRound, color: "text-indigo-300", bg: "bg-indigo-400/10" },
    { label: "A validar", value: scopedSummary.pendingLeads, icon: CircleAlert, color: "text-amber-300", bg: "bg-amber-400/10" },
    { label: "Fechados", value: scopedSummary.closedLeads, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-400/10" },
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#090a0b] grid place-items-center text-zinc-400" style={{ fontFamily: "Inter, sans-serif" }}><RefreshCw className="h-5 w-5 animate-spin" /><span className="sr-only">Carregando painel Evolution</span></div>;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090a0b] text-zinc-100 selection:bg-cyan-300/30" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute -top-48 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/8 blur-[120px]" /><div className="absolute bottom-[-16rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/8 blur-[120px]" /></div>
      <div className="relative mx-auto max-w-[1480px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.12)]"><Signal className="h-5 w-5" /></div><div><p className="mb-1 text-[10px] font-medium uppercase tracking-[.24em] text-cyan-300">Módulo isolado · administrativo</p><h1 className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">Evolution Monitor</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Eventos de mensagens, classificação comercial e evidências de origem. Este ambiente não participa das métricas nem dos fluxos da dashboard atual.</p></div></div>
          <div className="flex flex-wrap items-center gap-3"><button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/[.06] hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Voltar à dashboard</button><button onClick={() => loadOverview(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3.5 py-2.5 text-xs font-medium text-[#082124] transition hover:bg-cyan-200 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Atualizar dados</button></div>
        </header>

        {error && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        <section aria-label="Escopo de instâncias" className="mb-6 grid gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs text-zinc-500">Unidade
            <select value={unitScope} onChange={(event) => { setUnitScope(event.target.value); setInstanceScope("all"); }} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-[#101214] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-300/50">
              <option value="all">Todas as unidades</option>
              {unitOptions.map((unit) => <option key={unit} value={unit}>{unit === "__unassigned" ? "Sem unidade atribuída" : unit}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-500">Instância Evolution
            <select value={instanceScope} onChange={(event) => setInstanceScope(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-[#101214] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-300/50">
              <option value="all">Todas as instâncias da seleção</option>
              {scopedInstances.map((instance) => <option key={instance.instanceName} value={instance.instanceName}>{instance.displayName || instance.instanceName}</option>)}
            </select>
          </label>
          <div className="flex items-end"><div className="rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-4 py-2.5 text-xs leading-5 text-cyan-100"><strong className="font-medium">{scopedInstances.length}</strong> instância(s) · <strong className="font-medium">{scopedSummary.totalLeads}</strong> contato(s)</div></div>
        </section>

        <nav aria-label="Áreas do Evolution Monitor" className="mb-8 flex flex-wrap gap-2 border-b border-white/8 pb-4">
          {([ ["operacao", "Operação", Activity], ["crm", "CRM", UsersRound], ["atribuicao", "Atribuição Meta", MousePointerClick], ["conversas", "Conversas", MessageCircleMore], ["origem", "Origem & tags", Tag], ["auditoria", "Auditoria", FileJson] ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setView(id)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition ${view === id ? "bg-cyan-300 text-[#082124] font-medium" : "border border-white/10 bg-white/[.025] text-zinc-400 hover:bg-white/[.06] hover:text-white"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </nav>

        {view === "crm" && <section className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">CRM por instância</p><h2 className="mt-1 font-['Space_Grotesk'] text-2xl font-light text-white">Pipeline comercial</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual.</p></div><div className="rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100"><strong className="font-medium">{scopedLeads.length}</strong> contato(s) no escopo atual</div></div>
          {automationLocked ? <div role="status" className="flex items-start gap-3 rounded-2xl border border-violet-300/25 bg-violet-400/10 px-5 py-4 text-sm text-violet-100"><Bot className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" /><div><strong className="font-medium">IA da Tráfego Pro atualizando o CRM</strong><p className="mt-1 text-xs leading-5 text-violet-200/75">A movimentação manual está temporariamente bloqueada. O painel atualiza automaticamente quando a análise terminar.</p></div></div> : latestAiUpdate ? <div className="flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[.07] px-5 py-4 text-sm text-violet-100"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" /><div><strong className="font-medium">Última atualização feita pela IA da Tráfego Pro</strong><p className="mt-1 text-xs leading-5 text-violet-200/75">{latestAiUpdate.contactName || "Contato sem nome"} foi movido para <span className="text-violet-100">{crmStages.find((stage) => stage.value === latestAiUpdate.crmStage)?.label}</span> em {formatDate(latestAiUpdate.crmStageUpdatedAt)}.</p></div></div> : <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-5 py-4 text-sm text-zinc-400"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" /><p className="text-xs leading-5">Ainda não há atualização automática aplicada pela IA da Tráfego Pro neste escopo.</p></div>}
          <DndContext sensors={dndSensors} onDragStart={(event) => { if (!automationLocked) setActiveCrmLeadId(String(event.active.id)); }} onDragCancel={() => setActiveCrmLeadId(null)} onDragEnd={handleCrmDragEnd}><div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{crmStages.map((stage) => <CrmStageColumn key={stage.value} stage={stage} leads={scopedLeads.filter((lead) => lead.crmStage === stage.value)} attributions={attributionByLead} movingLeadId={movingCrmLead} locked={automationLocked} onOpen={openCrmDetail} />)}</div><DragOverlay dropAnimation={null}>{activeCrmLead ? <div className="w-[250px] rounded-xl border border-cyan-300/50 bg-[#151a1c] p-3 shadow-2xl shadow-black/50"><p className="truncate text-sm text-zinc-100">{activeCrmLead.contactName || "Contato sem nome"}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400"><Phone className="h-3 w-3" />{formatAdminPhone(activeCrmLead)}</p></div> : null}</DragOverlay></DndContext>
          {crmDetailLead && <aside className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Detalhes do lead"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#101214] shadow-2xl shadow-black/60"><header className="flex items-start justify-between gap-4 border-b border-white/8 p-6"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">Detalhe do contato</p><h3 className="mt-1 font-['Space_Grotesk'] text-2xl font-light text-white">{crmDetailLead.contactName || "Contato sem nome"}</h3><p className="mt-2 text-sm text-zinc-400">{formatAdminPhone(crmDetailLead)} · {crmDetailLead.instanceName}</p></div><button onClick={() => setCrmDetailLeadId(null)} className="rounded-xl border border-white/10 p-2 text-zinc-400 hover:bg-white/[.06] hover:text-white" aria-label="Fechar detalhes"><X className="h-4 w-4" /></button></header><div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]"><div className="space-y-5"><section className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">Origem e atribuição</p><div className="mt-3"><OriginPill platform={crmDetailLead.originPlatform} evidence={crmDetailLead.originEvidence} /></div><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-zinc-600">Campanha</dt><dd className="text-right text-zinc-200">{attributionByLead.get(crmDetailLead.id)?.campaignName || "Não identificada"}</dd></div><div className="flex justify-between gap-3"><dt className="text-zinc-600">Conjunto</dt><dd className="text-right text-zinc-200">{attributionByLead.get(crmDetailLead.id)?.adsetName || "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-zinc-600">Criativo</dt><dd className="text-right text-zinc-200">{attributionByLead.get(crmDetailLead.id)?.creativeName || attributionByLead.get(crmDetailLead.id)?.adName || "—"}</dd></div></dl></section><section className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">Histórico comercial</p><div className="mt-3 space-y-3">{crmHistory.length === 0 ? <p className="text-xs text-zinc-600">Nenhuma movimentação registrada ainda.</p> : crmHistory.map((item) => <div key={item.id} className="border-l border-cyan-300/30 pl-3 text-xs"><p className="text-zinc-300">{crmStages.find((stage) => stage.value === item.fromStage)?.label || "Entrada"} <ChevronRight className="inline h-3 w-3 text-zinc-600" /> {crmStages.find((stage) => stage.value === item.toStage)?.label}</p><p className="mt-1 text-zinc-600">{formatDate(item.changedAt)} · {item.changedBy || "Sistema"}</p></div>)}</div></section></div><section className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">Mensagens</p><div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">{conversationLoading ? <RefreshCw className="mx-auto my-10 h-5 w-5 animate-spin text-zinc-500" /> : conversation.length === 0 ? <p className="py-10 text-center text-xs text-zinc-600">Não há mensagens textuais registradas.</p> : conversation.map((message) => <div key={message.id} className={`flex ${message.direction === "outgoing" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm ${message.direction === "outgoing" ? "bg-cyan-300 text-[#082124]" : "bg-white/[.07] text-zinc-200"}`}><p className="whitespace-pre-wrap break-words">{message.bodyText}</p><p className={`mt-1 text-[10px] ${message.direction === "outgoing" ? "text-[#164044]" : "text-zinc-600"}`}>{message.direction === "outgoing" ? "Enviada pela unidade" : "Recebida do contato"} · {formatDate(message.sentAt)}</p></div></div>)}</div></section></div></div></aside>}
        </section>}

        {view === "operacao" && <section className="mb-8 rounded-2xl border border-white/8 bg-white/[.025] p-6">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Organização operacional</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Instâncias por unidade</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Cadastre um nome de operação e a unidade responsável por cada WhatsApp. Cada nova instância que enviar eventos ao mesmo webhook aparecerá aqui.</p></div><Database className="h-5 w-5 text-zinc-600" /></div>
          {scopedInstances.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-zinc-500">Nenhuma instância nesta seleção.</p> : <div className="space-y-3">{scopedInstances.map((instance) => <form key={instance.instanceName} onSubmit={(event) => updateInstanceProfile(event, instance)} className="grid gap-3 rounded-xl border border-white/8 bg-black/15 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
            <label className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Nome da instância<input name="displayName" defaultValue={instance.displayName || ""} placeholder={instance.instanceName} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101214] px-3 py-2 text-xs normal-case tracking-normal text-zinc-200 outline-none focus:border-cyan-300/50" /></label>
            <label className="text-[10px] uppercase tracking-[.14em] text-zinc-600">Unidade<input name="unitName" defaultValue={instance.unitName || ""} placeholder="Ex.: Vida Card Ijuí" className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101214] px-3 py-2 text-xs normal-case tracking-normal text-zinc-200 outline-none focus:border-cyan-300/50" /></label>
            <div className="flex items-end"><span className={`rounded-full border px-2.5 py-2 text-[10px] uppercase tracking-[.12em] ${statusClass(instance.connectionStatus)}`}>{instance.connectionStatus}</span></div>
            <div className="flex items-end"><button disabled={savingInstance === instance.instanceName} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-medium text-[#082124] disabled:opacity-60">{savingInstance === instance.instanceName ? "Salvando" : "Salvar"}</button></div>
          </form>)}</div>}
        </section>}

        {view === "operacao" && <>
          <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, color, bg }) => <article key={label} className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-2xl shadow-black/10"><div className="mb-5 flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className={`grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}><Icon className="h-4 w-4" /></span></div><strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">{value}</strong></article>)}</section>
          <section className="mb-8 grid gap-5 xl:grid-cols-[1.5fr_.9fr]"><article className="rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Conexões</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Instâncias monitoradas</h2></div><Database className="h-5 w-5 text-zinc-600" /></div>{overview.instances.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-9 text-center"><Signal className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Nenhuma instância enviou eventos ainda.</p><p className="mt-1 text-xs text-zinc-600">A primeira chamada autenticada do webhook criará a instância aqui.</p></div> : <div className="divide-y divide-white/7">{overview.instances.map((instance) => <div key={instance.instanceName} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="text-sm text-zinc-100">{instance.displayName || instance.instanceName}</p><p className="mt-1 text-xs text-zinc-600">{instance.unitName || instance.instanceName} · última mensagem {formatDate(instance.lastMessageAt)}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.14em] ${statusClass(instance.connectionStatus)}`}>{instance.connectionStatus}</span></div>)}</div>}</article><aside className="rounded-2xl border border-cyan-300/12 bg-gradient-to-br from-cyan-400/[.10] to-indigo-500/[.06] p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300 text-[#082124]"><Webhook className="h-4 w-4" /></span><div><p className="text-xs uppercase tracking-[.18em] text-cyan-200/70">Conexão segura</p><h2 className="font-['Space_Grotesk'] text-lg font-light text-white">Endpoint do webhook</h2></div></div><code className="block break-all rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-cyan-100">{webhookUrl}</code><div className="mt-4 space-y-2 text-xs leading-5 text-zinc-400"><p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />O endpoint aceita somente chamadas Bearer com o segredo do projeto.</p><p className="flex gap-2"><Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />Ative inicialmente <code className="text-zinc-200">MESSAGES_UPSERT</code> e <code className="text-zinc-200">CONNECTION_UPDATE</code>.</p></div></aside></section>
          <section className="mb-8 rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Triagem comercial</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Contatos recebidos</h2></div><span className="text-xs text-zinc-600">Apenas dados mínimos para classificar o contato</span></div>{overview.leads.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><UsersRound className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Os contatos aparecerão após a primeira mensagem recebida.</p></div> : <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead className="border-b border-white/8 text-[10px] uppercase tracking-[.16em] text-zinc-600"><tr><th className="pb-3 font-medium">Contato</th><th className="pb-3 font-medium">Instância</th><th className="pb-3 font-medium">Mensagens</th><th className="pb-3 font-medium">Classificação</th><th className="pb-3 font-medium">Etapa</th><th className="pb-3 text-right font-medium">Ação</th></tr></thead><tbody className="divide-y divide-white/7">{overview.leads.map((lead) => <tr key={lead.id}><td className="py-4"><p className="text-sm text-zinc-100">{lead.contactName || "Contato sem nome"}</p><p className="mt-1 text-xs text-zinc-600">•••• {lead.phoneLast4 || "—"} · {formatDate(lead.lastMessageAt)}</p></td><td className="py-4 text-xs text-zinc-400">{lead.instanceName}</td><td className="py-4 text-xs text-zinc-400"><span className="text-cyan-200">{lead.messagesReceived} recebidas</span><span className="mx-1 text-zinc-700">/</span>{lead.messagesSent} enviadas</td><td className="py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.12em] ${lead.classification === "lead" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : lead.classification === "nao_lead" ? "border-zinc-500/20 bg-zinc-400/10 text-zinc-400" : "border-amber-400/20 bg-amber-300/10 text-amber-300"}`}>{classificationLabel(lead.classification)}</span></td><td className="py-4"><select aria-label={`Etapa de ${lead.contactName || "contato"}`} value={lead.funnelStage} onChange={(event) => updateLead(lead, lead.classification, event.target.value as Lead["funnelStage"])} disabled={automationLocked || updatingLead === lead.id} className="rounded-lg border border-white/10 bg-[#101214] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50">{stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></td><td className="py-4 text-right"><div className="inline-flex overflow-hidden rounded-lg border border-white/10"><button onClick={() => updateLead(lead, "lead", lead.funnelStage === "novo" ? "qualificado" : lead.funnelStage)} disabled={automationLocked || updatingLead === lead.id} className="border-r border-white/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50">É lead</button><button onClick={() => updateLead(lead, "nao_lead", "perdido")} disabled={automationLocked || updatingLead === lead.id} className="px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">Não lead</button></div></td></tr>)}</tbody></table></div>}</section>
        </>}

        {view === "atribuicao" && <section className="rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Atribuição de campanha</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Meta Ads por contato</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha, conjunto, anúncio ou criativo na fonte de métricas. Sem essa chave, a origem permanece não resolvida.</p></div><button onClick={() => loadAttributions()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.07]"><RefreshCw className="h-3.5 w-3.5" />Atualizar atribuições</button></div>{attributions.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><MousePointerClick className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Ainda não há atribuições Meta disponíveis.</p><p className="mt-1 text-xs text-zinc-600">Quando um evento trouxer uma referência Meta correspondente, a campanha e o criativo aparecerão aqui.</p></div> : <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left"><thead className="border-b border-white/8 text-[10px] uppercase tracking-[.16em] text-zinc-600"><tr><th className="pb-3 font-medium">Contato</th><th className="pb-3 font-medium">Campanha</th><th className="pb-3 font-medium">Conjunto</th><th className="pb-3 font-medium">Criativo / anúncio</th><th className="pb-3 font-medium">Método</th><th className="pb-3 text-right font-medium">Status</th></tr></thead><tbody className="divide-y divide-white/7">{attributions.map((item) => { const lead = overview.leads.find((candidate) => candidate.id === item.leadId); return <tr key={item.leadId}><td className="py-4"><p className="text-sm text-zinc-100">{lead?.contactName || "Contato sem nome"}</p><p className="mt-1 text-xs text-zinc-600">•••• {lead?.phoneLast4 || "—"}</p></td><td className="py-4"><p className="text-xs text-zinc-200">{item.campaignName || "Não identificado"}</p><code className="mt-1 block text-[10px] text-zinc-600">{item.campaignId || "—"}</code></td><td className="py-4"><p className="text-xs text-zinc-300">{item.adsetName || "—"}</p><code className="mt-1 block text-[10px] text-zinc-600">{item.adsetId || "—"}</code></td><td className="py-4"><p className="text-xs text-zinc-300">{item.creativeName || item.adName || "—"}</p><code className="mt-1 block text-[10px] text-zinc-600">{item.creativeId || item.adId || "—"}</code></td><td className="py-4 text-xs text-zinc-500">{item.matchedBy}</td><td className="py-4 text-right"><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.12em] ${item.matchStatus === "matched" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{item.matchStatus === "matched" ? "Correspondência confirmada" : "Não resolvida"}</span></td></tr>; })}</tbody></table></div>}</section>}

        {view === "conversas" && <section className="grid min-h-[590px] overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] lg:grid-cols-[340px_1fr]"><aside className="border-b border-white/8 lg:border-b-0 lg:border-r"><div className="border-b border-white/8 px-5 py-5"><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Conversas</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Contatos e histórico</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Mensagens recebidas e enviadas registradas pelo webhook.</p></div><div className="max-h-[520px] overflow-y-auto p-2">{overview.leads.length === 0 ? <p className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum contato disponível.</p> : overview.leads.map((lead) => <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`w-full rounded-xl px-4 py-3 text-left transition ${selectedLead?.id === lead.id ? "bg-cyan-300 text-[#082124]" : "hover:bg-white/[.05]"}`}><div className="flex items-center justify-between gap-3"><p className={`truncate text-sm ${selectedLead?.id === lead.id ? "text-[#082124]" : "text-zinc-200"}`}>{lead.contactName || "Contato sem nome"}</p><span className={`text-[10px] ${selectedLead?.id === lead.id ? "text-[#164044]" : "text-zinc-600"}`}>•••• {lead.phoneLast4 || "—"}</span></div><p className={`mt-1 truncate text-xs ${selectedLead?.id === lead.id ? "text-[#164044]" : "text-zinc-600"}`}>{lead.messagesReceived} recebidas · {lead.messagesSent} enviadas</p></button>)}</div></aside><div className="flex min-h-[520px] flex-col"><div className="border-b border-white/8 px-6 py-5"><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Linha do tempo</p><h3 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">{selectedLead?.contactName || "Selecione um contato"}</h3></div><div className="flex-1 space-y-3 overflow-y-auto p-6">{!selectedLead ? <p className="py-16 text-center text-sm text-zinc-500">Selecione um contato à esquerda para visualizar a conversa.</p> : conversationLoading ? <div className="grid h-full place-items-center text-zinc-500"><RefreshCw className="h-5 w-5 animate-spin" /></div> : conversation.length === 0 ? <div className="py-16 text-center"><MessageCircleMore className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Não há mensagens textuais registradas para este contato.</p><p className="mt-1 text-xs text-zinc-600">Novas mensagens recebidas pelo webhook aparecerão aqui.</p></div> : conversation.map((message) => <article key={message.id} className={`flex ${message.direction === "outgoing" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${message.direction === "outgoing" ? "bg-cyan-300 text-[#082124]" : "border border-white/10 bg-white/[.045] text-zinc-200"}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.bodyText}</p><div className={`mt-2 flex items-center justify-between gap-4 text-[10px] ${message.direction === "outgoing" ? "text-[#164044]" : "text-zinc-600"}`}><span>{message.direction === "outgoing" ? "Enviada pela unidade" : "Recebida do contato"}</span><time>{formatDate(message.sentAt)}</time></div></div></article>)}</div></div></section>}

        {view === "origem" && <>
          <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: "Meta verificado", value: sourceStats.verifiedMeta, icon: BadgeCheck, color: "text-emerald-300", bg: "bg-emerald-400/10" },
            { label: "Meta observado", value: sourceStats.observedMeta, icon: Signal, color: "text-amber-300", bg: "bg-amber-400/10" },
            { label: "Google Ads observado", value: sourceStats.observedGoogle, icon: Tag, color: "text-sky-300", bg: "bg-sky-400/10" },
            { label: "Sem evidência", value: sourceStats.withoutEvidence, icon: CircleAlert, color: "text-zinc-400", bg: "bg-white/[.06]" },
          ].map(({ label, value, icon: Icon, color, bg }) => <article key={label} className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="mb-5 flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className={`grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}><Icon className="h-4 w-4" /></span></div><strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">{value}</strong></article>)}</section>
          <section className="rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6"><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Evidências de origem</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Tags preservadas por contato</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">O status <strong className="font-medium text-emerald-200">Verificado</strong> aparece somente quando há um <code className="text-zinc-300">ctwa_clid</code>. Outros identificadores são sinais observados e nunca são tratados como prova de uma plataforma sem tag explícita.</p></div>{overview.leads.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-5 py-9 text-center text-sm text-zinc-500">Ainda não há contatos para analisar.</p> : <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left"><thead className="border-b border-white/8 text-[10px] uppercase tracking-[.16em] text-zinc-600"><tr><th className="pb-3 font-medium">Contato</th><th className="pb-3 font-medium">Origem</th><th className="pb-3 font-medium">Evidência</th><th className="pb-3 font-medium">Tag disponível</th><th className="pb-3 text-right font-medium">Detectado</th></tr></thead><tbody className="divide-y divide-white/7">{overview.leads.map((lead) => <tr key={lead.id}><td className="py-4"><p className="text-sm text-zinc-100">{lead.contactName || "Contato sem nome"}</p><p className="mt-1 text-xs text-zinc-600">•••• {lead.phoneLast4 || "—"} · {lead.instanceName}</p></td><td className="py-4"><OriginPill platform={lead.originPlatform} evidence={lead.originEvidence} /></td><td className="py-4 text-xs text-zinc-400">{evidenceLabel(lead.originEvidence)}</td><td className="py-4"><code className="rounded bg-black/20 px-2 py-1 text-xs text-cyan-100">{lead.metaCtwaClid || lead.googleClickId || "—"}</code></td><td className="py-4 text-right text-xs text-zinc-500">{formatDate(lead.originDetectedAt)}</td></tr>)}</tbody></table></div>}</section>
        </>}

        {view === "auditoria" && <section className="rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Auditoria de referência</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Eventos e payloads limitados</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">O painel exibe apenas tags de atribuição, sem identificadores de contato, conteúdo integral da conversa ou URLs com parâmetros sensíveis.</p></div><span className="text-xs text-zinc-600">{originEvents.length} evento(s) com sinal</span></div>{overview.events.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-zinc-500">Ainda não há eventos recebidos pelo webhook.</p> : <div className="divide-y divide-white/7">{overview.events.map((event) => <article key={event.id} className="py-5"><div className="grid gap-4 lg:grid-cols-[190px_160px_1fr_auto]"><div><p className="text-xs text-zinc-200">{event.instanceName}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-600">{event.direction} · {event.eventType}</p></div><OriginPill platform={event.originPlatform} evidence={event.originEvidence} /><div><p className="text-sm text-zinc-400">{event.messagePreview || "Evento do sistema — sem conteúdo de mensagem"}</p>{event.attributionPayload && <pre className="mt-3 max-w-full overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-3 text-xs leading-5 text-cyan-100">{JSON.stringify(event.attributionPayload, null, 2)}</pre>}</div><time className="text-xs text-zinc-600 lg:text-right">{formatDate(event.occurredAt || event.receivedAt)}</time></div></article>)}</div>}</section>}
        <footer className="flex items-center justify-end gap-1 pt-7 text-xs text-zinc-700">Painel administrativo isolado <ChevronRight className="h-3 w-3" /> Evolution</footer>
      </div>
    </main>
  );
}
