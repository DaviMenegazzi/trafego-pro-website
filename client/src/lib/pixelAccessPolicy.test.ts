import { describe, expect, it } from "vitest";
import { canAccessPixel } from "./pixelAccessPolicy";

describe("Pixel access policy", () => {
  it("always allows administrators", () => {
    expect(canAccessPixel({ role: "admin", pixelAccess: false })).toBe(true);
  });

  it("allows non-admin users only with the explicit permission", () => {
    expect(canAccessPixel({ role: "viewer", pixelAccess: true })).toBe(true);
    expect(canAccessPixel({ role: "viewer", pixelAccess: false })).toBe(false);
    expect(canAccessPixel({ role: "viewer" })).toBe(false);
  });
});
