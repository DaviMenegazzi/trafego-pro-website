import { describe, expect, it } from "vitest";
import {
  DASHBOARD_AUTHENTICATED_EVENT,
  DASHBOARD_POST_LOGIN_REFRESH_KEY,
  consumeDashboardPostLoginRefresh,
  markDashboardPostLoginRefresh,
  notifyDashboardAuthenticated,
} from "./dashboardAuthSignal";

describe("notifyDashboardAuthenticated", () => {
  it("emite o evento que dispara a atualização das unidades após login", () => {
    const target = new EventTarget();
    let calls = 0;
    target.addEventListener(DASHBOARD_AUTHENTICATED_EVENT, () => { calls += 1; });

    notifyDashboardAuthenticated(target);

    expect(calls).toBe(1);
  });

  it("persiste e consome o marcador de refetch entre login e montagem da dashboard", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    markDashboardPostLoginRefresh(storage);
    expect(values.get(DASHBOARD_POST_LOGIN_REFRESH_KEY)).toBe("1");
    expect(consumeDashboardPostLoginRefresh(storage)).toBe(true);
    expect(consumeDashboardPostLoginRefresh(storage)).toBe(false);
  });
});
