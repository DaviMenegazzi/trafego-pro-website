import { Search } from "lucide-react";
import { Button, Input, SegmentedControl, Select } from "@/components/ds";
import type { CrmFilters as CrmFiltersValue, CrmInstance } from "../../../../shared/crm";

type FiltersProps = {
  value: CrmFiltersValue;
  search: string;
  instances: CrmInstance[];
  onSearchChange: (value: string) => void;
  onChange: (value: CrmFiltersValue) => void;
};

type TemperatureOption = "" | NonNullable<CrmFiltersValue["temperature"]>;

const TEMPERATURE_OPTIONS: { value: TemperatureOption; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "HOT", label: "Quentes" },
  { value: "WARM", label: "Mornos" },
  { value: "COLD", label: "Frios" },
  { value: "unrated", label: "Não avaliados" },
];

const CLASSIFICATION_OPTIONS = [
  { value: "", label: "Toda classificação" },
  { value: "lead", label: "Leads confirmados" },
  { value: "pendente", label: "Pendentes" },
];

export function CrmFilters({ value, search, instances, onSearchChange, onChange }: FiltersProps) {
  const active = Boolean(value.instanceName || value.temperature || value.classification || search.trim());
  const update = (patch: Partial<CrmFiltersValue>) => {
    const next = { ...value, ...patch };
    for (const key of Object.keys(next) as (keyof CrmFiltersValue)[]) if (!next[key]) delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-64">
        <Input
          value={search}
          maxLength={80}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar nome ou telefone"
          aria-label="Buscar nome ou telefone"
          leading={<Search />}
        />
      </div>
      <SegmentedControl<TemperatureOption>
        aria-label="Temperatura"
        value={value.temperature ?? ""}
        onValueChange={(next) => update({ temperature: next || undefined })}
        options={TEMPERATURE_OPTIONS}
        className="hidden sm:inline-flex"
      />
      <Select
        aria-label="Temperatura"
        value={value.temperature ?? ""}
        onValueChange={(next) => update({ temperature: (next || undefined) as CrmFiltersValue["temperature"] })}
        options={TEMPERATURE_OPTIONS.map((option) => ({ value: option.value, label: option.value ? option.label : "Toda temperatura" }))}
        placeholder="Toda temperatura"
        className="w-[calc(50%-0.25rem)] sm:hidden"
      />
      <Select
        aria-label="Classificação"
        value={value.classification ?? ""}
        onValueChange={(next) => update({ classification: (next || undefined) as CrmFiltersValue["classification"] })}
        options={CLASSIFICATION_OPTIONS}
        placeholder="Toda classificação"
        className="w-[calc(50%-0.25rem)] sm:w-48"
      />
      {instances.length > 1 && (
        <Select
          aria-label="Instância"
          value={value.instanceName ?? ""}
          onValueChange={(next) => update({ instanceName: next || undefined })}
          placeholder="Todas as instâncias"
          options={[{ value: "", label: "Todas as instâncias" }, ...instances.map((instance) => ({ value: instance.instanceName, label: instance.displayName || instance.instanceName }))]}
          className="w-full sm:w-56"
        />
      )}
      {active && (
        <Button variant="ghost" onClick={() => { onSearchChange(""); onChange({}); }}>Limpar</Button>
      )}
    </div>
  );
}
