import { describe, expect, it } from "vitest";
import { createMetaAuthorizationUrl, createMetaOAuthState, decryptSocialSecret, encryptSocialSecret, isMetaOAuthConfigured, verifyMetaOAuthState } from "./socialMetaService.js";

describe("segurança da conexão Meta", () => {
  it("não considera OAuth Meta configurado sem as variáveis protegidas", () => {
    const previous = { appId: process.env.META_APP_ID, appSecret: process.env.META_APP_SECRET, encryptionKey: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY };
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(isMetaOAuthConfigured()).toBe(false);
    if (previous.appId) process.env.META_APP_ID = previous.appId;
    if (previous.appSecret) process.env.META_APP_SECRET = previous.appSecret;
    if (previous.encryptionKey) process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = previous.encryptionKey;
  });

  it("assina e valida o estado OAuth de curta duração", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "chave-de-teste-para-validacao-com-mais-de-vinte-e-quatro-caracteres";
    const state = createMetaOAuthState("user-123");
    expect(verifyMetaOAuthState(state)).toEqual({ ownerUserId: "user-123" });
    expect(verifyMetaOAuthState(`${state}alterado`)).toBeNull();
  });

  it("cifra tokens antes da persistência", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "chave-de-teste-para-validacao-com-mais-de-vinte-e-quatro-caracteres";
    const encrypted = encryptSocialSecret("token-meta-de-teste");
    expect(encrypted).not.toContain("token-meta-de-teste");
    expect(decryptSocialSecret(encrypted)).toBe("token-meta-de-teste");
  });

  it("solicita apenas os escopos de publicação necessários no OAuth", () => {
    const url = new URL(createMetaAuthorizationUrl({ appId: "app-123", appSecret: "segredo", redirectUri: "https://trafego.pro/api/social/meta/callback" }, "estado-assinado"));
    expect(url.searchParams.get("redirect_uri")).toBe("https://trafego.pro/api/social/meta/callback");
    expect(url.searchParams.get("scope")).toContain("pages_manage_posts");
    expect(url.searchParams.get("scope")).toContain("instagram_content_publish");
  });
});
