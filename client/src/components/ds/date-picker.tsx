import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale/pt-BR";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatShortDate } from "@/lib/format";
import { Button } from "./button";
import { controlSize, type ControlSize } from "./field";
import { Popover } from "./menu";

// Substitui <input type="date">, que mostra o formato do navegador
// (mm/dd/yyyy em muitas máquinas) e o calendário do sistema.

/** "2026-09-24" ↔ Date local (sem deslocamento de fuso). */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateToIso(date: Date | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dayPickerClassNames = {
  root: "p-3 text-zinc-100",
  months: "relative flex flex-col gap-4 sm:flex-row",
  month: "space-y-3",
  month_caption: "flex h-8 items-center justify-center text-sm font-medium capitalize",
  nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
  button_previous: "inline-flex size-8 items-center justify-center rounded-md text-zinc-300 hover:bg-white/[0.07] disabled:opacity-30",
  button_next: "inline-flex size-8 items-center justify-center rounded-md text-zinc-300 hover:bg-white/[0.07] disabled:opacity-30",
  weekdays: "flex",
  weekday: "w-9 text-center text-xs font-normal text-zinc-500",
  week: "mt-1 flex",
  day: "size-9 p-0 text-center text-sm",
  day_button:
    "inline-flex size-9 items-center justify-center rounded-md tabular-nums outline-none transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-emerald-400/60",
  today: "font-semibold text-emerald-300",
  selected: "[&>button]:bg-emerald-500 [&>button]:text-zinc-950 [&>button]:hover:bg-emerald-400",
  range_start: "rounded-l-md bg-emerald-500/15",
  range_end: "rounded-r-md bg-emerald-500/15",
  range_middle: "bg-emerald-500/15 [&>button]:bg-transparent [&>button]:text-zinc-100 [&>button]:hover:bg-white/[0.08]",
  outside: "text-zinc-600",
  disabled: "text-zinc-700 [&>button]:pointer-events-none",
  hidden: "invisible",
};

const chevron = ({ orientation }: { orientation?: string }) =>
  orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />;

function Trigger({ label, placeholder, size = "md", invalid, id, className, ...props }: { label: string; placeholder: string; size?: ControlSize; invalid?: boolean; id?: string; className?: string } & React.ComponentProps<"button">) {
  return (
    <button
      id={id}
      type="button"
      aria-invalid={invalid || undefined}
      className={cn(
        "inline-flex w-full items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/70 text-left outline-none transition-[border-color,box-shadow] duration-150 hover:border-white/20 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 aria-[invalid=true]:border-rose-500/60",
        controlSize[size],
        label ? "text-zinc-100" : "text-zinc-500",
        className,
      )}
      {...props}
    >
      <CalendarDays className="size-4 shrink-0 text-zinc-400" />
      <span className="truncate tabular-nums">{label || placeholder}</span>
    </button>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  min,
  max,
  size = "md",
  id,
  invalid,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  size?: ControlSize;
  id?: string;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = isoToDate(value);
  const disabled = [
    ...(min && isoToDate(min) ? [{ before: isoToDate(min)! }] : []),
    ...(max && isoToDate(max) ? [{ after: isoToDate(max)! }] : []),
  ];
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-auto"
      trigger={<Trigger id={id} aria-label={ariaLabel} label={value ? formatDate(value) : ""} placeholder={placeholder} size={size} invalid={invalid} className={className} />}
    >
      <DayPicker
        mode="single"
        locale={ptBR}
        selected={selected}
        defaultMonth={selected}
        disabled={disabled}
        onSelect={(date) => { onChange(dateToIso(date)); if (date) setOpen(false); }}
        classNames={dayPickerClassNames}
        components={{ Chevron: chevron }}
      />
    </Popover>
  );
}

export type IsoRange = { start: string; end: string };

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Escolher período",
  max,
  size = "md",
  className,
  align = "start",
  presets,
  "aria-label": ariaLabel,
}: {
  value: IsoRange;
  onChange: (range: IsoRange) => void;
  placeholder?: string;
  max?: string;
  size?: ControlSize;
  className?: string;
  align?: "start" | "end";
  presets?: { label: string; range: IsoRange }[];
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>();

  React.useEffect(() => {
    if (open) setDraft({ from: isoToDate(value.start), to: isoToDate(value.end) });
  }, [open, value.start, value.end]);

  const label = value.start && value.end ? `${formatShortDate(value.start)} – ${formatDate(value.end)}` : "";
  const complete = Boolean(draft?.from && draft?.to);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align={align}
      className="w-auto"
      trigger={<Trigger aria-label={ariaLabel} label={label} placeholder={placeholder} size={size} className={className} />}
    >
      <div className="flex flex-col sm:flex-row">
        {presets && presets.length > 0 && (
          <div className="flex gap-1 border-b border-white/10 p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {presets.map((preset) => (
              <Button key={preset.label} size="sm" variant="ghost" className="justify-start" onClick={() => { onChange(preset.range); setOpen(false); }}>
                {preset.label}
              </Button>
            ))}
          </div>
        )}
        <DayPicker
          mode="range"
          locale={ptBR}
          selected={draft}
          onSelect={setDraft}
          defaultMonth={draft?.from ?? isoToDate(value.start)}
          numberOfMonths={1}
          disabled={max && isoToDate(max) ? [{ after: isoToDate(max)! }] : undefined}
          classNames={dayPickerClassNames}
          components={{ Chevron: chevron }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5">
        <span className="text-xs tabular-nums text-zinc-400">
          {draft?.from ? formatDate(draft.from) : "Início"} – {draft?.to ? formatDate(draft.to) : "fim"}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!complete}
            onClick={() => {
              if (!draft?.from || !draft?.to) return;
              onChange({ start: dateToIso(draft.from), end: dateToIso(draft.to) });
              setOpen(false);
            }}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </Popover>
  );
}
