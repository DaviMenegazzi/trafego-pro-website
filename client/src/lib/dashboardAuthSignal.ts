export const DASHBOARD_AUTHENTICATED_EVENT = "tp:dashboard-authenticated";
export const DASHBOARD_POST_LOGIN_REFRESH_KEY = "tp:dashboard-post-login-refresh";

type StorageTarget = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function notifyDashboardAuthenticated(target?: EventTarget) {
  const eventTarget = target ?? (typeof window !== "undefined" ? window : undefined);
  eventTarget?.dispatchEvent(new Event(DASHBOARD_AUTHENTICATED_EVENT));
}

export function markDashboardPostLoginRefresh(
  storage: StorageTarget = window.sessionStorage,
  target?: EventTarget,
) {
  storage.setItem(DASHBOARD_POST_LOGIN_REFRESH_KEY, "1");
  notifyDashboardAuthenticated(target);
}

export function consumeDashboardPostLoginRefresh(storage: StorageTarget = window.sessionStorage) {
  const pending = storage.getItem(DASHBOARD_POST_LOGIN_REFRESH_KEY) === "1";
  storage.removeItem(DASHBOARD_POST_LOGIN_REFRESH_KEY);
  return pending;
}
