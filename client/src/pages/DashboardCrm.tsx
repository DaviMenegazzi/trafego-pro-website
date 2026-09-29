import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Loader2, LogIn, RefreshCw, ScanLine, ShieldOff, SquareKanban } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CrmBoard } from "@/components/crm/CrmBoard";
import { CrmFilters } from "@/components/crm/CrmFilters";
import { CrmLeadDrawer } from "@/components/crm/CrmLeadDrawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/contexts/ClientContext";
import { usePixelCrm } from "@/hooks/usePixelCrm";
import { findCrmLead } from "@/lib/crmBoardState";
import { cn } from "@/lib/utils";
import { CRM_STAGE_LABELS, isCrmReopen, type CrmFilters as CrmFiltersValue, type CrmLead, type CrmStage } from "../../../shared/crm";

function Notice({ icon: Icon, title, children, tone = "neutral" }: { icon: typeof AlertTriangle; title: string; children?: React.ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center",
      tone === "danger" ? "border-rose-400/25 bg-rose-400/[.04]" : "border-white/15 bg-white/[.02]",
    )}>
      <Icon className={cn("size-6", tone === "danger" ? "text-rose-300" : "text-zinc-500")} />
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {children && <div className="max-w-md text-sm text-zinc-400">{children}</div>}
    </div>
  );
}

