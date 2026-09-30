import { useCallback, useEffect, useState } from "react";

// Selo "Novo" de itens do menu: aparece até a pessoa abrir a tela uma vez. Fica guardado no
// navegador, separado por usuário; sem localStorage (aba anônima bloqueada) o selo só não aparece.

const EVENT = "tp-nav-new-seen";

function storageKey(badgeKey: string): string {
  let user = "anon";
  try {
    const stored = JSON.parse(localStorage.getItem("tp_user") ?? "{}") as { email?: string };
    if (stored.email) user = stored.email.toLowerCase();
  } catch {
    // tp_user ilegível: usa a chave anônima
  }
  return `tp_nav_seen:${badgeKey}:${user}`;
}

export function hasSeenNavItem(badgeKey: string): boolean {
  try {
    return localStorage.getItem(storageKey(badgeKey)) === "1";
  } catch {
    return true;
  }
}

export function markNavItemSeen(badgeKey: string): void {
  try {
    localStorage.setItem(storageKey(badgeKey), "1");
  } catch {
    // sem armazenamento: nada a guardar
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: badgeKey }));
}

/** O menu aparece em mais de um lugar (lateral e gaveta do celular): o evento apaga o selo em todos. */
export function useNavNewBadge(badgeKey: string | undefined, active: boolean) {
  const [isNew, setIsNew] = useState(() => (badgeKey ? !hasSeenNavItem(badgeKey) : false));

  useEffect(() => {
    if (!badgeKey) return;
    const onSeen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === badgeKey) setIsNew(false);
    };
    window.addEventListener(EVENT, onSeen);
    return () => window.removeEventListener(EVENT, onSeen);
  }, [badgeKey]);

  // Abrir a tela por outro caminho (link direto, voltar do navegador) também conta como visto.
  useEffect(() => {
    if (badgeKey && active && isNew) markNavItemSeen(badgeKey);
  }, [active, badgeKey, isNew]);

  const dismiss = useCallback(() => {
    if (badgeKey && isNew) markNavItemSeen(badgeKey);
  }, [badgeKey, isNew]);

  return { isNew, dismiss };
}
