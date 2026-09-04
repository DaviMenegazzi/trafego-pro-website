export type NavigationUser = {
  role?: string;
  allowedClientIds?: string[];
};

export function canSeeAdminFeedbacks(user: NavigationUser | null | undefined): boolean {
  return user?.role === "admin" || user?.allowedClientIds?.includes("*") === true;
}

export function canExportDashboardMetrics(
  user: NavigationUser | null | undefined,
  selectedClientId?: string | null,
): boolean {
  return canSeeAdminFeedbacks(user) && Boolean(selectedClientId);
}
