const WA_URL =
  "https://wa.me/55999940634?text=Ol%C3%A1!%20Olhei%20o%20site%20da%20Tr%C3%A1fego%20Pro%20e%20queria%20saber%20mais.";

const LOGO_SRC = "/brand/logo_trafego_pro_white_9daf2f2e.webp";

const links = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#produtos", label: "Produtos" },
  { href: "#metodologia", label: "Estratégia" },
  { href: "#contato", label: "Contato" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/40">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
        <a href="#top" className="shrink-0">
          <img src={LOGO_SRC} alt="Tráfego Pro" width={202} height={16} className="block h-2.5 w-auto md:h-4" />
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
        <div className="flex items-center gap-1 md:gap-3">
          {/* Clientes da agência não tinham caminho da home para o login. */}
          <a
            href="/login"
            aria-label="Área do cliente"
            className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:px-4"
          >
            <span className="md:hidden">Entrar</span>
            <span className="hidden md:inline">Área do cliente</span>
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-primary text-primary-foreground px-4 md:px-5 py-2 md:py-2.5 text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Começar agora
          </a>
        </div>
      </div>
    </header>
  );
}

export { WA_URL, LOGO_SRC };
