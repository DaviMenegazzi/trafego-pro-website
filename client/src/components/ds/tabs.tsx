import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Abas de seção com sublinhado (troca o conteúdo da página).
 * Para escolher um filtro entre poucas opções, use SegmentedControl.
 */
export function TabBar<T extends string>({
  value,
  onValueChange,
  tabs,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  tabs: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
  "aria-label": string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (delta: number) => {
    const index = tabs.findIndex((t) => t.value === value);
    const next = (index + delta + tabs.length) % tabs.length;
    onValueChange(tabs[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex max-w-full gap-5 overflow-x-auto border-b border-white/10", className)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      }}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm font-medium outline-none transition-colors focus-visible:text-white",
              selected ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-zinc-100",
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="tabular-nums text-zinc-500">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
