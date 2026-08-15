export const DASHBOARD_AUTHENTICATED_EVENT = "tp:dashboard-authenticated";

export function notifyDashboardAuthenticated(target: EventTarget = window) {
  target.dispatchEvent(new Event(DASHBOARD_AUTHENTICATED_EVENT));
}
