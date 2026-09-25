import { useEffect, useState } from "react";
import { Link } from "wouter";
import { OPEN_CONSENT_EVENT, readConsent, saveConsent, type ConsentChoice } from "@/lib/consent";

function hasSession() {
  try {
    return Boolean(localStorage.getItem("tp_token"));
  } catch {
    return false;
  }
}

/**
 * Banner de cookies. "Aceitar" e "Recusar" têm o mesmo peso visual de propósito
 * (sem dark pattern). Nada de analytics/anúncios roda antes do aceite.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(() => readConsent() === null && !hasSession());

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    setOpen(false);
  };

  const buttonClass =
    "flex-1 sm:flex-none rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Preferências de cookies"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/10 bg-zinc-950/95 p-4 text-zinc-300 shadow-2xl backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-sm leading-6">
          Usamos cookies do Google Analytics e de ferramentas de anúncio para medir visitas e melhorar
          nossas campanhas. Você pode aceitar ou recusar; cookies essenciais funcionam sempre.{" "}
          <Link href="/privacidade" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">
            Política de privacidade
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={buttonClass} onClick={() => choose("denied")}>
            Recusar
          </button>
          <button type="button" className={buttonClass} onClick={() => choose("granted")}>
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
