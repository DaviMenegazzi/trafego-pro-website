import { describe, it, expect } from "vitest";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

describe("Supabase Connection", () => {
  it("should have Supabase configured", () => {
    const configured = isSupabaseConfigured();
    expect(configured).toBe(true);
  });

  it("should return a valid Supabase client", () => {
    const supabase = getSupabase();
    expect(supabase).not.toBeNull();
    expect(supabase).toBeDefined();
  });

  it("should have valid Supabase URL in environment", () => {
    const url = process.env.SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it("should have valid Supabase publishable key in environment", () => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key).toMatch(/^sb_publishable_/);
  });
});
