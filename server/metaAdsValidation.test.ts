import { describe, expect, it } from "vitest";

type MetaDebugResponse = {
  data?: Array<{ id?: string; name?: string; account_status?: number }>;
  error?: { message?: string };
};

describe("token temporário de leitura Meta Ads", () => {
  it("é válido para listar contas de anúncio e consultar insights sem exigir o app de publicações", async () => {
    const inputToken = process.env.META_ADS_VALIDATION_TOKEN;
    expect(inputToken).toBeTruthy();

    const params = new URLSearchParams({ fields: "id,name,account_status", limit: "200", access_token: inputToken! });
    const response = await fetch(`https://graph.facebook.com/v26.0/me/adaccounts?${params.toString()}`);
    const body = await response.json() as MetaDebugResponse;
    expect(body.error?.message ?? "").toBe("");
    expect(response.ok).toBe(true);
    expect(body.data?.length).toBeGreaterThan(0);

    const accountId = body.data?.[0]?.id;
    expect(accountId).toBeTruthy();
    const insightsParams = new URLSearchParams({ fields: "spend", date_preset: "last_7d", limit: "1", access_token: inputToken! });
    const insights = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(accountId!)}/insights?${insightsParams.toString()}`);
    const insightsBody = await insights.json() as { error?: { message?: string } };
    expect(insightsBody.error?.message ?? "").toBe("");
    expect(insights.ok).toBe(true);
  }, 20_000);
});
