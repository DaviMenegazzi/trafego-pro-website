import { describe, expect, it } from "vitest";

describe("credenciais da aplicação Meta", () => {
  it("autentica a aplicação no endpoint leve da Graph API", async () => {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    expect(appId).toBeTruthy();
    expect(appSecret).toBeTruthy();
    const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(appId!) }?fields=id,name&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
    const body = await response.json() as { id?: string; name?: string; error?: { message?: string } };
    expect(body.error?.message ?? "").toBe("");
    expect(response.ok).toBe(true);
    expect(body.id).toBe(appId);
  }, 20_000);
});
