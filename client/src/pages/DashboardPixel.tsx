import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import {
  Avatar,
  Button,
  DatePicker,
  Dialog,
  EmptyState,
  Field,
  FolderTabs,
  IconButton,
  InlineNotice,
  Input,
  Page,
  PageHeader,
  Popover,
  SegmentedControl,
  Select,
  Surface,
  SurfaceHeader,
  Tooltip,
  toast,
} from "@/components/ds";
import { CrmPanel } from "@/components/crm/CrmPanel";
import { CrmTemperature, relativeTime } from "@/components/crm/crmUi";
import { useClientContext } from "@/contexts/ClientContext";
import { getToken, useAdminAuth } from "@/hooks/useAdminAuth";
import { useScrollFade } from "@/hooks/useScrollFade";
import { formatPhone } from "@/lib/format";
import { useNavNewBadge } from "@/lib/navNewBadge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Filter,
  FlaskConical,
  ImageOff,
  Loader2,
  MessageCircleMore,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Smartphone,
  SquareKanban,
  Wifi,
  WifiOff,
} from "lucide-react";

type PixelInstance = {
  instanceName: string;
  displayName: string | null;
  unitName: string | null;
  connectionStatus: string;
  lastEventAt: string | null;
  lastMessageAt: string | null;
};

type PixelLead = {
  id: string;
  instanceName: string;
  contactName: string | null;
  contactPhone: string | null;
  phoneLast4: string | null;
  classification: "pendente" | "lead" | "nao_lead";
  lastMessageAt: string;
  messagesReceived: number;
  messagesSent: number;
  originPlatform: string;
  originEvidence: string;
  crmStage?: string;
  leadScore?: number | null;
  temperature?: "HOT" | "WARM" | "COLD" | null;
};

type PixelMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  bodyText: string;
  sentAt: string;
};

type PixelAttribution = {
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  creativeName: string | null;
  adImageUrl: string | null;
  matchStatus: "matched" | "unresolved";
};

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

type PixelOverview = {
  provisioningConfigured: boolean;
  unit: { id: string; name: string; metaAccountId: string };
  instances: PixelInstance[];
  leads: PixelLead[];
  creativeRanking: CreativeRankingRow[];
  summary: { connectedInstances: number; totalInstances: number; visibleLeads: number; unreadConversations: number };
};

type SimulationChannel = "meta_verified" | "meta_observed" | "google_ads" | "organic";

type SimAdOption = {
  adId: string;
  adName: string | null;
  campaignName: string | null;
  adsetName: string | null;
  creativeName: string | null;
  adImageUrl: string | null;
  totalSpend: number | null;
  totalConversas: number | null;
};

const SIMULATION_CHANNEL_OPTIONS: { value: SimulationChannel; label: string }[] = [
  { value: "meta_verified", label: "Meta Ads (verificado — ctwa_clid)" },
  { value: "meta_observed", label: "Meta Ads (observado)" },
  { value: "google_ads", label: "Google Ads (gclid + UTM)" },
  { value: "organic", label: "Orgânico (sem evidência — vira quarentena)" },
];

const SIMULATION_CLASSIFICATION_OPTIONS: { value: "pendente" | "lead" | "nao_lead"; label: string }[] = [
  { value: "pendente", label: "Deixar pendente (padrão)" },
  { value: "lead", label: "Marcar como lead confirmado" },
  { value: "nao_lead", label: "Marcar como não lead" },
];

const emptyOverview: PixelOverview = {
  provisioningConfigured: false,
  unit: { id: "", name: "", metaAccountId: "" },
  instances: [],
  leads: [],
  creativeRanking: [],
  summary: { connectedInstances: 0, totalInstances: 0, visibleLeads: 0, unreadConversations: 0 },
};

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatCurrencyBRL(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// URLs de criativo da Meta são assinadas e expiram — sem onError aqui, uma imagem
// vencida some em silêncio em vez de cair no aviso "sem imagem".
function SafeImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-white/[.04] text-zinc-600", className)}>
        <ImageOff className="size-4" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={cn("object-cover", className)} loading="lazy" />;
}

function authHeaders(json = false): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

function isConnected(status: string): boolean {
  return ["open", "connected"].includes(status.toLowerCase());
}

const ORIGIN_LABELS: Record<string, string> = { meta: "Meta Ads", google_ads: "Google Ads", mixed: "Meta e Google", unknown: "Origem não identificada" };

// Cor só no ponto; o texto diz o estado.
function LeadStatus({ lead, className }: { lead: PixelLead; className?: string }) {
  const confirmed = lead.classification === "lead";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-400", className)}>
      <span className={cn("size-1.5 rounded-full", confirmed ? "bg-emerald-400" : "bg-amber-400")} aria-hidden />
      {confirmed ? "Lead confirmado" : lead.classification === "nao_lead" ? "Não lead" : "A confirmar"}
    </span>
  );
}

