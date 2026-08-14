export type MetricsAccessClaims = {
  role: string;
  allowedClientIds: string[];
};

export type ClientSelectionError = {
  status: 400 | 403;
  error: string;
};

/**
 * Exige uma unidade explícita para métricas de anúncios e impede que um token
 * consulte uma unidade fora da sua lista de acessos.
 */
export function validateMetricsClientSelection(
  clientId: string | undefined,
  claims: MetricsAccessClaims | undefined,
): ClientSelectionError | null {
  if (!clientId) {
    return { status: 400, error: "Selecione uma unidade para consultar os anúncios" };
  }

  const hasGlobalAccess = claims?.role === "admin" || claims?.allowedClientIds.includes("*");
  if (claims && !hasGlobalAccess && !claims.allowedClientIds.includes(clientId)) {
    return { status: 403, error: "Sem acesso a essa unidade" };
  }

  return null;
}
