import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Bot, Copy, ExternalLink, History, Loader2, Megaphone, MessageCircleMore, Smartphone, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CrmRequestError,
  fetchCrmAttribution,
  fetchCrmHistory,
  fetchCrmLead,
  fetchCrmMessages,
  type CrmAttribution,
  type CrmMessage,
} from "@/lib/pixelCrmApi";
import {
  CRM_STAGE_LABELS,
  formatCrmPhone,
  type CrmHistoryEvent,
  type CrmLead,
  type CrmStage,
} from "../../../../shared/crm";
import { CRM_STAGE_OPTIONS, CrmModeIndicator, CrmTemperatureBadge, dateTimeLabel, relativeTime } from "./crmUi";

type DrawerProps = {
  unitId: string;
  leadId: string | null;
  boardLead: CrmLead | null;
  saving: boolean;
  onClose: () => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
  onLeadLoaded: (lead: CrmLead) => void;
};

const ORIGIN_LABELS: Record<string, string> = { meta: "Meta Ads", google_ads: "Google Ads", mixed: "Meta + Google", unknown: "Sem origem identificada" };

function Section({ icon: Icon, title, children }: { icon: typeof History; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-white/8 px-5 py-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-zinc-400"><Icon className="size-3.5" /> {title}</h3>
      {children}
    </section>
  );
}

function historyText(event: CrmHistoryEvent): string {
  if (event.eventType === "automation_resumed") return `Automação reativada em ${CRM_STAGE_LABELS[event.toStage]}`;
  return event.fromStage ? `${CRM_STAGE_LABELS[event.fromStage]} → ${CRM_STAGE_LABELS[event.toStage]}` : `Entrou em ${CRM_STAGE_LABELS[event.toStage]}`;
}

