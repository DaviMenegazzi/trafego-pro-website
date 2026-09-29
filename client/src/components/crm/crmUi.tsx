import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Bot, Hand, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM_STAGE_LABELS, CRM_STAGES, CRM_TEMPERATURE_LABELS, type CrmLead, type CrmStage } from "../../../../shared/crm";

export const CRM_STAGE_STYLES: Record<CrmStage, { column: string; dot: string }> = {
  lead_not_responded: { column: "border-zinc-500/25 bg-zinc-400/[.05]", dot: "bg-zinc-400" },
  lead_responded: { column: "border-sky-400/25 bg-sky-400/[.06]", dot: "bg-sky-400" },
  follow_up: { column: "border-amber-400/25 bg-amber-400/[.06]", dot: "bg-amber-400" },
  lead_replied: { column: "border-violet-400/25 bg-violet-400/[.06]", dot: "bg-violet-400" },
  negotiation: { column: "border-indigo-400/25 bg-indigo-400/[.06]", dot: "bg-indigo-400" },
  closed_won: { column: "border-emerald-400/25 bg-emerald-400/[.06]", dot: "bg-emerald-400" },
  closed_lost: { column: "border-rose-400/25 bg-rose-400/[.06]", dot: "bg-rose-400" },
};

export const CRM_STAGE_OPTIONS = CRM_STAGES.map((stage) => ({ value: stage, label: CRM_STAGE_LABELS[stage] }));

const TEMPERATURE_STYLES = {
  HOT: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  WARM: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  COLD: "border-sky-400/25 bg-sky-400/10 text-sky-300",
} as const;

export function CrmTemperatureBadge({ lead, className }: { lead: Pick<CrmLead, "temperature" | "leadScore">; className?: string }) {
  if (!lead.temperature) {
    return <span className={cn("rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-medium text-zinc-400", className)}>Não avaliado</span>;
  }
  return (
    <span
      title={lead.leadScore != null ? `Interesse de compra: ${lead.leadScore}/100` : undefined}
      className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", TEMPERATURE_STYLES[lead.temperature], className)}
    >
      {CRM_TEMPERATURE_LABELS[lead.temperature]}
    </span>
  );
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
 * Indicador do modo da etapa. Em modo manual vira botão: um clique devolve o lead à automação,
 * e a Laya volta a poder mover o cartão na próxima varredura.
 */
export function CrmModeIndicator({
  lead, saving, onResume, size = "sm",
}: {
  lead: CrmLead;
  saving: boolean;
  onResume: (leadId: string) => void;
  size?: "sm" | "md";
}) {
  const base = cn("inline-flex items-center gap-1 rounded-full border font-medium", size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs");
  if (lead.crmStageMode === "automatic") {
    return (
      <span className={cn(base, "border-violet-400/20 bg-violet-400/[.08] text-violet-300")} title="A etapa deste lead é atualizada automaticamente pela Laya e pelas regras de texto.">
        <Bot className="size-3" /> Atualizado automaticamente
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={saving}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onResume(lead.id);
      }}
      title="Etapa definida manualmente. A automação não move este lead. Clique para reativar a atualização automática."
      className={cn(base, "border-amber-400/25 bg-amber-400/[.08] text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:opacity-60")}
    >
      {saving ? <Loader2 className="size-3 animate-spin" /> : <Hand className="size-3" />}
      Manual · reativar automático
    </button>
  );
}
