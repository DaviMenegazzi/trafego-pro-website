import * as React from "react";
import { cn } from "@/lib/utils";

/** Cabeçalho padrão de tela: título, uma linha de contexto e as ações à direita. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[28px] sm:leading-9">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Contêiner de página: largura máxima e respiro iguais em todas as telas. */
export function Page({ children, className, width = "wide" }: { children: React.ReactNode; className?: string; width?: "wide" | "narrow" | "medium" }) {
  const max = { wide: "max-w-[1400px]", medium: "max-w-[1160px]", narrow: "max-w-[800px]" }[width];
  return <div className={cn("mx-auto w-full min-w-0 space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8", max, className)}>{children}</div>;
}

/** Superfície de conteúdo (cartão). Raio de 16px. */
export function Surface({ children, className, as: Tag = "section", ...props }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-2xl border border-white/[0.08] bg-zinc-900/60", className)} {...props}>
      {children}
    </Tag>
  );
}

export function SurfaceHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Número-herói de KPI. Rótulo em texto secundário (sem mono, sem CAIXA ALTA);
 * a cor do número é neutra, exceto quando comunica status (e então vem com texto).
 */
export function StatTile({
  label,
  value,
  hint,
  status,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  status?: { tone: "good" | "warning" | "critical"; label: string };
  className?: string;
}) {
  const tone = status ? { good: "text-emerald-300", warning: "text-amber-300", critical: "text-rose-300" }[status.tone] : "text-white";
  return (
    <div className={cn("min-w-0 rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4 sm:p-5", className)}>
      <p className="truncate text-sm text-zinc-400">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-[-0.02em] sm:text-[28px]", tone)}>{value}</p>
      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 text-xs text-zinc-500">
        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

const badgeTone = {
  good: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/25",
  warning: "bg-amber-500/12 text-amber-300 ring-amber-500/25",
  critical: "bg-rose-500/12 text-rose-300 ring-rose-500/25",
  info: "bg-sky-500/12 text-sky-300 ring-sky-500/25",
  neutral: "bg-white/[0.06] text-zinc-300 ring-white/10",
} as const;

export type BadgeTone = keyof typeof badgeTone;

export function StatusBadge({ tone = "neutral", children, className, dot = true }: { tone?: BadgeTone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", badgeTone[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium text-zinc-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Aviso de uma linha (substitui as faixas grandes que empurram o layout). */
export function InlineNotice({ tone = "info", icon, children, action, className }: { tone?: "info" | "warning" | "critical"; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const styles = {
    info: "border-sky-500/20 bg-sky-500/[0.06] text-sky-100",
    warning: "border-amber-500/25 bg-amber-500/[0.07] text-amber-100",
    critical: "border-rose-500/25 bg-rose-500/[0.07] text-rose-100",
  }[tone];
  return (
    <div role={tone === "critical" ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2.5 text-sm", styles, className)}>
      {icon && <span className="shrink-0 opacity-80 [&_svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1 leading-5">{children}</span>
      {action}
    </div>
  );
}
