/**
 * Políticas de Governança de Dados, Retenção e Conformidade LGPD (Artigos 15, 16 e 18).
 */

export const DEFAULT_TALENT_RETENTION_DAYS = 180;

/**
 * Avalia se uma candidatura ultrapassou o período legal de retenção consentida.
 */
export function isSubmissionExpired(
  createdAt: string | Date,
  retentionDays: number = DEFAULT_TALENT_RETENTION_DAYS,
  now: Date = new Date(),
): boolean {
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return false;

  const ageMs = now.getTime() - createdDate.getTime();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
}

/**
 * Mascara dados altamente sensíveis (CPF, cartões de crédito) em textos de mensagens ou observações.
 */
export function maskPiiInText(text: string | null | undefined): string {
  if (!text) return "";

  let masked = text;

  // 1. Mascara CPF formatado (000.000.000-00) ou 11 dígitos sequenciais
  masked = masked.replace(/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g, "$1.***.***-$4");

  // 2. Mascara Números de Cartão de Crédito (13 a 16 dígitos com ou sem espaços/hífens)
  masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, (match) => {
    const cleanDigits = match.replace(/\D/g, "");
    if (cleanDigits.length >= 13 && cleanDigits.length <= 16) {
      return `****-****-****-${cleanDigits.slice(-4)}`;
    }
    return match;
  });

  return masked;
}

/**
 * Anonimiza telefone preservando apenas os últimos 4 dígitos para conferência.
 */
export function anonymizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `(***) *****-${digits.slice(-4)}`;
}

/**
 * Aplica anonimização completa em uma candidatura a pedido do titular (DSR) ou por expurgo.
 */
export function anonymizeCandidateData<T extends Record<string, any>>(candidate: T): T {
  return {
    ...candidate,
    candidateName: "[ANONIMIZADO - LGPD]",
    candidateEmail: "anonimizado@lgpd.local",
    candidatePhone: candidate.candidatePhone ? anonymizePhone(candidate.candidatePhone) : null,
    answers: {
      _anonymized: true,
      _anonymizedAt: new Date().toISOString(),
      _reason: "LGPD - Direito ao Esquecimento / Expurgo de Retenção",
    },
    notes: candidate.notes ? "[NOTAS EXPURGADAS CONFORME LGPD]" : null,
    attachments: [],
  };
}
