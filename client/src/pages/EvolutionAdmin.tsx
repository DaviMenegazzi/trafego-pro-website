import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleSlash,
  Clock3,
  Copy,
  Database,
  FileJson,
  GripVertical,
  HelpCircle,
  MessageCircleMore,
  MousePointerClick,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Signal,
  Tag,
  UsersRound,
  Webhook,
  X,
} from "lucide-react";
import { canAccessEvolutionPanel } from "@/lib/evolutionAdminPolicy";
import { resolveCrmDrop, type CrmStage } from "@/lib/crmPipeline";
import { scopeEvolutionData } from "@/lib/evolutionScope";
import {
  isEvolutionAiAutomationRunning,
  wasLastCrmUpdateMadeByAi,
  type EvolutionAiAutomationState,
} from "../../../shared/evolutionAiPolicy";
import { cn } from "@/lib/utils";

type Summary = { totalLeads: number; pendingLeads: number; qualifiedLeads: number; closedLeads: number; eventsToday: number };
type Instance = { instanceName: string; displayName: string | null; unitName: string | null; connectionStatus: string; lastEventAt: string | null; lastMessageAt: string | null };
type AuthorizedUnit = { id: string; name: string; client_group: string | null };
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
  { value: "novo", label: "Novo" },
  { value: "qualificado", label: "Qualificado" },
  { value: "negociacao", label: "Negociação" },
  { value: "perdido", label: "Perdido" },
  { value: "fechado", label: "Fechado" },
];

const crmStages: Array<{ value: CrmStage; label: string; color: string; indicatorColor: string }> = [
  { value: "lead_not_responded", label: "Não respondido", color: "border-zinc-500/25 bg-zinc-400/[.06]", indicatorColor: "bg-zinc-400" },
  { value: "lead_responded", label: "Respondido", color: "border-sky-400/25 bg-sky-400/[.07]", indicatorColor: "bg-sky-400" },
  { value: "follow_up", label: "Follow up", color: "border-amber-400/25 bg-amber-400/[.07]", indicatorColor: "bg-amber-400" },
  { value: "lead_replied", label: "Respondeu", color: "border-violet-400/25 bg-violet-400/[.07]", indicatorColor: "bg-violet-400" },
  { value: "negotiation", label: "Negociação", color: "border-indigo-400/25 bg-indigo-400/[.07]", indicatorColor: "bg-indigo-400" },
  { value: "closed_won", label: "Fechou (Ganho)", color: "border-emerald-400/25 bg-emerald-400/[.07]", indicatorColor: "bg-emerald-400" },
  { value: "closed_lost", label: "Perdido", color: "border-rose-400/25 bg-rose-400/[.07]", indicatorColor: "bg-rose-400" },
];

const emptyOverview: Overview = {
  summary: { totalLeads: 0, pendingLeads: 0, qualifiedLeads: 0, closedLeads: 0, eventsToday: 0 },
  instances: [],
  events: [],
  leads: [],
  automation: { lastRunStatus: null, lastStartedAt: null, lastCompletedAt: null },
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
    throw new Error(response.status === 404 ? "A rota Pixel ainda não está disponível no servidor." : fallback);
  }
  return response.json() as Promise<T>;
}

function statusClass(status: string): string {
  if (status === "open" || status === "connected") return "bg-emerald-400/12 text-emerald-300 border-emerald-400/25";
  if (status === "close" || status === "disconnected") return "bg-rose-400/12 text-rose-300 border-rose-400/25";
  return "bg-white/6 text-zinc-300 border-white/10";
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
  return evidence === "verified"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    : evidence === "observed"
    ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
    : "border-white/10 bg-white/[.04] text-zinc-400";
}

