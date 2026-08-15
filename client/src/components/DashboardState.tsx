import React from "react";

type DashboardStateProps = {
  title: string;
  description: string;
  loading?: boolean;
};

export function DashboardState({ title, description, loading = false }: DashboardStateProps) {
  return (
    <section className="rounded-3xl border border-border bg-surface/25 px-6 py-12 text-center sm:px-10">
      {loading ? (
        <div className="mx-auto mb-5 flex w-28 items-end justify-center gap-2" aria-hidden="true">
          <span className="h-5 w-3 animate-pulse rounded-full bg-emerald-300/30" />
          <span className="h-10 w-3 animate-pulse rounded-full bg-emerald-300/50 [animation-delay:120ms]" />
          <span className="h-7 w-3 animate-pulse rounded-full bg-emerald-300/40 [animation-delay:240ms]" />
        </div>
      ) : (
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-xl text-emerald-300">↗</div>
      )}
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
