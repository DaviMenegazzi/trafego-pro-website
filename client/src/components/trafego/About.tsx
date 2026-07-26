import { Reveal } from "./Reveal";

const stats = [
  { value: "+500", label: "Campanhas gerenciadas com sucesso" },
  { value: "+50M", label: "Em vendas geradas para clientes" },
  { value: "98%", label: "Taxa de satisfação de clientes" },
];

export function About() {
  return (
    <section id="sobre" className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-36">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-6">Quem somos</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display font-semibold tracking-[-0.02em] leading-[1.02] text-[clamp(2.25rem,5vw,4.5rem)]">
              Dados em decisões.
              <br />
              <span className="text-muted-foreground">Investimento em receita.</span>
            </h2>
          </Reveal>
        </div>
        <div className="lg:col-span-6 lg:pt-6">
          <Reveal delay={160}>
            <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              <p>
                A Tráfego Pro é uma assessoria especializada em marketing digital
                que ajuda empresas a alcançarem seus objetivos de vendas através
                de estratégias integradas de tráfego pago e conteúdo orgânico.
              </p>
              <p>
                Nosso foco é transformar dados em decisões estratégicas,
                maximizando o retorno de cada real investido em marketing.
                Trabalhamos com empresas de todos os tamanhos, sempre com a mesma
                dedicação e excelência.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-20 md:mt-28 bg-border/70 border border-border/70 rounded-3xl overflow-hidden">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 120}>
            <div className="bg-background p-8 md:p-10 h-full">
              <div className="font-display font-semibold tracking-[-0.03em] text-5xl md:text-6xl">
                {s.value}
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-[240px]">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

    </section>
  );
}
