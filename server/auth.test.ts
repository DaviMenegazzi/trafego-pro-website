import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-fixture-signing-key";

function signToken(payload: object, expiresIn: string = "2h"): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn,
  });
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return typeof decoded === "object" && decoded !== null ? (decoded as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("JWT auth helpers", () => {
  it("signs and verifies a valid token", () => {
    const token = signToken({ email: "admin@example.test", role: "admin" });
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("admin@example.test");
    expect(payload?.role).toBe("admin");
    expect(payload?.exp).toBeDefined();
  });

  it("returns null for a tampered token", () => {
    const token = signToken({ email: "admin@example.test", role: "admin" });
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for a completely invalid token", () => {
    expect(verifyToken("not.a.valid.token")).toBeNull();
  });

  it("rejects an expired token", () => {
    const expiredToken = signToken({ email: "admin@example.test", role: "admin" }, "-1s");
    expect(verifyToken(expiredToken)).toBeNull();
  });

  it("rejects non-admin role", () => {
    const token = signToken({ email: "user@example.com", role: "user" });
    const payload = verifyToken(token);
    expect(payload?.role).not.toBe("admin");
  });
});
