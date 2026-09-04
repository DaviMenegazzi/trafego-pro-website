import { describe, it, expect, beforeEach } from "vitest";
import { checkAdminAuth } from "./AdminRoute";

const storage = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};

describe("checkAdminAuth", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("returns isAuthenticated: false and isAdmin: false when no token exists", () => {
    const res = checkAdminAuth();
    expect(res.isAuthenticated).toBe(false);
    expect(res.isAdmin).toBe(false);
  });

  it("returns isAuthenticated: true, but isAdmin: false for non-admin roles", () => {
    localStorage.setItem("tp_token", "dummy-jwt-token");
    localStorage.setItem(
      "tp_user",
      JSON.stringify({ role: "viewer", allowedClientIds: ["client-123"] })
    );

    const res = checkAdminAuth();
    expect(res.isAuthenticated).toBe(true);
    expect(res.isAdmin).toBe(false);
  });

  it("returns isAuthenticated: true and isAdmin: true for role === admin", () => {
    localStorage.setItem("tp_token", "dummy-jwt-token");
    localStorage.setItem(
      "tp_user",
      JSON.stringify({ role: "admin", allowedClientIds: [] })
    );

    const res = checkAdminAuth();
    expect(res.isAuthenticated).toBe(true);
    expect(res.isAdmin).toBe(true);
  });

  it("returns isAuthenticated: true and isAdmin: true when user has wildcard allowedClientIds", () => {
    localStorage.setItem("tp_token", "dummy-jwt-token");
    localStorage.setItem(
      "tp_user",
      JSON.stringify({ role: "manager", allowedClientIds: ["*"] })
    );

    const res = checkAdminAuth();
    expect(res.isAuthenticated).toBe(true);
    expect(res.isAdmin).toBe(true);
  });
});
