import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, Select } from "@/components/ds";
import { MESES } from "../constants";

/** Mês de referência com setas para o anterior e o seguinte. */
export function MonthPicker({ value, onChange, label = "Mês" }: { value: string; onChange: (key: string) => void; label?: string }) {
  const index = MESES.findIndex((m) => m.k === value);
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Mês anterior" size="sm" disabled={index <= 0} onClick={() => onChange(MESES[index - 1].k)} icon={<ChevronLeft />} />
      <Select
        aria-label={label}
        value={value}
        onValueChange={onChange}
        className="w-44"
        options={MESES.map((m) => ({ value: m.k, label: m.l }))}
      />
      <IconButton label="Próximo mês" size="sm" disabled={index < 0 || index >= MESES.length - 1} onClick={() => onChange(MESES[index + 1].k)} icon={<ChevronRight />} />
    </div>
  );
}
