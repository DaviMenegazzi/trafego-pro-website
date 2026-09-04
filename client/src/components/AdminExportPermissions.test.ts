import { describe, expect, it } from "vitest";
import {
  canSeeAdminFeedbacks,
  canExportDashboardMetrics,
} from "./adminNavigationPolicy";

describe("Admin Export & Print Permissions Policy", () => {
  it("allows export when user is admin and client is selected", () => {
    const adminUser = { role: "admin", allowedClientIds: ["act_123"] };
    expect(canSeeAdminFeedbacks(adminUser)).toBe(true);
    expect(canExportDashboardMetrics(adminUser, "act_123")).toBe(true);
  });

  it("allows export when user has wildcard allowedClientIds and client is selected", () => {
    const wildcardUser = { role: "viewer", allowedClientIds: ["*"] };
    expect(canSeeAdminFeedbacks(wildcardUser)).toBe(true);
    expect(canExportDashboardMetrics(wildcardUser, "act_456")).toBe(true);
  });

  it("blocks export if client is not selected even for admin", () => {
    const adminUser = { role: "admin", allowedClientIds: ["*"] };
    expect(canExportDashboardMetrics(adminUser, null)).toBe(false);
    expect(canExportDashboardMetrics(adminUser, undefined)).toBe(false);
    expect(canExportDashboardMetrics(adminUser, "")).toBe(false);
  });

  it("strictly blocks export for non-admin users (viewers, managers, clients)", () => {
    const normalUser = { role: "viewer", allowedClientIds: ["act_123", "act_456"] };
    expect(canSeeAdminFeedbacks(normalUser)).toBe(false);
    expect(canExportDashboardMetrics(normalUser, "act_123")).toBe(false);

    const clientUser = { role: "client_viewer", allowedClientIds: ["act_123"] };
    expect(canSeeAdminFeedbacks(clientUser)).toBe(false);
    expect(canExportDashboardMetrics(clientUser, "act_123")).toBe(false);

    const nullUser = null;
    expect(canSeeAdminFeedbacks(nullUser)).toBe(false);
    expect(canExportDashboardMetrics(nullUser, "act_123")).toBe(false);
  });
});
