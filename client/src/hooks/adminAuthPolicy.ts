export function shouldRedirectToLogin(
  token: string | null,
  userJson: string | null,
  serverVerified: boolean,
): boolean {
  if (!token || !userJson || !serverVerified) return true;

  try {
    const user = JSON.parse(userJson) as { role?: string };
    return user.role !== "admin";
  } catch {
    return true;
  }
}