function OriginPill({ platform, evidence }: { platform: OriginPlatform; evidence: OriginEvidence }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${originClass(evidence)}`}>
      <Tag className="h-3 w-3 shrink-0" />
      <span>{originLabel(platform)} · {evidenceLabel(evidence)}</span>
    </span>
  );
}

function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copiado para a área de transferência" : `Copiar ${label}`}
      className={cn(
        "group relative inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] text-zinc-300 transition hover:border-cyan-300/30 hover:bg-white/[.06] hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/60 active:scale-95",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-300 animate-in zoom-in-75 duration-150" />
          <span className="text-emerald-300 font-medium">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 text-zinc-400 group-hover:text-cyan-300 transition-colors" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function PixelPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#090a0b] text-zinc-100 selection:bg-cyan-300/30" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between animate-pulse">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/[.05]" />
            <div className="space-y-2">
              <div className="h-3 w-40 rounded-md bg-white/[.05]" />
              <div className="h-8 w-64 rounded-lg bg-white/[.08]" />
              <div className="h-4 w-96 max-w-full rounded-md bg-white/[.04]" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-xl bg-white/[.04]" />
            <div className="h-10 w-36 rounded-xl bg-cyan-300/20" />
          </div>
        </div>

        <div className="mb-6 h-16 rounded-2xl border border-white/10 bg-white/[.02] animate-pulse" />

        <div className="mb-8 flex flex-wrap gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-28 rounded-xl bg-white/[.03]" />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/8 bg-white/[.025] p-5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

function CrmLeadCard({
  lead,
  attribution,
  moving,
  locked,
  onOpen,
}: {
  lead: Lead;
  attribution: MetaAttribution | undefined;
  moving: boolean;
  locked: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: locked,
  });

  const aiUpdated = wasLastCrmUpdateMadeByAi(lead.crmStageUpdatedBy);
  const style = isDragging ? undefined : { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className={cn(
        "group relative w-full cursor-grab rounded-xl border p-3.5 text-left shadow-md transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]",
        isDragging
          ? "cursor-grabbing opacity-30 border-dashed border-cyan-400/40 bg-cyan-950/20 scale-95"
          : "border-white/10 bg-[#101214] hover:border-cyan-300/40 hover:bg-[#14181a] hover:shadow-lg hover:shadow-black/40",
        locked && "cursor-not-allowed opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
          {lead.contactName || "Contato sem nome"}
        </p>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-500 opacity-40 transition group-hover:opacity-100 group-hover:text-cyan-300" />
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
        <Phone className="h-3 w-3 text-zinc-500" />
        <span>{formatAdminPhone(lead)}</span>
      </p>

      {attribution?.campaignName ? (
        <div className="mt-2.5 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-1.5">
          <p className="line-clamp-1 text-[10px] font-medium text-cyan-200">
            {attribution.campaignName}
          </p>
        </div>
      ) : (
        <div className="mt-2.5">
          <OriginPill platform={lead.originPlatform} evidence={lead.originEvidence} />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/6 pt-2 text-[10px] text-zinc-400">
        <span className="truncate max-w-[110px]">{lead.instanceName}</span>
        <span className="flex items-center gap-1 font-mono text-zinc-400">
          <MessageCircleMore className="h-3 w-3 text-cyan-300/70" />
          <span>
            {lead.messagesReceived} / {lead.messagesSent}
          </span>
        </span>
      </div>

      {aiUpdated && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-300">
          <Bot className="h-3 w-3 text-violet-400" />
          <span>Atualizado pela IA</span>
        </div>
      )}

      {moving && (
        <p className="mt-2 text-[10px] font-medium text-cyan-300 animate-pulse">
          Movendo…
        </p>
      )}
    </div>
  );
}

function CrmStageColumn({
  stage,
  leads,
  attributions,
  movingLeadId,
  locked,
  onOpen,
}: {
  stage: typeof crmStages[number];
  leads: Lead[];
  attributions: Map<string, MetaAttribution>;
  movingLeadId: string | null;
  locked: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
    disabled: locked,
  });

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "flex w-[290px] shrink-0 flex-col rounded-2xl border p-3.5 transition-colors duration-200 bg-black/20",
        stage.color,
        isOver && "border-cyan-300/60 bg-cyan-950/20 ring-2 ring-cyan-300/40 ring-offset-2 ring-offset-[#090a0b]"
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", stage.indicatorColor)} />
          <h3 className="text-xs font-medium text-zinc-100">{stage.label}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          {leads.length}
        </span>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[640px] pr-1">
        {isOver && (
          <div className="min-h-[90px] rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-400/[.06] animate-pulse flex items-center justify-center text-cyan-200 text-xs font-medium">
            Solte o contato aqui
          </div>
        )}

        {leads.length === 0 && !isOver ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-white/8 p-4 text-center text-xs text-zinc-500">
            {locked ? "Atualização automática em andamento" : "Nenhum lead nesta etapa"}
          </div>
        ) : (
          leads.map((lead) => (
            <CrmLeadCard
              key={lead.id}
              lead={lead}
              attribution={attributions.get(lead.id)}
              moving={movingLeadId === lead.id}
              locked={locked}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </article>
  );
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
  const [authorizedUnits, setAuthorizedUnits] = useState<AuthorizedUnit[]>([]);
  const [savingInstance, setSavingInstance] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [crmSearch, setCrmSearch] = useState("");
  const [attributionSearch, setAttributionSearch] = useState("");
  const [attributionFilter, setAttributionFilter] = useState<"all" | "matched" | "unresolved">("all");
  const [conversationSearch, setConversationSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<OriginEvidence | "google" | "all">("all");
  const [auditEventType, setAuditEventType] = useState("all");
  const [auditDirection, setAuditDirection] = useState("all");
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversasMessagesEndRef = useRef<HTMLDivElement>(null);

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
      setError(err instanceof Error ? err.message : "Não foi possível carregar o painel Pixel");
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

  const loadAuthorizedUnits = useCallback(async () => {
    try {
      const response = await fetch("/api/metrics/clients", { headers: requestHeaders() });
      const data = await readEvolutionJson<{ clients?: AuthorizedUnit[]; error?: string }>(response, "Não foi possível carregar as unidades autorizadas");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as unidades autorizadas");
      setAuthorizedUnits(data.clients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as unidades autorizadas");
    }
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
    void Promise.all([loadOverview(), loadAuthorizedUnits()]);
  }, [loadAuthorizedUnits, loadOverview, navigate, token]);

  useEffect(() => { if (view === "atribuicao") void loadAttributions(); }, [loadAttributions, view]);
  useEffect(() => { if (view === "conversas" && selectedLead) void loadConversation(selectedLead.id); }, [loadConversation, selectedLead, view]);
  useEffect(() => {
    if (!automationLocked) return;
    const interval = window.setInterval(() => void loadOverview(true), 15_000);
    return () => window.clearInterval(interval);
  }, [automationLocked, loadOverview]);

  useEffect(() => {
    if (!crmDetailLead) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCrmDetailLeadId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [crmDetailLead]);

  useEffect(() => {
    if (crmDetailLead && conversation.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.length, crmDetailLead]);

  useEffect(() => {
    if (view === "conversas" && conversation.length > 0) {
      conversasMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.length, view]);

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

  async function updateInstanceProfile(event: FormEvent<HTMLFormElement>, instance: Instance) {
    event.preventDefault();
    setSavingInstance(instance.instanceName);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/evolution/instances/${instance.instanceName}`, {
        method: "PUT", headers: requestHeaders(), body: JSON.stringify({ displayName: fields.get("displayName"), unitId: fields.get("unitId") }),
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
    { label: "Eventos hoje", value: scopedSummary.eventsToday, icon: Activity, color: "text-cyan-300", bg: "bg-cyan-400/10 border-cyan-300/20", description: "Mensagens e alterações registradas hoje" },
    { label: "Contatos rastreados", value: scopedSummary.totalLeads, icon: UsersRound, color: "text-indigo-300", bg: "bg-indigo-400/10 border-indigo-300/20", description: "Total de conversas ativas no escopo" },
    { label: "A validar", value: scopedSummary.pendingLeads, icon: CircleAlert, color: "text-amber-300", bg: "bg-amber-400/10 border-amber-300/20", description: "Contatos aguardando triagem comercial" },
    { label: "Fechados", value: scopedSummary.closedLeads, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-300/20", description: "Negociações convertidas com sucesso" },
  ];

  const filteredCrmLeads = useMemo(() => {
    if (!crmSearch.trim()) return scopedLeads;
    const q = crmSearch.toLowerCase();
    return scopedLeads.filter((l) =>
      (l.contactName?.toLowerCase().includes(q)) ||
      (l.contactPhone?.includes(q)) ||
      (l.phoneLast4?.includes(q)) ||
      (attributionByLead.get(l.id)?.campaignName?.toLowerCase().includes(q))
    );
  }, [crmSearch, scopedLeads, attributionByLead]);

  const filteredAttributions = useMemo(() => {
    let list = attributions;
    if (attributionFilter === "matched") list = list.filter((a) => a.matchStatus === "matched");
    else if (attributionFilter === "unresolved") list = list.filter((a) => a.matchStatus === "unresolved");

    if (attributionSearch.trim()) {
      const q = attributionSearch.toLowerCase();
      list = list.filter((a) => {
        const lead = overview.leads.find((l) => l.id === a.leadId);
        return (
          (a.campaignName?.toLowerCase().includes(q)) ||
          (a.campaignId?.toLowerCase().includes(q)) ||
          (a.adsetName?.toLowerCase().includes(q)) ||
          (a.creativeName?.toLowerCase().includes(q)) ||
          (lead?.contactName?.toLowerCase().includes(q)) ||
          (lead?.phoneLast4?.includes(q))
        );
      });
    }
    return list;
  }, [attributionFilter, attributionSearch, attributions, overview.leads]);

  const filteredConversasLeads = useMemo(() => {
    if (!conversationSearch.trim()) return scopedLeads;
    const q = conversationSearch.toLowerCase();
    return scopedLeads.filter((l) =>
      (l.contactName?.toLowerCase().includes(q)) ||
      (l.contactPhone?.includes(q)) ||
      (l.phoneLast4?.includes(q)) ||
      (l.instanceName.toLowerCase().includes(q))
    );
  }, [conversationSearch, scopedLeads]);

  const filteredOriginLeads = useMemo(() => {
    let list = scopedLeads;
    if (originFilter === "google") {
      list = list.filter((l) => l.originPlatform === "google_ads" && l.originEvidence !== "none");
    } else if (originFilter !== "all") {
      list = list.filter((l) => l.originEvidence === originFilter);
    }
    return list;
  }, [originFilter, scopedLeads]);

  const filteredAuditEvents = useMemo(() => {
    let list = scopedEvents;
    if (auditEventType !== "all") list = list.filter((e) => e.eventType === auditEventType);
    if (auditDirection !== "all") list = list.filter((e) => e.direction === auditDirection);
    return list;
  }, [auditDirection, auditEventType, scopedEvents]);

  if (loading) {
    return <PixelPageSkeleton />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090a0b] text-zinc-100 selection:bg-cyan-300/30 font-light" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/8 blur-[120px]" />
        <div className="absolute bottom-[-16rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Camada 1: PixelHeader */}
        <header className="mb-8 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,.15)]">
              <Signal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">
                  Tráfego Pro · Central de Rastreamento
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                  Em tempo real
                </span>
              </div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">
                Pixel & Atribuição
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-zinc-300">
                Monitoramento contínuo de instâncias WhatsApp, pipeline comercial CRM, correlação de campanhas Meta/Google e auditoria de webhooks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-zinc-300 transition-all duration-150 hover:border-white/20 hover:bg-white/[.06] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar à dashboard
            </button>
            <button
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              className="inline-flex min-w-[145px] items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-[#082124] shadow-sm transition-all duration-150 hover:bg-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,.30)] active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Sincronizando..." : "Atualizar dados"}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-500/20"
              aria-label="Dispensar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Camada 2: PixelScopeBar */}
        <section
          aria-label="Escopo de instâncias e unidades"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#090a0b]/85 p-3.5 shadow-xl backdrop-blur-md lg:sticky lg:top-3 lg:z-20 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-light text-zinc-400">
              Unidade
              <div className="relative mt-1">
                <select
                  value={unitScope}
                  onChange={(event) => {
                    setUnitScope(event.target.value);
                    setInstanceScope("all");
                  }}
                  className="block w-full appearance-none rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-9 text-xs font-light text-zinc-100 outline-none transition duration-150 hover:border-white/20 hover:bg-[#14181a] focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
                >
                  <option value="all">Todas as unidades autorizadas</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === "__unassigned" ? "Sem unidade atribuída" : unit}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </label>

            <label className="text-xs font-light text-zinc-400">
              Instância WhatsApp
              <div className="relative mt-1">
                <select
                  value={instanceScope}
                  onChange={(event) => setInstanceScope(event.target.value)}
                  className="block w-full appearance-none rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-9 text-xs font-light text-zinc-100 outline-none transition duration-150 hover:border-white/20 hover:bg-[#14181a] focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
                >
                  <option value="all">Todas as instâncias conectadas</option>
                  {scopedInstances.map((instance) => (
                    <option key={instance.instanceName} value={instance.instanceName}>
                      {instance.displayName || instance.instanceName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-3.5 py-2.5 text-xs text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <strong className="font-medium text-cyan-300">{scopedInstances.length}</strong>
              <span className="text-zinc-400">instância(s) ·</span>
              <strong className="font-medium text-cyan-300">{scopedSummary.totalLeads}</strong>
              <span className="text-zinc-400">contato(s)</span>
            </div>
          </div>
        </section>

        {/* Camada 3: PixelSegmentedTabs */}
        <nav aria-label="Áreas do Pixel" role="tablist" aria-orientation="horizontal" className="mb-8 inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[.025] p-1.5 shadow-inner">
          {([
            { id: "operacao", label: "Operação", icon: Activity, count: scopedInstances.length },
            { id: "crm", label: "CRM Pipeline", icon: UsersRound, count: scopedLeads.length },
            { id: "atribuicao", label: "Atribuição Meta", icon: MousePointerClick, count: attributions.length },
            { id: "conversas", label: "Conversas", icon: MessageCircleMore, count: scopedLeads.length },
            { id: "origem", label: "Origem & tags", icon: Tag, count: sourceStats.verifiedMeta + sourceStats.observedMeta },
            { id: "auditoria", label: "Auditoria", icon: FileJson, count: scopedEvents.length },
          ] as const).map(({ id, label, icon: Icon, count }) => {
            const isActive = view === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setView(id)}
                className={cn(
                  "group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                  isActive
                    ? "bg-white/[.08] text-white border border-white/10 shadow-sm shadow-black/40"
                    : "border border-transparent text-zinc-400 hover:bg-white/[.04] hover:text-zinc-200"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 transition-colors", isActive ? "text-cyan-300" : "text-zinc-400 group-hover:text-zinc-200")} />
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      isActive
                        ? "border border-cyan-400/30 bg-cyan-400/20 text-cyan-200"
                        : "bg-white/5 text-zinc-400 group-hover:text-zinc-300"
                    )}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.7)] transition-all duration-200 ease-out" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ABA 1: OPERAÇÃO */}
        {view === "operacao" && (
          <div className="space-y-8">
            {/* 1. Resumo Executivo de Métricas */}
            <section aria-label="Métricas executivas da operação" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, icon: Icon, color, bg, description }) => (
                <article
                  key={label}
                  className="group rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10 transition-all duration-200 hover:border-cyan-300/30 hover:bg-white/[.035] hover:shadow-[0_0_30px_rgba(34,211,238,.08)]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-light text-zinc-400">{label}</span>
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg border transition-transform duration-200 group-hover:scale-105", bg, color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                    {value}
                  </strong>
                  <p className="mt-2 text-[11px] font-light text-zinc-400">{description}</p>
                </article>
              ))}
            </section>

            {/* 2. Gestão de Conexões & Webhook (Split 1.5fr / 1fr) */}
            <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              {/* Painel Operacional de Instâncias */}
              <article className="rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Gestão Operacional</p>
                    <h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Instâncias por unidade</h2>
                    <p className="mt-1.5 text-xs font-light leading-5 text-zinc-300">
                      Cadastre o nome operacional e vincule cada WhatsApp à sua respectiva unidade autorizada no sistema.
                    </p>
                  </div>
                  <Database className="h-5 w-5 shrink-0 text-zinc-400" />
                </div>

                {scopedInstances.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
                    <Signal className="mx-auto mb-3 h-5 w-5 text-zinc-400" />
                    <p className="text-sm text-zinc-300">Nenhuma instância cadastrada sob o escopo atual.</p>
                    <p className="mt-1 text-xs text-zinc-400">A primeira requisição válida do webhook registrará a instância automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scopedInstances.map((instance) => (
                      <form
                        key={instance.instanceName}
                        onSubmit={(event) => updateInstanceProfile(event, instance)}
                        className="grid gap-3 rounded-xl border border-white/6 bg-black/20 p-4 md:grid-cols-[1.2fr_1.2fr_auto_auto] md:items-end"
                      >
                        <label className="text-[10px] font-medium uppercase tracking-[.14em] text-zinc-400">
                          Nome da instância
                          <input
                            name="displayName"
                            defaultValue={instance.displayName || ""}
                            placeholder={instance.instanceName}
                            className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101214] px-3 py-2 text-xs normal-case tracking-normal text-zinc-100 outline-none transition hover:border-white/20 focus:border-cyan-300/50"
                          />
                        </label>
                        <label className="text-[10px] font-medium uppercase tracking-[.14em] text-zinc-400">
                          Unidade
                          <select
                            key={`${instance.instanceName}-${authorizedUnits.map((u) => u.id).join("-")}`}
                            name="unitId"
                            defaultValue={authorizedUnits.find((u) => u.name === instance.unitName)?.id ?? ""}
                            disabled={authorizedUnits.length === 0}
                            className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101214] px-3 py-2 text-xs normal-case tracking-normal text-zinc-100 outline-none transition hover:border-white/20 focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">{authorizedUnits.length === 0 ? "Nenhuma unidade autorizada" : "Selecione a unidade"}</option>
                            {authorizedUnits.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div>
                          <span className={cn("inline-block rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em]", statusClass(instance.connectionStatus))}>
                            {instance.connectionStatus}
                          </span>
                        </div>
                        <div>
                          <button
                            type="submit"
                            disabled={savingInstance === instance.instanceName || authorizedUnits.length === 0}
                            className="w-full rounded-lg bg-cyan-300 px-3.5 py-2 text-xs font-semibold text-[#082124] transition hover:bg-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingInstance === instance.instanceName ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                )}
              </article>

              {/* Painel do Webhook Seguro */}
              <aside className="flex flex-col justify-between rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[.08] to-indigo-500/[.04] p-6 shadow-xl shadow-black/20">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-[#082124] shadow-[0_0_20px_rgba(34,211,238,.3)]">
                      <Webhook className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Recepção Segura</p>
                      <h2 className="font-['Space_Grotesk'] text-lg font-light text-white">Endpoint do Webhook</h2>
                    </div>
                  </div>

                  <div className="relative rounded-xl border border-white/10 bg-black/40 p-3">
                    <code className="block break-all font-mono text-xs leading-5 text-cyan-200 pr-16">
                      {webhookUrl}
                    </code>
                    <div className="absolute right-2.5 top-2.5">
                      <CopyButton text={webhookUrl} label="Copiar URL" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-xs font-light leading-5 text-zinc-300">
                    <p className="flex items-start gap-2.5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>Autenticação Bearer obrigatória com a chave de segurança do projeto.</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>Eventos recomendados na central: <code className="font-mono text-cyan-200">MESSAGES_UPSERT</code> e <code className="font-mono text-cyan-200">CONNECTION_UPDATE</code>.</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/8 pt-4">
                  <span className="text-[10px] uppercase tracking-[.14em] text-zinc-400">
                    Tráfego Pro Gateway v2 · Isolamento por Unidade
                  </span>
                </div>
              </aside>
            </section>

            {/* 3. Tabela de Triagem Comercial */}
            <section className="rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Triagem Comercial</p>
                  <h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Contatos recebidos</h2>
                  <p className="mt-1 text-xs font-light text-zinc-300">Classificação inicial e direcionamento para o pipeline de vendas.</p>
                </div>
                <span className="rounded-lg border border-white/8 bg-black/20 px-3 py-1.5 text-xs text-zinc-300">
                  {scopedLeads.length} contato(s) no escopo
                </span>
              </div>

              {scopedLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center">
                  <UsersRound className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
                  <p className="text-sm text-zinc-300">Nenhum contato recebido no escopo selecionado.</p>
                  <p className="mt-1 text-xs text-zinc-400">Novas mensagens registrarão leads automaticamente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] w-full text-left">
                    <thead className="border-b border-white/8 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">
                      <tr>
                        <th className="pb-3 font-medium">Contato</th>
                        <th className="pb-3 font-medium">Instância</th>
                        <th className="pb-3 font-medium">Mensagens</th>
                        <th className="pb-3 font-medium">Classificação</th>
                        <th className="pb-3 font-medium">Etapa</th>
                        <th className="pb-3 text-right font-medium">Ação rápida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {scopedLeads.map((lead) => (
                        <tr key={lead.id} className="transition-colors duration-150 hover:bg-white/[.025]">
                          <td className="py-3.5">
                            <p className="text-sm font-normal text-zinc-100">{lead.contactName || "Contato sem nome"}</p>
                            <p className="mt-0.5 text-xs text-zinc-400">
                              •••• {lead.phoneLast4 || "—"} · {formatDate(lead.lastMessageAt)}
                            </p>
                          </td>
                          <td className="py-3.5 text-xs text-zinc-300">{lead.instanceName}</td>
                          <td className="py-3.5 text-xs text-zinc-300">
                            <span className="text-cyan-300">{lead.messagesReceived} recebidas</span>
                            <span className="mx-1 text-zinc-500">/</span>
                            <span>{lead.messagesSent} enviadas</span>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em]",
                                lead.classification === "lead"
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : lead.classification === "nao_lead"
                                  ? "border-zinc-500/20 bg-zinc-400/10 text-zinc-400"
                                  : "border-amber-400/20 bg-amber-300/10 text-amber-300"
                              )}
                            >
                              {classificationLabel(lead.classification)}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <select
                              aria-label={`Etapa de ${lead.contactName || "contato"}`}
                              value={lead.funnelStage}
                              onChange={(event) => updateLead(lead, lead.classification, event.target.value as Lead["funnelStage"])}
                              disabled={automationLocked || updatingLead === lead.id}
                              className="rounded-lg border border-white/10 bg-[#101214] px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition hover:border-white/20 focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {stages.map((stage) => (
                                <option key={stage.value} value={stage.value}>
                                  {stage.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-white/[.02]">
                              <button
                                type="button"
                                onClick={() => updateLead(lead, "lead", lead.funnelStage === "novo" ? "qualificado" : lead.funnelStage)}
                                disabled={automationLocked || updatingLead === lead.id}
                                className="min-h-[36px] border-r border-white/10 px-3 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                É lead
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLead(lead, "nao_lead", "perdido")}
                                disabled={automationLocked || updatingLead === lead.id}
                                className="min-h-[36px] px-3 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Não lead
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ABA 2: CRM PIPELINE */}
        {view === "crm" && (
          <section className="space-y-6">
            {/* Header do CRM & Barra de Busca */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Pipeline Comercial</p>
                <h2 className="mt-1 font-['Space_Grotesk'] text-2xl font-light text-white">Esteira de Vendas</h2>
                <p className="mt-1.5 max-w-2xl text-xs font-light leading-5 text-zinc-300">
                  Arraste os contatos entre as etapas. A movimentação é sincronizada em tempo real no Pixel e isolada por instância e unidade.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    placeholder="Filtrar por nome, telefone ou campanha..."
                    className="w-full rounded-xl border border-white/10 bg-[#101214] py-2 pl-9 pr-8 text-xs font-light text-zinc-100 placeholder:text-zinc-500 outline-none transition hover:border-white/20 focus:border-cyan-300/50"
                  />
                  {crmSearch && (
                    <button
                      type="button"
                      onClick={() => setCrmSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-4 py-2.5 text-xs text-cyan-100">
                  <strong className="font-medium text-cyan-300">{filteredCrmLeads.length}</strong>
                  <span className="text-zinc-400"> de </span>
                  <strong className="font-medium text-zinc-200">{scopedLeads.length}</strong>
                  <span className="text-zinc-400"> leads no escopo</span>
                </div>
              </div>
            </div>

            {/* Banner de Automação IA */}
            {automationLocked ? (
              <div role="status" className="flex items-start gap-3 rounded-2xl border border-violet-300/25 bg-violet-400/10 px-5 py-4 text-sm text-violet-100 shadow-lg shadow-violet-950/20">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-violet-300" />
                <div>
                  <strong className="font-medium">IA da Tráfego Pro atualizando o CRM</strong>
                  <p className="mt-1 text-xs leading-5 text-violet-200/80">
                    A movimentação manual está temporariamente pausada para evitar concorrência. O painel será atualizado automaticamente ao concluir.
                  </p>
                </div>
              </div>
            ) : latestAiUpdate ? (
              <div className="flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[.07] px-5 py-3.5 text-sm text-violet-100">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <div>
                  <strong className="text-xs font-medium">Última atualização feita pela IA da Tráfego Pro</strong>
                  <p className="mt-0.5 text-xs leading-5 text-violet-200/80">
                    <span className="text-white font-normal">{latestAiUpdate.contactName || "Contato sem nome"}</span> foi movido para{" "}
                    <span className="text-cyan-200 font-medium">
                      {crmStages.find((stage) => stage.value === latestAiUpdate.crmStage)?.label}
                    </span>{" "}
                    em {formatDate(latestAiUpdate.crmStageUpdatedAt)}.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Esteira Horizontal Contínua de 7 Colunas (290px cada) */}
            <DndContext
              sensors={dndSensors}
              onDragStart={(event) => {
                if (!automationLocked) setActiveCrmLeadId(String(event.active.id));
              }}
              onDragCancel={() => setActiveCrmLeadId(null)}
              onDragEnd={handleCrmDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
                {crmStages.map((stage) => (
                  <CrmStageColumn
                    key={stage.value}
                    stage={stage}
                    leads={filteredCrmLeads.filter((lead) => lead.crmStage === stage.value)}
                    attributions={attributionByLead}
                    movingLeadId={movingCrmLead}
                    locked={automationLocked}
                    onOpen={openCrmDetail}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={dropAnimationConfig}>
                {activeCrmLead ? (
                  <div className="w-[270px] rounded-xl border border-cyan-300/60 bg-[#151a1c] p-3.5 shadow-2xl shadow-cyan-950/50 cursor-grabbing pointer-events-none">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {activeCrmLead.contactName || "Contato sem nome"}
                      </p>
                      <OriginPill platform={activeCrmLead.originPlatform} evidence={activeCrmLead.originEvidence} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                      <Phone className="h-3 w-3 text-cyan-300" />
                      {formatAdminPhone(activeCrmLead)}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Modal de Detalhes do Lead (crmDetailLead) */}
            {crmDetailLead && (
              <aside
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-opacity duration-200"
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes do lead"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setCrmDetailLeadId(null);
                }}
              >
                <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden flex flex-col rounded-2xl border border-white/10 bg-[#101214] shadow-2xl shadow-black/80">
                  <header className="flex items-start justify-between gap-4 border-b border-white/8 p-6 bg-white/[.01]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">
                          Detalhe do Contato
                        </span>
                        <OriginPill platform={crmDetailLead.originPlatform} evidence={crmDetailLead.originEvidence} />
                      </div>
                      <h3 className="font-['Space_Grotesk'] text-2xl font-light text-white">
                        {crmDetailLead.contactName || "Contato sem nome"}
                      </h3>
                      <p className="mt-1 text-xs font-light text-zinc-400">
                        {formatAdminPhone(crmDetailLead)} · Instância: <span className="text-zinc-200">{crmDetailLead.instanceName}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCrmDetailLeadId(null)}
                      className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:bg-white/[.06] hover:text-white"
                      aria-label="Fechar detalhes"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </header>

                  <div className="grid flex-1 overflow-y-auto p-6 gap-6 lg:grid-cols-[1fr_1.3fr]">
                    {/* Coluna Esquerda: Origem/Atribuição & Histórico */}
                    <div className="space-y-5">
                      <section className="rounded-xl border border-white/8 bg-black/25 p-4">
                        <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">Origem & Atribuição Meta</p>
                        <dl className="mt-3.5 space-y-2.5 text-xs">
                          <div className="flex justify-between items-start gap-3">
                            <dt className="text-zinc-400">Campanha</dt>
                            <dd className="text-right text-zinc-100 font-medium">
                              {attributionByLead.get(crmDetailLead.id)?.campaignName || "Não identificada"}
                            </dd>
                          </div>
                          <div className="flex justify-between items-start gap-3">
                            <dt className="text-zinc-400">Conjunto</dt>
                            <dd className="text-right text-zinc-200">
                              {attributionByLead.get(crmDetailLead.id)?.adsetName || "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between items-start gap-3">
                            <dt className="text-zinc-400">Criativo</dt>
                            <dd className="text-right text-zinc-200">
                              {attributionByLead.get(crmDetailLead.id)?.creativeName || attributionByLead.get(crmDetailLead.id)?.adName || "—"}
                            </dd>
                          </div>
                          {attributionByLead.get(crmDetailLead.id)?.campaignId && (
                            <div className="pt-2 border-t border-white/6 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-zinc-400">ID da Campanha:</span>
                              <div className="flex items-center gap-1">
                                <code className="font-mono text-[10px] text-cyan-200">
                                  {attributionByLead.get(crmDetailLead.id)?.campaignId}
                                </code>
                                <CopyButton text={attributionByLead.get(crmDetailLead.id)!.campaignId!} label="Copiar" />
                              </div>
                            </div>
                          )}
                        </dl>
                      </section>

                      <section className="rounded-xl border border-white/8 bg-black/25 p-4">
                        <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">Histórico Comercial CRM</p>
                        <div className="mt-3.5 space-y-3">
                          {crmHistory.length === 0 ? (
                            <p className="text-xs text-zinc-400">Nenhuma movimentação manual registrada até o momento.</p>
                          ) : (
                            crmHistory.map((item) => (
                              <div key={item.id} className="border-l-2 border-cyan-400/40 pl-3 text-xs">
                                <p className="text-zinc-200 font-normal">
                                  {crmStages.find((s) => s.value === item.fromStage)?.label || "Entrada"}
                                  <ChevronRight className="inline h-3 w-3 mx-1 text-zinc-400" />
                                  <span className="text-cyan-300 font-medium">
                                    {crmStages.find((s) => s.value === item.toStage)?.label}
                                  </span>
                                </p>
                                <p className="mt-1 text-[11px] text-zinc-400">
                                  {formatDate(item.changedAt)} · {item.changedBy || "Sistema"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>

                    {/* Coluna Direita: Mensagens WhatsApp com Auto-scroll */}
                    <section className="flex flex-col rounded-xl border border-white/8 bg-black/25 p-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/8">
                        <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">Mensagens Registradas</p>
                        <span className="text-[11px] text-zinc-400">
                          {conversation.length} mensagem(ns)
                        </span>
                      </div>

                      <div className="mt-3 max-h-[420px] flex-1 space-y-3 overflow-y-auto pr-1">
                        {conversationLoading ? (
                          <div className="py-12 text-center text-zinc-400">
                            <RefreshCw className="mx-auto h-5 w-5 animate-spin text-cyan-300" />
                            <p className="mt-2 text-xs">Carregando histórico...</p>
                          </div>
                        ) : conversation.length === 0 ? (
                          <p className="py-12 text-center text-xs text-zinc-400">
                            Não há mensagens textuais registradas para este contato.
                          </p>
                        ) : (
                          <>
                            {conversation.map((message) => (
                              <div
                                key={message.id}
                                className={cn("flex", message.direction === "outgoing" ? "justify-end" : "justify-start")}
                              >
                                <div
                                  className={cn(
                                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                                    message.direction === "outgoing"
                                      ? "bg-cyan-300 text-[#062428]"
                                      : "border border-white/10 bg-white/[.05] text-zinc-100"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.bodyText}</p>
                                  <p
                                    className={cn(
                                      "mt-1 text-[10px]",
                                      message.direction === "outgoing" ? "text-[#124348]" : "text-zinc-400"
                                    )}
                                  >
                                    {message.direction === "outgoing" ? "Enviada pela unidade" : "Recebida do contato"} · {formatDate(message.sentAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </aside>
            )}
          </section>
        )}

        {/* ABA 3: ATRIBUIÇÃO META */}
        {view === "atribuicao" && (
          <section className="space-y-6">
            {/* 1. KPIs de Correlação */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-light text-zinc-400">Total rastreado Meta</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                    <MousePointerClick className="h-4 w-4" />
                  </span>
                </div>
                <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                  {attributions.length}
                </strong>
                <p className="mt-2 text-[11px] font-light text-zinc-400">Leads com identificadores Meta</p>
              </article>

              <article className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-light text-zinc-400">Correspondência confirmada</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                </div>
                <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                  {attributions.filter((a) => a.matchStatus === "matched").length}
                </strong>
                <p className="mt-2 text-[11px] font-light text-zinc-400">Campanha e anúncio correlacionados</p>
              </article>

              <article className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-light text-zinc-400">Não resolvidos / Sinais</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-300/20 bg-amber-400/10 text-amber-300">
                    <HelpCircle className="h-4 w-4" />
                  </span>
                </div>
                <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                  {attributions.filter((a) => a.matchStatus === "unresolved").length}
                </strong>
                <p className="mt-2 text-[11px] font-light text-zinc-400">Sem correspondência de chave</p>
              </article>

              <article className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-light text-zinc-400">Taxa de pareamento</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-300/20 bg-indigo-400/10 text-indigo-300">
                    <Activity className="h-4 w-4" />
                  </span>
                </div>
                <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                  {attributions.length
                    ? `${Math.round((attributions.filter((a) => a.matchStatus === "matched").length / attributions.length) * 100)}%`
                    : "0%"}
                </strong>
                <p className="mt-2 text-[11px] font-light text-zinc-400">Eficácia da atribuição automática</p>
              </article>
            </div>

            {/* 2. Tabela de Atribuição com Filtros */}
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Atribuição de Campanha</p>
                  <h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Meta Ads por Contato</h2>
                  <p className="mt-1.5 max-w-2xl text-xs font-light leading-5 text-zinc-300">
                    O vínculo é estabelecido quando o webhook do Pixel recebe um identificador Meta e corresponde a campanha, conjunto, anúncio ou criativo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => loadAttributions()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2 text-xs text-zinc-300 transition hover:bg-white/[.07] hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar atribuições
                  </button>
                </div>
              </div>

              {/* Controles de Filtro */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-y border-white/8 py-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={attributionSearch}
                    onChange={(e) => setAttributionSearch(e.target.value)}
                    placeholder="Buscar por contato, campanha ou ID..."
                    className="w-full rounded-xl border border-white/10 bg-[#101214] py-2 pl-9 pr-8 text-xs font-light text-zinc-100 placeholder:text-zinc-500 outline-none transition hover:border-white/20 focus:border-cyan-300/50"
                  />
                  {attributionSearch && (
                    <button
                      type="button"
                      onClick={() => setAttributionSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
                  {(["all", "matched", "unresolved"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAttributionFilter(mode)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                        attributionFilter === mode
                          ? "bg-white/[.08] text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {mode === "all" ? "Todos" : mode === "matched" ? "Confirmados" : "Não resolvidos"}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAttributions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center">
                  <MousePointerClick className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
                  <p className="text-sm text-zinc-300">Ainda não há atribuições Meta correspondentes ao filtro.</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Quando uma mensagem com referência Meta for identificada, a correlação aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-left">
                    <thead className="border-b border-white/8 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">
                      <tr>
                        <th className="pb-3 font-medium">Contato</th>
                        <th className="pb-3 font-medium">Campanha Meta</th>
                        <th className="pb-3 font-medium">Conjunto de anúncios</th>
                        <th className="pb-3 font-medium">Criativo / anúncio</th>
                        <th className="pb-3 font-medium">Método</th>
                        <th className="pb-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {filteredAttributions.map((item) => {
                        const lead = overview.leads.find((candidate) => candidate.id === item.leadId);
                        return (
                          <tr key={item.leadId} className="transition-colors duration-150 hover:bg-white/[.025]">
                            <td className="py-3.5">
                              <p className="text-sm font-normal text-zinc-100">{lead?.contactName || "Contato sem nome"}</p>
                              <p className="mt-0.5 text-xs text-zinc-400">•••• {lead?.phoneLast4 || "—"}</p>
                            </td>
                            <td className="py-3.5">
                              <p className="text-xs font-medium text-zinc-200">{item.campaignName || "Não identificado"}</p>
                              {item.campaignId && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <code className="font-mono text-[10px] text-cyan-200 truncate max-w-[160px]">{item.campaignId}</code>
                                  <CopyButton text={item.campaignId} label="Copiar" />
                                </div>
                              )}
                            </td>
                            <td className="py-3.5">
                              <p className="text-xs text-zinc-300">{item.adsetName || "—"}</p>
                              {item.adsetId && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <code className="font-mono text-[10px] text-cyan-200 truncate max-w-[160px]">{item.adsetId}</code>
                                  <CopyButton text={item.adsetId} label="Copiar" />
                                </div>
                              )}
                            </td>
                            <td className="py-3.5">
                              <p className="text-xs text-zinc-300">{item.creativeName || item.adName || "—"}</p>
                              {(item.creativeId || item.adId) && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <code className="font-mono text-[10px] text-cyan-200 truncate max-w-[160px]">{item.creativeId || item.adId}</code>
                                  <CopyButton text={item.creativeId || item.adId!} label="Copiar" />
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 text-xs text-zinc-400">{item.matchedBy}</td>
                            <td className="py-3.5 text-right">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em]",
                                  item.matchStatus === "matched"
                                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                                )}
                              >
                                {item.matchStatus === "matched" ? (
                                  <>
                                    <BadgeCheck className="h-3 w-3" />
                                    Confirmado
                                  </>
                                ) : (
                                  <>
                                    <CircleAlert className="h-3 w-3" />
                                    Não resolvida
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ABA 4: CONVERSAS */}
        {view === "conversas" && (
          <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] shadow-xl shadow-black/20 lg:grid-cols-[360px_1fr]">
            {/* Painel Esquerdo: Lista de Contatos */}
            <aside className="border-b border-white/8 lg:border-b-0 lg:border-r flex flex-col">
              <div className="border-b border-white/8 p-4">
                <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Conversas</p>
                <h2 className="mt-1 font-['Space_Grotesk'] text-lg font-light text-white">Contatos e Histórico</h2>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    placeholder="Filtrar contato..."
                    className="w-full rounded-xl border border-white/10 bg-[#101214] py-2 pl-9 pr-7 text-xs font-light text-zinc-100 placeholder:text-zinc-500 outline-none transition hover:border-white/20 focus:border-cyan-300/50"
                  />
                  {conversationSearch && (
                    <button
                      type="button"
                      onClick={() => setConversationSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[540px] flex-1 overflow-y-auto p-2 space-y-1">
                {filteredConversasLeads.length === 0 ? (
                  <p className="px-4 py-10 text-center text-xs text-zinc-400">Nenhum contato encontrado.</p>
                ) : (
                  filteredConversasLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={cn(
                          "w-full rounded-xl px-3.5 py-3 text-left transition duration-150",
                          isSelected
                            ? "border border-cyan-400/40 bg-cyan-400/[.08] shadow-sm"
                            : "border border-transparent hover:bg-white/[.04]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-xs font-medium", isSelected ? "text-cyan-200" : "text-zinc-100")}>
                            {lead.contactName || "Contato sem nome"}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            •••• {lead.phoneLast4 || "—"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="truncate max-w-[140px]">{lead.instanceName}</span>
                          <span className="text-cyan-300/90">{lead.messagesReceived} rec / {lead.messagesSent} env</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Painel Direito: Linha do Tempo da Conversa */}
            <div className="flex min-h-[540px] flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-6 py-4 bg-white/[.01]">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Linha do Tempo</p>
                  <h3 className="mt-0.5 font-['Space_Grotesk'] text-lg font-light text-white">
                    {selectedLead ? selectedLead.contactName || "Contato sem nome" : "Selecione um contato"}
                  </h3>
                  {selectedLead && (
                    <p className="text-xs font-light text-zinc-400">
                      •••• {selectedLead.phoneLast4 || "—"} · Instância: <span className="text-zinc-200">{selectedLead.instanceName}</span>
                    </p>
                  )}
                </div>

                {selectedLead && (
                  <button
                    type="button"
                    onClick={() => openCrmDetail(selectedLead)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[.06] hover:text-white"
                  >
                    <UsersRound className="h-3.5 w-3.5 text-cyan-300" />
                    Abrir no CRM
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-6">
                {!selectedLead ? (
                  <div className="py-20 text-center text-zinc-400">
                    <MessageCircleMore className="mx-auto mb-3 h-6 w-6 text-zinc-500" />
                    <p className="text-sm text-zinc-300">Selecione um contato à esquerda para visualizar as mensagens.</p>
                  </div>
                ) : conversationLoading ? (
                  <div className="grid h-full place-items-center py-20 text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />
                    <p className="mt-2 text-xs">Carregando conversa...</p>
                  </div>
                ) : conversation.length === 0 ? (
                  <div className="py-20 text-center text-zinc-400">
                    <MessageCircleMore className="mx-auto mb-3 h-6 w-6 text-zinc-500" />
                    <p className="text-sm text-zinc-300">Não há mensagens textuais registradas para este contato.</p>
                    <p className="mt-1 text-xs text-zinc-400">Novas mensagens recebidas pelo webhook aparecerão aqui.</p>
                  </div>
                ) : (
                  <>
                    {conversation.map((message) => (
                      <article
                        key={message.id}
                        className={cn("flex", message.direction === "outgoing" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[82%] rounded-2xl px-4 py-3",
                            message.direction === "outgoing"
                              ? "bg-cyan-300 text-[#062428]"
                              : "border border-white/10 bg-white/[.045] text-zinc-100"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.bodyText}</p>
                          <div
                            className={cn(
                              "mt-2 flex items-center justify-between gap-4 text-[10px]",
                              message.direction === "outgoing" ? "text-[#124348]" : "text-zinc-400"
                            )}
                          >
                            <span>{message.direction === "outgoing" ? "Enviada pela unidade" : "Recebida do contato"}</span>
                            <time>{formatDate(message.sentAt)}</time>
                          </div>
                        </div>
                      </article>
                    ))}
                    <div ref={conversasMessagesEndRef} />
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ABA 5: ORIGEM & TAGS */}
        {view === "origem" && (
          <section className="space-y-6">
            {/* 4 KPIs Interativos (clique para filtrar) */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "verified" as const,
                  label: "Meta verificado",
                  value: sourceStats.verifiedMeta,
                  icon: BadgeCheck,
                  color: "text-emerald-300",
                  bg: "bg-emerald-400/10 border-emerald-300/20",
                  desc: "Com ctwa_clid garantido",
                },
                {
                  key: "observed" as const,
                  label: "Meta observado",
                  value: sourceStats.observedMeta,
                  icon: Signal,
                  color: "text-amber-300",
                  bg: "bg-amber-400/10 border-amber-300/20",
                  desc: "Sinal textual ou referência",
                },
                {
                  key: "google" as const,
                  label: "Google Ads observado",
                  value: sourceStats.observedGoogle,
                  icon: Tag,
                  color: "text-sky-300",
                  bg: "bg-sky-400/10 border-sky-300/20",
                  desc: "Parâmetro gclid capturado",
                },
                {
                  key: "none" as const,
                  label: "Sem evidência",
                  value: sourceStats.withoutEvidence,
                  icon: CircleSlash,
                  color: "text-zinc-400",
                  bg: "bg-white/[.06] border-white/10",
                  desc: "Contato orgânico ou direto",
                },
              ].map(({ key, label, value, icon: Icon, color, bg, desc }) => {
                const isSelected = originFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOriginFilter(isSelected ? "all" : key)}
                    className={cn(
                      "text-left rounded-2xl border p-5 shadow-lg shadow-black/10 transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                      isSelected
                        ? "border-cyan-300/50 bg-cyan-400/[.06] shadow-[0_0_20px_rgba(34,211,238,.12)] ring-1 ring-cyan-300/40"
                        : "border-white/8 bg-white/[.025] hover:border-cyan-300/30 hover:bg-white/[.035]"
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-light text-zinc-400">{label}</span>
                      <span className={cn("grid h-8 w-8 place-items-center rounded-lg border", bg, color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
                        {value}
                      </strong>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-semibold text-cyan-300 tracking-wider">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] font-light text-zinc-400">{desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Tabela de Tags Preservadas */}
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Evidências de Origem</p>
                  <h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Tags preservadas por contato</h2>
                  <p className="mt-1.5 max-w-3xl text-xs font-light leading-5 text-zinc-300">
                    O status <strong className="font-medium text-emerald-300">Verificado</strong> é atribuído exclusivamente quando há um <code className="font-mono text-cyan-200">ctwa_clid</code> presente.
                  </p>
                </div>

                {originFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setOriginFilter("all")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    <span>Limpar filtro: {originFilter}</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {filteredOriginLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center">
                  <Tag className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
                  <p className="text-sm text-zinc-300">Nenhum contato com o nível de evidência selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left">
                    <thead className="border-b border-white/8 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">
                      <tr>
                        <th className="pb-3 font-medium">Contato</th>
                        <th className="pb-3 font-medium">Plataforma Origem</th>
                        <th className="pb-3 font-medium">Nível de Evidência</th>
                        <th className="pb-3 font-medium">Tag disponível</th>
                        <th className="pb-3 text-right font-medium">Detectado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {filteredOriginLeads.map((lead) => {
                        const tag = lead.metaCtwaClid || lead.googleClickId || null;
                        return (
                          <tr key={lead.id} className="transition-colors duration-150 hover:bg-white/[.025]">
                            <td className="py-3.5">
                              <p className="text-sm font-normal text-zinc-100">{lead.contactName || "Contato sem nome"}</p>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                •••• {lead.phoneLast4 || "—"} · {lead.instanceName}
                              </p>
                            </td>
                            <td className="py-3.5">
                              <OriginPill platform={lead.originPlatform} evidence={lead.originEvidence} />
                            </td>
                            <td className="py-3.5 text-xs text-zinc-300 font-light">
                              {evidenceLabel(lead.originEvidence)}
                            </td>
                            <td className="py-3.5">
                              {tag ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <code className="max-w-[220px] truncate rounded bg-black/40 px-2 py-1 font-mono text-xs text-cyan-200">
                                    {tag}
                                  </code>
                                  <CopyButton text={tag} label="Copiar" />
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right text-xs text-zinc-400 font-light">
                              {formatDate(lead.originDetectedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ABA 6: AUDITORIA */}
        {view === "auditoria" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-6 shadow-xl shadow-black/20">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">Auditoria de Referência</p>
                  <h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Eventos e Payloads Limitados</h2>
                  <p className="mt-1.5 max-w-3xl text-xs font-light leading-5 text-zinc-300">
                    Histórico cronológico de requisições processadas pelo webhook com higienização de dados e tags de campanha.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
                    {(["all", "MESSAGES_UPSERT", "CONNECTION_UPDATE"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAuditEventType(type)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                          auditEventType === type
                            ? "bg-white/[.08] text-white shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {type === "all" ? "Todos os eventos" : type}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
                    {(["all", "incoming", "outgoing"] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setAuditDirection(dir)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                          auditDirection === dir
                            ? "bg-white/[.08] text-white shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {dir === "all" ? "Todas direções" : dir === "incoming" ? "Entrada" : "Saída"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredAuditEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-5 py-12 text-center">
                  <FileJson className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
                  <p className="text-sm text-zinc-300">Nenhum evento registrado correspondente ao filtro.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/8">
                  {filteredAuditEvents.map((event) => {
                    const isExpanded = expandedPayloadId === event.id;
                    const hasPayload = Boolean(event.attributionPayload);
                    return (
                      <article key={event.id} className="py-4 transition-colors duration-150 hover:bg-white/[.015] px-2 rounded-xl">
                        <div className="grid gap-4 lg:grid-cols-[190px_160px_1fr_auto] lg:items-start">
                          <div>
                            <p className="text-xs font-medium text-zinc-200">{event.instanceName}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-400">
                              {event.direction} · {event.eventType}
                            </p>
                          </div>

                          <div>
                            <OriginPill platform={event.originPlatform} evidence={event.originEvidence} />
                          </div>

                          <div>
                            <p className="text-xs font-light text-zinc-300">
                              {event.messagePreview || "Evento do sistema — sem conteúdo textual"}
                            </p>

                            {hasPayload && (
                              <div className="mt-2.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPayloadId(isExpanded ? null : event.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[.02] px-2 py-1 text-[10px] font-medium text-cyan-300 transition hover:bg-white/[.06]"
                                >
                                  <span>{isExpanded ? "Ocultar payload JSON" : "Visualizar payload JSON"}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                                </button>

                                {isExpanded && (
                                  <div className="relative mt-2 max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3">
                                    <div className="absolute right-2 top-2">
                                      <CopyButton
                                        text={JSON.stringify(event.attributionPayload, null, 2)}
                                        label="Copiar JSON"
                                      />
                                    </div>
                                    <pre className="font-mono text-xs leading-5 text-cyan-200 pr-16 whitespace-pre-wrap break-all">
                                      {JSON.stringify(event.attributionPayload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <time className="text-xs font-light text-zinc-400 lg:text-right">
                            {formatDate(event.occurredAt || event.receivedAt)}
                          </time>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Rodapé Sanitizado */}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6 pb-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Signal className="h-3.5 w-3.5 text-cyan-300" />
            <span>Tráfego Pro Pixel · Central de Rastreamento v2.0</span>
          </div>
          <p className="text-zinc-500">Monitoramento contínuo e isolado por instância e unidade.</p>
        </footer>
      </div>
    </main>
  );
}

