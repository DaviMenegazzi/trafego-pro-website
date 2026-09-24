import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlSize, type ControlSize } from "./field";

export type SelectOption = { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean };

// O Radix não aceita value="" num item; o vazio vira um sentinela interno.
const EMPTY = "__vazio__";

export type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: ControlSize | "sm";
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  leading?: React.ReactNode;
};

/** Select próprio (substitui o <select> nativo): mesma altura e raio dos campos, lista ancorada ao gatilho. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Selecione",
  size = "md",
  disabled,
  id,
  name,
  required,
  invalid,
  className,
  contentClassName,
  leading,
  ...aria
}: SelectProps) {
  const sizeClass = size === "sm" ? "h-8 px-2.5 text-xs" : controlSize[size];
  return (
    <SelectPrimitive.Root
      value={value === "" ? undefined : value}
      onValueChange={(next) => onValueChange(next === EMPTY ? "" : next)}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={aria["aria-label"]}
        aria-invalid={invalid || undefined}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/70 text-left text-zinc-100 outline-none transition-[border-color,box-shadow] duration-150 hover:border-white/20 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55 data-[placeholder]:text-zinc-500 aria-[invalid=true]:border-rose-500/60",
          sizeClass,
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-zinc-400">
          {leading}
          <span className="truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-zinc-500" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-[200] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl shadow-black/60",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY}
                value={option.value || EMPTY}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-2.5 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-white/[0.07] data-[disabled]:opacity-45"
              >
                <div className="min-w-0">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description && <p className="text-xs text-zinc-500">{option.description}</p>}
                </div>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
                  <Check className="size-4 text-emerald-400" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
