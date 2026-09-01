import { useState, useMemo } from "react";
import type { Cliente } from "../types";
import { Search, Building2, ChevronRight } from "lucide-react";

interface FinancialSidebarProps {
  clientes: Record<string, Cliente>;
  activeClientId: string | null;
  onSelectClient: (cid: string) => void;
  onAddNewClick?: () => void;
}

export function FinancialSidebar({
  clientes,
  activeClientId,
  onSelectClient,
  onAddNewClick,
}: FinancialSidebarProps) {
  const [search, setSearch] = useState("");

  const payingClientsList = useMemo(() => {
    return Object.values(clientes || {}).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [clientes]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return payingClientsList;
    const term = search.toLowerCase();
    return payingClientsList.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        (c.cnpj && c.cnpj.includes(term))
    );
  }, [payingClientsList, search]);

  return (
    <aside className="w-64 min-w-[250px] bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Unidades Pagantes ({payingClientsList.length})
            </span>
          </div>
          {onAddNewClick && (
            <button
              onClick={onAddNewClick}
              title="Cadastrar nova unidade pagante"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              + Nova
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar unidade..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-1">
        {filteredClients.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            {payingClientsList.length === 0
              ? "Nenhuma unidade pagante cadastrada."
              : "Nenhuma unidade encontrada."}
          </div>
        ) : (
          filteredClients.map((c) => {
            const isActive = activeClientId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectClient(c.id)}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all text-xs font-semibold ${
                  isActive
                    ? "bg-slate-100 text-[#1A2730] border-l-4 border-[#1A2730] font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">🏢</span>
                  <span className="truncate">{c.nome}</span>
                </div>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
