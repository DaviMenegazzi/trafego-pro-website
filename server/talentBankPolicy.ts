import type { TalentField } from "./talentBankSupabaseStore.js";

export const TALENT_ALLOWED_MIME_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;
export const TALENT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateTalentUpload(input: { fieldKey: string; mimeType: string; size: number; allowedFieldKeys: string[] }): string | null {
  if (!input.allowedFieldKeys.includes(input.fieldKey)) return "Anexo não permitido";
  if (!TALENT_ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof TALENT_ALLOWED_MIME_TYPES)[number])) return "Envie somente arquivos PDF ou DOCX";
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > TALENT_MAX_UPLOAD_BYTES) return "O anexo deve ter até 5 MB";
  return null;
}

export function validateTalentSubmission(fields: TalentField[], answers: Record<string, unknown>, uploadedFieldKeys: string[]): string | null {
  for (const field of fields.filter((item) => item.isRequired)) {
    const value = answers[field.fieldKey];
    const missing = field.fieldType === "file" ? !uploadedFieldKeys.includes(field.fieldKey) : value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length);
    if (missing) return `Preencha o campo obrigatório: ${field.label}`;
  }
  for (const field of fields) {
    const value = answers[field.fieldKey];
    if (value === undefined || value === null || value === "") continue;
    if (field.fieldType === "email" && !/^\S+@\S+\.\S+$/.test(String(value))) return "Informe um e-mail válido";
    if (["select", "radio"].includes(field.fieldType) && field.options.length && !field.options.some((option) => option.value === value || option.label === value)) return `Selecione uma opção válida para: ${field.label}`;
    if (field.fieldType === "checkbox" && (!Array.isArray(value) || value.some((entry) => !field.options.some((option) => option.value === entry || option.label === entry)))) return `Selecione opções válidas para: ${field.label}`;
    if (typeof value === "string" && value.length > 5000) return `A resposta para ${field.label} é longa demais`;
  }
  return null;
}
