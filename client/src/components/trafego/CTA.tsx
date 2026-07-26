import { ArrowUpRight } from "lucide-react";
import { WA_URL } from "./Nav";
import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section id="contato" className="relative mx-auto max-w-[1400px] px-6 md:px-10 pb-24 md:pb-36">
      <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface/40 px-8 md:px-16 py-24 md:py-36 text-center">
        <Reveal>
          <h2 className="font-display font-semibold tracking-[-0.03em] leading-[0.98] text-[clamp(2.5rem,7vw,6.5rem)] max-w-4xl mx-auto">
            Pronto para transformar seus resultados?
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-8 max-w-xl mx-auto text-muted-foreground text-base md:text-lg">
            Vamos conversar sobre como a Tráfego Pro pode fazer seu negócio
            crescer com estratégias comprovadas.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Falar com a Tráfego Pro
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
