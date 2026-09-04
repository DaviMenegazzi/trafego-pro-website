import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type {
  Cliente,
  Cobranca,
  Caixa,
  DespesaFixa,
  DatabaseState,
} from "../types";
import {
  MESES,
  CL_FIN,
  CL_TRAF,
  CL_SOC,
  fmtBRL,
  mascararCNPJ,
  validarCNPJ,
  slug,
  now,
} from "../constants";
import {
  saveCliente,
  saveCaixa,
  saveDespesaFixa,
  deleteDespesaFixa,
  saveCobranca,
  saveChecklistItem,
} from "../lib/firebase";
import { useClientContext } from "@/contexts/ClientContext";
import {
  Building2,
  Wallet,
  CalendarCheck,
  Users,
  Archive,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  Landmark,
  Coins,
  RotateCcw,
  TrendingUp,
  Receipt,
  PieChart,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface TabFinanceiroProps {
  dbState: DatabaseState;
  onClientRegistered?: (cid: string) => void;
  onSelectClient?: (cid: string) => void;
  onCobrancaUpdated?: (cid: string, mesKey: string, cobranca: Cobranca) => void;
}

export function TabFinanceiro({
  dbState,
  onClientRegistered,
  onSelectClient,
  onCobrancaUpdated,
}: TabFinanceiroProps) {
  const { clients: metaAccounts } = useClientContext();

  // Form states for new unit
  const [selectedMetaId, setSelectedMetaId] = useState("");
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [respUnid, setRespUnid] = useState("");
  const [respFin, setRespFin] = useState("");
  const [emailBol, setEmailBol] = useState("");
  const [vencDia, setVencDia] = useState<string | number>("");
  const [mensalidade, setMensalidade] = useState<string | number>("");
  const [dataInicio, setDataInicio] = useState("");
  const [mesInicial, setMesInicial] = useState("2026_07");
  const [cnpjError, setCnpjError] = useState(false);
  const [msgCad, setMsgCad] = useState("");
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);

  // Month selector for cobrancas - default to current month (e.g. 2026_09)
  const [mesCobKey, setMesCobKey] = useState(() => {
    const hoje = new Date();
    const currentKey = `${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return MESES.some((m) => m.k === currentKey) ? currentKey : "2026_09";
  });

  // Caixa & Despesas fixas
  const [cxSaldo, setCxSaldo] = useState<string | number>(
    dbState.caixa?.saldo ?? 0
  );
  const [cxMeta, setCxMeta] = useState<string | number>(
    dbState.caixa?.metaFimAno ?? 0
  );
  const [msgCx, setMsgCx] = useState("");

  // Nova Despesa Fixa form
  const [dfNome, setDfNome] = useState("");
  const [dfVal, setDfVal] = useState<string | number>("");
  const [dfDesc, setDfDesc] = useState("");

  // Arquivados toggle
  const [showArquivados, setShowArquivados] = useState(false);

  // Quick prompt modal for editing received value
  const [editRecModal, setEditRecModal] = useState<{
    cid: string;
    mesKey: string;
    val: number;
  } | null>(null);
  const [editRecInput, setEditRecInput] = useState<string>("");

  // Inline value input states for unconfirmed receipts
  const [inputValoresRec, setInputValoresRec] = useState<Record<string, string>>({});
  const [savingCobrancas, setSavingCobrancas] = useState<Record<string, boolean>>({});

  // Meta ID sync
  const handleMetaAccountSelect = (metaId: string) => {
    setSelectedMetaId(metaId);
    if (!metaId) return;
    const found = metaAccounts.find((a) => a.id === metaId);
    if (found) {
      if (!nome) setNome(found.name);
    }
  };

  const handleCnpjChange = (val: string) => {
    const masked = mascararCNPJ(val);
    setCnpj(masked);
    if (masked.replace(/\D/g, "").length === 14) {
      setCnpjError(!validarCNPJ(masked));
    } else {
      setCnpjError(false);
    }
  };

  const handleCadastrarUnidade = async () => {
    if (!nome.trim()) {
      alert("Informe o nome da unidade.");
      return;
    }
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (!cnpj || cleanCnpj.length !== 14) {
      alert("Informe um CNPJ completo no formato 00.000.000/0000-00.");
      return;
    }
    if (!validarCNPJ(cnpj)) {
      alert("O CNPJ informado é inválido. Verifique os dígitos.");
      return;
    }
    if (!vencDia) {
      alert("Selecione o dia de vencimento.");
      return;
    }
    const numVal = parseFloat(String(mensalidade));
    if (!numVal || numVal <= 0) {
      alert("Informe o valor da mensalidade.");
      return;
    }
    if (!mesInicial) {
      alert("Selecione o primeiro mês de cobrança.");
      return;
    }

    const dup = Object.values(dbState.clientes || {}).find(
      (c) => c.cnpj.replace(/\D/g, "") === cleanCnpj
    );
    if (dup) {
      alert(`CNPJ já cadastrado para a unidade: ${dup.nome}`);
      return;
    }

    const id = slug(nome) + "_" + Date.now();
    const newClient: Cliente = {
      id,
      metaId: selectedMetaId || undefined,
      nome: nome.trim(),
      cnpj: cnpj.trim(),
      endereco: endereco.trim(),
      respUnid: respUnid.trim(),
      respFin: respFin.trim(),
      emailBol: emailBol.trim(),
      vencDia,
      mensalidade: numVal,
      mesInicial,
      dataInicio,
      criadoEm: now(),
    };

    try {
      await saveCliente(newClient);

      const allChecklistItems = [...CL_FIN, ...CL_TRAF, ...CL_SOC];
      for (const item of allChecklistItems) {
        await saveChecklistItem(id, item.id, {
          marcado: false,
          por: null,
          quando: null,
        });
      }

      const mesLabel = MESES.find((m) => m.k === mesInicial)?.l || mesInicial;
      const initialCobranca: Cobranca = {
        mes: mesLabel,
        boletoGerado: false,
        nfGerada: false,
        recebido: false,
        valorRecebido: null,
        divisao: null,
      };
      await saveCobranca(id, mesInicial, initialCobranca);

      setMsgCad(`${nome} cadastrada com sucesso!`);
      setTimeout(() => setMsgCad(""), 5000);

      setNome("");
      setCnpj("");
      setEndereco("");
      setRespUnid("");
      setRespFin("");
      setEmailBol("");
      setVencDia("");
      setMensalidade("");
      setDataInicio("");
      setSelectedMetaId("");
      setCnpjError(false);
      setShowNewUnitForm(false);

      if (onClientRegistered) onClientRegistered(id);
    } catch (err: any) {
      alert("Erro ao cadastrar unidade: " + err.message);
    }
  };

  const totalDespFixas = useMemo(() => {
    return Object.values(dbState.despFixas || {}).reduce(
      (s, d) => s + parseFloat(String(d.val || 0)),
      0
    );
  }, [dbState.despFixas]);

  const saldoNumber = parseFloat(String(cxSaldo || 0));
  const metaNumber = parseFloat(String(cxMeta || 0));

  const mesesRestantes = useMemo(() => {
    const hoje = new Date();
    return Math.max(1, 12 - hoje.getMonth());
  }, []);

  const receitaMedMes = useMemo(() => {
    const recs: number[] = [];
    Object.values(dbState.cobrancas || {}).forEach((m) => {
      Object.values(m || {}).forEach((c) => {
        if (c.recebido && c.valorRecebido) recs.push(c.valorRecebido);
      });
    });
    return recs.length ? recs.reduce((a, b) => a + b, 0) / recs.length : 0;
  }, [dbState.cobrancas]);

  const projecaoEntrada = receitaMedMes * mesesRestantes;
  const projecaoSaida = totalDespFixas * mesesRestantes;
  const projecaoCaixa = saldoNumber + projecaoEntrada - projecaoSaida;

  const handleSalvarCaixa = async () => {
    try {
      await saveCaixa({
        saldo: saldoNumber,
        metaFimAno: metaNumber,
        atualizadoEm: now(),
      });
      setMsgCx("Salvo com sucesso!");
      setTimeout(() => setMsgCx(""), 3000);
    } catch (err: any) {
      alert("Erro ao salvar caixa: " + err.message);
    }
  };

  const handleAddDespFixa = async () => {
    if (!dfNome.trim()) {
      alert("Informe o nome da despesa fixa.");
      return;
    }
    const val = parseFloat(String(dfVal));
    if (!val || val <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    const id = "df_" + Date.now();
    await saveDespesaFixa({
      id,
      nome: dfNome.trim(),
      val,
      desc: dfDesc.trim(),
    });
    setDfNome("");
    setDfVal("");
    setDfDesc("");
  };

  const handleDeleteDespFixa = async (id: string) => {
    if (confirm("Remover esta despesa fixa?")) {
      await deleteDespesaFixa(id);
    }
  };

  const persistCobranca = async (
    cid: string,
    mesKey: string,
    updated: Cobranca,
    successMessage: string,
  ): Promise<boolean> => {
    const operationKey = `${cid}:${mesKey}`;
    if (savingCobrancas[operationKey]) return false;

    // Snapshot anterior para rollback se a gravação falhar
    const previous = dbState.cobrancas?.[cid]?.[mesKey];

    // Atualização otimista imediata na interface
    onCobrancaUpdated?.(cid, mesKey, updated);

    setSavingCobrancas((current) => ({ ...current, [operationKey]: true }));
    try {
      await saveCobranca(cid, mesKey, updated);
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error("Firebase financial write error:", error);
      // Reverte em caso de falha de rede
      if (previous) {
        onCobrancaUpdated?.(cid, mesKey, previous);
      }
      toast.error("Não foi possível salvar a alteração no financeiro. Tente novamente.");
      return false;
    } finally {
      setSavingCobrancas((current) => ({ ...current, [operationKey]: false }));
    }
  };

  const handleToggleCobField = async (
    cid: string,
    field: "boletoGerado" | "nfGerada",
    currentVal: boolean
  ) => {
    const existing = dbState.cobrancas?.[cid]?.[mesCobKey] || {
      mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
      boletoGerado: false,
      nfGerada: false,
      recebido: false,
      valorRecebido: null,
      divisao: null,
    };

    const updated = {
      ...existing,
      [field]: !currentVal,
    };
    await persistCobranca(
      cid,
      mesCobKey,
      updated,
      field === "boletoGerado"
        ? updated.boletoGerado
          ? "Boleto marcado como gerado."
          : "Boleto desmarcado."
        : updated.nfGerada
        ? "Nota fiscal marcada como gerada."
        : "Nota fiscal desmarcada."
    );
  };

  const handleConfirmarRecebimento = async (cid: string, fallbackVal: number) => {
    const typed = inputValoresRec[cid];
    const val = typed ? parseFloat(typed) : fallbackVal;
    if (!val || val <= 0) {
      toast.error("Informe um valor recebido válido.");
      return;
    }

    const caixa = val * 0.5;
    const sobra = val * 0.5;
    const hoje = new Date();
    const em = `30/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

    const existing = dbState.cobrancas?.[cid]?.[mesCobKey] || {
      mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
      boletoGerado: false,
      nfGerada: false,
    };

    const updated: Cobranca = {
      ...existing,
      recebido: true,
      valorRecebido: val,
      divisao: {
        caixa,
        patrono: sobra * 0.3,
        socio3: sobra * 0.3,
        davi: sobra * 0.3,
        lucas: sobra * 0.3,
        ana: sobra * 0.1,
        em,
      },
    };

    const ok = await persistCobranca(cid, mesCobKey, updated, "Recebimento confirmado com sucesso!");
    if (ok) {
      setInputValoresRec((prev) => {
        const copy = { ...prev };
        delete copy[cid];
        return copy;
      });
    }
  };

  const handleDesconfirmarRecebimento = async (
    cid: string,
    mesKey: string,
    clienteNome: string
  ) => {
    if (
      confirm(
        `Desconfirmar o recebimento de "${clienteNome}" no mês selecionado?\n\nO status voltará para Pendente e o valor será removido da divisão societária.`
      )
    ) {
      const existing = dbState.cobrancas?.[cid]?.[mesKey] || {
        mes: MESES.find((m) => m.k === mesKey)?.l || mesKey,
        boletoGerado: false,
        nfGerada: false,
      };

      const updated: Cobranca = {
        ...existing,
        recebido: false,
        valorRecebido: null,
        divisao: null,
      };

      await persistCobranca(cid, mesKey, updated, "Recebimento voltou para pendente.");
    }
  };

  const handleSalvarEdicaoRecebimento = async () => {
    if (!editRecModal) return;
    const val = parseFloat(editRecInput);
    if (!val || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const { cid, mesKey } = editRecModal;
    const caixa = val * 0.5;
    const sobra = val * 0.5;
    const hoje = new Date();
    const em = `30/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

    const existing = dbState.cobrancas?.[cid]?.[mesKey] || {
      mes: MESES.find((m) => m.k === mesKey)?.l || mesKey,
      boletoGerado: false,
      nfGerada: false,
    };

    const updated: Cobranca = {
      ...existing,
      recebido: true,
      valorRecebido: val,
      divisao: {
        caixa,
        patrono: sobra * 0.3,
        socio3: sobra * 0.3,
        davi: sobra * 0.3,
        lucas: sobra * 0.3,
        ana: sobra * 0.1,
        em,
      },
    };

    if (await persistCobranca(cid, mesKey, updated, "Recebimento atualizado.")) {
      setEditRecModal(null);
    }
  };

  const clientesOrdenadosPorVenc = useMemo(() => {
    return Object.values(dbState.clientes || {}).sort(
      (a, b) => parseInt(String(a.vencDia || 99)) - parseInt(String(b.vencDia || 99))
    );
  }, [dbState.clientes]);

  // Previsão detalhada para o mês selecionado (ex: Setembro 2026)
  const previsaoMes = useMemo(() => {
    // 1. Unidades pagantes ativas para este mês
    const unidadesAtivas = Object.values(dbState.clientes || {}).filter((c) => {
      const ini = c.mesInicial || "2026_07";
      return mesCobKey >= ini;
    });

    // 2. Faturamento previsto total das mensalidades cadastradas
    const faturamentoPrevisto = unidadesAtivas.reduce(
      (sum, c) => sum + parseFloat(String(c.mensalidade || 0)),
      0
    );

    // 3. Faturamento já confirmado e contagem de confirmados
    let faturamentoConfirmado = 0;
    let unidadesConfirmadasCount = 0;
    let boletosGeradosCount = 0;
    let nfsGeradasCount = 0;

    unidadesAtivas.forEach((c) => {
      const cb = dbState.cobrancas?.[c.id]?.[mesCobKey];
      if (cb?.boletoGerado) boletosGeradosCount++;
      if (cb?.nfGerada) nfsGeradasCount++;
      if (cb?.recebido && typeof cb.valorRecebido === "number" && cb.valorRecebido > 0) {
        faturamentoConfirmado += cb.valorRecebido;
        unidadesConfirmadasCount++;
      }
    });

    // 4. Despesas do mês
    const despFixasTotal = totalDespFixas;
    const despVariaveisTotal = Object.values(dbState.despesas || {})
      .filter((d) => d.mes === mesCobKey)
      .reduce((sum, d) => sum + parseFloat(String(d.val || 0)), 0);
    const totalDespesas = despFixasTotal + despVariaveisTotal;

    // 5. Lucro Líquido Previsto (Faturamento Previsto - Despesas Totais)
    const lucroTotalPrevisto = Math.max(0, faturamentoPrevisto - totalDespesas);
    const lucroTotalConfirmado = Math.max(0, faturamentoConfirmado - totalDespesas);

    // 6. Divisão Prevista (50% Caixa, 50% Sobra para Sócios: 30% Patrono, 30% Davi, 30% Lucas, 10% Ana)
    const caixaPrevisto = lucroTotalPrevisto * 0.5;
    const sobraPrevista = lucroTotalPrevisto * 0.5;
    const patronoPrevisto = sobraPrevista * 0.3;
    const daviPrevisto = sobraPrevista * 0.3;
    const lucasPrevisto = sobraPrevista * 0.3;
    const anaPrevisto = sobraPrevista * 0.1;

    // Divisão já confirmada
    const caixaConfirmado = lucroTotalConfirmado * 0.5;
    const sobraConfirmada = lucroTotalConfirmado * 0.5;
    const patronoConfirmado = sobraConfirmada * 0.3;
    const daviConfirmado = sobraConfirmada * 0.3;
    const lucasConfirmado = sobraConfirmada * 0.3;
    const anaConfirmado = sobraConfirmada * 0.1;

    const mesObj = MESES.find((m) => m.k === mesCobKey);
    const mesLabel = mesObj ? mesObj.l : mesCobKey;

    const progressoConfirmacao = faturamentoPrevisto > 0
      ? Math.round((faturamentoConfirmado / faturamentoPrevisto) * 100)
      : 0;

    return {
      mesKey: mesCobKey,
      mesLabel,
      unidadesAtivasCount: unidadesAtivas.length,
      unidadesConfirmadasCount,
      boletosGeradosCount,
      nfsGeradasCount,
      faturamentoPrevisto,
      faturamentoConfirmado,
      faturamentoPendente: Math.max(0, faturamentoPrevisto - faturamentoConfirmado),
      despFixasTotal,
      despVariaveisTotal,
      totalDespesas,
      lucroTotalPrevisto,
      lucroTotalConfirmado,
      caixaPrevisto,
      sobraPrevista,
      patronoPrevisto,
      daviPrevisto,
      lucasPrevisto,
      anaPrevisto,
      caixaConfirmado,
      patronoConfirmado,
      daviConfirmado,
      lucasConfirmado,
      anaConfirmado,
      progressoConfirmacao,
    };
  }, [dbState.clientes, dbState.cobrancas, dbState.despesas, totalDespFixas, mesCobKey]);

  const acumuladoSocios = useMemo(() => {
    const tot: Record<
      string,
      {
        mes: string;
        t: number;
        caixa: number;
        patrono: number;
        davi: number;
        lucas: number;
        ana: number;
        em: string;
      }
    > = {};

    Object.entries(dbState.cobrancas || {}).forEach(([_cid, meses]) => {
      Object.entries(meses || {}).forEach(([mk, cb]) => {
        if (!cb.recebido || !cb.divisao || !cb.valorRecebido) return;
        if (!tot[mk]) {
          tot[mk] = {
            mes: cb.mes || mk,
            t: 0,
            caixa: 0,
            patrono: 0,
            davi: 0,
            lucas: 0,
            ana: 0,
            em: cb.divisao.em,
          };
        }
        tot[mk].t += cb.valorRecebido;
        tot[mk].caixa += cb.divisao.caixa;
        tot[mk].patrono += cb.divisao.patrono || cb.divisao.socio3 || 0;
        tot[mk].davi += cb.divisao.davi;
        tot[mk].lucas += cb.divisao.lucas;
        tot[mk].ana += cb.divisao.ana;
      });
    });

    return Object.entries(tot).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dbState.cobrancas]);

  const historicalSocios = useMemo(() => {
    return acumuladoSocios.filter(([mk]) => mk !== mesCobKey);
  }, [acumuladoSocios, mesCobKey]);

  const arquivadosList = useMemo(() => {
    return Object.values(dbState.arquivados || {}).sort((a, b) =>
      (b.encerradoEm || "").localeCompare(a.encerradoEm || "")
    );
  }, [dbState.arquivados]);

  return (
    <div className="space-y-6">
      {/* ═══ 1. CADASTRAR NOVA UNIDADE ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Unidades Pagantes Cadastradas ({clientesOrdenadosPorVenc.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Cadastre ou vincule contas Meta para gerenciar mensalidades e rotinas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewUnitForm(!showNewUnitForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="size-4" />
            <span>{showNewUnitForm ? "Fechar Formulário" : "Cadastrar Nova Unidade"}</span>
          </button>
        </div>

        {/* Quick Grid of Registered Paying Units */}
        {clientesOrdenadosPorVenc.length > 0 && !showNewUnitForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            {clientesOrdenadosPorVenc.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectClient && onSelectClient(c.id)}
                className="group cursor-pointer rounded-2xl border border-white/5 bg-zinc-950/60 hover:border-emerald-500/40 hover:bg-zinc-900 p-4 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="truncate">
                  <div className="font-bold text-xs text-zinc-200 group-hover:text-white truncate flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                    <span className="truncate">{c.nome}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                    {fmtBRL(c.mensalidade)} · <span className="text-zinc-500">venc. dia {c.vencDia}</span>
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        )}

        {showNewUnitForm && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
            {metaAccounts.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-zinc-300">
                  Vincular a Conta Meta Conectada:
                </span>
                <select
                  value={selectedMetaId}
                  onChange={(e) => handleMetaAccountSelect(e.target.value)}
                  className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">(Entrada manual / não vinculado)</option>
                  {metaAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.id})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-zinc-500">
                  * Preenche o nome automaticamente e conecta à unidade.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nome da Unidade
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Vida Card Santo Ângelo"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  CNPJ
                </label>
                <input
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  className={`w-full bg-zinc-950/80 border ${
                    cnpjError ? "border-red-500" : "border-white/10"
                  } rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500`}
                />
                {cnpjError && (
                  <span className="text-[10px] text-red-400 font-medium">CNPJ inválido</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Endereço
                </label>
                <input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, cidade/UF"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Responsável pela Unidade
                </label>
                <input
                  value={respUnid}
                  onChange={(e) => setRespUnid(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Responsável Financeiro
                </label>
                <input
                  value={respFin}
                  onChange={(e) => setRespFin(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  E-mail para Boleto
                </label>
                <input
                  type="email"
                  value={emailBol}
                  onChange={(e) => setEmailBol(e.target.value)}
                  placeholder="financeiro@unidade.com.br"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Dia de Vencimento
                </label>
                <select
                  value={vencDia}
                  onChange={(e) => setVencDia(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {[5, 10, 15, 20, 25].map((d) => (
                    <option key={d} value={d}>
                      Dia {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Mensalidade (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mensalidade}
                  onChange={(e) => setMensalidade(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Data Início Operação
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Primeiro Mês Cobrança
                </label>
                <select
                  value={mesInicial}
                  onChange={(e) => setMesInicial(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {MESES.map((m) => (
                    <option key={m.k} value={m.k}>
                      {m.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleCadastrarUnidade}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl px-6 py-2.5 text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
              >
                Salvar Unidade
              </button>
              {msgCad && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>{msgCad}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. CAIXA & DESPESAS FIXAS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 mb-6">
          <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Caixa & Despesas Fixas
            </h2>
            <p className="text-xs text-zinc-400">
              Gerencie a reserva da empresa e custos fixos recorrentes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Inputs */}
          <div className="space-y-4 bg-zinc-950/60 p-5 rounded-2xl border border-white/5">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Saldo Atual em Caixa (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={cxSaldo}
                onChange={(e) => setCxSaldo(e.target.value)}
                placeholder="0,00"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xl font-black text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Meta de Caixa — Fim do Ano (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={cxMeta}
                onChange={(e) => setCxMeta(e.target.value)}
                placeholder="0,00"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSalvarCaixa}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl px-5 py-2 text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
              >
                Salvar Caixa
              </button>
              {msgCx && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>{msgCx}</span>
                </span>
              )}
            </div>
          </div>

          {/* KPI Projection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 text-center flex flex-col justify-center shadow-lg">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Saldo Atual
              </div>
              <div
                className={`text-2xl font-black font-mono ${
                  saldoNumber >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmtBRL(saldoNumber)}
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 text-center flex flex-col justify-center shadow-lg">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Projeção Fim do Ano
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  projecaoCaixa >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmtBRL(projecaoCaixa)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                saldo + {mesesRestantes}m média − desp. fixas
              </div>
            </div>

            {metaNumber > 0 && (
              <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 text-center sm:col-span-2 shadow-lg">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Meta Fim do Ano: <span className="font-mono">{fmtBRL(metaNumber)}</span>
                </div>
                <div
                  className={`text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    projecaoCaixa >= metaNumber ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {projecaoCaixa >= metaNumber ? (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>Meta atingível na projeção atual</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" />
                      <span>Abaixo da meta por {fmtBRL(metaNumber - projecaoCaixa)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Despesas Fixas Section */}
        <div className="border-t border-white/10 pt-5">
          <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Despesas Fixas da Operação</span>
            <span className="text-emerald-400 font-mono font-bold">
              Total: {fmtBRL(totalDespFixas)}/mês
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-3.5">
            <div>
              <input
                value={dfNome}
                onChange={(e) => setDfNome(e.target.value)}
                placeholder="Nome da despesa fixa"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                value={dfVal}
                onChange={(e) => setDfVal(e.target.value)}
                placeholder="Valor Mensal (R$)"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <input
                value={dfDesc}
                onChange={(e) => setDfDesc(e.target.value)}
                placeholder="Descrição / Para que serve"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <button
                onClick={handleAddDespFixa}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-all"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {Object.keys(dbState.despFixas || {}).length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono">
                    <th className="py-2.5 px-3.5">Despesa Fixa</th>
                    <th className="py-2.5 px-3.5">Valor / mês</th>
                    <th className="py-2.5 px-3.5">Descrição</th>
                    <th className="py-2.5 px-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.values(dbState.despFixas || {}).map((d) => (
                    <tr key={d.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3.5 font-semibold text-zinc-200">{d.nome}</td>
                      <td className="py-2.5 px-3.5 font-bold text-emerald-400 font-mono">
                        {fmtBRL(d.val)}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-400">{d.desc || "—"}</td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={() => handleDeleteDespFixa(d.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-2">
              Nenhuma despesa fixa cadastrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* ═══ 3. CONTROLE DE COBRANÇAS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CalendarCheck className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Controle de Cobranças
              </h2>
              <p className="text-xs text-zinc-400">
                Acompanhe o status de boletos, notas fiscais e confirmação de recebimento.
              </p>
            </div>
          </div>

          <select
            value={mesCobKey}
            onChange={(e) => setMesCobKey(e.target.value)}
            className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500 shadow-sm"
          >
            {MESES.map((m) => (
              <option key={m.k} value={m.k}>
                {m.l}
              </option>
            ))}
          </select>
        </div>

        {clientesOrdenadosPorVenc.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">
            Nenhuma unidade cadastrada ainda. Use o formulário acima para adicionar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Mensalidade</th>
                  <th className="py-3 px-4 text-center">Boleto</th>
                  <th className="py-3 px-4 text-center">NF</th>
                  <th className="py-3 px-4">Recebimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesOrdenadosPorVenc.map((c) => {
                  const iniMes = c.mesInicial || "2026_07";
                  if (mesCobKey < iniMes) {
                    return null;
                  }
                  const cb = dbState.cobrancas?.[c.id]?.[mesCobKey] || {
                    mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
                    boletoGerado: false,
                    nfGerada: false,
                    recebido: false,
                    valorRecebido: null,
                    divisao: null,
                  };
                  const val = parseFloat(String(c.mensalidade || 0));

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectClient && onSelectClient(c.id)}
                          className="font-bold text-zinc-200 hover:text-emerald-400 text-left transition-colors flex items-center gap-1.5"
                        >
                          <Building2 className="size-3.5 text-zinc-500 shrink-0" />
                          <span>{c.nome}</span>
                        </button>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {c.emailBol || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-200 font-mono">
                          {fmtBRL(val)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          dia {c.vencDia || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={Boolean(savingCobrancas[`${c.id}:${mesCobKey}`])}
                          onClick={() =>
                            handleToggleCobField(c.id, "boletoGerado", cb.boletoGerado)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            cb.boletoGerado
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                          }`}
                          title={cb.boletoGerado ? "Clique para desmarcar boleto" : "Clique para marcar boleto como gerado"}
                        >
                          <span
                            className={`size-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                              cb.boletoGerado ? "bg-emerald-500 text-zinc-950" : "border border-zinc-600"
                            }`}
                          >
                            {cb.boletoGerado && <Check className="size-2.5" />}
                          </span>
                          <span>{cb.boletoGerado ? "Gerado" : "Pendente"}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={Boolean(savingCobrancas[`${c.id}:${mesCobKey}`])}
                          onClick={() =>
                            handleToggleCobField(c.id, "nfGerada", cb.nfGerada)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            cb.nfGerada
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                          }`}
                          title={cb.nfGerada ? "Clique para desmarcar nota fiscal" : "Clique para marcar nota fiscal como gerada"}
                        >
                          <span
                            className={`size-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                              cb.nfGerada ? "bg-emerald-500 text-zinc-950" : "border border-zinc-600"
                            }`}
                          >
                            {cb.nfGerada && <Check className="size-2.5" />}
                          </span>
                          <span>{cb.nfGerada ? "Gerada" : "Pendente"}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {cb.recebido ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              <Check className="size-3" />
                              <span>{fmtBRL(cb.valorRecebido)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditRecModal({
                                  cid: c.id,
                                  mesKey: mesCobKey,
                                  val: cb.valorRecebido || val,
                                });
                                setEditRecInput(String(cb.valorRecebido || val));
                              }}
                              className="text-zinc-500 hover:text-amber-400 p-1 transition-colors cursor-pointer"
                              title="Editar valor recebido"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(savingCobrancas[`${c.id}:${mesCobKey}`])}
                              onClick={() =>
                                handleDesconfirmarRecebimento(c.id, mesCobKey, c.nome)
                              }
                              className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Desconfirmar recebimento (voltar para pendente)"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              div. em {cb.divisao?.em || "—"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={inputValoresRec[c.id] ?? ""}
                              onChange={(e) =>
                                setInputValoresRec({
                                  ...inputValoresRec,
                                  [c.id]: e.target.value,
                                })
                              }
                              placeholder={val.toFixed(2)}
                              className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              disabled={Boolean(savingCobrancas[`${c.id}:${mesCobKey}`])}
                              onClick={() => handleConfirmarRecebimento(c.id, val)}
                              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 rounded-lg px-3 py-1 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              {savingCobrancas[`${c.id}:${mesCobKey}`] ? "Salvando..." : "Confirmar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ 4. PREVISÃO & ACUMULADO — DIVISÃO ENTRE SÓCIOS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Divisão Societária & Previsão de Lucros
              </h2>
              <p className="text-xs text-zinc-400">
                Acompanhe a projeção de faturamento, despesas e lucro para {previsaoMes.mesLabel}, além do histórico consolidado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Mês da Previsão:
            </span>
            <select
              value={mesCobKey}
              onChange={(e) => setMesCobKey(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-purple-500 shadow-sm"
            >
              {MESES.map((m) => (
                <option key={m.k} value={m.k}>
                  {m.l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card Executivo de Previsão de Recebimento e Lucros */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-zinc-900/70 to-zinc-950/90 p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                    Previsão de Recebimento & Lucros — {previsaoMes.mesLabel}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Projeção Ativa
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Baseado em {previsaoMes.unidadesAtivasCount} unidades pagantes ativas · Repasse previsto para o dia 30
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/60 border border-white/5 rounded-xl px-3.5 py-2">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Status Recebimento</div>
                <div className="text-xs font-mono font-bold text-white">
                  {previsaoMes.unidadesConfirmadasCount} / {previsaoMes.unidadesAtivasCount} unidades ({previsaoMes.progressoConfirmacao}%)
                </div>
              </div>
              <div className="w-20 bg-zinc-800 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${previsaoMes.progressoConfirmacao}%` }}
                />
              </div>
            </div>
          </div>

          {/* Grid de 4 Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Faturamento Previsto */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Faturamento Previsto</span>
                <Landmark className="size-3.5 text-zinc-400" />
              </div>
              <div className="text-xl font-black font-mono text-white">
                {fmtBRL(previsaoMes.faturamentoPrevisto)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-white/5">
                <span>Já confirmado:</span>
                <span className="text-emerald-400 font-bold">{fmtBRL(previsaoMes.faturamentoConfirmado)}</span>
              </div>
            </div>

            {/* Despesas Totais Previstas */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 shadow-sm">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Despesas Previstas</span>
                <Receipt className="size-3.5 text-red-400" />
              </div>
              <div className="text-xl font-black font-mono text-red-400">
                {fmtBRL(previsaoMes.totalDespesas)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-white/5">
                <span>Fixas: {fmtBRL(previsaoMes.despFixasTotal)}</span>
                <span>Mês: {fmtBRL(previsaoMes.despVariaveisTotal)}</span>
              </div>
            </div>

            {/* Lucro Líquido Previsto */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Lucro Líquido Previsto</span>
                <Coins className="size-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-400">
                {fmtBRL(previsaoMes.lucroTotalPrevisto)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-emerald-500/10">
                <span>Faturamento − Despesas</span>
                {previsaoMes.lucroTotalConfirmado > 0 && (
                  <span className="text-emerald-400">({fmtBRL(previsaoMes.lucroTotalConfirmado)} conf.)</span>
                )}
              </div>
            </div>

            {/* Reserva de Caixa (50%) */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Caixa da Empresa (50%)</span>
                <Wallet className="size-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black font-mono text-amber-400">
                {fmtBRL(previsaoMes.caixaPrevisto)}
              </div>
              <div className="mt-2 text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-amber-500/10">
                Reserva estratégica Tráfego Pro
              </div>
            </div>
          </div>

          {/* Divisão dos Lucros entre os Sócios (50% da Sobra) */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <PieChart className="size-3.5 text-purple-400" />
                <span>Divisão Prevista entre os Sócios (Sobra de 50% = {fmtBRL(previsaoMes.sobraPrevista)})</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Repasse previsto: 30/{mesCobKey.split("_")[1] || "09"}/2026
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Patrono */}
              <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 text-center">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Patrono
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">30% da sobra</div>
                <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                  {fmtBRL(previsaoMes.patronoPrevisto)}
                </div>
                {previsaoMes.patronoConfirmado > 0 && (
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    ({fmtBRL(previsaoMes.patronoConfirmado)} já conf.)
                  </div>
                )}
              </div>

              {/* Davi */}
              <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 text-center">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Davi
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">30% da sobra</div>
                <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                  {fmtBRL(previsaoMes.daviPrevisto)}
                </div>
                {previsaoMes.daviConfirmado > 0 && (
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    ({fmtBRL(previsaoMes.daviConfirmado)} já conf.)
                  </div>
                )}
              </div>

              {/* Lucas */}
              <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 text-center">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Lucas
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">30% da sobra</div>
                <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                  {fmtBRL(previsaoMes.lucasPrevisto)}
                </div>
                {previsaoMes.lucasConfirmado > 0 && (
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    ({fmtBRL(previsaoMes.lucasConfirmado)} já conf.)
                  </div>
                )}
              </div>

              {/* Ana */}
              <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 text-center">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Ana
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">10% da sobra</div>
                <div className="text-lg font-black font-mono text-blue-400 mt-1">
                  {fmtBRL(previsaoMes.anaPrevisto)}
                </div>
                {previsaoMes.anaConfirmado > 0 && (
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    ({fmtBRL(previsaoMes.anaConfirmado)} já conf.)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Histórico & Previsão */}
        <div>
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Demonstrativo Mensal Consolidado</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Linha roxa = Previsão do mês ativo · Demais linhas = Realizado
            </span>
          </div>

          {historicalSocios.length === 0 && previsaoMes.faturamentoPrevisto === 0 ? (
            <p className="text-xs text-zinc-500 py-3">
              Nenhum recebimento confirmado ou unidade cadastrada para previsão.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                    <th className="py-3 px-4">Mês</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4 text-amber-400 font-bold">Caixa (50%)</th>
                    <th className="py-3 px-4 text-emerald-400 font-bold">Patrono (30%)</th>
                    <th className="py-3 px-4 text-emerald-400 font-bold">Davi (30%)</th>
                    <th className="py-3 px-4 text-emerald-400 font-bold">Lucas (30%)</th>
                    <th className="py-3 px-4 text-blue-400 font-bold">Ana (10%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Linha de Previsão em destaque para o mês selecionado */}
                  {previsaoMes.faturamentoPrevisto > 0 && (
                    <tr className="bg-purple-500/[0.08] border-y-2 border-purple-500/40 hover:bg-purple-500/[0.12] transition-colors">
                      <td className="py-3.5 px-4 text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm">{previsaoMes.mesLabel}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Previsão
                          </span>
                        </div>
                        <span className="block text-[10px] font-normal text-zinc-400 font-mono mt-0.5">
                          {previsaoMes.unidadesConfirmadasCount}/{previsaoMes.unidadesAtivasCount} confirmadas · prev. dia 30
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black font-mono text-purple-200">
                        <div>{fmtBRL(previsaoMes.lucroTotalPrevisto)}</div>
                        {previsaoMes.faturamentoConfirmado > 0 && (
                          <div className="text-[10px] text-emerald-400 font-normal mt-0.5">
                            {fmtBRL(previsaoMes.faturamentoConfirmado)} conf.
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-amber-400 font-mono">
                        {fmtBRL(previsaoMes.caixaPrevisto)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                        {fmtBRL(previsaoMes.patronoPrevisto)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                        {fmtBRL(previsaoMes.daviPrevisto)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                        {fmtBRL(previsaoMes.lucasPrevisto)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-400 font-mono">
                        {fmtBRL(previsaoMes.anaPrevisto)}
                      </td>
                    </tr>
                  )}

                  {/* Histórico realizado dos outros meses */}
                  {historicalSocios.map(([mk, t]) => (
                    <tr key={mk} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{t.mes}</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold uppercase bg-zinc-800 text-zinc-400 border border-white/5">
                            Realizado
                          </span>
                        </div>
                        <span className="block text-[10px] font-normal text-zinc-500 font-mono mt-0.5">
                          div. dia 30
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-100 font-mono">
                        {fmtBRL(t.t)}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-amber-400 font-mono">
                        {fmtBRL(t.caixa)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-mono">
                        {fmtBRL(t.patrono)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-mono">
                        {fmtBRL(t.davi)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-mono">
                        {fmtBRL(t.lucas)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-400 font-mono">
                        {fmtBRL(t.ana)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 5. HISTÓRICO DE UNIDADES ENCERRADAS ═══ */}
      {arquivadosList.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
          <button
            onClick={() => setShowArquivados(!showArquivados)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-zinc-800 text-zinc-400 border border-white/10">
                <Archive className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Histórico de Unidades Encerradas ({arquivadosList.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Registros financeiros de contratos finalizados.
                </p>
              </div>
            </div>
            <ChevronDown
              className={`size-4 text-zinc-400 transition-transform ${
                showArquivados ? "rotate-180" : ""
              }`}
            />
          </button>

          {showArquivados && (
            <div className="mt-5 space-y-4 pt-5 border-t border-white/10">
              {arquivadosList.map((a, i) => {
                const cobrancas = Object.values(a.cobrancas || {});
                const totalRec = cobrancas
                  .filter((c) => c.recebido)
                  .reduce((s, c) => s + (c.valorRecebido || 0), 0);
                const mesesFat = cobrancas.filter((c) => c.recebido).length;

                const caixa = totalRec * 0.5;
                const sobra = totalRec * 0.5;

                return (
                  <div
                    key={i}
                    className="border border-white/10 rounded-2xl p-5 bg-zinc-950/60 shadow-md"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Building2 className="size-4 text-zinc-400" />
                          <span>{a.nome}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          CNPJ: {a.cnpj || "—"} · Encerrado em {a.encerradoEm || "—"}{" "}
                          por {a.encerradoPor || "—"}
                        </div>
                      </div>
                      <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {mesesFat} mês(es) faturado(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center text-xs mb-1">
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">
                          Total
                        </div>
                        <div className="font-bold text-white font-mono mt-0.5">
                          {fmtBRL(totalRec)}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-amber-400 font-bold">
                          Caixa (50%)
                        </div>
                        <div className="font-bold text-amber-400 font-mono mt-0.5">
                          {fmtBRL(caixa)}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">
                          Patrono
                        </div>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5">
                          {fmtBRL(sobra * 0.3)}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">
                          Davi
                        </div>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5">
                          {fmtBRL(sobra * 0.3)}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">
                          Lucas
                        </div>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5">
                          {fmtBRL(sobra * 0.3)}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">
                          Ana
                        </div>
                        <div className="font-bold text-blue-400 font-mono mt-0.5">
                          {fmtBRL(sobra * 0.1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit receipt modal with Portal */}
      {editRecModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-white">
              <div className="text-sm font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <Pencil className="size-4 text-amber-400" />
                <span>Editar Valor Recebido</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Novo Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editRecInput}
                  onChange={(e) => setEditRecInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-base font-bold text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSalvarEdicaoRecebimento}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditRecModal(null)}
                  className="border border-white/10 hover:bg-white/5 text-zinc-300 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
