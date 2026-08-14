const FEEDBACK_ACCESS_ROLES = new Set([
  "viewer",
  "client_viewer",
  "designer",
  "cs",
  "account_manager",
  "traffic_manager",
  "copywriter",
]);

export function shouldRedirectToLogin(
  token: string | null,
  userJson: string | null,
  serverVerified: boolean,
): boolean {
  if (!token || !userJson || !serverVerified) return true;

  try {
    const user = JSON.parse(userJson) as { role?: string; allowedClientIds?: string[] };
    if (user.role === "admin") return false;
    if (!FEEDBACK_ACCESS_ROLES.has(user.role ?? "")) return true;
    return !Array.isArray(user.allowedClientIds) || user.allowedClientIds.length === 0;
  } catch {
    return true;
  }
}
