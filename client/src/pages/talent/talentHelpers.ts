import type { TalentForm, TalentSubmission } from "./types";

export function resolveCandidateDisplayName(
  candidate: TalentSubmission,
  form?: TalentForm | null
): string {
  // 1. Direct name if present
  if (candidate.candidateName && candidate.candidateName.trim()) {
    return candidate.candidateName.trim();
  }

  // 2. Search answers by field label or field key containing "nome" or "name"
  if (candidate.answers && typeof candidate.answers === "object") {
    const entries = Object.entries(candidate.answers);

    // Look for exact key match first
    for (const [key, val] of entries) {
      if (typeof val === "string" && val.trim()) {
        const k = key.toLowerCase();
        if (
          k === "nome" ||
          k === "nome_completo" ||
          k === "name" ||
          k === "full_name" ||
          k === "candidato" ||
          k.includes("nome")
        ) {
          return val.trim();
        }
      }
    }

    // Look for matching form field label
    if (form && form.fields) {
      for (const field of form.fields) {
        const label = field.label.toLowerCase();
        if (label.includes("nome") || label.includes("name") || label.includes("candidato")) {
          const val = candidate.answers[field.fieldKey];
          if (typeof val === "string" && val.trim()) {
            return val.trim();
          }
        }
      }
    }
  }

  // 3. Email username fallback
  if (candidate.candidateEmail && candidate.candidateEmail.includes("@")) {
    const userPart = candidate.candidateEmail.split("@")[0];
    const cleaned = userPart
      .replace(/[._-]/g, " ")
      .replace(/\d+/g, "")
      .trim();
    if (cleaned.length > 2) {
      return cleaned
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  // 4. Clean anonymous ID fallback
  const shortId = candidate.id ? candidate.id.slice(0, 6).toUpperCase() : "NOVO";
  return `Candidato #${shortId}`;
}

export function resolveCandidateDisplayEmail(candidate: TalentSubmission): string | null {
  if (candidate.candidateEmail && candidate.candidateEmail.trim()) {
    return candidate.candidateEmail.trim();
  }
  if (candidate.answers) {
    for (const [key, val] of Object.entries(candidate.answers)) {
      if (typeof val === "string" && val.includes("@")) {
        return val.trim();
      }
    }
  }
  return null;
}

export function resolveCandidateDisplayPhone(candidate: TalentSubmission): string | null {
  if (candidate.candidatePhone && candidate.candidatePhone.trim()) {
    return candidate.candidatePhone.trim();
  }
  if (candidate.answers) {
    for (const [key, val] of Object.entries(candidate.answers)) {
      const k = key.toLowerCase();
      if (
        (k.includes("telefone") || k.includes("celular") || k.includes("whatsapp") || k.includes("phone")) &&
        typeof val === "string" &&
        val.trim()
      ) {
        return val.trim();
      }
    }
  }
  return null;
}
