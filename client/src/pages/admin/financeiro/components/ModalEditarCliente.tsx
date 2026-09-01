import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Cliente } from "../types";
import { MESES, mascararCNPJ, validarCNPJ } from "../constants";
import { Pencil, X, CheckCircle2 } from "lucide-react";

interface ModalEditarClienteProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cid: string, updatedData: Partial<Cliente>) => Promise<void>;
}

export function ModalEditarCliente({
  cliente,
  isOpen,
  onClose,
  onSave,
}: ModalEditarClienteProps) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [respUnid, setRespUnid] = useState("");
  const [respFin, setRespFin] = useState("");
  const [emailBol, setEmailBol] = useState("");
  const [vencDia, setVencDia] = useState<string | number>("");
  const [mensalidade, setMensalidade] = useState<string | number>("");
  const [dataInicio, setDataInicio] = useState("");
  const [mesInicial, setMesInicial] = useState("");
  const [cnpjError, setCnpjError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState("");

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome || "");
      setCnpj(cliente.cnpj || "");
      setEndereco(cliente.endereco || "");
      setRespUnid(cliente.respUnid || "");
      setRespFin(cliente.respFin || "");
      setEmailBol(cliente.emailBol || "");
      setVencDia(cliente.vencDia || "");
      setMensalidade(cliente.mensalidade || "");
      setDataInicio(cliente.dataInicio || "");
      setMesInicial(cliente.mesInicial || "");
      setCnpjError(false);
      setMsgSuccess("");
    }
  }, [cliente, isOpen]);

  if (!isOpen || !cliente) return null;

  const handleCnpjChange = (val: string) => {
    const masked = mascararCNPJ(val);
    setCnpj(masked);
    if (masked.replace(/\D/g, "").length === 14) {
      setCnpjError(!validarCNPJ(masked));
    } else {
      setCnpjError(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert("Informe o nome da unidade.");
      return;
    }
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (!cnpj || cleanCnpj.length !== 14 || !validarCNPJ(cnpj)) {
      alert("Informe um CNPJ válido no formato 00.000.000/0000-00.");
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

    try {
      setSaving(true);
      await onSave(cliente.id, {
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        endereco: endereco.trim(),
        respUnid: respUnid.trim(),
        respFin: respFin.trim(),
        emailBol: emailBol.trim(),
        vencDia,
        mensalidade: numVal,
        dataInicio,
        mesInicial,
      });
      setMsgSuccess("Salvo com sucesso!");
      setTimeout(() => {
        setMsgSuccess("");
        onClose();
      }, 700);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
            <Pencil className="size-4 text-emerald-400" />
            <span>Editar Unidade:</span>
            <span className="text-emerald-400 font-bold">{cliente.nome}</span>
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
              Nome da Unidade
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vida Card Santo Ângelo"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              CNPJ
            </label>
            <input
              value={cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              maxLength={18}
              placeholder="00.000.000/0000-00"
              className={`w-full bg-zinc-900 border ${
                cnpjError ? "border-red-500" : "border-white/10"
              } rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors`}
            />
            {cnpjError && (
              <span className="text-xs text-red-400 font-medium">CNPJ inválido</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Endereço
            </label>
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, cidade/UF"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Responsável pela Unidade
            </label>
            <input
              value={respUnid}
              onChange={(e) => setRespUnid(e.target.value)}
              placeholder="Nome completo"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Responsável Financeiro
            </label>
            <input
              value={respFin}
              onChange={(e) => setRespFin(e.target.value)}
              placeholder="Nome completo"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              E-mail para Boleto
            </label>
            <input
              type="email"
              value={emailBol}
              onChange={(e) => setEmailBol(e.target.value)}
              placeholder="financeiro@unidade.com.br"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Dia de Vencimento
            </label>
            <select
              value={vencDia}
              onChange={(e) => setVencDia(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione...</option>
              {[5, 10, 15, 20, 25].map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Mensalidade (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={mensalidade}
              onChange={(e) => setMensalidade(e.target.value)}
              placeholder="0,00"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Data de Início da Operação
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Primeiro Mês de Cobrança
            </label>
            <select
              value={mesInicial}
              onChange={(e) => setMesInicial(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione...</option>
              {MESES.map((m) => (
                <option key={m.k} value={m.k}>
                  {m.l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 pt-4 border-t border-white/10 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            onClick={onClose}
            className="border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl px-5 py-2.5 text-xs font-medium transition-all"
          >
            Cancelar
          </button>
          {msgSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              <span>{msgSuccess}</span>
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
