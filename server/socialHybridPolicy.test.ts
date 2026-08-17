import { describe, expect, it } from "vitest";
import { canUseNativeFacebookSchedule, nextInstagramRetry } from "./socialHybridPolicy.js";

describe("política híbrida de agendamento", () => {
  it("aceita imagem futura na janela nativa do Facebook", () => expect(canUseNativeFacebookSchedule(new Date(Date.now() + 20 * 60_000).toISOString(), "image")).toBe(true));
  it("mantém Instagram em tentativas progressivas e encerra após o limite", () => {
    expect(nextInstagramRetry(1, 0)?.getTime()).toBe(5 * 60_000);
    expect(nextInstagramRetry(4, 0)).toBeNull();
  });
});
