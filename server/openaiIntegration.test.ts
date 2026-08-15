import { describe, expect, it } from "vitest";

describe("credencial OpenAI para classificação diária", () => {
  it("autentica na API e disponibiliza o modelo gpt-5-nano", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models/gpt-5-nano", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await response.text();

    expect(response.status, body).toBe(200);
    expect(JSON.parse(body)).toMatchObject({ id: "gpt-5-nano" });
  }, 30_000);
});
