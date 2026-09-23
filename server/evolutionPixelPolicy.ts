import type { EvolutionLead } from "./evolutionSupabaseStore.js";
import type { EvolutionOrigin } from "./evolutionOrigin.js";

export function hasDeterministicLeadOrigin(origin: Pick<EvolutionOrigin, "platform" | "evidence">): boolean {
  return origin.evidence !== "none" && ["meta", "google_ads", "mixed"].includes(origin.platform);
}

export function isVisiblePixelLead(lead: Pick<EvolutionLead, "classification" | "isQuarantine">): boolean {
  if (lead.classification === "nao_lead") return false;
  return !lead.isQuarantine;
}
