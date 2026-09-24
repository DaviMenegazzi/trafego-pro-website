import React from "react";

type DashboardStateProps = {
  title: string;
  description: string;
  loading?: boolean;
  action?: React.ReactNode;
};

export function DashboardState({ title, description, loading = false, action }: DashboardStateProps) {
  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-6 py-14 text-center sm:px-10"
      aria-busy={loading || undefined}
      aria-live="polite"
    >
      {loading && (
        <div className="mx-auto mb-5 flex w-20 items-end justify-center gap-1.5" aria-hidden="true">
          <span className="h-4 w-2 animate-pulse rounded-full bg-zinc-600" />
          <span className="h-8 w-2 animate-pulse rounded-full bg-zinc-500 [animation-delay:120ms]" />
          <span className="h-6 w-2 animate-pulse rounded-full bg-zinc-600 [animation-delay:240ms]" />
        </div>
      )}
      <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-400">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}
