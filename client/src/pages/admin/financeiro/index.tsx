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
import {
  DollarSign,
  Receipt,
  BarChart3,
  FileText,
  Building2,
  ChevronDown,
  Sparkles,
  Search,
  Landmark,
  Download,
  ShieldAlert,
} from "lucide-react";
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

  const [dbState, setDbState] = useState<DatabaseState>(() => {
    if (!isAuthorizedAdmin) {
      return {
        clientes: {},
        cobrancas: {},
        checklists: {},
        arquivados: {},
        despesas: {},
        atas: {},
        caixa: { saldo: 0, metaFimAno: 0 },
        despFixas: {},
        logs: [],
      };
    }
    try {
      const raw = JSON.parse(localStorage.getItem("tp_db") || "{}");
      return {
        clientes: raw.clientes || {},
        cobrancas: raw.cobrancas || {},
        checklists: raw.checklists || {},
        arquivados: raw.arquivados || {},
        despesas: raw.despesas || {},
        atas: raw.atas || {},
        caixa: raw.caixa || { saldo: 0, metaFimAno: 0 },
        despFixas: raw.despFixas || {},
        logs: raw.logs || [],
      };
    } catch {
      return {
        clientes: {},
        cobrancas: {},
        checklists: {},
        arquivados: {},
        despesas: {},
        atas: {},
        caixa: { saldo: 0, metaFimAno: 0 },
        despFixas: {},
        logs: [],
      };
    }
  });

  const [activeTab, setActiveTab] = useState<"fin" | "desp" | "dash" | "ata" | "cli">("fin");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("admin");
  const [isAdmin, setIsAdmin] = useState(isAuthorizedAdmin);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

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
        try {
          localStorage.setItem("tp_db", JSON.stringify(data));
        } catch {
          // ignore
        }
      },
      () => {
        toast.error("Erro na sincronização do Firebase Realtime.");
      }
    );

    return () => unsubscribe();
  }, [isAuthorizedAdmin]);

  // Se não for admin, bloqueia imediatamente qualquer renderização de dados financeiros
  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Acesso Restrito</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-sm">
          Você não possui permissão de administrador para acessar o módulo Financeiro. Redirecionando para a Dashboard...
        </p>
      </div>
    );
  }

  const payingClientsList = useMemo(() => {
    return Object.values(dbState.clientes || {}).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [dbState.clientes]);

  const filteredPayingClients = useMemo(() => {
    if (!unitSearch.trim()) return payingClientsList;
    return payingClientsList.filter((c) =>
      c.nome.toLowerCase().includes(unitSearch.toLowerCase())
    );
  }, [payingClientsList, unitSearch]);

  const activeClient = useMemo(() => {
    if (!activeClientId) return null;
    return dbState.clientes?.[activeClientId] || null;
  }, [activeClientId, dbState.clientes]);

  const handleSelectClient = (cid: string) => {
    setActiveClientId(cid);
    setActiveTab("cli");
    setUnitDropdownOpen(false);
  };

  const handleSelectMainTab = (tab: "fin" | "desp" | "dash" | "ata") => {
    setActiveTab(tab);
    setActiveClientId(null);
  };

  const handleClientRegistered = (cid: string) => {
    setActiveClientId(cid);
    setActiveTab("cli");
    toast.success("Unidade cadastrada com sucesso!");
  };

  const handleClientDeleted = () => {
    setActiveClientId(null);
    setActiveTab("fin");
    toast.info("Unidade encerrada e arquivada.");
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
      try {
        localStorage.setItem("tp_db", JSON.stringify(next));
      } catch {
        // Não impede a atualização visual quando o cache local estiver indisponível.
      }
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
    toast.success(`Excel de ${activeClient.nome} gerado.`);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8 pb-16">
        {/* Top Header Deck */}
        <div className="relative z-30 rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            {/* Title & Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="size-3.5" />
                <span>Módulo de Gestão Financeira</span>
                <span className="text-zinc-500 font-mono text-[11px]">· Firebase Realtime</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Central Financeira & Franquias
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-400 font-light">
                Acompanhamento integrado de mensalidades, divisão de sócios, despesas e checklists operacionais da rede.
              </p>
            </div>

            {/* Paying Units Quick Selector */}
            <div className="relative z-40 w-full md:w-72 shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Unidade Pagante</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {payingClientsList.length} cadastradas
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
                  className="flex items-center justify-between gap-3 w-full bg-zinc-950/80 border border-white/10 hover:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-xs text-white shadow-lg transition-all focus:outline-none"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="size-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold truncate">
                      {activeTab === "cli" && activeClient
                        ? activeClient.nome
                        : "Visão Geral (Todas as Unidades)"}
                    </span>
                  </div>
                  <ChevronDown className={`size-4 text-zinc-400 transition-transform ${unitDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {unitDropdownOpen && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setUnitDropdownOpen(false)}
                    />

                    <div className="absolute right-0 top-full mt-2 w-full md:w-80 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl z-50 text-xs">
                      <div className="p-2 border-b border-white/10 mb-1">
                        <div className="relative">
                          <Search className="size-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={unitSearch}
                            onChange={(e) => setUnitSearch(e.target.value)}
                            placeholder="Buscar unidade pagante…"
                            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
                          />
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectMainTab("fin");
                            setUnitDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                            activeTab === "fin" && !activeClientId
                              ? "bg-emerald-500 text-zinc-950 font-bold"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Landmark className="size-3.5" />
                            <span>Visão Geral (Todas as Unidades)</span>
                          </span>
                        </button>

                        {filteredPayingClients.map((c) => {
                          const isSelected = activeClientId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectClient(c.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? "bg-emerald-500 text-zinc-950 font-bold"
                                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <span className="truncate flex items-center gap-2">
                                <Building2 className="size-3.5 text-zinc-400 shrink-0" />
                                <span className="truncate">{c.nome}</span>
                              </span>
                              {isSelected && (
                                <span className="text-[10px] uppercase font-black tracking-wider text-zinc-950">
                                  Ativa
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {isAdmin && activeClient && (
              <button
                type="button"
                onClick={handleExportActiveUnit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-zinc-950"
              >
                <Download className="size-4" />
                Exportar unidade
              </button>
            )}
          </div>

          {/* Navigation Tabs - Modern Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-5 border-t border-white/10">
            <button
              onClick={() => handleSelectMainTab("fin")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "fin"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <DollarSign className="size-4" />
              <span>Financeiro</span>
            </button>

            <button
              onClick={() => handleSelectMainTab("desp")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "desp"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <Receipt className="size-4" />
              <span>Despesas</span>
            </button>

            <button
              onClick={() => handleSelectMainTab("dash")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "dash"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <BarChart3 className="size-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleSelectMainTab("ata")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === "ata"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "border border-white/5 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <FileText className="size-4" />
              <span>Atas de Reunião</span>
            </button>

            {activeTab === "cli" && activeClient && (
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 whitespace-nowrap"
              >
                <Building2 className="size-4" />
                <span>{activeClient.nome}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <main className="relative z-10 space-y-6">
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

          {activeTab === "ata" && (
            <TabAtas dbState={dbState} currentUser={currentUser} />
          )}

          {activeTab === "cli" && activeClientId && (
            <TabClienteDetalhes
              clientId={activeClientId}
              dbState={dbState}
              currentUser={currentUser}
              onClientDeleted={handleClientDeleted}
            />
          )}
        </main>
      </div>
    </AppLayout>
  );
}
