import { describe, expect, it } from "vitest";
import { socialPostStatusForConnection, validateSocialPostDraft } from "./socialPublishingPolicy.js";

const base = {
  title: "Conteúdo institucional",
  caption: "Legenda aprovada.",
  contentFormat: "image" as const,
  targetFacebook: true,
  targetInstagram: true,
  media: [{ url: "https://cdn.example.com/post.jpg", mediaType: "image" as const }],
};

describe("validação de publicação social", () => {
  it("aceita uma publicação de imagem com canais e URL pública", () => {
    expect(validateSocialPostDraft(base)).toBeNull();
  });

  it("recusa formatos incompatíveis, mídias privadas e ausência de canal", () => {
    expect(validateSocialPostDraft({ ...base, targetFacebook: false, targetInstagram: false })).toContain("canal");
    expect(validateSocialPostDraft({ ...base, media: [{ url: "http://inseguro.example/post.jpg", mediaType: "image" }] })).toContain("HTTPS");
    expect(validateSocialPostDraft({ ...base, contentFormat: "reel", media: base.media })).toContain("Reel");
  });

  it("distingue rascunho, agendamento conectado e espera de conexão", () => {
    expect(socialPostStatusForConnection(null, false)).toBe("draft");
    expect(socialPostStatusForConnection("connection-1", true)).toBe("scheduled");
    expect(socialPostStatusForConnection(null, true)).toBe("waiting_connection");
  });
});
