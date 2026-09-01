import { useState } from "react";
import type { Cliente, ChecklistItemState, DatabaseState } from "../types";
import {
  MESES,
  CL_FIN,
  CL_TRAF,
  CL_SOC,
  fmtBRL,
  now,
} from "../constants";
import {
  saveChecklistItem,
  deleteChecklistItem,
  deleteClienteAndArchive,
  saveCliente,
} from "../lib/firebase";
import { ModalEditarCliente } from "../components/ModalEditarCliente";
import {
  Building2,
  Pencil,
  Trash2,
  Plus,
  X,
  Info,
  Check,
  FileCheck,
  Megaphone,
  Share2,
} from "lucide-react";

interface TabClienteDetalhesProps {
  clientId: string;
  dbState: DatabaseState;
  currentUser?: string;
  onClientDeleted?: () => void;
}

export function TabClienteDetalhes({
  clientId,
  dbState,
  currentUser = "admin",
  onClientDeleted,
}: TabClienteDetalhesProps) {
  const cliente = dbState.clientes?.[clientId];

  const [editModalOpen, setEditModalOpen] = useState(false);

  // Forms to add extra demands
  const [openAddForm, setOpenAddForm] = useState<Record<string, boolean>>({});
  const [extraTexto, setExtraTexto] = useState<Record<string, string>>({});
  const [extraGrupo, setExtraGrupo] = useState<Record<string, string>>({});
  const [extraNovoGrupo, setExtraNovoGrupo] = useState<Record<string, string>>({});

  if (!cliente) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-8 text-center text-zinc-400">
        Unidade não encontrada ou já encerrada.
      </div>
    );
  }

  const handleUpdateCliente = async (cid: string, updated: Partial<Cliente>) => {
    const merged = { ...cliente, ...updated, editadoEm: now(), editadoPor: currentUser };
    await saveCliente(merged);
  };

  const handleExcluirCliente = async () => {
    if (
      !confirm(
        `Excluir a unidade "${cliente.nome}"?\n\nO histórico financeiro ficará arquivado na aba Financeiro.\nChecklists e dados cadastrais serão removidos.`
      )
    ) {
      return;
    }

    const archiveData = {
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      mensalidade: cliente.mensalidade,
      encerradoEm: now(),
      encerradoPor: currentUser,
      cobrancas: dbState.cobrancas?.[clientId] || {},
    };

    try {
      await deleteClienteAndArchive(clientId, archiveData);
      if (onClientDeleted) onClientDeleted();
    } catch (err: any) {
      alert("Erro ao excluir unidade: " + err.message);
    }
  };

  const handleToggleCheck = async (
    checkId: string,
    currentMarcado: boolean,
    existingData?: ChecklistItemState
  ) => {
    const nextMarcado = !currentMarcado;
    const itemData: ChecklistItemState = {
      ...(existingData || {}),
      marcado: nextMarcado,
      por: nextMarcado ? currentUser : null,
      quando: nextMarcado ? now() : null,
    };
    await saveChecklistItem(clientId, checkId, itemData);
  };

  const handleSalvarExtra = async (tipo: "fin" | "traf" | "soc") => {
    const texto = (extraTexto[tipo] || "").trim();
    if (!texto) {
      alert("Descreva a demanda antes de salvar.");
      return;
    }

    const selectedG = extraGrupo[tipo] || "";
    const grupo =
      selectedG === "__novo__"
        ? (extraNovoGrupo[tipo] || "").trim() || "Demandas Adicionais"
        : selectedG || "Demandas Adicionais";

    const id = `extra_${tipo}_${Date.now()}`;
    const itemData: ChecklistItemState = {
      texto,
      grupo,
      marcado: false,
      por: null,
      quando: null,
      extra: true,
    };

    await saveChecklistItem(clientId, id, itemData);

    setExtraTexto({ ...extraTexto, [tipo]: "" });
    setExtraNovoGrupo({ ...extraNovoGrupo, [tipo]: "" });
    setOpenAddForm({ ...openAddForm, [tipo]: false });
  };

  const handleRemoverExtra = async (checkId: string) => {
    if (confirm("Remover esta demanda?")) {
      await deleteChecklistItem(clientId, checkId);
    }
  };

  const renderChecklistCard = (
    titulo: string,
    icon: React.ReactNode,
    standardItems: { id: string; g: string; t: string }[],
    tipo: "fin" | "traf" | "soc"
  ) => {
    const checks = dbState.checklists?.[clientId] || {};

    const extras = Object.entries(checks)
      .filter(([k, v]) => k.startsWith(`extra_${tipo}_`) && v.texto)
      .map(([k, v]) => ({ id: k, t: v.texto!, extra: true, grupo: v.grupo || "Demandas Adicionais", ...v }));

    const totalPad = standardItems.length;
    const totalExt = extras.length;
    const total = totalPad + totalExt;
    const marcadosPad = standardItems.filter((i) => checks[i.id]?.marcado).length;
    const marcadosExt = extras.filter((e) => checks[e.id]?.marcado).length;
    const marcados = marcadosPad + marcadosExt;
    const pct = total ? Math.round((marcados / total) * 100) : 0;

    const grupos: Record<string, { id: string; t: string; extra?: boolean }[]> = {};
    standardItems.forEach((i) => {
      if (!grupos[i.g]) grupos[i.g] = [];
      grupos[i.g].push(i);
    });

    extras.forEach((e) => {
      const g = e.grupo || "Demandas Adicionais";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push({ id: e.id, t: e.t, extra: true });
    });

    const isAddOpen = openAddForm[tipo] || false;
    const gruposExistentes = Object.keys(grupos);

    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-black/30 space-y-4">
        {/* Title and Progress */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {icon}
              </span>
              <span>{titulo}</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-400 font-mono">
              {marcados}/{total}
            </span>
          </div>

          <div className="w-full bg-zinc-950/80 rounded-full h-2 overflow-hidden mb-1.5 border border-white/5">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-400 font-medium">
            {pct}% concluído ({marcados} de {total} itens)
          </div>
        </div>

        {/* Groups & Items */}
        <div className="space-y-4 divide-y divide-white/5 pt-2">
          {Object.entries(grupos).map(([g, items]) => (
            <div key={g} className="pt-3 first:pt-0 space-y-2.5">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                {g}
              </div>

              <div className="space-y-2">
                {items.map((i) => {
                  const itemState = checks[i.id];
                  const isDone = itemState?.marcado || false;
                  const por = itemState?.por;
                  const quando = itemState?.quando;

                  return (
                    <div key={i.id} className="group">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCheck(i.id, isDone, itemState)}
                          className="flex items-start gap-2.5 text-left flex-1 select-none"
                        >
                          <div
                            className={`size-4 min-w-[16px] rounded flex items-center justify-center text-[10px] font-bold mt-0.5 transition-all ${
                              isDone
                                ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30"
                                : "border border-zinc-700 hover:border-zinc-500 text-transparent"
                            }`}
                          >
                            <Check className="size-2.5" />
                          </div>
                          <span
                            className={`text-xs leading-relaxed transition-colors ${
                              isDone
                                ? "line-through text-zinc-500"
                                : "text-zinc-300 group-hover:text-white"
                            }`}
                          >
                            {i.t}
                          </span>
                        </button>

                        {i.extra && (
                          <button
                            onClick={() => handleRemoverExtra(i.id)}
                            className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition-colors"
                            title="Remover demanda adicional"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {isDone && por && (
                        <div className="text-[9px] text-zinc-500 pl-6 mt-0.5 font-mono">
                          por {por} — {quando}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add demand toggle */}
        <div className="pt-2">
          {!isAddOpen ? (
            <button
              onClick={() => setOpenAddForm({ ...openAddForm, [tipo]: true })}
              className="w-full py-2.5 border border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5 bg-zinc-950/40"
            >
              <Plus className="size-3.5 text-emerald-400" />
              <span>Adicionar Demanda</span>
            </button>
          ) : (
            <div className="p-4 bg-zinc-950/80 border border-white/10 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Selecione ou crie um grupo
                </label>
                <select
                  value={extraGrupo[tipo] || ""}
                  onChange={(e) =>
                    setExtraGrupo({ ...extraGrupo, [tipo]: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione um grupo existente...</option>
                  {gruposExistentes.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__novo__">Criar novo grupo...</option>
                </select>

                {extraGrupo[tipo] === "__novo__" && (
                  <input
                    value={extraNovoGrupo[tipo] || ""}
                    onChange={(e) =>
                      setExtraNovoGrupo({ ...extraNovoGrupo, [tipo]: e.target.value })
                    }
                    placeholder="Nome do novo grupo"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 mt-1"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Descrição da demanda
                </label>
                <input
                  value={extraTexto[tipo] || ""}
                  onChange={(e) =>
                    setExtraTexto({ ...extraTexto, [tipo]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSalvarExtra(tipo);
                  }}
                  placeholder="Descreva a demanda..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSalvarExtra(tipo)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Salvar Demanda
                </button>
                <button
                  onClick={() =>
                    setOpenAddForm({ ...openAddForm, [tipo]: false })
                  }
                  className="border border-white/10 hover:border-red-500/50 hover:text-red-400 text-zinc-400 rounded-xl px-3 py-2 text-xs font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header da Unidade ═══ */}
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">{cliente.nome}</h2>
              <p className="text-xs text-zinc-400">
                Ficha cadastral, checklist operacional e financeiro da franquia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setEditModalOpen(true)}
              className="border border-white/10 hover:border-white/30 bg-zinc-900 text-zinc-200 hover:text-white rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Pencil className="size-3.5" />
              <span>Editar Unidade</span>
            </button>

            <button
              onClick={handleExcluirCliente}
              className="border border-red-500/20 hover:border-red-500/50 bg-red-500/10 text-red-400 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="size-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-5 border-t border-white/10 text-xs">
          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              CNPJ
            </div>
            <div className="font-semibold text-zinc-200 font-mono">{cliente.cnpj || "—"}</div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Endereço
            </div>
            <div className="font-semibold text-zinc-200 truncate" title={cliente.endereco}>
              {cliente.endereco || "—"}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Resp. Unidade
            </div>
            <div className="font-semibold text-zinc-200">{cliente.respUnid || "—"}</div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Resp. Financeiro
            </div>
            <div className="font-semibold text-zinc-200">{cliente.respFin || "—"}</div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              E-mail Boleto
            </div>
            <div className="font-semibold text-zinc-200 truncate font-mono" title={cliente.emailBol}>
              {cliente.emailBol || "—"}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Mensalidade
            </div>
            <div className="font-bold text-emerald-400 font-mono">
              {fmtBRL(cliente.mensalidade)} (dia {cliente.vencDia || "—"})
            </div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Início Operação
            </div>
            <div className="font-semibold text-zinc-200 font-mono">{cliente.dataInicio || "—"}</div>
          </div>

          <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              1º Mês Cobrança
            </div>
            <div className="font-semibold text-zinc-200">
              {MESES.find((m) => m.k === cliente.mesInicial)?.l || cliente.mesInicial || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-3 backdrop-blur-md">
        <Info className="size-4 text-emerald-400 shrink-0" />
        <span>
          Qualquer usuário autenticado pode marcar os itens. Cada check registra o autor e horário automaticamente.
        </span>
      </div>

      {/* Checklists 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {renderChecklistCard("Checklist Financeiro", <FileCheck className="size-3.5" />, CL_FIN, "fin")}
        {renderChecklistCard("Checklist Tráfego", <Megaphone className="size-3.5" />, CL_TRAF, "traf")}
        {renderChecklistCard("Checklist Social Media", <Share2 className="size-3.5" />, CL_SOC, "soc")}
      </div>

      {/* Edit modal */}
      <ModalEditarCliente
        cliente={cliente}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateCliente}
      />
    </div>
  );
}
