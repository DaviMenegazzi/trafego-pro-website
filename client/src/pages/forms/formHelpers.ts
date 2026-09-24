import type { FormSubmission } from "./formTypes";

/** Converte snake_case ou camelCase para label legível em Português */
export function formatFieldLabel(key: string): string {
  const normalized = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  const titleCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  // Mapeamentos comuns para melhorar a legibilidade
  const labelDictionary: Record<string, string> = {
    nome: "Nome completo",
    name: "Nome completo",
    fullname: "Nome completo",
    telefone: "Telefone",
    phone: "Telefone",
    whatsapp: "WhatsApp",
    celular: "Celular",
    email: "E-mail",
    cidade: "Cidade",
    city: "Cidade",
    estado: "Estado",
    state: "Estado",
    interesse: "Interesse",
    plano: "Plano",
    mensagem: "Mensagem",
    message: "Mensagem",
    observacoes: "Observações",
    observacao: "Observação",
    cargo: "Cargo",
    empresa: "Empresa",
    idade: "Idade",
    cpf: "CPF",
  };

  return labelDictionary[key.toLowerCase()] || titleCase;
}

/** Tenta extrair o nome ou identificador principal do lead da submissão */
export function resolveSubmissionDisplayName(sub: FormSubmission): string {
  const fields = sub.fields || {};
  const nameKeys = [
    "nome",
    "name",
    "fullname",
    "full_name",
    "nome_completo",
    "contato",
    "lead_name",
    "primeiro_nome",
  ];

  for (const k of nameKeys) {
    for (const fieldKey of Object.keys(fields)) {
      if (fieldKey.toLowerCase() === k && typeof fields[fieldKey] === "string" && fields[fieldKey]) {
        return String(fields[fieldKey]).trim();
      }
    }
  }

  // Fallback: procura campo que contenha "nome"
  for (const fieldKey of Object.keys(fields)) {
    if (fieldKey.toLowerCase().includes("nome") && typeof fields[fieldKey] === "string" && fields[fieldKey]) {
      return String(fields[fieldKey]).trim();
    }
  }

  // Fallback: primeiro campo textual não vazio com mais de 2 letras
  for (const val of Object.values(fields)) {
    if (typeof val === "string" && val.trim().length > 2 && !val.includes("@") && !/^\+?\d{8,}$/.test(val.replace(/\D/g, ""))) {
      return val.trim();
    }
  }

  return `Submissão #${sub.id.slice(0, 8)}`;
}

/** Tenta extrair o telefone ou WhatsApp */
export function resolveSubmissionPhone(sub: FormSubmission): string | null {
  const fields = sub.fields || {};
  const phoneKeys = ["telefone", "phone", "whatsapp", "celular", "tel", "contato_tel", "fone"];

  for (const k of phoneKeys) {
    for (const fieldKey of Object.keys(fields)) {
      if (fieldKey.toLowerCase() === k && fields[fieldKey]) {
        return String(fields[fieldKey]).trim();
      }
    }
  }

  // Procura campo que contenha fone ou phone ou whatsapp
  for (const fieldKey of Object.keys(fields)) {
    const lk = fieldKey.toLowerCase();
    if ((lk.includes("tel") || lk.includes("cel") || lk.includes("whats") || lk.includes("fone")) && fields[fieldKey]) {
      return String(fields[fieldKey]).trim();
    }
  }

  return null;
}

/** Tenta extrair o e-mail */
export function resolveSubmissionEmail(sub: FormSubmission): string | null {
  const fields = sub.fields || {};
  const emailKeys = ["email", "e-mail", "mail", "contato_email"];

  for (const k of emailKeys) {
    for (const fieldKey of Object.keys(fields)) {
      if (fieldKey.toLowerCase() === k && fields[fieldKey]) {
        return String(fields[fieldKey]).trim();
      }
    }
  }

  // Busca qualquer valor que pareça e-mail
  for (const val of Object.values(fields)) {
    if (typeof val === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      return val.trim();
    }
  }

  return null;
}

/** Formata data para exibição em pt-BR */
export function formatSubmissionDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

/** Gera link direto para iniciar conversa no WhatsApp */
export function getWhatsAppLink(rawPhone: string, leadName?: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  const greeting = leadName ? `Olá ${leadName}, tudo bem? Recebemos seu contato através do nosso site!` : "Olá, tudo bem? Recebemos seu contato através do nosso site!";
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(greeting)}`;
}
