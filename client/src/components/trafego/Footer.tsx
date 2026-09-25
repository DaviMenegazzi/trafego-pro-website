import { Link } from "wouter";
import { LOGO_SRC, WA_URL } from "./Nav";
import { openConsentPreferences } from "@/lib/consent";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <img src={LOGO_SRC} alt="Tráfego Pro" width={151} height={12} loading="lazy" className="block h-3 w-auto" />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tráfego Pro. Todos os direitos reservados.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/privacidade" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Privacidade
        </Link>
        <button type="button" onClick={openConsentPreferences} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cookies
        </button>
        <a
          href={WA_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          WhatsApp →
        </a>
        </div>
      </div>
    </footer>
  );
}