export function CrmLeadDrawer({ unitId, leadId, boardLead, saving, onClose, onMove, onResume, onLeadLoaded }: DrawerProps) {
  const [detail, setDetail] = useState<CrmLead | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CrmMessage[] | null>(null);
  const [attribution, setAttribution] = useState<CrmAttribution | null | undefined>(undefined);
  const [history, setHistory] = useState<CrmHistoryEvent[] | null>(null);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const lead = boardLead && (!detail || boardLead.crmVersion >= detail.crmVersion) ? boardLead : detail;

  // Detalhe, conversa e anúncio: carregados ao abrir, nunca no polling do quadro.
  useEffect(() => {
    setDetail(null);
    setDetailError(null);
    setMessages(null);
    setAttribution(undefined);
    if (!leadId) return;
    const controller = new AbortController();
    fetchCrmLead(unitId, leadId, controller.signal)
      .then((fresh) => {
        setDetail(fresh);
        onLeadLoaded(fresh);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setDetailError(reason instanceof CrmRequestError && reason.status === 404
          ? "Este lead não está mais disponível nesta unidade."
          : "Não foi possível carregar o lead.");
      });
    fetchCrmMessages(unitId, leadId, controller.signal).then(setMessages).catch(() => !controller.signal.aborted && setMessages([]));
    fetchCrmAttribution(unitId, leadId, controller.signal).then(setAttribution).catch(() => !controller.signal.aborted && setAttribution(null));
    return () => controller.abort();
    // onLeadLoaded muda a cada render do pai; o carregamento depende só do lead aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, leadId]);

  // Histórico recarrega quando a versão do cartão muda (movimento ou retomada da automação).
  const version = lead?.crmVersion;
  useEffect(() => {
    setHistory(null);
    setHistoryCursor(null);
    if (!leadId) return;
    const controller = new AbortController();
    fetchCrmHistory(unitId, leadId, null, controller.signal)
      .then((page) => { setHistory(page.items); setHistoryCursor(page.nextCursor); })
      .catch(() => !controller.signal.aborted && setHistory([]));
    return () => controller.abort();
  }, [unitId, leadId, version]);

  async function loadMoreHistory() {
    if (!leadId || !historyCursor) return;
    setHistoryLoading(true);
    try {
      const page = await fetchCrmHistory(unitId, leadId, historyCursor);
      setHistory((current) => {
        const known = new Set((current ?? []).map((item) => item.id));
        return [...(current ?? []), ...page.items.filter((item) => !known.has(item.id))];
      });
      setHistoryCursor(page.nextCursor);
    } catch {
      toast.error("Não foi possível carregar mais histórico.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const phone = lead ? formatCrmPhone(lead) : null;

  async function copyPhone() {
    if (!phone?.copyValue) return;
    try {
      await navigator.clipboard.writeText(phone.copyValue);
      toast.success("Telefone copiado.");
    } catch {
      toast.error("Não foi possível copiar o telefone.");
    }
  }

  return (
    <Sheet open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-white/10 bg-[#0d0f10] p-0 text-zinc-100 sm:max-w-md">
        {!lead ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-zinc-400">
            <SheetTitle className="sr-only">Detalhe do lead</SheetTitle>
            <SheetDescription className="sr-only">Carregando dados do lead</SheetDescription>
            {detailError ? detailError : <><Loader2 className="size-5 animate-spin" /> Carregando lead…</>}
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-2 px-5 pb-4 pt-5">
              <SheetTitle className="pr-8 text-lg font-semibold text-white">{lead.contactName || "Contato sem nome"}</SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Smartphone className="size-3.5" /> {lead.instanceDisplayName || lead.instanceName}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <CrmTemperatureBadge lead={lead} className="text-[11px]" />
                {lead.leadScoreUpdatedAt && <span className="text-[11px] text-zinc-500">avaliado {relativeTime(lead.leadScoreUpdatedAt)}</span>}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className={cn("font-mono text-sm", phone?.partial ? "text-zinc-500" : "text-zinc-200")}>{phone?.label}</span>
                {phone?.partial && lead.phoneLast4 && <span className="text-[10px] text-zinc-500">(parcial)</span>}
                {phone?.copyValue && (
                  <button type="button" onClick={copyPhone} aria-label="Copiar telefone" className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[.06] hover:text-zinc-100">
                    <Copy className="size-3.5" />
                  </button>
                )}
              </div>
            </SheetHeader>

            <Section icon={Bot} title="Etapa">
              <label className="block space-y-1.5">
                <span className="text-xs text-zinc-400">Mover para…</span>
                <select
                  value={lead.crmStage}
                  disabled={saving}
                  onChange={(event) => onMove(lead, event.target.value as CrmStage)}
                  className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-sm text-zinc-100 disabled:opacity-60"
                >
                  {CRM_STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <CrmModeIndicator lead={lead} saving={saving} onResume={onResume} size="md" />
                {saving && <Loader2 className="size-4 animate-spin text-emerald-300" />}
              </div>
              <p className="text-xs text-zinc-500">
                Nesta etapa {relativeTime(lead.crmStageUpdatedAt)}{lead.crmStageUpdatedBy ? ` · por ${lead.crmStageUpdatedBy}` : ""}.
                {lead.crmStageMode === "manual" && " A automação só volta a mover este lead depois de reativada."}
              </p>
            </Section>

            <Section icon={UserRound} title="Contato">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="text-zinc-500">Classificação</dt>
                <dd className="text-zinc-200">{lead.classification === "lead" ? "Lead confirmado" : "Pendente de confirmação"}</dd>
                <dt className="text-zinc-500">Origem</dt>
                <dd className="text-zinc-200">{ORIGIN_LABELS[lead.originPlatform] ?? lead.originPlatform}{lead.originEvidence === "observed" ? " (observada)" : ""}</dd>
                <dt className="text-zinc-500">Primeiro contato</dt>
                <dd className="text-zinc-200">{dateTimeLabel(lead.firstContactAt)}</dd>
                <dt className="text-zinc-500">Última mensagem</dt>
                <dd className="text-zinc-200">{dateTimeLabel(lead.lastMessageAt)}</dd>
                <dt className="text-zinc-500">Mensagens</dt>
                <dd className="text-zinc-200">{lead.messagesReceived} recebidas · {lead.messagesSent} enviadas</dd>
              </dl>
            </Section>

            <Section icon={Megaphone} title="Anúncio">
              {attribution === undefined ? (
                <p className="text-xs text-zinc-500">Carregando…</p>
              ) : attribution?.campaignName || attribution?.adName ? (
                <div className="space-y-1 text-xs">
                  {attribution.campaignName && <p className="text-zinc-200">{attribution.campaignName}</p>}
                  {attribution.adsetName && <p className="text-zinc-400">Conjunto: {attribution.adsetName}</p>}
                  {attribution.adName && <p className="text-zinc-400">Anúncio: {attribution.adName}</p>}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Sem atribuição de anúncio para este contato.</p>
              )}
            </Section>

            <Section icon={MessageCircleMore} title="Conversa">
              {messages === null ? (
                <p className="text-xs text-zinc-500">Carregando…</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-zinc-500">Nenhuma mensagem de texto registrada.</p>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div key={message.id} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5", message.direction === "incoming" ? "bg-white/[.05] text-zinc-200" : "ml-auto bg-emerald-400/10 text-emerald-100")}>
                      <p className="whitespace-pre-wrap break-words">{message.bodyText}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{dateTimeLabel(message.sentAt)}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/dashboard/pixel" className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline">
                Abrir no Pixel <ExternalLink className="size-3" />
              </Link>
            </Section>

            <Section icon={History} title="Histórico">
              {history === null ? (
                <p className="text-xs text-zinc-500">Carregando…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-zinc-500">Nenhuma mudança de etapa registrada.</p>
              ) : (
                <ol className="space-y-2.5">
                  {history.map((event) => (
                    <li key={event.id} className="rounded-lg border border-white/8 bg-white/[.02] px-3 py-2 text-xs">
                      <p className="font-medium text-zinc-200">{historyText(event)}</p>
                      <p className="mt-0.5 text-zinc-500">
                        {event.actorType === "automation" ? "Automático" : "Manual"} · {event.actorLabel} · {dateTimeLabel(event.changedAt)}
                      </p>
                      {event.note && <p className="mt-1 text-zinc-400">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
              {historyCursor && (
                <button type="button" onClick={loadMoreHistory} disabled={historyLoading} className="flex items-center gap-1.5 text-xs text-zinc-300 hover:underline disabled:opacity-60">
                  {historyLoading && <Loader2 className="size-3 animate-spin" />} Carregar mais
                </button>
              )}
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
