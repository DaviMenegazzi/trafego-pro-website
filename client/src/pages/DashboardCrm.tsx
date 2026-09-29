import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, LogIn, RefreshCw, ScanLine, ShieldOff, SquareKanban } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button, EmptyState, IconButton, InlineNotice, Page, PageHeader, Surface, useConfirm } from "@/components/ds";
import { CrmBoard } from "@/components/crm/CrmBoard";
import { CrmFilters } from "@/components/crm/CrmFilters";
import { CrmLeadDrawer } from "@/components/crm/CrmLeadDrawer";
import { useClientContext } from "@/contexts/ClientContext";
import { usePixelCrm } from "@/hooks/usePixelCrm";
import { findCrmLead } from "@/lib/crmBoardState";
import { CRM_STAGE_LABELS, CRM_STAGES, isCrmReopen, type CrmFilters as CrmFiltersValue, type CrmLead, type CrmStage } from "../../../shared/crm";

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Carregando quadro">
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

export default function DashboardCrm() {
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientContext();
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
  const subtitle = [
    selectedClient?.name ?? "Nenhuma unidade selecionada",
    board ? `${board.total} ${board.total === 1 ? "lead" : "leads"}${hasFilters ? " com estes filtros" : ""}` : null,
  ].filter(Boolean).join(" · ");

  let body: React.ReactNode;
  if (clientsLoading || (crm.status === "loading" && !board && selectedClientId && !crm.problem)) {
    body = <BoardSkeleton />;
  } else if (!selectedClientId) {
    body = <Surface><EmptyState icon={<SquareKanban />} title="Selecione uma unidade" description="Escolha a unidade no menu para ver o CRM." /></Surface>;
  } else if (crm.problem === "unauthenticated") {
    body = <Surface><EmptyState icon={<LogIn />} title="Sua sessão expirou" description="Entre novamente para continuar usando o CRM." action={<Button asChild variant="primary"><Link href="/login">Entrar</Link></Button>} /></Surface>;
  } else if (crm.problem === "forbidden") {
    body = <Surface><EmptyState icon={<ShieldOff />} title="Sem acesso a esta unidade" description="O Pixel ou esta unidade não está liberado para o seu usuário. Fale com um administrador." /></Surface>;
  } else if (crm.problem === "disabled") {
    body = <Surface><EmptyState icon={<SquareKanban />} title="O CRM ainda não está habilitado" /></Surface>;
  } else if (!board) {
    body = <Surface><EmptyState icon={<AlertTriangle />} title="Não conseguimos carregar o CRM" description={crm.error ?? undefined} action={<Button size="sm" onClick={() => void crm.refresh()}><RefreshCw />Tentar de novo</Button>} /></Surface>;
  } else if (board.instances.length === 0) {
    body = <Surface><EmptyState icon={<ScanLine />} title="Nenhum WhatsApp nesta unidade" description="Os leads do CRM vêm do Pixel. Conecte uma instância para começar." action={<Button asChild size="sm"><Link href="/dashboard/pixel">Ir para o Pixel</Link></Button>} /></Surface>;
  } else if (board.total === 0) {
    body = hasFilters
      ? <Surface><EmptyState title="Nenhum lead com estes filtros" action={<Button size="sm" onClick={() => { setSearch(""); setFilters({}); }}>Limpar filtros</Button>} /></Surface>
      : <Surface><EmptyState icon={<SquareKanban />} title="Nenhum lead ainda" description="Conversas confirmadas ou vindas de anúncios aparecem aqui automaticamente." /></Surface>;
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
    <AppLayout>
      <Page className="max-w-none">
        <PageHeader
          title="CRM"
          subtitle={subtitle}
          actions={
            <>
              {lastUpdated && <span className="hidden text-xs text-zinc-500 sm:inline">Atualizado às {lastUpdated}</span>}
              <IconButton
                label="Atualizar"
                icon={<RefreshCw className={crm.refreshing ? "animate-spin" : undefined} />}
                onClick={() => void crm.refresh()}
                disabled={crm.refreshing || !selectedClientId || Boolean(crm.problem)}
              />
              <Button asChild><Link href="/dashboard/pixel"><ScanLine />Pixel</Link></Button>
            </>
          }
        >
          {board && board.instances.length > 0 && !crm.problem && (
            <CrmFilters value={filters} search={search} instances={board.instances} onSearchChange={setSearch} onChange={setFilters} />
          )}
        </PageHeader>

        {crm.error && board && (
          <InlineNotice tone="warning" icon={<AlertTriangle />} action={<Button size="sm" variant="ghost" onClick={() => void crm.refresh()}>Tentar de novo</Button>}>
            {crm.error} Mostrando a última atualização.
          </InlineNotice>
        )}

        {body}
      </Page>

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
        />
      )}
    </AppLayout>
  );
}
