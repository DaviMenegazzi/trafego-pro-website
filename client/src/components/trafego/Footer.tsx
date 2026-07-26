import { WA_URL } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="font-display font-semibold tracking-[0.14em] text-sm">
          TRÁFEGO<span className="text-muted-foreground"> PRO</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tráfego Pro. Todos os direitos reservados.
        </p>
        <a
          href={WA_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          WhatsApp →
        </a>
      </div>
    </footer>
  );
}
