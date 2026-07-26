import { ArrowUpRight } from "lucide-react";
import { WA_URL } from "./Nav";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 md:pt-36 pb-24 md:pb-40">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground mb-10">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/80" />
            Impulsione suas vendas com Tráfego Pago
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="font-display font-semibold tracking-[-0.035em] leading-[0.92] text-[clamp(3rem,11vw,10rem)] max-w-[15ch]">
            Tráfego que <span className="text-muted-foreground">converte</span> em receita.
          </h1>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-[minmax(0,1fr)_auto] gap-10 md:items-end">
          <Reveal delay={160}>
            <p className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              Assessoria de marketing digital especializada em tráfego pago e
              conteúdo orgânico. Estratégias comprovadas para maximizar vendas e
              ROI.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={WA_URL}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Entrar em contato
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#servicos"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium hover:bg-surface transition-colors"
              >
                Saiba mais
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
