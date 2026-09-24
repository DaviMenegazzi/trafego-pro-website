import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-white/25 bg-zinc-950 text-zinc-950 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=indeterminate]:border-emerald-500 data-[state=indeterminate]:bg-emerald-500",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** Checkbox com rótulo clicável e descrição opcional. */
export function CheckboxField({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { id: string; label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="min-w-0 cursor-pointer text-sm leading-5 text-zinc-200">
        {label}
        {description && <span className="block text-xs text-zinc-500">{description}</span>}
      </label>
    </div>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-white/15 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:bg-emerald-500",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-150 data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export function SwitchField({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { id: string; label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer text-sm leading-5 text-zinc-200">
        {label}
        {description && <span className="block text-xs text-zinc-500">{description}</span>}
      </label>
      <Switch id={id} {...props} />
    </div>
  );
}

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} />;
}

export function RadioOption({
  value,
  id,
  label,
  description,
  tone = "default",
}: {
  value: string;
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3 transition-colors has-[[data-state=checked]]:border-white/25 has-[[data-state=checked]]:bg-white/[0.04]",
        tone === "danger" && "has-[[data-state=checked]]:border-rose-500/40 has-[[data-state=checked]]:bg-rose-500/[0.06]",
      )}
    >
      <RadioGroupPrimitive.Item
        id={id}
        value={value}
        className="mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-white/25 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 data-[state=checked]:border-emerald-500"
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-emerald-400" />
      </RadioGroupPrimitive.Item>
      <span className="min-w-0 text-sm leading-5">
        <span className={cn("font-medium", tone === "danger" ? "text-rose-200" : "text-zinc-100")}>{label}</span>
        {description && <span className="mt-0.5 block text-xs text-zinc-400">{description}</span>}
      </span>
    </label>
  );
}
