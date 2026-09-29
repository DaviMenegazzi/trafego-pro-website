import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { findCrmLead } from "@/lib/crmBoardState";
import { CRM_STAGE_LABELS, CRM_STAGES, resolveCrmDrop, type CrmBoard as CrmBoardData, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CrmColumnView } from "./CrmColumn";
import { CrmCardBody } from "./CrmLeadCard";
import { CRM_STAGE_STYLES } from "./crmUi";

type BoardProps = {
  board: CrmBoardData;
  savingIds: ReadonlySet<string>;
  loadingMore: ReadonlySet<CrmStage>;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, stage: CrmStage) => void;
  onResume: (leadId: string) => void;
  onLoadMore: (stage: CrmStage) => void;
};

// Desktop: sete colunas com rolagem horizontal e arrastar-e-soltar. Celular: seletor de etapa e
// lista vertical; o movimento é pelo menu "Mover para…" de cada cartão.
export function CrmBoard({ board, savingIds, loadingMore, onOpen, onMove, onResume, onLoadMore }: BoardProps) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<CrmStage>("lead_not_responded");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const activeLead = useMemo(() => (activeId ? findCrmLead(board, activeId) : null), [activeId, board]);
  const allLeads = useMemo(() => CRM_STAGES.flatMap((stage) => board.columns[stage].items), [board]);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    // Soltar na mesma coluna não muda etapa nem cria histórico.
    const drop = resolveCrmDrop(allLeads, String(event.active.id), event.over ? String(event.over.id) : null);
    if (drop) onMove(drop.lead, drop.stage);
  }

  const columnProps = { savingIds, onOpen, onMove, onResume, onLoadMore };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Etapas do CRM">
          <div className="flex w-max gap-2">
            {CRM_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={mobileStage === stage}
                onClick={() => setMobileStage(stage)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  mobileStage === stage ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/[.03] text-zinc-300",
                )}
              >
                <span className={cn("size-1.5 rounded-full", CRM_STAGE_STYLES[stage].dot)} />
                {CRM_STAGE_LABELS[stage]}
                <span className="tabular-nums text-zinc-500">{board.columns[stage].total}</span>
              </button>
            ))}
          </div>
        </div>
        <CrmColumnView
          stage={mobileStage}
          column={board.columns[mobileStage]}
          loadingMore={loadingMore.has(mobileStage)}
          draggable={false}
          {...columnProps}
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {CRM_STAGES.map((stage) => (
          <CrmColumnView
            key={stage}
            stage={stage}
            column={board.columns[stage]}
            loadingMore={loadingMore.has(stage)}
            draggable
            className="w-[272px] shrink-0"
            {...columnProps}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="pointer-events-none w-[250px] cursor-grabbing rounded-xl border border-emerald-300/50 bg-[#151a1c] p-3 shadow-2xl shadow-black/50">
            <CrmCardBody lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
