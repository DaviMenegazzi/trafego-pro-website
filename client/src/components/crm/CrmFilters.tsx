import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CrmFilters as CrmFiltersValue, CrmInstance } from "../../../../shared/crm";

type FiltersProps = {
  value: CrmFiltersValue;
  search: string;
  instances: CrmInstance[];
  onSearchChange: (value: string) => void;
  onChange: (value: CrmFiltersValue) => void;
};

const selectClass = "h-9 rounded-lg border border-white/10 bg-black/30 px-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50";

export function CrmFilters({ value, search, instances, onSearchChange, onChange }: FiltersProps) {
  const active = Boolean(value.instanceName || value.temperature || value.classification || search.trim());
  const update = (patch: Partial<CrmFiltersValue>) => {
    const next = { ...value, ...patch };
    for (const key of Object.keys(next) as (keyof CrmFiltersValue)[]) if (!next[key]) delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative min-w-0 sm:w-64">
        <span className="sr-only">Buscar por nome ou telefone</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          maxLength={80}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar nome ou telefone"
          className="h-9 border-white/10 bg-black/30 pl-8 text-sm"
        />
      </label>
      <div className="grid grid-cols-3 gap-2 sm:flex">
        <select aria-label="Instância" value={value.instanceName ?? ""} onChange={(event) => update({ instanceName: event.target.value || undefined })} className={selectClass}>
          <option value="">Todas as instâncias</option>
          {instances.map((instance) => <option key={instance.instanceName} value={instance.instanceName}>{instance.displayName || instance.instanceName}</option>)}
        </select>
        <select aria-label="Temperatura" value={value.temperature ?? ""} onChange={(event) => update({ temperature: (event.target.value || undefined) as CrmFiltersValue["temperature"] })} className={selectClass}>
          <option value="">Toda temperatura</option>
          <option value="HOT">Quente</option>
          <option value="WARM">Morno</option>
          <option value="COLD">Frio</option>
          <option value="unrated">Não avaliado</option>
        </select>
        <select aria-label="Classificação" value={value.classification ?? ""} onChange={(event) => update({ classification: (event.target.value || undefined) as CrmFiltersValue["classification"] })} className={selectClass}>
          <option value="">Toda classificação</option>
          <option value="lead">Lead confirmado</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
      {active && (
        <button
          type="button"
          onClick={() => { onSearchChange(""); onChange({}); }}
          className="flex h-9 items-center gap-1 self-start rounded-lg px-2 text-xs text-zinc-400 transition hover:bg-white/[.05] hover:text-zinc-200 sm:self-auto"
        >
          <X className="size-3.5" /> Limpar filtros
        </button>
      )}
    </div>
  );
}
