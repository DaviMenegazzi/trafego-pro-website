import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Avatar, Button, Menu, type MenuItem } from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  formatCrmPhone,
  type CrmLead,
  type CrmStage,
} from "../../../../shared/crm";
import {
  CRM_STAGE_DOT,
  CRM_STAGE_OPTIONS,
  CrmModeIndicator,
  CrmTemperature,
  relativeTime,
} from "./crmUi";

type CardProps = {
  lead: CrmLead;
  saving: boolean;
  draggable: boolean;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
};

function moveItems(
  lead: CrmLead,
  onMove: (lead: CrmLead, stage: CrmStage) => void
): MenuItem[] {
  return [
    { type: "label", label: "Mover para" },
    ...CRM_STAGE_OPTIONS.map(
      (option): MenuItem => ({
        label: option.label,
        icon: (
          <span
            className={cn(
              "m-[5px] size-1.5 rounded-full",
              CRM_STAGE_DOT[option.value]
            )}
          />
        ),
        disabled: option.value === lead.crmStage,
        hint: option.value === lead.crmStage ? "Etapa atual" : undefined,
        onSelect: () => onMove(lead, option.value),
      })
    ),
  ];
}

/** Menu "Mover para…": alternativa ao arrastar para teclado, toque e celular. */
export function CrmMoveMenu({
  lead,
  disabled,
  onMove,
  className,
}: {
  lead: CrmLead;
  disabled: boolean;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  className?: string;
}) {
  return (
    <div
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
      className={className}
    >
      <Menu
        items={moveItems(lead, onMove)}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Mover ${lead.contactName || "contato"} para outra etapa`}
            className="-mr-1 -mt-0.5 size-7"
          >
            <MoreHorizontal />
          </Button>
        }
      />
    </div>
  );
}

export function CrmCardIdentity({ lead }: { lead: CrmLead }) {
  const name = lead.contactName || "Contato sem nome";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-medium leading-5",
            lead.contactName ? "text-zinc-100" : "text-zinc-400"
          )}
        >
          {name}
        </p>
        <p className="truncate text-xs leading-4 text-zinc-500">
          {lead.instanceDisplayName || lead.instanceName}
        </p>
      </div>
    </div>
  );
}

export function CrmCardDetails({ lead }: { lead: CrmLead }) {
  const phone = formatCrmPhone(lead);
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
      <span
        className={cn(
          "truncate tabular-nums",
          phone.partial ? "text-zinc-500" : "text-zinc-300"
        )}
      >
        {phone.label}
      </span>
      <CrmTemperature lead={lead} className="shrink-0" />
    </div>
  );
}

export function CrmCardSummary({ lead }: { lead: CrmLead }) {
  return (
    <>
      <CrmCardIdentity lead={lead} />
      <CrmCardDetails lead={lead} />
    </>
  );
}

export function CrmLeadCard({
  lead,
  saving,
  draggable,
  onOpen,
  onMove,
  onResume,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id, disabled: !draggable || saving });
  const style = isDragging
    ? undefined
    : { transform: CSS.Translate.toString(transform) };

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
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(lead.id);
        }
      }}
      className={cn(
        "group relative select-none rounded-xl border bg-zinc-900 p-3 text-left outline-none",
        "shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-[border-color,background-color,box-shadow,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        isDragging
          ? "border-dashed border-white/15 opacity-40"
          : "border-white/[0.07] hover:border-white/[0.14] hover:bg-zinc-800/70",
        draggable && !saving
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <CrmCardIdentity lead={lead} />
        </div>
        <CrmMoveMenu
          lead={lead}
          disabled={saving}
          onMove={onMove}
          className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        />
      </div>
      <CrmCardDetails lead={lead} />
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5 text-[11px] leading-4">
        <CrmModeIndicator lead={lead} saving={saving} onResume={onResume} />
        {saving ? (
          <span className="flex items-center gap-1 text-zinc-400">
            <Loader2 className="size-3 animate-spin" aria-hidden /> Salvando
          </span>
        ) : (
          <span className="whitespace-nowrap text-zinc-600">
            {relativeTime(lead.crmStageUpdatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
