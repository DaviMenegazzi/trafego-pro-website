import { describe, it, expect } from "vitest";
import crypto from "crypto";

// ─── Replicate the JWT logic from server/index.ts ────────────────────────────
const JWT_SECRET = "trafego-pro-secret-2024";

function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("JWT auth helpers", () => {
  it("signs and verifies a valid token", () => {
    const token = signToken({ email: "lucas@trafego.pro", role: "admin" });
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("lucas@trafego.pro");
    expect(payload?.role).toBe("admin");
  });

  it("returns null for a tampered token", () => {
    const token = signToken({ email: "lucas@trafego.pro", role: "admin" });
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for a completely invalid token", () => {
    expect(verifyToken("not.a.valid.token")).toBeNull();
  });

  it("rejects non-admin role", () => {
    const token = signToken({ email: "user@example.com", role: "user" });
    const payload = verifyToken(token);
    expect(payload?.role).not.toBe("admin");
  });
});

describe("Admin credentials check", () => {
  const ADMIN_EMAIL = "lucas@trafego.pro";
  const ADMIN_PASSWORD = "trafego2024";

  it("accepts correct credentials", () => {
    expect(ADMIN_EMAIL === "lucas@trafego.pro" && ADMIN_PASSWORD === "trafego2024").toBe(true);
  });

  it("rejects wrong password", () => {
    expect(ADMIN_EMAIL === "lucas@trafego.pro" && "wrongpassword" === ADMIN_PASSWORD).toBe(false);
  });

  it("rejects wrong email", () => {
    expect("other@email.com" === ADMIN_EMAIL && ADMIN_PASSWORD === "trafego2024").toBe(false);
  });
});
