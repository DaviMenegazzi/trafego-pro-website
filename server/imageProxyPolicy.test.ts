import { describe, expect, it } from "vitest";
import { allowedImageProxyUrl } from "./imageProxyPolicy.js";

describe("image proxy destinations", () => {
  const supabase = ["https://project.supabase.co"];

  it("rejects localhost, private addresses, unexpected hosts and redirects supplied as URLs", () => {
    for (const raw of [
      "http://graph.facebook.com/image.jpg",
      "https://127.0.0.1/image.jpg",
      "https://localhost/image.jpg",
      "https://graph.facebook.com.evil.example/image.jpg",
      "https://user:pass@graph.facebook.com/image.jpg",
      "https://project.supabase.co:8443/image.jpg",
    ]) expect(allowedImageProxyUrl(raw, supabase)).toBeNull();
  });

  it("accepts only approved HTTPS image providers", () => {
    expect(allowedImageProxyUrl("https://scontent.xx.fbcdn.net/image.jpg", supabase)?.hostname)
      .toBe("scontent.xx.fbcdn.net");
    expect(allowedImageProxyUrl("https://project.supabase.co/storage/image.jpg", supabase)?.hostname)
      .toBe("project.supabase.co");
  });
});
