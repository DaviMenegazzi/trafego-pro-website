import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

// O atraso inicial e o "skip delay" vêm do TooltipProvider global (App.tsx):
// o primeiro tooltip espera; os vizinhos abrem na hora, sem animação.
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  if (!content) return children;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-[200] max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-xs leading-5 text-zinc-100 shadow-lg",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150",
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
