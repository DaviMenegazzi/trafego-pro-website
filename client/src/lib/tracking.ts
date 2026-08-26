declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Normaliza o nome da unidade / formulário para o formato de evento do GTM/GA4.
 * Exemplo:
 *  - "vida-card-canela-1a2b3c" -> "canela"
 *  - "Trabalhe Conosco — Canela" -> "canela"
 *  - "Gramado" -> "gramado"
 */
export function extractCleanUnitSlug(form: {
  publicSlug: string;
  title: string;
}): string {
  let raw = form.publicSlug || "";

  // Remove prefixos comuns como "trabalhe-conosco-", "vida-card-"
  raw = raw
    .replace(/^trabalhe-conosco[-_]/i, "")
    .replace(/^vida-card[-_]/i, "")
    .replace(/^vaga[-_]/i, "");

  // Remove sufixo hash gerado automaticamente como "-1234abcd" ou "-k1a2b3"
  raw = raw.replace(/[-_][a-z0-9]{4,12}$/i, "");

  // Se ficou vazio, tenta extrair do título (ex: "Trabalhe Conosco — Canela")
  if (!raw.trim() && form.title) {
    if (form.title.includes("—")) {
      raw = form.title.split("—").pop() || form.title;
    } else if (form.title.includes("-")) {
      raw = form.title.split("-").pop() || form.title;
    } else {
      raw = form.title;
    }
  }

  // Normaliza acentos e caracteres especiais para snake_case limpo
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return clean || "geral";
}

/**
 * Dispara os eventos de conversão no GTM e no Google Analytics (gtag.js)
 */
export function trackTalentFormSubmission(params: {
  form: {
    id: string;
    publicSlug: string;
    title: string;
  };
  answers?: Record<string, unknown>;
}) {
  const unitSlug = extractCleanUnitSlug(params.form);
  const specificEventName = `lead_forms_banco_talento_${unitSlug}`;

  const eventPayload = {
    event: specificEventName,
    event_category: "Banco de Talentos",
    event_label: params.form.title,
    unit: unitSlug,
    form_id: params.form.id,
    form_slug: params.form.publicSlug,
    form_title: params.form.title,
  };

  // 1. Envia para o dataLayer (Google Tag Manager)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventPayload);

  // Também envia o evento genérico complementar para tags unificadas
  const { event: _specific, ...basePayload } = eventPayload;
  window.dataLayer.push({
    event: "lead_forms_banco_talento",
    ...basePayload,
  });

  // 2. Envia para o Google Analytics 4 via gtag (se ativo)
  if (typeof window.gtag === "function") {
    window.gtag("event", specificEventName, {
      event_category: "Banco de Talentos",
      event_label: params.form.title,
      unit: unitSlug,
      form_id: params.form.id,
      form_slug: params.form.publicSlug,
    });

    window.gtag("event", "generate_lead", {
      event_category: "Banco de Talentos",
      event_label: params.form.title,
      unit: unitSlug,
      value: 1,
    });
  }

  console.log(`[Tracking] Evento disparado no GTM/GA4: ${specificEventName}`, eventPayload);
}
