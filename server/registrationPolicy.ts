export function buildPendingRegistrationBio(reason?: string): string {
  const normalizedReason = reason?.trim();
  return normalizedReason ? `Justificativa: ${normalizedReason}` : "";
}
