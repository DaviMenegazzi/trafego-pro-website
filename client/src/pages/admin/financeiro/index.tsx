import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/AppLayout";
import type { DatabaseState } from "./types";
import { subscribeToFinancialDB } from "./lib/firebase";
import { TabFinanceiro } from "./tabs/TabFinanceiro";
import { TabDespesas } from "./tabs/TabDespesas";
import { TabDashboard } from "./tabs/TabDashboard";
import { TabAtas } from "./tabs/TabAtas";
import { TabClienteDetalhes } from "./tabs/TabClienteDetalhes";
import { ShieldAlert } from "lucide-react";
import { Page, PageHeader, Select, TabBar } from "@/components/ds";
import { toast } from "sonner";

export default function AdminFinanceiroPage() {
  const [, setLocation] = useLocation();

  // Validação síncrona rigorosa de permissão de administrador
  const isAuthorizedAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("tp_token");
    if (!token) return false;
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      return user?.role === "admin" || user?.allowedClientIds?.includes("*") === true;
    } catch {
      return false;
    }
  }, []);

  // Redirecionamento imediato e expurgo de dados caso usuário não seja admin
  useEffect(() => {
    if (!isAuthorizedAdmin) {
      try {
        localStorage.removeItem("tp_db");
      } catch {
        // ignore
      }
      toast.error("Acesso negado: o módulo financeiro é restrito a administradores.");
      setLocation("/dashboard");
    }
  }, [isAuthorizedAdmin, setLocation]);

  // Os dados financeiros não ficam mais em cache no navegador: chegam só pela API.
  const [dbState, setDbState] = useState<DatabaseState>(() => ({
    clientes: {},
    cobrancas: {},
    checklists: {},
    arquivados: {},
    despesas: {},
    atas: {},
    caixa: { saldo: 0, metaFimAno: 0 },
    despFixas: {},
    logs: [],
  }));
  const [financialReady, setFinancialReady] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);

  // Remove a cópia financeira deixada por versões anteriores.
  useEffect(() => {
    try {
      localStorage.removeItem("tp_db");
    } catch {
      // ignore
    }
  }, []);

  const [activeTab, setActiveTab] = useState<"fin" | "desp" | "dash" | "ata" | "cli">("fin");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("admin");
  const [isAdmin, setIsAdmin] = useState(isAuthorizedAdmin);

  // Read current user
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tp_user") || "{}");
      if (stored.name || stored.email || stored.login) {
        setCurrentUser(stored.name || stored.email || stored.login);
      }
      setIsAdmin(stored.role === "admin" || stored.allowedClientIds?.includes("*") === true);
    } catch {
      // fallback
    }
  }, []);

  // Firebase Realtime subscription - EXCLUSIVAMENTE para administradores autorizados
  useEffect(() => {
    if (!isAuthorizedAdmin) return;

    const unsubscribe = subscribeToFinancialDB(
      (data) => {
        setDbState(data);
        setFinancialReady(true);
        setFinancialError(null);
      },
      (error) => {
        setFinancialError(error.message);
        toast.error("Não foi possível sincronizar os dados do financeiro.");
      }
    );

    return () => unsubscribe();
  }, [isAuthorizedAdmin]);

  const payingClientsList = useMemo(() => {
    return Object.values(dbState.clientes || {}).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [dbState.clientes]);

  const activeClient = useMemo(() => {
    if (!activeClientId) return null;
    return dbState.clientes?.[activeClientId] || null;
  }, [activeClientId, dbState.clientes]);

  const handleSelectClient = (cid: string) => {
    setActiveClientId(cid);
    setActiveTab("cli");
  };

  const handleSelectMainTab = (tab: "fin" | "desp" | "dash" | "ata") => {
    setActiveTab(tab);
    setActiveClientId(null);
  };

  const handleClientRegistered = (cid: string) => {
    setActiveClientId(cid);
    setActiveTab("cli");
  };

  const handleClientDeleted = () => {
    setActiveClientId(null);
    setActiveTab("fin");
    toast.success("Unidade encerrada; o histórico financeiro foi arquivado.");
  };

  const handleCobrancaUpdated = (clientId: string, mesKey: string, cobranca: DatabaseState["cobrancas"][string][string]) => {
    setDbState((previous) => {
      const next = {
        ...previous,
        cobrancas: {
          ...previous.cobrancas,
          [clientId]: {
            ...(previous.cobrancas?.[clientId] || {}),
            [mesKey]: cobranca,
          },
        },
      };
      return next;
    });
  };

  const handleExportActiveUnit = () => {
    if (!isAdmin || !activeClientId || !activeClient) return;
    const cobrancas = Object.entries(dbState.cobrancas?.[activeClientId] || {}).map(([mesKey, item]) => ({
      periodo: mesKey,
      mes: item.mes,
      boleto_gerado: item.boletoGerado ? "Sim" : "Não",
      nf_gerada: item.nfGerada ? "Sim" : "Não",
      recebimento: item.recebido ? "Confirmado" : "Pendente",
      valor_recebido: item.valorRecebido ?? "",
      caixa: item.divisao?.caixa ?? "",
      patrono: item.divisao?.patrono ?? "",
      socio_3: item.divisao?.socio3 ?? "",
      davi: item.divisao?.davi ?? "",
      lucas: item.divisao?.lucas ?? "",
      ana: item.divisao?.ana ?? "",
    }));
    const checklist = Object.entries(dbState.checklists?.[activeClientId] || {}).map(([id, item]) => ({
      id,
      grupo: item.grupo ?? "",
      item: item.texto ?? "",
      status: item.marcado ? "Concluído" : "Pendente",
      realizado_por: item.por ?? "",
      realizado_em: item.quando ?? "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      unidade: activeClient.nome,
      cnpj: activeClient.cnpj,
      conta_meta: activeClient.metaId ?? "",
      mensalidade: activeClient.mensalidade,
      vencimento: activeClient.vencDia,
      responsavel_unidade: activeClient.respUnid ?? "",
      responsavel_financeiro: activeClient.respFin ?? "",
      email_boleto: activeClient.emailBol ?? "",
    }]), "Unidade");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cobrancas), "Cobranças");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(checklist), "Checklist");
    XLSX.writeFile(workbook, `financeiro-${activeClient.nome.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.xlsx`);
    toast.success(`Planilha de ${activeClient.nome} gerada`);
  };

  // Se não for admin, bloqueia imediatamente qualquer renderização de dados financeiros
  if (!isAuthorizedAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <ShieldAlert className="mb-4 size-8 text-rose-300" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-400">
          O Financeiro é exclusivo para administradores. Voltando para a Dashboard…
        </p>
      </div>
    );
  }

  const tabs = [
    { value: "fin" as const, label: "Financeiro" },
    { value: "desp" as const, label: "Despesas" },
    { value: "dash" as const, label: "Resumo" },
    { value: "ata" as const, label: "Atas" },
  ];

  if (isAuthorizedAdmin && !financialReady) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl p-8 text-center text-white">
          <div role="status" aria-label="Carregando dados financeiros" className="mx-auto mb-5 size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="mt-3 text-sm text-zinc-400">
            {financialError ? `Não foi possível carregar os dados: ${financialError}. Tentando novamente.` : "Carregando dados financeiros..."}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page>
        {activeTab === "cli" && activeClientId ? (
          <TabClienteDetalhes
            clientId={activeClientId}
            dbState={dbState}
            currentUser={currentUser}
            onClientDeleted={handleClientDeleted}
            onBack={() => handleSelectMainTab("fin")}
            onExport={isAdmin ? handleExportActiveUnit : undefined}
          />
        ) : (
          <>
            <PageHeader
              title="Financeiro"
              subtitle="Mensalidades das unidades, despesas, divisão entre sócios e atas."
              actions={
                <Select
                  aria-label="Abrir unidade"
                  value=""
                  onValueChange={(cid) => { if (cid) handleSelectClient(cid); }}
                  placeholder={`Abrir unidade (${payingClientsList.length})`}
                  className="w-60"
                  options={payingClientsList.map((c) => ({ value: c.id, label: c.nome }))}
                />
              }
            >
              <TabBar aria-label="Seções do financeiro" value={activeTab as "fin" | "desp" | "dash" | "ata"} onValueChange={handleSelectMainTab} tabs={tabs} />
            </PageHeader>

            {activeTab === "fin" && (
              <TabFinanceiro
                dbState={dbState}
                onClientRegistered={handleClientRegistered}
                onSelectClient={handleSelectClient}
                onCobrancaUpdated={handleCobrancaUpdated}
              />
            )}
            {activeTab === "desp" && <TabDespesas dbState={dbState} />}
            {activeTab === "dash" && <TabDashboard dbState={dbState} />}
            {activeTab === "ata" && <TabAtas dbState={dbState} currentUser={currentUser} />}
          </>
        )}
      </Page>
    </AppLayout>
  );
}
