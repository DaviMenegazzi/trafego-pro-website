import { describe, expect, it } from "vitest";
import { OPENAI_LEAD_CLASSIFIER_MODEL } from "./evolutionAiClassification.js";

describe("integração OpenAI para classificação diária", () => {
  it("mantém o modelo econômico configurado sem realizar chamadas externas nos testes", () => {
    expect(OPENAI_LEAD_CLASSIFIER_MODEL).toBe("gpt-5-nano");
  });
});
