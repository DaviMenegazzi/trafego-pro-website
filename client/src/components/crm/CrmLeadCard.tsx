import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRightLeft, Ellipsis, Loader2, Phone, Smartphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCrmPhone, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CRM_STAGE_OPTIONS, CRM_STAGE_STYLES, CrmModeIndicator, CrmTemperatureBadge, relativeTime } from "./crmUi";

type CardProps = {
  lead: CrmLead;
  saving: boolean;
  draggable: boolean;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
};

export function CrmMoveMenu({ lead, disabled, onMove }: { lead: CrmLead; disabled: boolean; onMove: (lead: CrmLead, stage: CrmStage) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Mover ${lead.contactName || "contato"} para outra etapa`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:opacity-40"
        >
          <Ellipsis className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#151417] text-zinc-100" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-zinc-400"><ArrowRightLeft className="size-3.5" /> Mover para…</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {CRM_STAGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.value === lead.crmStage}
            onSelect={() => onMove(lead, option.value)}
            className="gap-2 text-sm"
          >
            <span className={cn("size-2 rounded-full", CRM_STAGE_STYLES[option.value].dot)} />
            {option.label}
            {option.value === lead.crmStage && <span className="ml-auto text-[10px] text-zinc-500">atual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CrmCardBody({ lead }: { lead: CrmLead }) {
  const phone = formatCrmPhone(lead);
  return (
    <>
      <p className="truncate text-sm font-semibold text-zinc-100">{lead.contactName || "Contato sem nome"}</p>
      <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
        <Smartphone className="size-3 shrink-0 text-zinc-500" />
        <span className="truncate">{lead.instanceDisplayName || lead.instanceName}</span>
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <CrmTemperatureBadge lead={lead} />
        <span className={cn("flex items-center gap-1 truncate font-mono text-[11px]", phone.partial ? "text-zinc-500" : "text-zinc-300")} title={phone.partial ? "Número completo indisponível" : undefined}>
          <Phone className="size-3 shrink-0 text-zinc-500" />
          {phone.label}
        </span>
      </div>
    </>
  );
}

export function CrmLeadCard({ lead, saving, draggable, onOpen, onMove, onResume }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled: !draggable || saving });
  const style = isDragging ? undefined : { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${lead.contactName || "contato sem nome"}`}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(lead.id);
        }
      }}
      className={cn(
        "group relative w-full select-none rounded-xl border p-3 text-left shadow-sm transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]",
        draggable && !saving ? "cursor-grab" : "cursor-pointer",
        isDragging
          ? "scale-95 border-dashed border-emerald-400/40 bg-emerald-950/20 opacity-30"
          : "border-white/10 bg-[#101214] hover:border-emerald-300/30 hover:bg-[#14181a]",
        saving && "opacity-80",
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1"><CrmCardBody lead={lead} /></div>
        <CrmMoveMenu lead={lead} disabled={saving} onMove={onMove} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/[.06] pt-2">
        <CrmModeIndicator lead={lead} saving={saving} onResume={onResume} />
        {saving ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300"><Loader2 className="size-3 animate-spin" /> Salvando…</span>
        ) : (
          <span className="text-[10px] text-zinc-500">{relativeTime(lead.crmStageUpdatedAt)}</span>
        )}
      </div>
    </div>
  );
}