export default function DashboardCrm() {
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientContext();
  const [filters, setFilters] = useState<CrmFiltersValue>({});
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [pendingReopen, setPendingReopen] = useState<{ lead: CrmLead; stage: CrmStage } | null>(null);

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
    setPendingReopen(null);
    setFilters({});
    setSearch("");
  }, [selectedClientId]);

  const crm = usePixelCrm(selectedClientId, filters);
  const { board } = crm;
  const selectedLead = useMemo(() => (selectedLeadId ? findCrmLead(board, selectedLeadId) : null), [board, selectedLeadId]);
  const hasFilters = Boolean(filters.instanceName || filters.temperature || filters.classification || filters.q);

  function requestMove(lead: CrmLead, stage: CrmStage) {
    if (lead.crmStage === stage) return;
    if (isCrmReopen(lead.crmStage, stage)) {
      setPendingReopen({ lead, stage });
      return;
    }
    void crm.moveLead(lead.id, stage);
  }

  function confirmReopen() {
    if (!pendingReopen) return;
    void crm.moveLead(pendingReopen.lead.id, pendingReopen.stage, `Reaberto de ${CRM_STAGE_LABELS[pendingReopen.lead.crmStage]}`);
    setPendingReopen(null);
  }

  const lastUpdated = crm.lastUpdatedAt
    ? new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(crm.lastUpdatedAt)
    : null;

  let content: React.ReactNode;
  if (clientsLoading) {
    content = <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400"><Loader2 className="mr-2 size-4 animate-spin" /> Preparando o CRM…</div>;
  } else if (!selectedClientId) {
    content = <Notice icon={SquareKanban} title="Selecione uma unidade no menu para abrir o CRM." />;
  } else if (crm.problem === "unauthenticated") {
    content = (
      <Notice icon={LogIn} title="Sua sessão expirou." tone="danger">
        <p>Entre novamente para continuar usando o CRM.</p>
        <Button asChild className="mt-3 bg-emerald-400 text-zinc-950 hover:bg-emerald-300"><Link href="/login">Entrar</Link></Button>
      </Notice>
    );
  } else if (crm.problem === "forbidden") {
    content = <Notice icon={ShieldOff} title="Sem acesso ao CRM desta unidade." tone="danger"><p>O acesso ao Pixel ou a esta unidade não está liberado para o seu usuário. Fale com um administrador.</p></Notice>;
  } else if (crm.problem === "disabled") {
    content = <Notice icon={SquareKanban} title="O CRM ainda não está habilitado." />;
  } else if (crm.status === "loading" && !board) {
    content = (
      <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Carregando quadro">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-80 w-[272px] shrink-0 animate-pulse rounded-2xl border border-white/8 bg-white/[.03]" />)}
      </div>
    );
  } else if (!board) {
    content = (
      <Notice icon={AlertTriangle} title="Não foi possível carregar o CRM." tone="danger">
        <p>{crm.error}</p>
        <Button variant="outline" onClick={() => void crm.refresh()} className="mt-3 border-white/10 bg-white/[.03]"><RefreshCw className="size-4" /> Tentar novamente</Button>
      </Notice>
    );
  } else if (board.instances.length === 0) {
    content = (
      <Notice icon={ScanLine} title="Nenhum WhatsApp vinculado a esta unidade.">
        <p>Os leads do CRM vêm do Pixel. Conecte uma instância para começar.</p>
        <Button asChild variant="outline" className="mt-3 border-white/10 bg-white/[.03]"><Link href="/dashboard/pixel">Ir para o Pixel</Link></Button>
      </Notice>
    );
  } else {
    content = (
      <div className="space-y-4">
        <CrmFilters value={filters} search={search} instances={board.instances} onSearchChange={setSearch} onChange={setFilters} />
        {crm.error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-4 py-2.5 text-xs text-amber-100">
            <span>{crm.error} Mostrando os dados da última atualização.</span>
            <button type="button" onClick={() => void crm.refresh()} className="shrink-0 underline-offset-2 hover:underline">Tentar novamente</button>
          </div>
        )}
        {board.total === 0 ? (
          hasFilters
            ? <Notice icon={SquareKanban} title="Nenhum lead encontrado com estes filtros."><button type="button" onClick={() => { setSearch(""); setFilters({}); }} className="text-emerald-300 hover:underline">Limpar filtros</button></Notice>
            : <Notice icon={SquareKanban} title="Nenhum lead nesta unidade ainda."><p>Conversas confirmadas ou vindas de anúncios aparecem aqui automaticamente.</p></Notice>
        ) : (
          <CrmBoard
            board={board}
            savingIds={crm.savingIds}
            loadingMore={crm.loadingMore}
            onOpen={setSelectedLeadId}
            onMove={requestMove}
            onResume={(leadId) => void crm.resumeAutomation(leadId)}
            onLoadMore={(stage) => void crm.loadMore(stage)}
          />
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1900px] space-y-6 px-4 py-6 md:px-8">
        <header className="platform-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-emerald-400"><SquareKanban className="size-4" /> CRM</div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Leads por etapa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {selectedClient?.name ? <span className="text-zinc-200">{selectedClient.name}</span> : "Unidade"}
              {board ? ` · ${board.total} ${board.total === 1 ? "lead" : "leads"}${hasFilters ? " com os filtros" : ""}` : ""}
              {lastUpdated ? ` · atualizado às ${lastUpdated}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-white/10 bg-white/[.03]"><Link href="/dashboard/pixel"><ScanLine className="size-4" /> Pixel</Link></Button>
            <Button variant="outline" onClick={() => void crm.refresh()} disabled={crm.refreshing || !selectedClientId || Boolean(crm.problem)} className="border-white/10 bg-white/[.03]">
              <RefreshCw className={cn("size-4", crm.refreshing && "animate-spin")} /> Atualizar
            </Button>
          </div>
        </header>

        {content}
      </div>

      {selectedClientId && (
        <CrmLeadDrawer
          unitId={selectedClientId}
          leadId={selectedLeadId}
          boardLead={selectedLead}
          saving={selectedLeadId ? crm.savingIds.has(selectedLeadId) : false}
          onClose={() => setSelectedLeadId(null)}
          onMove={requestMove}
          onResume={(leadId) => void crm.resumeAutomation(leadId)}
          onLeadLoaded={crm.syncLead}
        />
      )}

      <AlertDialog open={Boolean(pendingReopen)} onOpenChange={(open) => !open && setPendingReopen(null)}>
        <AlertDialogContent className="border-white/10 bg-[#151417] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir este lead?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingReopen && `${pendingReopen.lead.contactName || "Este contato"} está em ${CRM_STAGE_LABELS[pendingReopen.lead.crmStage]}. Ele volta para ${CRM_STAGE_LABELS[pendingReopen.stage]} e a reabertura fica registrada no histórico.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReopen} className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300">Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
