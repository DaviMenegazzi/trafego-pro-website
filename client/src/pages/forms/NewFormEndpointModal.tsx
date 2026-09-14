import { useState, useMemo } from "react";
import {
  Building2,
  Check,
  Globe,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { FormApiKey, NewKeyResponse } from "./formTypes";

interface ClientOption {
  id: string;
  name: string;
}

interface NewFormEndpointModalProps {
  clients: ClientOption[];
  onClose: () => void;
  onCreated: (created: NewKeyResponse) => void;
}

export function NewFormEndpointModal({
  clients,
  onClose,
  onCreated,
}: NewFormEndpointModalProps) {
  const [name, setName] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [unitSearch, setUnitSearch] = useState("");
  const [allowedOriginsText, setAllowedOriginsText] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("never");
  const [saving, setSaving] = useState(false);

  const toggleUnit = (unitId: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return clients;
    const term = unitSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clients.filter((c) =>
      c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
    );
  }, [clients, unitSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do formulário");
      return;
    }
    if (selectedUnits.length === 0) {
      toast.error("Selecione ao menos uma unidade associada");
      return;
    }

    // Processar origens CORS
    let allowedOrigins: string[] | null = null;
    if (allowedOriginsText.trim()) {
      allowedOrigins = allowedOriginsText
        .split(/[\n,]+/)
        .map((s) => s.trim().replace(/\/$/, ""))
        .filter(Boolean);
    }

    let expiresAt: string | null = null;
    if (expiryDays !== "never") {
      const days = Number(expiryDays);
      if (!Number.isNaN(days) && days > 0) {
        expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("tp_token");
      const res = await fetch("/api/forms/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          clientIds: selectedUnits,
          allowedOrigins,
          expiresAt,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Não foi possível criar o endpoint do formulário");
        return;
      }

      toast.success("Endpoint criado com sucesso!");
      onCreated(body as NewKeyResponse);
    } catch {
      toast.error("Falha de conexão com o servidor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="glass-card flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-0 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-6 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
              <Plus className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-100">
                Adicionar Formulário ao Endpoint
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Gere uma chave de API para receber submissões de uma landing page ou site externo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nome do Formulário / Origem <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Landing Page Caxias - Contato Principal"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Unidades Associadas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Unidades Permitidas <span className="text-emerald-400">*</span> ({selectedUnits.length}/{clients.length})
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedUnits(clients.map((c) => c.id))}
                  className="text-emerald-400 hover:underline"
                >
                  Marcar todas
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedUnits([])}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Filtrar franquias..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 space-y-1">
              {filteredUnits.length === 0 ? (
                <p className="p-3 text-center text-xs text-zinc-600">Nenhuma franquia encontrada.</p>
              ) : (
                filteredUnits.map((u) => {
                  const isChecked = selectedUnits.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      onClick={() => toggleUnit(u.id)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
                        isChecked
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "text-zinc-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className={`size-3.5 shrink-0 ${isChecked ? "text-emerald-400" : "text-zinc-500"}`} />
                        <span className="truncate font-medium">{u.name}</span>
                      </div>
                      <div
                        className={`flex size-4 items-center justify-center rounded border transition shrink-0 ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                            : "border-zinc-700 bg-zinc-800"
                        }`}
                      >
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              O formulário só aceitará submissões direcionadas para as unidades marcadas acima.
            </p>
          </div>

          {/* Origens Permitidas (CORS) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Domínios Permitidos (CORS - Opcional)
            </label>
            <p className="text-[11px] text-zinc-500 mb-1.5">
              Informe as URLs que podem disparar envios (ex.: <code className="text-zinc-400">https://vidacardcaxias.com.br</code>). Deixe vazio para aceitar qualquer origem.
            </p>
            <textarea
              rows={2}
              value={allowedOriginsText}
              onChange={(e) => setAllowedOriginsText(e.target.value)}
              placeholder="https://vidacardcaxias.com.br&#10;https://www.vidacardcaxias.com.br"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Validade */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Validade da Chave
            </label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none transition"
            >
              <option value="never">Sem expiração (Recomendado para Landing Pages)</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">1 ano (365 dias)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 p-5 bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50 transition shadow-sm active:scale-95"
          >
            <KeyRound className="size-3.5" />
            {saving ? "Gerando chave..." : "Gerar Endpoint e Chave"}
          </button>
        </div>
      </form>
    </div>
  );
}
