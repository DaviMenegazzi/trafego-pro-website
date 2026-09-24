import * as React from "react";
import { cn } from "@/lib/utils";

// Dois tamanhos de campo: md (36px, telas internas) e lg (44px, formulários
// públicos e de preenchimento longo). Mesmo raio dos botões (12px).
const controlBase =
  "w-full rounded-lg border border-white/10 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-500 outline-none transition-[border-color,box-shadow] duration-150 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-rose-500/60 aria-[invalid=true]:focus:ring-rose-500/20";

export const controlSize = {
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-3.5 text-sm",
} as const;

export type ControlSize = keyof typeof controlSize;

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & { size?: ControlSize; leading?: React.ReactNode; trailing?: React.ReactNode };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, size = "md", leading, trailing, ...props }, ref) {
  if (!leading && !trailing) {
    return <input ref={ref} className={cn(controlBase, controlSize[size], className)} {...props} />;
  }
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 [&_svg]:size-4">{leading}</span>}
      <input ref={ref} className={cn(controlBase, controlSize[size], leading && "pl-9", trailing && "pr-10", className)} {...props} />
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlBase, "min-h-20 px-3 py-2 text-sm leading-6", className)} {...props} />;
});

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-zinc-200", className)} {...props} />;
}

/** Rótulo + controle + ajuda/erro. O erro substitui a ajuda e é anunciado. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="block">
        {label}
        {required && <span className="text-emerald-400" aria-hidden> *</span>}
        {optional && <span className="font-normal text-zinc-500"> (opcional)</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs leading-5 text-rose-300">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
