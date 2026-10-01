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

/**
 * Abas de navegador presas no topo de uma Surface: a aba ativa tem a cor do cartão e se funde
 * com ele. Use logo acima de <Surface className="rounded-tl-none">, sem espaço entre os dois.
 */
export function FolderTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  tabs: { value: T; label: React.ReactNode; icon?: React.ReactNode; count?: number; badge?: React.ReactNode }[];
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
  const activeIndex = tabs.findIndex((t) => t.value === value);
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("ds-rise relative z-[1] -mb-px flex max-w-full items-end overflow-x-auto overflow-y-hidden", className)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      }}
    >
      {tabs.map((tab, index) => {
        const selected = index === activeIndex;
        // Divisória só entre duas abas inativas, como no Chrome.
        const divider = index > 0 && !selected && index - 1 !== activeIndex;
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
              "group relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-xl px-4 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/60 sm:min-w-[180px]",
              selected
                ? // Linha opaca embaixo cobre a borda de cima da Surface (bg-zinc-900/60 sobre o fundo #050505).
                  "h-[41px] border border-b-0 border-white/[0.08] bg-zinc-900/60 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[#101012]"
                : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100",
              divider && "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-white/10",
            )}
          >
            {tab.icon && (
              <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", selected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-zinc-500 group-hover:text-zinc-300")}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.count !== undefined && <span className="rounded-full bg-white/[0.07] px-1.5 text-xs tabular-nums text-zinc-400">{tab.count}</span>}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
