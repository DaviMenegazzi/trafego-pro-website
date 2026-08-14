export type NavigationUser = {
  role?: string;
};

export function canSeeAdminFeedbacks(user: NavigationUser | null | undefined): boolean {
  return user?.role === "admin";
}
