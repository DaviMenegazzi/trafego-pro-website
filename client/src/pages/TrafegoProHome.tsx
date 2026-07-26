import { useEffect } from "react";
import { Nav } from "@/components/trafego/Nav";
import { Hero } from "@/components/trafego/Hero";
import { Logos } from "@/components/trafego/Logos";
import { About } from "@/components/trafego/About";
import { Services } from "@/components/trafego/Services";
import { Method } from "@/components/trafego/Method";
import { CTA } from "@/components/trafego/CTA";
import { Footer } from "@/components/trafego/Footer";

/**
 * Página inicial da Tráfego Pro.
 * O layout usa tokens semânticos (bg-background, bg-surface, font-display...) e roda
 * dentro do escopo `.trafego-dark`, que aplica o tema escuro apenas nesta página,
 * sem afetar o restante do app (landings e dashboard).
 */
export default function TrafegoProHome() {
  useEffect(() => {
    document.title = "Tráfego Pro — Tráfego pago que converte";
  }, []);

  return (
    <div className="trafego-dark min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Logos />
        <About />
        <Services />
        <Method />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
