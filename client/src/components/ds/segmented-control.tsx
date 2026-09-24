import * as React from "react";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; count?: number; disabled?: boolean; tone?: "default" | "warning" | "danger" | "success" };

const toneDot: Record<string, string> = {
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  success: "bg-emerald-400",
};

/**
 * Escolha única entre poucas opções (2–6), sempre visíveis.
 * Setas do teclado movem a seleção (padrão de radiogroup).
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  fullWidth = false,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
  "aria-label": string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);

  const move = (delta: number) => {
    const index = enabled.findIndex((o) => o.value === value);
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    if (!next) return;
    onValueChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950/70 p-0.5",
        size === "sm" ? "h-8" : "h-9",
        fullWidth && "flex w-full",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(1); }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex h-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-40",
              size === "sm" ? "text-xs" : "text-sm",
              fullWidth && "flex-1",
              selected ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {option.tone && option.tone !== "default" && <span className={cn("size-1.5 rounded-full", toneDot[option.tone])} aria-hidden />}
            {option.label}
            {option.count !== undefined && (
              <span className={cn("tabular-nums", selected ? "text-zinc-300" : "text-zinc-500")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
