import { formatDate, formatShortDate } from "@/lib/format";

// Os registros antigos gravam datas em formatos diferentes: ISO
// ("2026-07-06T12:00:00.000Z"), data local ("06/07/2026, 09:00:00") ou
// texto livre. Nada disso deve aparecer cru na tela.

/** "06/07" (ou "06/07/2026" com `withYear`) para qualquer um dos formatos gravados. */
export function formatStoredDate(value: string | null | undefined, withYear = false): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return withYear ? formatDate(value) : formatShortDate(value);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  if (br) return withYear ? `${br[1]}/${br[2]}/${br[3]}` : `${br[1]}/${br[2]}`;
  return value;
}

/** Primeiro nome com inicial maiúscula ("davi@x.com" → "Davi"). */
export function formatPerson(value: string | null | undefined): string {
  if (!value) return "—";
  const base = value.includes("@") ? value.split("@")[0] : value.split(" ")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}
