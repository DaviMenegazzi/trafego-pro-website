import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, LogIn, RefreshCw, ScanLine, ShieldOff, SquareKanban } from "lucide-react";
import { Button, EmptyState, IconButton, InlineNotice, useConfirm } from "@/components/ds";
import { CrmBoard } from "@/components/crm/CrmBoard";
import { CrmFilters } from "@/components/crm/CrmFilters";
import { CrmLeadDrawer } from "@/components/crm/CrmLeadDrawer";
import { useClientContext } from "@/contexts/ClientContext";
import { usePixelCrm } from "@/hooks/usePixelCrm";
import { findCrmLead } from "@/lib/crmBoardState";
import { CRM_STAGE_LABELS, CRM_STAGES, isCrmReopen, type CrmFilters as CrmFiltersValue, type CrmLead, type CrmStage } from "../../../../shared/crm";

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden p-4" aria-busy="true" aria-label="Carregando quadro">
      {CRM_STAGES.slice(0, 5).map((stage) => (
        <div key={stage} className="w-[280px] shrink-0 space-y-2.5">
          <div className="h-4 w-28 animate-pulse rounded bg-white/[0.06]" />
          <div className="space-y-2 rounded-2xl bg-white/[0.02] p-1.5 ring-1 ring-inset ring-white/[0.04]">
            {[0, 1].map((index) => <div key={index} className="h-[118px] animate-pulse rounded-xl bg-white/[0.04]" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Quadro do CRM dentro da aba "CRM" do Pixel. Vai dentro de uma Surface. */
export function CrmPanel({ onOpenConversations, onOpenConversation }: { onOpenConversations: () => void; onOpenConversation: (leadId: string) => void }) {
  const { selectedClientId } = useClientContext();
  const { confirm } = useConfirm();
  const [filters, setFilters] = useState<CrmFiltersValue>({});
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Busca vai ao servidor com atraso curto para não disparar uma consulta por tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = search.trim();
      setFilters((current) => (current.q === (q || undefined) ? current : { ...current, q: q || undefined }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Troca de unidade: painel, filtros e busca da unidade anterior saem na hora.
  useEffect(() => {
    setSelectedLeadId(null);
    setFilters({});
    setSearch("");
  }, [selectedClientId]);

  const crm = usePixelCrm(selectedClientId, filters);
  const { board } = crm;
  const selectedLead = useMemo(() => (selectedLeadId ? findCrmLead(board, selectedLeadId) : null), [board, selectedLeadId]);
  const hasFilters = Boolean(filters.instanceName || filters.temperature || filters.classification || filters.q);

  async function requestMove(lead: CrmLead, stage: CrmStage) {
    if (lead.crmStage === stage) return;
    if (isCrmReopen(lead.crmStage, stage)) {
      const ok = await confirm({
        title: "Reabrir este lead?",
        description: `${lead.contactName || "Este contato"} está em ${CRM_STAGE_LABELS[lead.crmStage]} e volta para ${CRM_STAGE_LABELS[stage]}. A reabertura fica no histórico.`,
        confirmLabel: "Reabrir",
      });
      if (!ok) return;
      void crm.moveLead(lead.id, stage, `Reaberto de ${CRM_STAGE_LABELS[lead.crmStage]}`);
      return;
    }
    void crm.moveLead(lead.id, stage);
  }

  const lastUpdated = crm.lastUpdatedAt ? new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(crm.lastUpdatedAt) : null;
  const description = board
    ? `${board.total} ${board.total === 1 ? "lead" : "leads"}${hasFilters ? " com estes filtros" : ""} · arraste o card para mudar a etapa`
    : "Arraste o card para mudar a etapa.";

  let body: React.ReactNode;
  if (crm.status === "loading" && !board && selectedClientId && !crm.problem) {
    body = <BoardSkeleton />;
  } else if (crm.problem === "unauthenticated") {
    body = <EmptyState icon={<LogIn />} title="Sua sessão expirou" description="Entre novamente para continuar usando o CRM." action={<Button asChild variant="primary"><Link href="/login">Entrar</Link></Button>} />;
  } else if (crm.problem === "forbidden") {
    body = <EmptyState icon={<ShieldOff />} title="Sem acesso a esta unidade" description="O Pixel ou esta unidade não está liberado para o seu usuário. Fale com um administrador." />;
  } else if (crm.problem === "disabled") {
    body = <EmptyState icon={<SquareKanban />} title="O CRM ainda não está habilitado" />;
  } else if (!board) {
    body = <EmptyState icon={<AlertTriangle />} title="Não conseguimos carregar o CRM" description={crm.error ?? undefined} action={<Button size="sm" onClick={() => void crm.refresh()}><RefreshCw />Tentar de novo</Button>} />;
  } else if (board.instances.length === 0) {
    body = <EmptyState icon={<ScanLine />} title="Nenhum WhatsApp nesta unidade" description="Os leads do CRM vêm do Pixel. Conecte uma instância para começar." />;
  } else if (board.total === 0) {
    body = hasFilters
      ? <EmptyState title="Nenhum lead com estes filtros" action={<Button size="sm" onClick={() => { setSearch(""); setFilters({}); }}>Limpar filtros</Button>} />
      : <EmptyState icon={<SquareKanban />} title="Nenhum lead ainda" description="Conversas confirmadas ou vindas de anúncios aparecem aqui automaticamente." action={<Button size="sm" onClick={onOpenConversations}>Ver conversas</Button>} />;
  } else {
    body = (
      <CrmBoard
        board={board}
        savingIds={crm.savingIds}
        loadingMore={crm.loadingMore}
        onOpen={setSelectedLeadId}
        onMove={(lead, stage) => void requestMove(lead, stage)}
        onResume={(leadId) => void crm.resumeAutomation(leadId)}
        onLoadMore={(stage) => void crm.loadMore(stage)}
      />
    );
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-100">Funil de atendimento</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="hidden text-xs text-zinc-500 sm:inline">Atualizado às {lastUpdated}</span>}
          <IconButton
            label="Atualizar CRM"
            size="sm"
            icon={<RefreshCw className={crm.refreshing ? "animate-spin" : undefined} />}
            onClick={() => void crm.refresh()}
            disabled={crm.refreshing || !selectedClientId || Boolean(crm.problem)}
          />
        </div>
        {board && board.instances.length > 0 && !crm.problem && (
          <div className="w-full">
            <CrmFilters value={filters} search={search} instances={board.instances} onSearchChange={setSearch} onChange={setFilters} />
          </div>
        )}
      </div>

      {crm.error && board && (
        <div className="shrink-0 px-5 pt-4">
          <InlineNotice tone="warning" icon={<AlertTriangle />} action={<Button size="sm" variant="ghost" onClick={() => void crm.refresh()}>Tentar de novo</Button>}>
            {crm.error} Mostrando a última atualização.
          </InlineNotice>
        </div>
      )}

      {/* Ocupa o resto da altura da aba; as colunas rolam por dentro. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center">{body}</div>

      {selectedClientId && (
        <CrmLeadDrawer
          unitId={selectedClientId}
          leadId={selectedLeadId}
          boardLead={selectedLead}
          saving={selectedLeadId ? crm.savingIds.has(selectedLeadId) : false}
          onClose={() => setSelectedLeadId(null)}
          onMove={(lead, stage) => void requestMove(lead, stage)}
          onResume={(leadId) => void crm.resumeAutomation(leadId)}
          onLeadLoaded={crm.syncLead}
          onOpenConversation={onOpenConversation}
        />
      )}
    </>
  );
}
