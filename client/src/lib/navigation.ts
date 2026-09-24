// Um único item de menu ativo: o de caminho mais longo que casa com a URL.
// Evita "Feedback de Leads" e "Feedbacks enviados" acesos ao mesmo tempo.
export function resolveActiveNav(pathname: string, items: { to: string }[]): string | null {
  const matches = items
    .map((item) => item.to)
    .filter((to) => pathname === to || pathname === `${to}/` || pathname.startsWith(`${to}/`));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0];
}
