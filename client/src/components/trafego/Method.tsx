import { Reveal } from "./Reveal";

const steps = [
  { n: "01", title: "Diagnóstico", desc: "Análise completa do seu negócio e concorrência." },
  { n: "02", title: "Estratégia", desc: "Planejamento de campanhas personalizadas." },
  { n: "03", title: "Execução", desc: "Implementação e otimização contínua." },
  { n: "04", title: "Resultados", desc: "Relatórios e ajustes baseados em dados." },
];

export function Method() {
  return (
    <section id="metodologia" className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-36">
      <div className="max-w-3xl mb-16 md:mb-24">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-6">Metodologia</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="font-display font-semibold tracking-[-0.02em] leading-[1.02] text-[clamp(2.25rem,5vw,4.5rem)]">
            Quatro passos até o resultado.
          </h2>
        </Reveal>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 100}>
            <div className="group relative rounded-3xl border border-border bg-surface/30 p-8 min-h-[260px] flex flex-col justify-between hover:bg-surface/60 transition-colors">
              <span className="text-sm text-muted-foreground font-mono">{s.n}</span>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
