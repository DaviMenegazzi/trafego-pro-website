export type EvolutionAdminSession = { role?: string };

export function canAccessEvolutionPanel(token: string | null, userJson: string | null): boolean {
  if (!token || !userJson) return false;
  try {
    return (JSON.parse(userJson) as EvolutionAdminSession).role === "admin";
  } catch {
    return false;
  }
}
