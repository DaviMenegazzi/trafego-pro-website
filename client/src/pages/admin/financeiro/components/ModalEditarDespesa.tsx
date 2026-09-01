import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Despesa } from "../types";
import { MESES, CATEGORIAS_DESP } from "../constants";
import { Pencil, X } from "lucide-react";

interface ModalEditarDespesaProps {
  despesa: Despesa | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Despesa>) => Promise<void>;
}

export function ModalEditarDespesa({
  despesa,
  isOpen,
  onClose,
  onSave,
}: ModalEditarDespesaProps) {
  const [nome, setNome] = useState("");
  const [cat, setCat] = useState("");
  const [val, setVal] = useState<string | number>("");
  const [dia, setDia] = useState<string | number>("");
  const [mes, setMes] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<"pendente" | "paga">("pendente");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (despesa) {
      setNome(despesa.nome || "");
      setCat(despesa.cat || "");
      setVal(despesa.val || "");
      setDia(despesa.dia || "");
      setMes(despesa.mes || "");
      setDesc(despesa.desc || "");
      setStatus(despesa.status || "pendente");
    }
  }, [despesa, isOpen]);

  if (!isOpen || !despesa) return null;

  const handleSave = async () => {
    if (!nome.trim()) {
      alert("Informe o nome da despesa.");
      return;
    }
    const numVal = parseFloat(String(val));
    if (!numVal || numVal <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    const numDia = parseInt(String(dia));
    if (!numDia || numDia < 1 || numDia > 31) {
      alert("Informe um dia de pagamento válido (1-31).");
      return;
    }

    try {
      setSaving(true);
      await onSave(despesa.id, {
        nome: nome.trim(),
        cat,
        val: numVal,
        dia: numDia,
        mes,
        desc: desc.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      alert("Erro ao salvar despesa: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 sm:p-7 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
            <Pencil className="size-4 text-emerald-400" />
            <span>Editar Despesa</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-red-400 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Nome da Despesa
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Meta Ads — Boosts"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Categoria
            </label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione...</option>
              {CATEGORIAS_DESP.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="0,00"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Dia do Pagamento (1-31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="Ex: 10"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Competência (Mês)
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            >
              {MESES.map((m) => (
                <option key={m.k} value={m.k}>
                  {m.l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Descrição / Para que serve
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Breve descrição"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Status do Pagamento
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "pendente" | "paga")}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 pt-4 border-t border-white/10 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={onClose}
            className="border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl px-5 py-2.5 text-xs font-medium transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
