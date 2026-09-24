import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

// Três alturas (32 / 36 / 44) e um raio (12px) para todo botão do produto.
// A resposta ao toque vem no :active (scale 0.97), não no clique.
export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium outline-none transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
        secondary: "border border-white/10 bg-white/[0.04] text-zinc-100 hover:border-white/20 hover:bg-white/[0.08]",
        ghost: "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
        danger: "bg-rose-500 text-white hover:bg-rose-400",
        "danger-ghost": "text-rose-300 hover:bg-rose-500/10 hover:text-rose-200",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-11 px-5 text-sm [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...(!asChild && !props.type ? { type: "button" as const } : {})}
      {...props}
    >
      {asChild ? children : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}

export type IconButtonProps = Omit<ButtonProps, "size" | "children"> & {
  /** Nome da ação: vira o tooltip e o aria-label. Obrigatório. */
  label: string;
  icon: React.ReactNode;
  size?: "sm" | "md";
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

/** Botão só com ícone. Sempre tem nome acessível e tooltip real (nunca title=). */
export function IconButton({ label, icon, size = "md", variant = "ghost", tooltipSide = "top", className, ...props }: IconButtonProps) {
  return (
    <Tooltip content={label} side={tooltipSide}>
      <Button aria-label={label} variant={variant} size={size === "sm" ? "icon-sm" : "icon"} className={className} {...props}>
        {icon}
      </Button>
    </Tooltip>
  );
}
