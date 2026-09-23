import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/contexts/ClientContext";
import { getToken, useAdminAuth } from "@/hooks/useAdminAuth";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Filter,
  FlaskConical,
  ImageOff,
  Info,
  Loader2,
  MessageCircleMore,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

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

function phoneLabel(lead: PixelLead): string {
  const digits = lead.contactPhone?.replace(/\D/g, "");
  return digits ? `+${digits}` : lead.phoneLast4 ? `•••• ${lead.phoneLast4}` : "Número protegido";
}

function dateLabel(value: string | null): string {
  if (!value) return "Sem atividade";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function DashboardPixel() {
  const { user: adminUser, loading: authLoading } = useAdminAuth();
  const canSimulate = import.meta.env.DEV && adminUser?.role === "admin";
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientContext();
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

  function toggleTodayFilter() {
    if (isTodayFilterActive) {
      setFilterDateFrom("");
      setFilterDateTo("");
    } else {
      setFilterDateFrom(today);
      setFilterDateTo(today);
    }
  }

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null,
    [filteredLeads, selectedLeadId],
  );

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

  if (authLoading || clientsLoading) {
    return <AppLayout><div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400"><Loader2 className="mr-2 size-4 animate-spin" /> Preparando o Pixel…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-8">
        <header className="platform-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-emerald-400"><ScanLine className="size-4" /> Pixel de mensagens</div>
              {!overview.provisioningConfigured && (
                <span title="Configure a URL e a chave da Evolution no servidor para liberar o botão Nova instância. Nenhuma chave é enviada ao navegador." className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"><ShieldCheck className="size-3" /> Sem credenciais</span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Conversas que viraram oportunidade</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">WhatsApp, conta Meta e leads separados por unidade. Nesta tela entram apenas leads confirmados ou contatos com evidência de campanha.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedClientId && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" title="Detalhes da unidade" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-zinc-300 transition hover:bg-white/[.06]"><Info className="size-4" /></button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 border-white/10 bg-[#151417] p-4 text-zinc-100">
                  <div className="space-y-3 text-xs">
                    <div><p className="text-zinc-500">Unidade / conta Meta</p><p className="mt-0.5 truncate text-sm font-semibold text-white">{selectedClient?.name}</p><p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{selectedClientId}</p></div>
                    <div className="flex items-center justify-between border-t border-white/8 pt-3"><span className="text-zinc-500">WhatsApps conectados</span><span className="font-semibold text-white">{overview.summary.connectedInstances} / {overview.summary.totalInstances}</span></div>
                    <div className="flex items-center justify-between border-t border-white/8 pt-3"><span className="text-zinc-500">Leads visíveis</span><span className="font-semibold text-emerald-300">{overview.summary.visibleLeads}</span></div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" onClick={() => void loadOverview(true)} disabled={refreshing || !selectedClientId} className="border-white/10 bg-white/[.03]"><RefreshCw className={cn("size-4", refreshing && "animate-spin")} /> Atualizar</Button>
            <Button onClick={openCreate} disabled={!selectedClientId || !overview.provisioningConfigured} className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"><Plus className="size-4" /> Nova instância</Button>
          </div>
        </header>

        {!selectedClientId ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center text-sm text-zinc-400">Selecione uma unidade no menu para abrir o Pixel.</div>
        ) : (
          <>
            {error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-sm text-rose-200">{error}</div>}

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f10]">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2"><Sparkles className="size-4 text-emerald-300" /><h2 className="text-base font-semibold text-white">Mensagens de leads</h2></div>
                  <p className="mt-1 text-xs text-zinc-500">Conversas classificadas como não lead não aparecem aqui.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTodayFilter}
                    title="Filtrar leads que chegaram hoje"
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition",
                      isTodayFilterActive ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300" : "border-white/10 bg-white/[.03] text-zinc-300 hover:bg-white/[.06]",
                    )}
                  >
                    <CalendarDays className="size-3.5" /> Leads hoje
                  </button>
                  <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" title="Filtrar conversas" className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-zinc-300 transition hover:bg-white/[.06]">
                        <Filter className="size-4" />
                        {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-zinc-950">{activeFilterCount}</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 border-white/10 bg-[#151417] p-4 text-zinc-100">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.14em] text-zinc-300"><Filter className="size-3.5" /> Filtros</span>
                        {activeFilterCount > 0 && <button type="button" onClick={() => { setFilterInstance(""); setFilterChannel(""); setFilterDateFrom(""); setFilterDateTo(""); }} className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline">Limpar</button>}
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="filter-instance" className="text-xs text-zinc-400">Instância</Label>
                          <select id="filter-instance" value={filterInstance} onChange={(event) => setFilterInstance(event.target.value)} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                            <option value="">Todas</option>
                            {overview.instances.map((instance) => <option key={instance.instanceName} value={instance.instanceName}>{instance.displayName || instance.instanceName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="filter-channel" className="text-xs text-zinc-400">Canal</Label>
                          <select id="filter-channel" value={filterChannel} onChange={(event) => setFilterChannel(event.target.value as "" | "meta" | "google_ads")} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                            <option value="">Todos</option>
                            <option value="meta">Meta</option>
                            <option value="google_ads">Google Ads</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="filter-date-from" className="text-xs text-zinc-400">De</Label>
                            <Input id="filter-date-from" type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} className="border-white/10 bg-black/30 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="filter-date-to" className="text-xs text-zinc-400">Até</Label>
                            <Input id="filter-date-to" type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} className="border-white/10 bg-black/30 text-sm" />
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500">{filteredLeads.length} de {overview.leads.length} conversas</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {canSimulate && (
                  <Popover open={simOpen} onOpenChange={setSimOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" title="Simular mensagem (admin)" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300 transition hover:bg-fuchsia-400/20">
                        <FlaskConical className="size-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[380px] max-w-[92vw] border-fuchsia-400/20 bg-[#151417] p-4 text-zinc-100">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-fuchsia-300"><FlaskConical className="size-4" /> Simular mensagem</div>
                      <form onSubmit={simulateMessage} className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="sim-instance" className="text-xs text-zinc-400">Instância</Label>
                          <select id="sim-instance" value={simInstance} onChange={(event) => setSimInstance(event.target.value)} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                            {overview.instances.map((instance) => <option key={instance.instanceName} value={instance.instanceName}>{instance.displayName || instance.instanceName}</option>)}
                            {selectedClientId && <option value={`sim-${selectedClientId}-dev`}>➕ Instância de teste (criada automaticamente)</option>}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sim-channel" className="text-xs text-zinc-400">Canal de origem</Label>
                          <select id="sim-channel" value={simChannel} onChange={(event) => setSimChannel(event.target.value as SimulationChannel)} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                            {SIMULATION_CHANNEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        {simIsMetaChannel && (
                          <div className="space-y-1.5">
                            <Label htmlFor="sim-ad" className="text-xs text-zinc-400">Anúncio específico (cruzamento com a dashboard)</Label>
                            <select id="sim-ad" value={simAdId} onChange={(event) => setSimAdId(event.target.value)} disabled={simAdsLoading} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                              <option value="">{simAdsLoading ? "Carregando anúncios…" : simAds.length === 0 ? "Nenhum anúncio sincronizado — usa um ID fictício" : "Aleatório (qualquer anúncio sincronizado)"}</option>
                              {simAds.map((ad) => (
                                <option key={ad.adId} value={ad.adId}>
                                  {(ad.adName || ad.creativeName || ad.adId)}{ad.campaignName ? ` — ${ad.campaignName}` : ""}{typeof ad.totalConversas === "number" ? ` (${ad.totalConversas} conversas na Meta)` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="sim-classification" className="text-xs text-zinc-400">É lead mesmo?</Label>
                          <select id="sim-classification" value={simClassification} onChange={(event) => setSimClassification(event.target.value as "pendente" | "lead" | "nao_lead")} className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-zinc-100">
                            {SIMULATION_CLASSIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sim-text" className="text-xs text-zinc-400">Texto da mensagem</Label>
                          <Input id="sim-text" value={simText} onChange={(event) => setSimText(event.target.value)} maxLength={300} className="border-white/10 bg-black/30" />
                        </div>
                        <Button type="submit" size="sm" disabled={simSubmitting || !simInstance} className="w-full bg-fuchsia-400 text-zinc-950 hover:bg-fuchsia-300">
                          {simSubmitting ? <><Loader2 className="size-3.5 animate-spin" />Simulando…</> : <><FlaskConical className="size-3.5" />Disparar mensagem simulada</>}
                        </Button>
                        <p className="text-[11px] leading-5 text-zinc-500">Usa o mesmo pipeline do webhook real. Só visível para administradores em ambiente de desenvolvimento.</p>
                      </form>
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
              </div>
              <div className="grid min-h-[480px] lg:grid-cols-[330px_1fr_260px]">
                <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
                  <div className="max-h-[560px] overflow-y-auto p-2">
                    {loading ? (
                      <div className="p-8 text-center text-xs text-zinc-500"><Loader2 className="mx-auto mb-2 size-4 animate-spin" />Carregando leads…</div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageCircleMore className="mx-auto size-7 text-zinc-600" />
                        <p className="mt-3 text-sm text-zinc-300">{overview.leads.length === 0 ? "Nenhum lead identificado" : "Nenhum lead com esse filtro"}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{overview.leads.length === 0 ? "Quando chegar uma conversa com evidência de campanha ou classificação confirmada, ela aparecerá aqui." : "Ajuste ou limpe os filtros para ver mais conversas."}</p>
                      </div>
                    ) : (
                      filteredLeads.map((lead) => <button key={lead.id} type="button" onClick={() => setSelectedLeadId(lead.id)} className={cn("mb-1 w-full rounded-xl px-3 py-3 text-left transition", selectedLead?.id === lead.id ? "bg-emerald-400/10 ring-1 ring-inset ring-emerald-400/20" : "hover:bg-white/[.04]")}><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-zinc-100">{lead.contactName || "Contato sem nome"}</p>{lead.classification === "lead" ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" /> : <CircleDashed className="size-3.5 shrink-0 text-amber-300" />}</div><p className="mt-1 text-xs text-zinc-500">{phoneLabel(lead)}</p><div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500"><span className="truncate">{lead.instanceName}</span><span>{lead.messagesReceived + lead.messagesSent} msgs</span></div></button>)
                    )}
                  </div>
                </div>
                <div className="flex min-h-[480px] flex-col">{selectedLead ? <><div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4"><div className="min-w-0"><p className="text-sm font-semibold text-white">{selectedLead.contactName || "Contato sem nome"}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><span>{phoneLabel(selectedLead)}</span><span>·</span><span>{selectedLead.classification === "lead" ? "Lead confirmado" : selectedLead.classification === "nao_lead" ? "Não lead" : `Detectado por ${selectedLead.originPlatform}`}</span></div></div>{selectedLead.classification === "pendente" && <div className="flex shrink-0 gap-1.5"><Button type="button" size="sm" variant="ghost" disabled={classifyingLead} onClick={() => void classifyLead(selectedLead.id, "lead")} className="h-7 gap-1 border border-emerald-400/20 bg-emerald-400/10 px-2 text-[11px] text-emerald-300 hover:bg-emerald-400/20"><CheckCircle2 className="size-3.5" /> Confirmar lead</Button><Button type="button" size="sm" variant="ghost" disabled={classifyingLead} onClick={() => void classifyLead(selectedLead.id, "nao_lead")} className="h-7 gap-1 border border-white/10 px-2 text-[11px] text-zinc-400 hover:bg-white/[.06]">Não é lead</Button></div>}</div>{selectedLead.originPlatform === "meta" && (attributionLoading || attribution) && <div className="flex items-center gap-3 border-b border-white/8 bg-white/[.02] px-5 py-3">{attributionLoading ? <span className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="size-3.5 animate-spin" />Buscando anúncio de origem…</span> : attribution?.matchStatus === "matched" ? <><SafeImage src={attribution.adImageUrl} alt={attribution.creativeName ?? "Criativo do anúncio"} className="size-12 shrink-0 rounded-lg" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-emerald-300">{attribution.creativeName || attribution.adName || "Anúncio identificado"}</p><p className="mt-0.5 truncate text-[11px] text-zinc-500">{[attribution.adName !== attribution.creativeName ? attribution.adName : null, attribution.campaignName, attribution.adsetName].filter(Boolean).join(" · ") || "Campanha não identificada"}</p></div></> : <span className="text-xs text-zinc-500">Origem Meta detectada, mas não foi possível identificar o anúncio específico.</span>}</div>}<div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">{messagesLoading ? <div className="flex h-full items-center justify-center text-xs text-zinc-500"><Loader2 className="mr-2 size-4 animate-spin" />Carregando conversa…</div> : <>{loadingMoreMessages && <div className="flex items-center justify-center py-2 text-[11px] text-zinc-500"><Loader2 className="mr-1.5 size-3 animate-spin" />Carregando mensagens anteriores…</div>}{messages.map((message) => <div key={message.id} className={cn("flex", message.direction === "outgoing" ? "justify-end" : "justify-start")}><div className={cn("max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6", message.direction === "outgoing" ? "rounded-br-md bg-emerald-400 text-zinc-950" : "rounded-bl-md border border-white/10 bg-white/[.055] text-zinc-200")}><p className="whitespace-pre-wrap break-words">{message.bodyText}</p><p className={cn("mt-1 text-right text-[9px]", message.direction === "outgoing" ? "text-zinc-800/65" : "text-zinc-500")}>{dateLabel(message.sentAt)}</p></div></div>)}</>}</div></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-zinc-500"><MessageCircleMore className="mb-3 size-8 text-zinc-700" />Selecione um lead para ler a conversa.</div>}</div>
                <aside className="border-t border-white/10 lg:border-l lg:border-t-0">
                  <div className="border-b border-white/10 px-3 py-3"><div className="flex items-center gap-1.5 text-xs font-semibold text-white"><Trophy className="size-3.5 text-amber-300" /> Ranking de criativos</div><p className="mt-0.5 text-[10px] text-zinc-500">Confirmadas (Pixel) × reportado pela Meta</p></div>
                  <div className="max-h-[480px] space-y-2 overflow-y-auto p-2">
                    {overview.creativeRanking.length === 0 ? (
                      <p className="px-2 py-6 text-center text-[11px] text-zinc-600">Sem dados de criativos ainda.</p>
                    ) : (
                      overview.creativeRanking.map((row, index) => {
                        const secondaryLine = [row.adName && row.adName !== row.creativeName ? row.adName : null, row.campaignName, row.adsetName].filter(Boolean).join(" · ");
                        return (
                          <button key={row.creativeId ?? row.adId ?? index} type="button" onClick={() => setSelectedRanking(row)} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] p-2 text-left transition hover:border-amber-400/30 hover:bg-amber-400/[.05]">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[9px] font-bold text-amber-300">{index + 1}</span>
                            <SafeImage src={row.adImageUrl} alt={row.creativeName ?? "Criativo"} className="size-10 shrink-0 rounded-md" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-zinc-100">{row.creativeName || row.adName || "Criativo sem nome"}</p>
                              <p className="truncate text-[10px] text-zinc-500">{secondaryLine || "Campanha não identificada"}</p>
                              <div className="mt-1 flex items-center gap-2 text-[10px]"><span className="text-emerald-300">{row.pixelConfirmedLeads} Pixel</span><span className="text-zinc-500">{row.metaConversasIniciadas ?? "—"} Meta</span></div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold text-white">Instâncias da unidade</h2><p className="mt-1 text-xs text-zinc-500">Cada número fica isolado no contexto selecionado.</p></div></div>
              {overview.instances.length === 0 ? (
                <button type="button" onClick={openCreate} disabled={!overview.provisioningConfigured} className="flex w-full flex-col items-center rounded-2xl border border-dashed border-white/15 bg-white/[.02] px-6 py-9 text-center transition hover:border-emerald-400/30 hover:bg-emerald-400/[.03] disabled:cursor-not-allowed"><QrCode className="size-8 text-zinc-500" /><span className="mt-3 text-sm font-medium text-zinc-200">Nenhum WhatsApp conectado</span><span className="mt-1 text-xs text-zinc-500">Crie uma instância e escaneie o QR Code.</span></button>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{overview.instances.map((instance) => {
                  const connected = isConnected(instance.connectionStatus);
                  return <article key={instance.instanceName} className="rounded-2xl border border-white/10 bg-[#111315] p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", connected ? "bg-emerald-400/10 text-emerald-300" : "bg-zinc-800 text-zinc-400")}>{connected ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{instance.displayName || instance.instanceName}</p><p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{instance.instanceName}</p></div></div><span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase", connected ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[.03] text-zinc-400")}>{connected ? "Conectado" : instance.connectionStatus}</span></div><div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3"><span className="text-[10px] text-zinc-500">{dateLabel(instance.lastMessageAt || instance.lastEventAt)}</span>{!connected && <Button size="sm" variant="ghost" onClick={() => void refreshQr(instance.instanceName)}><QrCode className="size-3.5" /> Ver QR</Button>}</div></article>;
                })}</div>
              )}
            </section>
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setQrDataUrl(null); setQrInstance(null); } }}>
        <DialogContent className="border-white/10 bg-[#111315] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode className="size-5 text-emerald-300" />{qrInstance ? "Conectar WhatsApp" : "Nova instância"}</DialogTitle><DialogDescription>{qrInstance ? "No WhatsApp, abra Aparelhos conectados e escaneie este código." : `A instância será vinculada à unidade ${selectedClient?.name || "selecionada"}.`}</DialogDescription></DialogHeader>
          {qrInstance ? <div className="flex flex-col items-center py-3">{creating ? <div className="flex size-72 items-center justify-center rounded-2xl bg-white text-zinc-700"><Loader2 className="size-7 animate-spin" /></div> : qrDataUrl ? <img src={qrDataUrl} alt="QR Code para conectar o WhatsApp" className="size-72 rounded-2xl bg-white p-3" /> : <div className="flex size-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs text-zinc-500"><QrCode className="mb-3 size-8" />QR Code indisponível.<Button variant="ghost" size="sm" className="mt-2" onClick={() => void refreshQr(qrInstance)}>Tentar novamente</Button></div>}<p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500"><Smartphone className="size-3.5" /> O código expira por segurança.</p></div> : <form onSubmit={createInstance} className="space-y-4"><div className="space-y-2"><Label htmlFor="pixel-display-name">Nome deste WhatsApp</Label><Input id="pixel-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} required placeholder="Ex.: Comercial da unidade" className="border-white/10 bg-black/30" /></div><div className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-xs text-zinc-400"><p className="flex items-center gap-2 text-zinc-200"><ExternalLink className="size-3.5 text-emerald-300" /> Vínculo automático</p><p className="mt-1.5 leading-5">Conta Meta/unidade: <span className="text-white">{selectedClient?.name}</span>. O webhook será configurado na criação.</p></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={creating || displayName.trim().length < 2} className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300">{creating ? <><Loader2 className="size-4 animate-spin" />Criando…</> : <><QrCode className="size-4" />Criar e gerar QR</>}</Button></DialogFooter></form>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRanking)} onOpenChange={(open) => { if (!open) setSelectedRanking(null); }}>
        <DialogContent className="border-white/10 bg-[#111315] text-white sm:max-w-lg">
          {selectedRanking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Trophy className="size-5 text-amber-300" />{selectedRanking.creativeName || selectedRanking.adName || "Criativo sem nome"}</DialogTitle>
                <DialogDescription>{[selectedRanking.adName && selectedRanking.adName !== selectedRanking.creativeName ? selectedRanking.adName : null, selectedRanking.campaignName, selectedRanking.adsetName].filter(Boolean).join(" · ") || "Campanha não identificada"}</DialogDescription>
              </DialogHeader>
              <SafeImage src={selectedRanking.adImageUrl} alt={selectedRanking.creativeName ?? "Criativo"} className="h-72 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-3"><p className="text-[11px] text-emerald-200/70">Confirmadas (Pixel)</p><p className="mt-1 text-2xl font-semibold text-emerald-300">{selectedRanking.pixelConfirmedLeads}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[11px] text-zinc-500">Conversas (Meta)</p><p className="mt-1 text-2xl font-semibold text-white">{selectedRanking.metaConversasIniciadas ?? "—"}</p></div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm">
                <span className="text-zinc-500">Gasto reportado</span>
                <span className="font-semibold text-zinc-200">{formatCurrencyBRL(selectedRanking.metaSpend)}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

