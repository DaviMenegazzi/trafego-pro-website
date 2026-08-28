import { describe, expect, it } from "vitest";
import {
  anonymizeCandidateData,
  anonymizePhone,
  isSubmissionExpired,
  maskPiiInText,
} from "./dataRetentionPolicy.js";

describe("Governança LGPD e Política de Retenção", () => {
  it("avalia corretamente candidaturas expiradas após 180 dias", () => {
    const now = new Date("2026-08-27T00:00:00Z");
    const recent = new Date("2026-07-01T00:00:00Z"); // ~57 dias
    const expired = new Date("2026-01-01T00:00:00Z"); // ~238 dias

    expect(isSubmissionExpired(recent, 180, now)).toBe(false);
    expect(isSubmissionExpired(expired, 180, now)).toBe(true);
  });

  it("mascara CPFs e números de cartão de crédito em textos", () => {
    const raw1 = "Meu CPF é 123.456.789-00 por favor entrar em contato.";
    const masked1 = maskPiiInText(raw1);
    expect(masked1).toBe("Meu CPF é 123.***.***-00 por favor entrar em contato.");

    const rawCard = "Dados de pagamento: 4111 2222 3333 4444 para o plano";
    const maskedCard = maskPiiInText(rawCard);
    expect(maskedCard).toBe("Dados de pagamento: ****-****-****-4444 para o plano");
  });

  it("anonimiza telefones preservando apenas os 4 últimos dígitos", () => {
    expect(anonymizePhone("5551998877665")).toBe("(***) *****-7665");
    expect(anonymizePhone("123")).toBe("***");
  });

  it("anonimiza completamente dados do candidato a pedido de DSR", () => {
    const candidate = {
      id: "cand-123",
      candidateName: "João da Silva",
      candidateEmail: "joao@example.com",
      candidatePhone: "51999998888",
      answers: { experiencia: "5 anos", pretensao: "R$ 5.000" },
      notes: "Candidato excelente para recepção",
      attachments: [{ fileName: "curriculo.pdf", storageKey: "key-1" }],
    };

    const anonymized = anonymizeCandidateData(candidate);
    expect(anonymized.candidateName).toBe("[ANONIMIZADO - LGPD]");
    expect(anonymized.candidateEmail).toBe("anonimizado@lgpd.local");
    expect(anonymized.candidatePhone).toBe("(***) *****-8888");
    expect(anonymized.answers._anonymized).toBe(true);
    expect(anonymized.notes).toBe("[NOTAS EXPURGADAS CONFORME LGPD]");
    expect(anonymized.attachments).toEqual([]);
  });
});
