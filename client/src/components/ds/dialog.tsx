import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const overlay =
  "fixed inset-0 z-[150] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-200";

/**
 * Diálogo modal (Radix): foco preso, fundo inerte, Esc fecha, portal acima da sidebar.
 * Modais ficam centralizados (sem transform-origin no gatilho, de propósito).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
  hideClose = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
  hideClose?: boolean;
}) {
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-5xl" }[size];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[160] flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl shadow-black/70 outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] duration-200",
            width,
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-base font-semibold text-white">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm leading-5 text-zinc-400">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Diálogo"}</DialogPrimitive.Description>
              )}
            </div>
            {!hideClose && (
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Fechar" className="-mr-1.5 -mt-1">
                  <X />
                </Button>
              </DialogPrimitive.Close>
            )}
          </div>
          {children !== undefined && <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>}
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-3.5 sm:flex-row sm:justify-end">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Gaveta lateral para detalhes (mesmo caminho de entrada e saída: pela direita). */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-[160] flex w-full max-w-xl flex-col border-l border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-base font-semibold text-white">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={description ? "mt-1 text-sm text-zinc-400" : "sr-only"}>
                {description ?? (typeof title === "string" ? title : "Detalhes")}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar" className="-mr-1.5 -mt-1">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-3.5 sm:flex-row sm:justify-end">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