function phoneLabel(lead: PixelLead): string {
  if (lead.contactPhone?.replace(/\D/g, "")) return formatPhone(lead.contactPhone);
  return lead.phoneLast4 ? `•••• ${lead.phoneLast4}` : "Número protegido";
}

function dateLabel(value: string | null): string {
  if (!value) return "Sem atividade";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

/** Hora para hoje, data curta para os outros dias (como na lista do Mensagens). */
function shortTimeLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("pt-BR", sameDay ? { timeStyle: "short" } : { day: "2-digit", month: "2-digit" }).format(date);
}

type PixelTab = "conversas" | "crm";

export default function DashboardPixel() {
  const { user: adminUser, loading: authLoading } = useAdminAuth();
  const canSimulate = import.meta.env.DEV && adminUser?.role === "admin";
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientContext();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const tab: PixelTab = searchParams.get("aba") === "crm" ? "crm" : "conversas";
  // ?lead=<id> vem do botão "Ver conversa completa" do CRM: abre Conversas já nesse lead.
  const leadParam = searchParams.get("lead");
  const leadListRef = useRef<HTMLDivElement | null>(null);
  // Listas sem barra de rolagem, com esmaecimento nas pontas (mesmo padrão do CRM).
  const leadListFade = useScrollFade();
  const messagesFade = useScrollFade();
  const rankingFade = useScrollFade();
  const setLeadListNode = useCallback((node: HTMLDivElement | null) => { leadListRef.current = node; leadListFade.ref(node); }, [leadListFade.ref]);
  const { isNew: crmIsNew } = useNavNewBadge("crm", tab === "crm");
  const [overview, setOverview] = useState<PixelOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PixelMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const setMessagesNode = useCallback((node: HTMLDivElement | null) => { messagesContainerRef.current = node; messagesFade.ref(node); }, [messagesFade.ref]);
  const MESSAGES_PAGE_SIZE = 20;
  const [attribution, setAttribution] = useState<PixelAttribution | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(false);
  const [classifyingLead, setClassifyingLead] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterInstance, setFilterInstance] = useState("");
  const [filterChannel, setFilterChannel] = useState<"" | "meta" | "google_ads">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedRanking, setSelectedRanking] = useState<CreativeRankingRow | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simInstance, setSimInstance] = useState("");
  const [simChannel, setSimChannel] = useState<SimulationChannel>("organic");
  const [simClassification, setSimClassification] = useState<"pendente" | "lead" | "nao_lead">("pendente");
  const [simText, setSimText] = useState("Mensagem de teste simulada");
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simAds, setSimAds] = useState<SimAdOption[]>([]);
  const [simAdsLoading, setSimAdsLoading] = useState(false);
  const [simAdId, setSimAdId] = useState("");

  const filteredLeads = useMemo(() => overview.leads.filter((lead) => {
    if (filterInstance && lead.instanceName !== filterInstance) return false;
    if (filterChannel && lead.originPlatform !== filterChannel) return false;
    if (filterDateFrom || filterDateTo) {
      const leadDate = lead.lastMessageAt.slice(0, 10);
      if (filterDateFrom && leadDate < filterDateFrom) return false;
      if (filterDateTo && leadDate > filterDateTo) return false;
    }
    return true;
  }), [overview.leads, filterInstance, filterChannel, filterDateFrom, filterDateTo]);

  const activeFilterCount = [filterInstance, filterChannel, filterDateFrom, filterDateTo].filter(Boolean).length;
  const today = todayDateString();
  const isTodayFilterActive = filterDateFrom === today && filterDateTo === today;

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null,
    [filteredLeads, selectedLeadId],
  );

  // Vindo do CRM: seleciona o lead (limpando filtros que o escondam) e tira o ?lead da URL.
  const scrollToLeadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!leadParam || loading) return;
    if (overview.leads.some((lead) => lead.id === leadParam)) {
      if (!filteredLeads.some((lead) => lead.id === leadParam)) clearFilters();
      setSelectedLeadId(leadParam);
      scrollToLeadRef.current = leadParam;
    } else {
      toast.info("Essa conversa não aparece na lista do Pixel.");
    }
    setLocation("/dashboard/pixel", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadParam, loading, overview.leads]);

  useEffect(() => {
    const id = scrollToLeadRef.current;
    if (!id || selectedLead?.id !== id) return;
    scrollToLeadRef.current = null;
    leadListRef.current?.querySelector(`[data-lead-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedLead?.id]);

  const loadOverview = useCallback(async (background = false) => {
    if (!selectedClientId) {
      setOverview(emptyOverview);
      setLoading(false);
      return;
    }
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/evolution/pixel/overview?unitId=${encodeURIComponent(selectedClientId)}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await responseJson<PixelOverview>(response);
      setOverview(data);
      setSelectedLeadId((current) => data.leads.some((lead) => lead.id === current) ? current : data.leads[0]?.id ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o Pixel.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClientId]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => {
    const timer = window.setInterval(() => void loadOverview(true), 20_000);
    return () => window.clearInterval(timer);
  }, [loadOverview]);
  useEffect(() => {
    if (!selectedClientId) return;
    const synthetic = `sim-${selectedClientId}-dev`;
    setSimInstance((current) => {
      if (overview.instances.some((instance) => instance.instanceName === current) || current === synthetic) return current;
      return overview.instances[0]?.instanceName ?? synthetic;
    });
  }, [overview.instances, selectedClientId]);

  useEffect(() => {
    if (!selectedLead || !selectedClientId) {
      setMessages([]);
      setHasMoreMessages(true);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    setHasMoreMessages(true);
    fetch(`/api/evolution/pixel/leads/${selectedLead.id}/messages?unitId=${encodeURIComponent(selectedClientId)}&limit=${MESSAGES_PAGE_SIZE}`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((response) => responseJson<{ rows: PixelMessage[] }>(response))
      .then((data) => {
        if (cancelled) return;
        setMessages(data.rows);
        setHasMoreMessages(data.rows.length === MESSAGES_PAGE_SIZE);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a conversa."); })
      .finally(() => { if (!cancelled) setMessagesLoading(false); });
    return () => { cancelled = true; };
    // Depende só do id (não do objeto inteiro): o polling de 20s recria `overview.leads`
    // a cada ciclo, o que trocaria a referência de `selectedLead` mesmo sem o lead mudar
    // de verdade, recarregando a conversa e piscando a tela sem necessidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead || !selectedClientId || selectedLead.originPlatform !== "meta") {
      setAttribution(null);
      return;
    }
    let cancelled = false;
    setAttributionLoading(true);
    fetch(`/api/evolution/pixel/leads/${selectedLead.id}/attribution?unitId=${encodeURIComponent(selectedClientId)}`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((response) => responseJson<{ attribution: PixelAttribution | null }>(response))
      .then((data) => { if (!cancelled) setAttribution(data.attribution); })
      .catch(() => { if (!cancelled) setAttribution(null); })
      .finally(() => { if (!cancelled) setAttributionLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, selectedLead?.id, selectedLead?.originPlatform]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedLead || !selectedClientId || loadingMoreMessages || !hasMoreMessages || messages.length === 0) return;
    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;
    setLoadingMoreMessages(true);
    try {
      const before = messages[0].sentAt;
      const response = await fetch(
        `/api/evolution/pixel/leads/${selectedLead.id}/messages?unitId=${encodeURIComponent(selectedClientId)}&limit=${MESSAGES_PAGE_SIZE}&before=${encodeURIComponent(before)}`,
        { headers: authHeaders(), credentials: "include" },
      );
      const data = await responseJson<{ rows: PixelMessage[] }>(response);
      setMessages((current) => [...data.rows, ...current]);
      setHasMoreMessages(data.rows.length === MESSAGES_PAGE_SIZE);
      requestAnimationFrame(() => {
        if (!container) return;
        container.scrollTop = container.scrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível carregar mensagens anteriores.");
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [selectedLead, selectedClientId, messages, loadingMoreMessages, hasMoreMessages]);

  function handleMessagesScroll(event: React.UIEvent<HTMLDivElement>) {
    if (event.currentTarget.scrollTop < 60) void loadOlderMessages();
  }

  async function createInstance(event: FormEvent) {
    event.preventDefault();
    if (!selectedClientId) return;
    setCreating(true);
    try {
      const response = await fetch("/api/evolution/pixel/instances", {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ unitId: selectedClientId, metaAccountId: selectedClientId, displayName }),
      });
      const data = await responseJson<{ instance: PixelInstance; qrDataUrl: string | null }>(response);
      setQrInstance(data.instance.instanceName);
      setQrDataUrl(data.qrDataUrl);
      toast.success("Instância criada. Escaneie o QR Code para conectar o WhatsApp.");
      await loadOverview(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível criar a instância.");
    } finally {
      setCreating(false);
    }
  }

  async function refreshQr(instanceName: string) {
    if (!selectedClientId) return;
    setQrInstance(instanceName);
    setQrDataUrl(null);
    setCreateOpen(true);
    setCreating(true);
    try {
      const response = await fetch(`/api/evolution/pixel/instances/${encodeURIComponent(instanceName)}/qr?unitId=${encodeURIComponent(selectedClientId)}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await responseJson<{ qrDataUrl: string }>(response);
      setQrDataUrl(data.qrDataUrl);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível gerar o QR Code.");
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setDisplayName(selectedClient ? `WhatsApp ${selectedClient.name}` : "WhatsApp comercial");
    setQrInstance(null);
    setQrDataUrl(null);
    setCreateOpen(true);
  }

  const simIsMetaChannel = simChannel === "meta_verified" || simChannel === "meta_observed";

  useEffect(() => {
    if (!simOpen || !simIsMetaChannel || !selectedClientId) return;
    let cancelled = false;
    setSimAdsLoading(true);
    fetch(`/api/evolution/pixel/simulate-ads?unitId=${encodeURIComponent(selectedClientId)}`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((response) => responseJson<{ ads: SimAdOption[] }>(response))
      .then((data) => { if (!cancelled) setSimAds(data.ads); })
      .catch(() => { if (!cancelled) setSimAds([]); })
      .finally(() => { if (!cancelled) setSimAdsLoading(false); });
    return () => { cancelled = true; };
  }, [simOpen, simIsMetaChannel, selectedClientId]);

  async function simulateMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedClientId || !simInstance) return;
    setSimSubmitting(true);
    try {
      const response = await fetch("/api/evolution/pixel/simulate-message", {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          unitId: selectedClientId,
          instanceName: simInstance,
          channel: simChannel,
          text: simText,
          classification: simClassification,
          adId: simIsMetaChannel ? simAdId || undefined : undefined,
        }),
      });
      const data = await responseJson<{ leadId: string | null }>(response);
      const willBeQuarantined = simChannel === "organic" && simClassification === "pendente";
      const chosenAd = simIsMetaChannel ? simAds.find((ad) => ad.adId === simAdId) : undefined;
      toast.success(
        willBeQuarantined
          ? "Mensagem simulada. Como é orgânica e sem classificação, deve ficar invisível (quarentena) até promoção ou revisão manual."
          : chosenAd
            ? `Mensagem simulada com o anúncio "${chosenAd.adName ?? chosenAd.creativeName ?? chosenAd.adId}". Confira o card do lead e o ranking.`
            : "Mensagem simulada com sucesso.",
      );
      setSimOpen(false);
      await loadOverview(true);
      if (data.leadId) setSelectedLeadId(data.leadId);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível simular a mensagem.");
    } finally {
      setSimSubmitting(false);
    }
  }

  async function classifyLead(leadId: string, classification: "lead" | "nao_lead") {
    if (!selectedClientId) return;
    setClassifyingLead(true);
    try {
      const response = await fetch(`/api/evolution/pixel/leads/${leadId}`, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ unitId: selectedClientId, classification }),
      });
      await responseJson<unknown>(response);
      toast.success(classification === "lead" ? "Lead confirmado." : "Marcado como não lead — sai da lista.");
      await loadOverview(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível classificar o lead.");
    } finally {
      setClassifyingLead(false);
    }
  }

  const selectedClientName = selectedClient?.name ?? "Nenhuma unidade selecionada";
  const subtitle = [
    selectedClientName,
    selectedClientId ? `${overview.summary.connectedInstances} de ${overview.summary.totalInstances} WhatsApps conectados` : null,
    selectedClientId ? `${overview.summary.visibleLeads} ${overview.summary.visibleLeads === 1 ? "lead" : "leads"}` : null,
  ].filter(Boolean).join(" · ");
  const dateScope = isTodayFilterActive ? "today" : filterDateFrom || filterDateTo ? "custom" : "all";
  const instanceOptions = overview.instances.map((instance) => ({ value: instance.instanceName, label: instance.displayName || instance.instanceName }));

  function selectTab(next: PixelTab) {
    // A aba fica na URL para o link /dashboard/pixel?aba=crm abrir direto no CRM.
    setLocation(next === "crm" ? "/dashboard/pixel?aba=crm" : "/dashboard/pixel", { replace: true });
  }

  function openConversation(leadId: string) {
    setLocation(`/dashboard/pixel?lead=${encodeURIComponent(leadId)}`, { replace: true });
  }

  function clearFilters() {
    setFilterInstance("");
    setFilterChannel("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  if (authLoading || clientsLoading) {
    return <AppLayout><div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-500"><Loader2 className="mr-2 size-4 animate-spin" /> Preparando o Pixel…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Pixel"
          subtitle={subtitle}
          actions={
            <>
              {!overview.provisioningConfigured && selectedClientId && (
                <Tooltip content="Configure a URL e a chave da Evolution no servidor para liberar novas instâncias. Nenhuma chave é enviada ao navegador.">
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400"><span className="size-1.5 rounded-full bg-amber-400" aria-hidden />Sem credenciais</span>
                </Tooltip>
              )}
              <IconButton
                label="Atualizar"
                variant="secondary"
                icon={<RefreshCw className={refreshing ? "animate-spin" : undefined} />}
                onClick={() => void loadOverview(true)}
                disabled={refreshing || !selectedClientId}
              />
              <Button variant="primary" onClick={openCreate} disabled={!selectedClientId || !overview.provisioningConfigured}><Plus />Nova instância</Button>
            </>
          }
        />

        {!selectedClientId ? (
          <Surface><EmptyState icon={<ScanLine />} title="Selecione uma unidade" description="Escolha a unidade no menu para abrir o Pixel." /></Surface>
        ) : (
          <>
            {error && <InlineNotice tone="critical" icon={<AlertTriangle />} action={<Button size="sm" variant="ghost" onClick={() => void loadOverview(true)}>Tentar de novo</Button>}>{error}</InlineNotice>}

            <div>
            <FolderTabs
              aria-label="Seções do Pixel"
              value={tab}
              onValueChange={selectTab}
              tabs={[
                { value: "conversas", label: "Conversas de leads", icon: <MessageCircleMore />, count: loading ? undefined : overview.summary.visibleLeads },
                {
                  value: "crm",
                  label: "CRM",
                  icon: <SquareKanban />,
                  badge: crmIsNew ? <span className="rounded-full bg-emerald-400/10 px-1.5 text-[10px] font-semibold tracking-[0.08em] text-emerald-300">NOVO</span> : undefined,
                },
              ]}
            />
            <Surface className="flex flex-col overflow-hidden rounded-tl-none lg:h-[680px]">
              {tab === "crm" ? <CrmPanel onOpenConversations={() => selectTab("conversas")} onOpenConversation={openConversation} /> : (
              <>
              <SurfaceHeader
                title="Conversas de leads"
                description="Entram leads confirmados e contatos com evidência de campanha. Não leads ficam de fora."
                actions={
                  <>
                    <SegmentedControl
                      size="sm"
                      aria-label="Período"
                      value={dateScope}
                      onValueChange={(value) => {
                        if (value === "today") { setFilterDateFrom(today); setFilterDateTo(today); }
                        else { setFilterDateFrom(""); setFilterDateTo(""); }
                      }}
                      options={[{ value: "all", label: "Todos" }, { value: "today", label: "Hoje" }]}
                    />
                    <Popover
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      align="end"
                      trigger={
                        <Button variant="secondary" size="sm">
                          <Filter />
                          Filtros
                          {activeFilterCount > 0 && <span className="rounded bg-white/[0.08] px-1 tabular-nums text-zinc-200">{activeFilterCount}</span>}
                        </Button>
                      }
                    >
                      <div className="space-y-4 p-4">
                        <div className="flex h-8 items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-100">Filtros</p>
                          {activeFilterCount > 0 && <Button size="sm" variant="ghost" className="-mr-2" onClick={clearFilters}>Limpar</Button>}
                        </div>
                        <Field label="Instância" htmlFor="filter-instance">
                          <Select id="filter-instance" value={filterInstance} onValueChange={setFilterInstance} options={[{ value: "", label: "Todas" }, ...instanceOptions]} />
                        </Field>
                        <Field label="Canal" htmlFor="filter-channel">
                          <Select
                            id="filter-channel"
                            value={filterChannel}
                            onValueChange={(value) => setFilterChannel(value as "" | "meta" | "google_ads")}
                            options={[{ value: "", label: "Todos" }, { value: "meta", label: "Meta Ads" }, { value: "google_ads", label: "Google Ads" }]}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="De" htmlFor="filter-date-from"><DatePicker id="filter-date-from" value={filterDateFrom} onChange={setFilterDateFrom} max={filterDateTo || undefined} /></Field>
                          <Field label="Até" htmlFor="filter-date-to"><DatePicker id="filter-date-to" value={filterDateTo} onChange={setFilterDateTo} min={filterDateFrom || undefined} /></Field>
                        </div>
                        <p className="text-xs tabular-nums text-zinc-500">{filteredLeads.length} de {overview.leads.length} conversas</p>
                      </div>
                    </Popover>
                    {canSimulate && (
                      <Popover
                        open={simOpen}
                        onOpenChange={setSimOpen}
                        align="end"
                        tooltip="Simular mensagem"
                        className="w-[380px]"
                        trigger={<Button variant="ghost" size="icon-sm" aria-label="Simular mensagem"><FlaskConical /></Button>}
                      >
                        <form onSubmit={simulateMessage} className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">Simular mensagem</p>
                            <p className="mt-0.5 text-xs leading-5 text-zinc-500">Usa o mesmo pipeline do webhook real. Só para administradores em desenvolvimento.</p>
                          </div>
                          <Field label="Instância" htmlFor="sim-instance">
                            <Select
                              id="sim-instance"
                              value={simInstance}
                              onValueChange={setSimInstance}
                              options={[...instanceOptions, ...(selectedClientId ? [{ value: `sim-${selectedClientId}-dev`, label: "Instância de teste (criada automaticamente)" }] : [])]}
                            />
                          </Field>
                          <Field label="Canal de origem" htmlFor="sim-channel">
                            <Select id="sim-channel" value={simChannel} onValueChange={(value) => setSimChannel(value as SimulationChannel)} options={SIMULATION_CHANNEL_OPTIONS} />
                          </Field>
                          {simIsMetaChannel && (
                            <Field label="Anúncio" htmlFor="sim-ad" hint="Cruza com os anúncios sincronizados da dashboard.">
                              <Select
                                id="sim-ad"
                                value={simAdId}
                                onValueChange={setSimAdId}
                                disabled={simAdsLoading}
                                options={[
                                  { value: "", label: simAdsLoading ? "Carregando anúncios…" : simAds.length === 0 ? "Nenhum anúncio sincronizado (ID fictício)" : "Aleatório" },
                                  ...simAds.map((ad) => ({
                                    value: ad.adId,
                                    label: ad.adName || ad.creativeName || ad.adId,
                                    description: [ad.campaignName, typeof ad.totalConversas === "number" ? `${ad.totalConversas} conversas na Meta` : null].filter(Boolean).join(" · ") || undefined,
                                  })),
                                ]}
                              />
                            </Field>
                          )}
                          <Field label="É lead mesmo?" htmlFor="sim-classification">
                            <Select id="sim-classification" value={simClassification} onValueChange={(value) => setSimClassification(value as "pendente" | "lead" | "nao_lead")} options={SIMULATION_CLASSIFICATION_OPTIONS} />
                          </Field>
                          <Field label="Texto da mensagem" htmlFor="sim-text">
                            <Input id="sim-text" value={simText} onChange={(event) => setSimText(event.target.value)} maxLength={300} />
                          </Field>
                          <Button type="submit" variant="primary" className="w-full" loading={simSubmitting} disabled={!simInstance}>
                            {!simSubmitting && <FlaskConical />}{simSubmitting ? "Simulando…" : "Disparar mensagem simulada"}
                          </Button>
                        </form>
                      </Popover>
                    )}
                  </>
                }
              />

              <div className="grid min-h-[520px] lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_minmax(0,1fr)_280px] lg:grid-rows-[minmax(0,1fr)]">
                <div className="border-b border-white/[0.06] lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
                  <div ref={setLeadListNode} onScroll={leadListFade.onScroll} style={leadListFade.style} className="scrollbar-none max-h-[600px] overflow-y-auto p-2 lg:max-h-none lg:flex-1">
                    {loading ? (
                      <div className="space-y-1 p-1" aria-busy="true" aria-label="Carregando leads">
                        {[0, 1, 2, 3].map((index) => <div key={index} className="h-[72px] animate-pulse rounded-xl bg-white/[0.04]" />)}
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <EmptyState
                        icon={<MessageCircleMore />}
                        title={overview.leads.length === 0 ? "Nenhum lead identificado" : "Nenhum lead com esses filtros"}
                        description={overview.leads.length === 0 ? "Conversas com evidência de campanha ou confirmadas aparecem aqui." : undefined}
                        action={overview.leads.length > 0 ? <Button size="sm" onClick={clearFilters}>Limpar filtros</Button> : undefined}
                        className="py-12"
                      />
                    ) : (
                      filteredLeads.map((lead) => {
                        const selected = selectedLead?.id === lead.id;
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            data-lead-id={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            aria-current={selected || undefined}
                            className={cn(
                              "mb-0.5 flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                              selected ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                            )}
                          >
                            <Avatar name={lead.contactName || "?"} size="sm" className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium text-zinc-100">{lead.contactName || "Contato sem nome"}</p>
                                <span className="shrink-0 text-xs tabular-nums text-zinc-500">{shortTimeLabel(lead.lastMessageAt)}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-zinc-500">{phoneLabel(lead)}</p>
                              <div className="mt-1.5 flex items-center gap-3 text-xs">
                                <LeadStatus lead={lead} />
                                {lead.temperature && <CrmTemperature lead={{ temperature: lead.temperature, leadScore: lead.leadScore ?? null }} />}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex min-h-[520px] min-w-0 flex-col lg:min-h-0">
                  {selectedLead ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={selectedLead.contactName || "?"} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{selectedLead.contactName || "Contato sem nome"}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                              <span>{phoneLabel(selectedLead)}</span>
                              <span aria-hidden>·</span>
                              <span>{ORIGIN_LABELS[selectedLead.originPlatform] ?? selectedLead.originPlatform}</span>
                              <span aria-hidden>·</span>
                              <span>{selectedLead.messagesReceived + selectedLead.messagesSent} mensagens</span>
                            </div>
                          </div>
                        </div>
                        {selectedLead.classification === "pendente" ? (
                          <div className="flex shrink-0 gap-2">
                            <Button size="sm" variant="ghost" disabled={classifyingLead} onClick={() => void classifyLead(selectedLead.id, "nao_lead")}>Não é lead</Button>
                            <Button size="sm" variant="primary" loading={classifyingLead} onClick={() => void classifyLead(selectedLead.id, "lead")}>{!classifyingLead && <Check />}Confirmar lead</Button>
                          </div>
                        ) : (
                          <LeadStatus lead={selectedLead} className="text-xs" />
                        )}
                      </div>

                      {selectedLead.originPlatform === "meta" && (attributionLoading || attribution) && (
                        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
                          {attributionLoading ? (
                            <span className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="size-3.5 animate-spin" />Buscando anúncio de origem…</span>
                          ) : attribution?.matchStatus === "matched" ? (
                            <>
                              <SafeImage src={attribution.adImageUrl} alt={attribution.creativeName ?? "Criativo do anúncio"} className="size-11 shrink-0 rounded-lg" />
                              <div className="min-w-0">
                                <p className="text-xs text-zinc-500">Veio do anúncio</p>
                                <p className="truncate text-sm font-medium text-zinc-100">{attribution.creativeName || attribution.adName || "Anúncio identificado"}</p>
                                <p className="truncate text-xs text-zinc-500">{[attribution.adName !== attribution.creativeName ? attribution.adName : null, attribution.campaignName, attribution.adsetName].filter(Boolean).join(" · ") || "Campanha não identificada"}</p>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-500">Origem Meta detectada, mas o anúncio específico não foi identificado.</span>
                          )}
                        </div>
                      )}

                      <div ref={setMessagesNode} onScroll={(event) => { handleMessagesScroll(event); messagesFade.onScroll(); }} style={messagesFade.style} className="scrollbar-none max-h-[600px] min-h-0 flex-1 space-y-2 overflow-y-auto p-4 sm:p-6 lg:max-h-none">
                        {messagesLoading ? (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-500"><Loader2 className="mr-2 size-4 animate-spin" />Carregando conversa…</div>
                        ) : (
                          <>
                            {loadingMoreMessages && <div className="flex items-center justify-center py-2 text-xs text-zinc-500"><Loader2 className="mr-1.5 size-3 animate-spin" />Carregando mensagens anteriores…</div>}
                            {messages.map((message) => {
                              const outgoing = message.direction === "outgoing";
                              return (
                                <div key={message.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                                  <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-6", outgoing ? "rounded-br-md bg-emerald-500 text-zinc-950" : "rounded-bl-md bg-white/[0.07] text-zinc-100")}>
                                    <p className="whitespace-pre-wrap break-words">{message.bodyText}</p>
                                    <p className={cn("mt-0.5 text-right text-[11px] tabular-nums", outgoing ? "text-zinc-900/60" : "text-zinc-500")}>{dateLabel(message.sentAt)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <EmptyState icon={<MessageCircleMore />} title="Nenhuma conversa aberta" description="Selecione um lead para ler a conversa." className="flex-1" />
                  )}
                </div>

                <aside className="min-w-0 border-t border-white/[0.06] lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-t-0">
                  <div className="px-4 py-3.5">
                    <h3 className="text-sm font-semibold text-zinc-100">Criativos que mais geraram leads</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">Confirmados no Pixel × conversas da Meta</p>
                  </div>
                  <div ref={rankingFade.ref} onScroll={rankingFade.onScroll} style={rankingFade.style} className="scrollbar-none max-h-[540px] overflow-y-auto px-2 pb-2 lg:max-h-none lg:min-h-0 lg:flex-1">
                    {overview.creativeRanking.length === 0 ? (
                      <p className="px-2 py-8 text-center text-xs text-zinc-500">Sem dados de criativos ainda.</p>
                    ) : (
                      overview.creativeRanking.map((row, index) => (
                        <button
                          key={row.creativeId ?? row.adId ?? index}
                          type="button"
                          onClick={() => setSelectedRanking(row)}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors duration-150 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                        >
                          <span className="w-4 shrink-0 text-center text-xs font-medium tabular-nums text-zinc-500">{index + 1}</span>
                          <SafeImage src={row.adImageUrl} alt={row.creativeName ?? "Criativo"} className="size-10 shrink-0 rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-100">{row.creativeName || row.adName || "Criativo sem nome"}</p>
                            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                              <span className="font-medium text-zinc-200">{row.pixelConfirmedLeads}</span> Pixel · {row.metaConversasIniciadas ?? "—"} Meta
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </aside>
              </div>
              </>
              )}
            </Surface>
            </div>

            <Surface>
              <SurfaceHeader title="WhatsApps da unidade" description="Cada número fica isolado na unidade selecionada." />
              {overview.instances.length === 0 ? (
                <EmptyState
                  icon={<QrCode />}
                  title="Nenhum WhatsApp conectado"
                  description="Crie uma instância e escaneie o QR Code para começar a capturar conversas."
                  action={<Button variant="primary" size="sm" onClick={openCreate} disabled={!overview.provisioningConfigured}><Plus />Nova instância</Button>}
                />
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {overview.instances.map((instance) => {
                    const connected = isConnected(instance.connectionStatus);
                    const lastActivity = instance.lastMessageAt || instance.lastEventAt;
                    return (
                      <li key={instance.instanceName} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] [&_svg]:size-4", connected ? "text-zinc-200" : "text-zinc-500")}>
                          {connected ? <Wifi /> : <WifiOff />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-100">{instance.displayName || instance.instanceName}</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            <span className="font-mono">{instance.instanceName}</span>
                            {lastActivity && <> · Última atividade {relativeTime(lastActivity)}</>}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                          <span className={cn("size-1.5 rounded-full", connected ? "bg-emerald-400" : "bg-zinc-500")} aria-hidden />
                          {connected ? "Conectado" : "Desconectado"}
                        </span>
                        {!connected && <Button size="sm" onClick={() => void refreshQr(instance.instanceName)}><QrCode />Conectar</Button>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Surface>
          </>
        )}
      </Page>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => { setCreateOpen(open); if (!open) { setQrDataUrl(null); setQrInstance(null); } }}
        size="sm"
        title={qrInstance ? "Conectar WhatsApp" : "Nova instância"}
        description={qrInstance ? "No WhatsApp, abra Aparelhos conectados e escaneie este código." : `A instância será vinculada à unidade ${selectedClient?.name || "selecionada"}.`}
        footer={qrInstance ? undefined : (
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" form="pixel-create-form" variant="primary" loading={creating} disabled={displayName.trim().length < 2}>{!creating && <QrCode />}{creating ? "Criando…" : "Criar e gerar QR"}</Button>
          </>
        )}
      >
        {qrInstance ? (
          <div className="flex flex-col items-center py-2">
            {creating ? (
              <div className="flex size-64 items-center justify-center rounded-2xl bg-white text-zinc-700"><Loader2 className="size-7 animate-spin" /></div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code para conectar o WhatsApp" className="size-64 rounded-2xl bg-white p-3" />
            ) : (
              <EmptyState icon={<QrCode />} title="QR Code indisponível" action={<Button size="sm" onClick={() => void refreshQr(qrInstance)}>Tentar de novo</Button>} className="size-64 rounded-2xl ring-1 ring-inset ring-white/10" />
            )}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500"><Smartphone className="size-3.5" /> O código expira por segurança.</p>
          </div>
        ) : (
          <form id="pixel-create-form" onSubmit={createInstance}>
            <Field label="Nome deste WhatsApp" htmlFor="pixel-display-name" hint={`Conta Meta: ${selectedClient?.name ?? "—"}. O webhook é configurado na criação.`}>
              <Input id="pixel-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} required placeholder="Ex.: Comercial da unidade" autoFocus />
            </Field>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(selectedRanking)}
        onOpenChange={(open) => { if (!open) setSelectedRanking(null); }}
        title={selectedRanking?.creativeName || selectedRanking?.adName || "Criativo sem nome"}
        description={selectedRanking ? [selectedRanking.adName && selectedRanking.adName !== selectedRanking.creativeName ? selectedRanking.adName : null, selectedRanking.campaignName, selectedRanking.adsetName].filter(Boolean).join(" · ") || "Campanha não identificada" : undefined}
      >
        {selectedRanking && (
          <div className="space-y-4">
            <SafeImage src={selectedRanking.adImageUrl} alt={selectedRanking.creativeName ?? "Criativo"} className="h-72 w-full rounded-xl" />
            <div className="grid grid-cols-3 divide-x divide-white/[0.06] overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">
              {[
                { label: "Confirmados (Pixel)", value: String(selectedRanking.pixelConfirmedLeads) },
                { label: "Conversas (Meta)", value: selectedRanking.metaConversasIniciadas === null ? "—" : String(selectedRanking.metaConversasIniciadas) },
                { label: "Investimento", value: formatCurrencyBRL(selectedRanking.metaSpend) },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 px-3.5 py-3">
                  <p className="truncate text-xs text-zinc-500">{stat.label}</p>
                  <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </AppLayout>
  );
}
