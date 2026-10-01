import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
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
import { cn } from "@/lib/utils";
import { findCrmLead } from "@/lib/crmBoardState";
import { CRM_STAGE_LABELS, CRM_STAGES, resolveCrmDrop, type CrmBoard as CrmBoardData, type CrmLead, type CrmStage } from "../../../../shared/crm";
import { CrmColumnView } from "./CrmColumn";
import { CrmCardSummary } from "./CrmLeadCard";

// Onde o clique é do cartão ou de um controle, não do quadro: ali não começa a rolagem por arraste.
const INTERACTIVE = "button, a, input, select, textarea, [role=button], [role=menuitem], [role=dialog]";

/**
 * Rolagem horizontal arrastando o fundo do quadro, sem barra visível. As bordas esmaecem
 * quando ainda há colunas escondidas daquele lado.
 */
function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startScroll: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const left = node.scrollLeft > 1;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateEdges]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startScroll: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = current.startScroll - (event.clientX - current.startX);
  };
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setPanning(false);
  };

  const mask = edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? "transparent, #000 48px" : "#000"}, ${edges.right ? "#000 calc(100% - 48px), transparent" : "#000"})`
    : undefined;

  return {
    panning,
    props: {
      ref,
      onScroll: updateEdges,
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      style: mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined,
    },
  };
}

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
  const dragScroll = useDragScroll();
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
      <div
        {...dragScroll.props}
        className={cn(
          "scrollbar-none flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto p-4",
          dragScroll.panning ? "cursor-grabbing select-none" : "cursor-grab",
        )}
      >
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
      {/* No body: um ancestral com transform (animação da Surface) deslocaria o cartão do cursor. */}
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }}>
          {activeLead ? (
            <div className="w-[268px] rotate-[1.5deg] cursor-grabbing rounded-xl border border-white/[0.14] bg-zinc-800 p-3 shadow-2xl shadow-black/60">
              <CrmCardSummary lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
