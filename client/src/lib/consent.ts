// Consentimento de cookies (LGPD + Google Consent Mode v2).
// O default "denied" é aplicado em client/index.html antes do GTM carregar;
// aqui só gravamos a escolha e avisamos o Google.

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "tp_cookie_consent";
export const OPEN_CONSENT_EVENT = "tp:open-cookie-consent";

export function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Sem storage a escolha vale só para esta visita.
  }
  window.gtag?.("consent", "update", {
    analytics_storage: choice,
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
  });
  window.dataLayer?.push({ event: "cookie_consent_update", consent: choice });
}

/** Reabre o banner (link "Preferências de cookies" no rodapé). */
export function openConsentPreferences() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
