import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

const services = [
  { n: "01", title: "Google Ads", desc: "Campanhas de pesquisa otimizadas para máxima conversão." },
  { n: "02", title: "Meta Ads", desc: "Estratégias de tráfego pago em Facebook e Instagram." },
  { n: "03", title: "Conteúdo Orgânico", desc: "Marketing de conteúdo de alto impacto e alcance." },
  { n: "04", title: "Análise de Dados", desc: "Relatórios detalhados e insights acionáveis." },
  { n: "05", title: "Otimização de Funil", desc: "Melhoria contínua de conversão e ROI." },
  { n: "06", title: "Consultoria", desc: "Orientação estratégica personalizada para seu negócio." },
];

export function Services() {
  return (
    <section id="servicos" className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-36">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-24">
        <div>
          <Reveal>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-6">Serviços</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display font-semibold tracking-[-0.02em] leading-[1.02] text-[clamp(2.25rem,5vw,4.5rem)] max-w-2xl">
              O que fazemos para vender mais.
            </h2>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <p className="text-muted-foreground max-w-sm">
            Um sistema completo de aquisição — do primeiro clique à venda
            recorrente.
          </p>
        </Reveal>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/70 border border-border/70 rounded-3xl overflow-hidden">
        {services.map((s, i) => (
          <Reveal key={s.n} delay={(i % 3) * 100}>
            <div className="group bg-background p-8 md:p-10 min-h-[240px] h-full flex flex-col justify-between hover:bg-surface transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground font-mono">{s.n}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-[-0.01em]">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                  {s.desc}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
