import { describe, expect, it } from "vitest";
import { MAX_SOCIAL_MEDIA_BYTES, validateSocialMediaUpload } from "./socialMediaUploadPolicy.js";

describe("validação de mídia social local", () => {
  it("aceita imagem e classifica seu tipo", () => expect(validateSocialMediaUpload({ mimetype: "image/png", size: 100 })).toEqual({ extension: "png", mediaType: "image" }));
  it("rejeita formatos e arquivos acima do limite", () => {
    expect(validateSocialMediaUpload({ mimetype: "application/pdf", size: 100 })).toContain("Formato");
    expect(validateSocialMediaUpload({ mimetype: "video/mp4", size: MAX_SOCIAL_MEDIA_BYTES + 1 })).toContain("50 MB");
  });
});
