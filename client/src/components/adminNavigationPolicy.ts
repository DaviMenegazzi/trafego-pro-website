export type NavigationUser = {
  role?: string;
  allowedClientIds?: string[];
};

export function canSeeAdminFeedbacks(user: NavigationUser | null | undefined): boolean {
  return user?.role === "admin" || user?.allowedClientIds?.includes("*") === true;
}

