import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Hand, Loader2, Sparkles } from "lucide-react";
import { Tooltip } from "@/components/ds";
import { cn } from "@/lib/utils";
import { CRM_STAGE_LABELS, CRM_STAGES, CRM_TEMPERATURE_LABELS, type CrmLead, type CrmStage } from "../../../../shared/crm";

// Cor só no ponto da etapa; colunas e cartões ficam neutros.
export const CRM_STAGE_DOT: Record<CrmStage, string> = {
  lead_not_responded: "bg-zinc-400",
  lead_responded: "bg-sky-400",
  follow_up: "bg-amber-400",
  lead_replied: "bg-violet-400",
  negotiation: "bg-indigo-400",
  closed_won: "bg-emerald-400",
  closed_lost: "bg-rose-400",
};

export const CRM_STAGE_OPTIONS = CRM_STAGES.map((stage) => ({ value: stage, label: CRM_STAGE_LABELS[stage] }));

const TEMPERATURE_TEXT = { HOT: "text-rose-300", WARM: "text-amber-300", COLD: "text-sky-300" } as const;

/** Temperatura como texto com ponto (sem pílula). Ausência de avaliação nunca vira "Frio". */
export function CrmTemperature({ lead, className }: { lead: Pick<CrmLead, "temperature" | "leadScore">; className?: string }) {
  if (!lead.temperature) return <span className={cn("whitespace-nowrap text-zinc-500", className)}>Não avaliado</span>;
  const label = (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-medium", TEMPERATURE_TEXT[lead.temperature], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {CRM_TEMPERATURE_LABELS[lead.temperature]}
    </span>
  );
  return lead.leadScore != null ? <Tooltip content={`Interesse de compra: ${lead.leadScore}/100`}>{label}</Tooltip> : label;
}

export function relativeTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "";
  return `há ${formatDistanceToNowStrict(date, { locale: ptBR })}`;
}

export function dateTimeLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

/**
 * Modo da etapa. Automático é só uma indicação discreta; manual vira botão: um clique devolve
 * o lead à automação e a Laya volta a poder movê-lo na próxima varredura.
 */
export function CrmModeIndicator({ lead, saving, onResume }: { lead: CrmLead; saving: boolean; onResume: (leadId: string) => void }) {
  if (lead.crmStageMode === "automatic") {
    return (
      <Tooltip content="A etapa é atualizada automaticamente pela Laya conforme a conversa avança.">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-zinc-500">
          <Sparkles className="size-3 text-violet-300/80" aria-hidden /> Atualizado automaticamente
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Etapa definida manualmente; a automação não move este lead. Clique para reativar.">
      <button
        type="button"
        disabled={saving}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onResume(lead.id);
        }}
        className="-mx-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-amber-200/90 outline-none transition-colors hover:bg-amber-400/10 hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Hand className="size-3" aria-hidden />}
        Manual · Reativar automático
      </button>
    </Tooltip>
  );
}
