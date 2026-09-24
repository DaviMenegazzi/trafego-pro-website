import * as React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART } from "@/lib/chartPalette";

/**
 * Acentos de identidade (não de status): dão a cada bloco uma cor que guia o
 * olhar e combina com a série do gráfico do mesmo assunto (conversas = aqua,
 * investimento = azul, custo = laranja). Vermelho/âmbar ficam para status.
 */
export const ACCENTS = {
  brand: { chip: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25", line: "#34d399", glow: "from-emerald-400/60" },
  aqua: { chip: "bg-teal-500/12 text-teal-300 ring-teal-400/25", line: CHART.aqua, glow: "from-teal-400/60" },
  blue: { chip: "bg-blue-500/12 text-blue-300 ring-blue-400/25", line: CHART.blue, glow: "from-blue-400/60" },
  orange: { chip: "bg-orange-500/12 text-orange-300 ring-orange-400/25", line: CHART.orange, glow: "from-orange-400/60" },
  violet: { chip: "bg-violet-500/12 text-violet-300 ring-violet-400/25", line: "#8b5cf6", glow: "from-violet-400/60" },
  neutral: { chip: "bg-white/[0.06] text-zinc-300 ring-white/10", line: "#a1a1aa", glow: "from-white/30" },
} as const;
export type Accent = keyof typeof ACCENTS;

/** Ícone num quadrado com a cor do acento. */
export function IconChip({ icon, accent = "brand", size = "md", className }: { icon: React.ReactNode; accent?: Accent; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-9 [&_svg]:size-4",
        ACCENTS[accent].chip,
        className,
      )}
    >
      {icon}
    </span>
  );
}

/** Minilinha de tendência (sem eixos): direção, não valor exato. */
export function Sparkline({ values, accent = "brand", className }: { values: number[]; accent?: Accent; className?: string }) {
  const id = React.useId();
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const color = ACCENTS[accent].line;
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export type Delta = {
  /** Variação relativa (0,12 = +12%). */
  value: number;
  /** Contra o quê: "vs. 1ª metade do período". */
  label?: string;
  /** Subir é bom (conversas) ou ruim (custo)? */
  goodWhen?: "up" | "down" | "neutral";
};

/** Variação com seta e sinal; a cor diz se a mudança é boa, a seta diz a direção. */
export function DeltaPill({ delta, className }: { delta: Delta; className?: string }) {
  const v = delta.value;
  const flat = !Number.isFinite(v) || Math.abs(v) < 0.005;
  const good = flat || delta.goodWhen === "neutral" ? null : (v > 0) === ((delta.goodWhen ?? "up") === "up");
  const Icon = flat ? ArrowRight : v > 0 ? ArrowUpRight : ArrowDownRight;
  const pct = flat ? "0%" : `${v > 0 ? "+" : "−"}${Math.abs(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(v) < 0.1 ? 1 : 0 })}%`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
          good === null ? "bg-white/[0.06] text-zinc-300" : good ? "bg-emerald-500/12 text-emerald-300" : "bg-rose-500/12 text-rose-300",
        )}
      >
        <Icon className="size-3" aria-hidden />
        {pct}
      </span>
      {delta.label && <span className="text-zinc-500">{delta.label}</span>}
    </span>
  );
}

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
    <Tag className={cn("ds-rise rounded-2xl border border-white/[0.08] bg-zinc-900/60", className)} {...props}>
      {children}
    </Tag>
  );
}

export function SurfaceHeader({ title, description, actions, icon, accent = "brand", className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode; accent?: Accent; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5", className)}>
      {icon && <IconChip icon={icon} accent={accent} size="sm" className="-mr-1" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * KPI: rótulo, valor, variação (com seta e sinal), minilinha e ícone no acento
 * do assunto. O número fica branco; cor de status só com texto (StatusBadge).
 */
export function StatTile({
  label,
  value,
  hint,
  status,
  icon,
  accent = "neutral",
  delta,
  trend,
  className,
  style,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  status?: { tone: "good" | "warning" | "critical"; label: string };
  icon?: React.ReactNode;
  accent?: Accent;
  delta?: Delta;
  trend?: number[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const tone = status ? { good: "text-emerald-300", warning: "text-amber-300", critical: "text-rose-300" }[status.tone] : "text-white";
  return (
    <div
      style={style}
      className={cn(
        "ds-rise group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4 transition-colors duration-200 hover:border-white/[0.16] sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate pt-0.5 text-sm text-zinc-400">{label}</p>
        {icon && <IconChip icon={icon} accent={accent} size="sm" />}
      </div>
      <p className={cn("mt-1.5 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]", tone)}>{value}</p>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        {delta && <DeltaPill delta={delta} />}
        {hint && <span>{hint}</span>}
      </div>
      {trend && trend.length > 1 && <Sparkline values={trend} accent={accent} className="mt-3" />}
    </div>
  );
}

/** Barra de progresso com o estado na cor (e o número ao lado, nunca só cor). */
export function Meter({ value, tone = "brand", className, label }: { value: number; tone?: "brand" | "good" | "warning" | "critical"; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const fill = { brand: "bg-emerald-400", good: "bg-emerald-400", warning: "bg-amber-400", critical: "bg-rose-400" }[tone];
  const track = { brand: "bg-emerald-400/12", good: "bg-emerald-400/12", warning: "bg-amber-400/12", critical: "bg-rose-400/12" }[tone];
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", track, className)}
    >
      <div className={cn("ds-grow h-full rounded-full", fill)} style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct * 100)}%` }} />
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
      {icon && <IconChip icon={icon} accent="brand" className="mb-3 size-10 [&_svg]:size-5" />}
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

const AVATAR_TONES = [
  "bg-teal-500/15 text-teal-200",
  "bg-blue-500/15 text-blue-200",
  "bg-violet-500/15 text-violet-200",
  "bg-orange-500/15 text-orange-200",
  "bg-emerald-500/15 text-emerald-200",
  "bg-sky-500/15 text-sky-200",
  "bg-fuchsia-500/15 text-fuchsia-200",
];

/** Inicial com cor fixa por nome: a mesma pessoa tem sempre a mesma cor. */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md"; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  const dim = size === "sm" ? "size-8 text-xs" : "size-10 text-sm";
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", dim, tone, className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : (name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
