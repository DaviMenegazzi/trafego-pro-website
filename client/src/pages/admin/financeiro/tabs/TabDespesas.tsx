import { useState, useMemo } from "react";
import type { Despesa, DatabaseState } from "../types";
import { MESES, CATEGORIAS_DESP, fmtBRL, now } from "../constants";
import { saveDespesa, deleteDespesa } from "../lib/firebase";
import { ModalEditarDespesa } from "../components/ModalEditarDespesa";
import {
  DollarSign,
  ListOrdered,
  BarChart2,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  Receipt,
} from "lucide-react";

interface TabDespesasProps {
  dbState: DatabaseState;
}

export function TabDespesas({ dbState }: TabDespesasProps) {
  const [nome, setNome] = useState("");
  const [cat, setCat] = useState("");
  const [val, setVal] = useState<string | number>("");
  const [dia, setDia] = useState<string | number>("");
  const [mes, setMes] = useState("2026_08");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<"pendente" | "paga">("pendente");
  const [msgDesp, setMsgDesp] = useState("");
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);

  const [filtroMes, setFiltroMes] = useState("");
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);

  const handleSalvarDespesa = async () => {
    if (!nome.trim()) {
      alert("Informe o nome da despesa.");
      return;
    }
    if (!cat) {
      alert("Selecione a categoria.");
      return;
    }
    const numVal = parseFloat(String(val));
    if (!numVal || numVal <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    const numDia = parseInt(String(dia));
    if (!numDia || numDia < 1 || numDia > 31) {
      alert("Informe o dia do pagamento (1-31).");
      return;
    }
    if (!mes) {
      alert("Selecione o mês de competência.");
      return;
    }

    const id = "desp_" + Date.now();
    const novaDespesa: Despesa = {
      id,
      nome: nome.trim(),
      cat,
      val: numVal,
      dia: numDia,
      mes,
      desc: desc.trim(),
      status,
      criadoEm: now(),
    };

    try {
      await saveDespesa(novaDespesa);
      setMsgDesp(`Despesa ${nome} lançada com sucesso!`);
      setTimeout(() => setMsgDesp(""), 4000);

      setNome("");
      setCat("");
      setVal("");
      setDia("");
      setDesc("");
      setStatus("pendente");
      setShowNewExpenseForm(false);
    } catch (err: any) {
      alert("Erro ao lançar despesa: " + err.message);
    }
  };

  const handleToggleStatus = async (d: Despesa) => {
    const newStatus = d.status === "paga" ? "pendente" : "paga";
    await saveDespesa({
      ...d,
      status: newStatus,
      editadoEm: now(),
    });
  };

  const handleDeleteDespesa = async (d: Despesa) => {
    if (confirm(`Excluir despesa "${d.nome}" (${fmtBRL(d.val)})?`)) {
      await deleteDespesa(d.id);
    }
  };

  const handleUpdateDespesa = async (id: string, updated: Partial<Despesa>) => {
    const existing = dbState.despesas?.[id];
    if (!existing) return;
    await saveDespesa({
      ...existing,
      ...updated,
      editadoEm: now(),
    } as Despesa);
  };

  const despesasFiltradas = useMemo(() => {
    return Object.values(dbState.despesas || {})
      .filter((d) => !filtroMes || d.mes === filtroMes)
      .sort((a, b) => {
        if (a.mes !== b.mes) return a.mes.localeCompare(b.mes);
        return a.dia - b.dia;
      });
  }, [dbState.despesas, filtroMes]);

  const resumoMeses = useMemo(() => {
    const porMes: Record<
      string,
      { mes: string; total: number; pagas: number; pend: number }
    > = {};

    Object.values(dbState.despesas || {}).forEach((d) => {
      if (!porMes[d.mes]) {
        porMes[d.mes] = {
          mes: MESES.find((m) => m.k === d.mes)?.l || d.mes,
          total: 0,
          pagas: 0,
          pend: 0,
        };
      }
      porMes[d.mes].total += d.val;
      if (d.status === "paga") porMes[d.mes].pagas += d.val;
      else porMes[d.mes].pend += d.val;
    });

    return Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dbState.despesas]);

  return (
    <div className="space-y-6">
      {/* ═══ 1. LANÇAR DESPESA ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Receipt className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Lançar Despesa da Operação
              </h2>
              <p className="text-xs text-zinc-400">
                Registre custos pontuais ou mensais com categorização e competência.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewExpenseForm(!showNewExpenseForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="size-4" />
            <span>{showNewExpenseForm ? "Fechar Formulário" : "Nova Despesa"}</span>
          </button>
        </div>

        {showNewExpenseForm && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nome da Despesa
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Meta Ads — Boosts"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {CATEGORIAS_DESP.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Dia do Pagamento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Competência (Mês)
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {MESES.map((m) => (
                    <option key={m.k} value={m.k}>
                      {m.l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Descrição / Para que serve
                </label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Breve descrição"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "pendente" | "paga")}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="paga">Paga</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleSalvarDespesa}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl px-6 py-2.5 text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
              >
                Salvar Despesa
              </button>
              {msgDesp && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>{msgDesp}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. DESPESAS LANÇADAS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ListOrdered className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Despesas Lançadas ({despesasFiltradas.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Histórico detalhado de despesas e status de liquidação.
              </p>
            </div>
          </div>

          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500 shadow-sm"
          >
            <option value="">Todos os meses</option>
            {MESES.map((m) => (
              <option key={m.k} value={m.k}>
                {m.l}
              </option>
            ))}
          </select>
        </div>

        {despesasFiltradas.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">
            Nenhuma despesa lançada para este filtro.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4">Despesa</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Mês</th>
                  <th className="py-3 px-4 text-center">Venc.</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {despesasFiltradas.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{d.nome}</div>
                      <div className="text-[10px] text-zinc-500">
                        {d.desc || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full px-2.5 py-0.5">
                        {d.cat || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium font-mono">
                      {MESES.find((m) => m.k === d.mes)?.l || d.mes}
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-400 font-mono">
                      dia {d.dia}
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {fmtBRL(d.val)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(d)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          d.status === "paga"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                        }`}
                      >
                        {d.status === "paga" ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            <span>Paga</span>
                          </>
                        ) : (
                          <>
                            <Clock className="size-3" />
                            <span>Pendente</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setEditingDespesa(d)}
                        className="text-zinc-500 hover:text-white p-1 transition-colors"
                        title="Editar despesa"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDespesa(d)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                        title="Excluir despesa"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ 3. RESUMO POR MÊS ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 mb-5">
          <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BarChart2 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Resumo por Mês
            </h2>
            <p className="text-xs text-zinc-400">
              Total consolidado de despesas pagas e pendentes.
            </p>
          </div>
        </div>

        {resumoMeses.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">Nenhuma despesa ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4">Mês</th>
                  <th className="py-3 px-4">Total Lançado</th>
                  <th className="py-3 px-4 text-emerald-400">Pagas</th>
                  <th className="py-3 px-4 text-amber-400">Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {resumoMeses.map(([mk, m]) => (
                  <tr key={mk} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-bold text-white">{m.mes}</td>
                    <td className="py-3 px-4 font-bold text-zinc-100 font-mono">
                      {fmtBRL(m.total)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                      {fmtBRL(m.pagas)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400 font-mono">
                      {fmtBRL(m.pend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <ModalEditarDespesa
        despesa={editingDespesa}
        isOpen={Boolean(editingDespesa)}
        onClose={() => setEditingDespesa(null)}
        onSave={handleUpdateDespesa}
      />
    </div>
  );
}
