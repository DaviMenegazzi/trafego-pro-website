import { useDroppable } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM_STAGE_LABELS, type CrmColumn as CrmColumnData, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CrmLeadCard } from "./CrmLeadCard";
import { CRM_STAGE_STYLES } from "./crmUi";

type ColumnProps = {
  stage: CrmStage;
  column: CrmColumnData;
  savingIds: ReadonlySet<string>;
  loadingMore: boolean;
  draggable: boolean;
  className?: string;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
  onLoadMore: (stage: CrmStage) => void;
};

export function CrmColumnView({ stage, column, savingIds, loadingMore, draggable, className, onOpen, onMove, onResume, onLoadMore }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !draggable });
  const styles = CRM_STAGE_STYLES[stage];
  const remaining = Math.max(0, column.total - column.items.length);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${CRM_STAGE_LABELS[stage]}: ${column.total} leads`}
      className={cn(
        "flex flex-col rounded-2xl border p-3 transition-colors duration-200",
        styles.column,
        isOver && "border-emerald-300/60 bg-emerald-950/20 ring-2 ring-emerald-300/40",
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", styles.dot)} />
          <h3 className="truncate text-xs font-semibold text-zinc-100">{CRM_STAGE_LABELS[stage]}</h3>
        </div>
        <span
          title={column.total > column.items.length ? `${column.items.length} carregados de ${column.total}` : undefined}
          className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-300"
        >
          {column.total > column.items.length ? `${column.items.length}/${column.total}` : column.total}
        </span>
      </header>

      <div className="flex-1 space-y-2">
        {column.items.length === 0 ? (
          <div className="flex min-h-[96px] items-center justify-center rounded-xl border border-dashed border-white/8 p-4 text-center text-xs text-zinc-500">
            {isOver ? "Solte o lead aqui" : "Nenhum lead nesta etapa"}
          </div>
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
          <button
            type="button"
            onClick={() => onLoadMore(stage)}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.02] py-2 text-xs text-zinc-300 transition hover:bg-white/[.05] disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
            Carregar mais{remaining ? ` (${remaining})` : ""}
          </button>
        )}
      </div>
    </section>
  );
}
