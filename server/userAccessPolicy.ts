export const MANAGED_USER_STATUSES = ["active", "inactive"] as const;

export type ManagedUserStatus = (typeof MANAGED_USER_STATUSES)[number];

export function normalizeManagedUserStatus(value: unknown): ManagedUserStatus | null {
  return typeof value === "string" && MANAGED_USER_STATUSES.includes(value as ManagedUserStatus)
    ? (value as ManagedUserStatus)
    : null;
}
