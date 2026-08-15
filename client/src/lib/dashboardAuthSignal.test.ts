import { describe, expect, it } from "vitest";
import { DASHBOARD_AUTHENTICATED_EVENT, notifyDashboardAuthenticated } from "./dashboardAuthSignal";

describe("notifyDashboardAuthenticated", () => {
  it("emite o evento que dispara a atualização das unidades após login", () => {
    const target = new EventTarget();
    let calls = 0;
    target.addEventListener(DASHBOARD_AUTHENTICATED_EVENT, () => { calls += 1; });

    notifyDashboardAuthenticated(target);

    expect(calls).toBe(1);
  });
});
