import { describe, expect, it } from "vitest";
import { TALENT_MAX_UPLOAD_BYTES, validateTalentSubmission, validateTalentUpload } from "./talentBankPolicy.js";
import type { TalentField } from "./talentBankSupabaseStore.js";

const fields: TalentField[] = [
  { id: "name", formId: "form", fieldKey: "nome", label: "Nome completo", placeholder: null, helpText: null, fieldType: "text", isRequired: true, orderIndex: 0, options: [], validationRules: {} },
  { id: "mail", formId: "form", fieldKey: "email", label: "E-mail", placeholder: null, helpText: null, fieldType: "email", isRequired: true, orderIndex: 1, options: [], validationRules: {} },
  { id: "area", formId: "form", fieldKey: "area", label: "Área", placeholder: null, helpText: null, fieldType: "select", isRequired: true, orderIndex: 2, options: [{ label: "Atendimento", value: "atendimento" }], validationRules: {} },
  { id: "cv", formId: "form", fieldKey: "curriculo", label: "Currículo", placeholder: null, helpText: null, fieldType: "file", isRequired: true, orderIndex: 3, options: [], validationRules: {} },
];

describe("validação pública de candidatura", () => {
  it("exige consentimento indireto por respostas e currículo obrigatórios", () => {
    expect(validateTalentSubmission(fields, { nome: "Ana", email: "ana@vida.card", area: "atendimento" }, [])).toBe("Preencha o campo obrigatório: Currículo");
  });
  it("bloqueia e-mail e opções adulteradas, aceitando tanto label quanto value", () => {
    expect(validateTalentSubmission(fields, { nome: "Ana", email: "invalido", area: "atendimento" }, ["curriculo"])).toBe("Informe um e-mail válido");
    expect(validateTalentSubmission(fields, { nome: "Ana", email: "ana@vida.card", area: "outro" }, ["curriculo"])).toBe("Selecione uma opção válida para: Área");
    expect(validateTalentSubmission(fields, { nome: "Ana", email: "ana@vida.card", area: "Atendimento" }, ["curriculo"])).toBeNull();
    expect(validateTalentSubmission(fields, { nome: "Ana", email: "ana@vida.card", area: "atendimento" }, ["curriculo"])).toBeNull();
  });
  it("aceita apenas upload permitido no campo de arquivo", () => {
    expect(validateTalentUpload({ fieldKey: "curriculo", mimeType: "application/pdf", size: TALENT_MAX_UPLOAD_BYTES, allowedFieldKeys: ["curriculo"] })).toBeNull();
    expect(validateTalentUpload({ fieldKey: "curriculo", mimeType: "image/png", size: 100, allowedFieldKeys: ["curriculo"] })).toBe("Envie somente arquivos PDF ou DOCX");
    expect(validateTalentUpload({ fieldKey: "curriculo", mimeType: "application/pdf", size: TALENT_MAX_UPLOAD_BYTES + 1, allowedFieldKeys: ["curriculo"] })).toBe("O anexo deve ter até 5 MB");
  });
});
