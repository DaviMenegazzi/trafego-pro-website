import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ds";
import { cn } from "@/lib/utils";
import { CRM_STAGE_LABELS, type CrmColumn as CrmColumnData, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CrmLeadCard } from "./CrmLeadCard";
import { CRM_STAGE_DOT } from "./crmUi";

type ColumnProps = {
  stage: CrmStage;
  column: CrmColumnData;
  savingIds: ReadonlySet<string>;
  loadingMore: boolean;
  draggable: boolean;
  showHeader?: boolean;
  className?: string;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
  onLoadMore: (stage: CrmStage) => void;
};

export function CrmColumnView({ stage, column, savingIds, loadingMore, draggable, showHeader = true, className, onOpen, onMove, onResume, onLoadMore }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !draggable });
  const remaining = Math.max(0, column.total - column.items.length);

  return (
    <section ref={setNodeRef} aria-label={`${CRM_STAGE_LABELS[stage]}: ${column.total} leads`} className={cn("flex min-w-0 flex-col", className)}>
      {showHeader && (
        <header className="mb-2.5 flex items-center gap-2 px-1">
          <span className={cn("size-2 shrink-0 rounded-full", CRM_STAGE_DOT[stage])} aria-hidden />
          <h3 className="truncate text-[13px] font-semibold text-zinc-100">{CRM_STAGE_LABELS[stage]}</h3>
          <span className="text-[13px] tabular-nums text-zinc-500">{column.total}</span>
        </header>
      )}
      <div
        className={cn(
          "min-h-[168px] flex-1 space-y-2 rounded-2xl p-1.5 ring-1 ring-inset transition-[background-color,box-shadow] duration-200",
          isOver ? "bg-emerald-400/[0.05] ring-emerald-400/35" : "bg-white/[0.02] ring-white/[0.04]",
        )}
      >
        {column.items.length === 0 ? (
          <p className="px-3 py-10 text-center text-xs text-zinc-600">{isOver ? "Solte para mover" : "Nenhum lead"}</p>
        ) : (
          column.items.map((lead) => (
            <CrmLeadCard
              key={lead.id}
              lead={lead}
              saving={savingIds.has(lead.id)}
              draggable={draggable}
              onOpen={onOpen}
              onMove={onMove}
              onResume={onResume}
            />
          ))
        )}
        {column.hasMore && (
          <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => onLoadMore(stage)} className="w-full text-zinc-400">
            Mostrar mais{remaining ? ` · ${remaining}` : ""}
          </Button>
        )}
      </div>
    </section>
  );
}
