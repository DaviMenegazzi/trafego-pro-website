const WA_URL =
  "https://wa.me/55999940634?text=Ol%C3%A1!%20Olhei%20o%20site%20da%20Tr%C3%A1fego%20Pro%20e%20queria%20saber%20mais.";

const links = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#metodologia", label: "Estratégia" },
  { href: "#contato", label: "Contato" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
        <a href="#top" className="font-display font-semibold tracking-[0.14em] text-sm md:text-base shrink-0">
          TRÁFEGO<span className="text-muted-foreground"> PRO</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={WA_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-primary text-primary-foreground px-4 md:px-5 py-2 md:py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Começar Agora
        </a>
      </div>
    </header>
  );
}

export { WA_URL };
