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
import { SegmentedControl } from "@/components/ds";
import { useIsMobile } from "@/hooks/useMobile";
import { findCrmLead } from "@/lib/crmBoardState";
import { CRM_STAGE_LABELS, CRM_STAGES, resolveCrmDrop, type CrmBoard as CrmBoardData, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CrmColumnView } from "./CrmColumn";
import { CrmCardSummary } from "./CrmLeadCard";

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
// lista vertical; o movimento é pelo menu "Mover para" de cada cartão.
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
        <SegmentedControl
          aria-label="Etapa"
          value={mobileStage}
          onValueChange={setMobileStage}
          className="w-full"
          options={CRM_STAGES.map((stage) => ({ value: stage, label: CRM_STAGE_LABELS[stage], count: board.columns[stage].total }))}
        />
        <CrmColumnView
          stage={mobileStage}
          column={board.columns[mobileStage]}
          loadingMore={loadingMore.has(mobileStage)}
          draggable={false}
          showHeader={false}
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
      <div className="-mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {CRM_STAGES.map((stage) => (
          <CrmColumnView
            key={stage}
            stage={stage}
            column={board.columns[stage]}
            loadingMore={loadingMore.has(stage)}
            draggable
            className="w-[280px] shrink-0"
            {...columnProps}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }}>
        {activeLead ? (
          <div className="w-[268px] rotate-[1.5deg] cursor-grabbing rounded-xl border border-white/[0.14] bg-zinc-800 p-3 shadow-2xl shadow-black/60">
            <CrmCardSummary lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
