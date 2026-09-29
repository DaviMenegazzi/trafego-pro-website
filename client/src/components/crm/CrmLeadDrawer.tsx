import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Copy, ExternalLink, Hand, Loader2, Sparkles } from "lucide-react";
import { Avatar, Button, EmptyState, IconButton, Select, Sheet, toast } from "@/components/ds";
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
import { CRM_STAGE_LABELS, formatCrmPhone, type CrmHistoryEvent, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CRM_STAGE_DOT, CRM_STAGE_OPTIONS, CrmTemperature, dateTimeLabel, relativeTime } from "./crmUi";

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

const ORIGIN_LABELS: Record<string, string> = { meta: "Meta Ads", google_ads: "Google Ads", mixed: "Meta e Google", unknown: "Não identificada" };

// Lista agrupada: título pequeno acima, linhas com rótulo à esquerda e valor à direita.
function Group({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-medium text-zinc-500">{title}</h3>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">{children}</div>
      {footer && <p className="px-1 text-xs leading-5 text-zinc-500">{footer}</p>}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm">
      <span className="shrink-0 text-zinc-400">{label}</span>
      <span className="min-w-0 truncate text-right text-zinc-100">{children}</span>
    </div>
  );
}

function historyTitle(event: CrmHistoryEvent): string {
  if (event.eventType === "automation_resumed") return "Atualização automática reativada";
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
  const name = lead?.contactName || "Contato sem nome";

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
    <Sheet
      open={Boolean(leadId)}
      onOpenChange={(open) => !open && onClose()}
      title={lead ? name : "Lead"}
      description={lead ? lead.instanceDisplayName || lead.instanceName : undefined}
      className="max-w-md"
    >
      {!lead ? (
        detailError
          ? <EmptyState title={detailError} />
          : <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Carregando</div>
      ) : (
        <div className="space-y-6 pb-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className={cn("truncate text-[15px] tabular-nums", phone?.partial ? "text-zinc-500" : "text-zinc-100")}>{phone?.label}</span>
                {phone?.copyValue && <IconButton label="Copiar telefone" size="sm" icon={<Copy />} onClick={copyPhone} />}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <CrmTemperature lead={lead} />
                {lead.leadScoreUpdatedAt && <span className="text-zinc-500">· avaliado {relativeTime(lead.leadScoreUpdatedAt)}</span>}
              </div>
            </div>
          </div>

          <Group
            title="Etapa"
            footer={lead.crmStageMode === "manual"
              ? "Definida manualmente. A automação só volta a mover este lead depois de reativada."
              : "A Laya atualiza a etapa conforme a conversa avança. Mover o lead manualmente pausa essa atualização."}
          >
            <div className="px-2 py-2">
              <Select
                aria-label="Etapa do lead"
                value={lead.crmStage}
                disabled={saving}
                onValueChange={(next) => onMove(lead, next as CrmStage)}
                options={CRM_STAGE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: <span className="inline-flex items-center gap-2"><span className={cn("size-2 rounded-full", CRM_STAGE_DOT[option.value])} />{option.label}</span>,
                }))}
                className="border-transparent bg-transparent hover:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="text-zinc-400">Atualização</span>
              {lead.crmStageMode === "automatic" ? (
                <span className="inline-flex items-center gap-1.5 text-zinc-100"><Sparkles className="size-3.5 text-violet-300" /> Automática</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-amber-200"><Hand className="size-3.5" /> Manual</span>
                  <Button size="sm" variant="secondary" loading={saving} onClick={() => onResume(lead.id)}>Reativar</Button>
                </span>
              )}
            </div>
            <Row label="Nesta etapa">{relativeTime(lead.crmStageUpdatedAt) || "—"}{lead.crmStageUpdatedBy ? ` · ${lead.crmStageUpdatedBy}` : ""}</Row>
          </Group>

          <Group title="Contato">
            <Row label="Classificação">{lead.classification === "lead" ? "Lead confirmado" : "Pendente"}</Row>
            <Row label="Origem">{ORIGIN_LABELS[lead.originPlatform] ?? lead.originPlatform}</Row>
            <Row label="Primeiro contato">{dateTimeLabel(lead.firstContactAt)}</Row>
            <Row label="Última mensagem">{dateTimeLabel(lead.lastMessageAt)}</Row>
            <Row label="Mensagens">{lead.messagesReceived} recebidas · {lead.messagesSent} enviadas</Row>
          </Group>

          {attribution && (attribution.campaignName || attribution.adName) && (
            <Group title="Anúncio">
              {attribution.campaignName && <Row label="Campanha">{attribution.campaignName}</Row>}
              {attribution.adsetName && <Row label="Conjunto">{attribution.adsetName}</Row>}
              {attribution.adName && <Row label="Anúncio">{attribution.adName}</Row>}
            </Group>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-medium text-zinc-500">Conversa</h3>
              <Link href="/dashboard/pixel" className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-100">
                Abrir no Pixel <ExternalLink className="size-3" />
              </Link>
            </div>
            {messages === null ? (
              <p className="px-1 text-sm text-zinc-500">Carregando…</p>
            ) : messages.length === 0 ? (
              <p className="px-1 text-sm text-zinc-500">Nenhuma mensagem de texto registrada.</p>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl bg-black/20 p-3 ring-1 ring-inset ring-white/[0.05]">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "w-fit max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-5",
                      message.direction === "incoming" ? "rounded-bl-md bg-zinc-800 text-zinc-100" : "ml-auto rounded-br-md bg-emerald-600/80 text-white",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.bodyText}</p>
                    <p className={cn("mt-0.5 text-[10px]", message.direction === "incoming" ? "text-zinc-500" : "text-emerald-100/70")}>{dateTimeLabel(message.sentAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="px-1 text-xs font-medium text-zinc-500">Histórico</h3>
            {history === null ? (
              <p className="px-1 text-sm text-zinc-500">Carregando…</p>
            ) : history.length === 0 ? (
              <p className="px-1 text-sm text-zinc-500">Nenhuma mudança de etapa registrada.</p>
            ) : (
              <ol className="relative ml-2 space-y-4 border-l border-white/[0.08] pl-5">
                {history.map((event) => (
                  <li key={event.id} className="relative">
                    <span className={cn("absolute -left-[25px] top-1.5 size-2 rounded-full ring-4 ring-zinc-900", CRM_STAGE_DOT[event.toStage])} aria-hidden />
                    <p className="text-sm text-zinc-100">{historyTitle(event)}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {event.actorType === "automation" ? `Automático · ${event.actorLabel}` : event.actorLabel} · {dateTimeLabel(event.changedAt)}
                    </p>
                    {event.note && <p className="mt-1 text-xs leading-5 text-zinc-400">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
            {historyCursor && (
              <Button variant="ghost" size="sm" loading={historyLoading} onClick={loadMoreHistory}>Mostrar mais</Button>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}
