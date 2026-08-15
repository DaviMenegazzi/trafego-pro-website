import type { NormalizedEvolutionEvent } from "./evolutionWebhook.js";
import type { EvolutionMetaAttributionInput } from "./evolutionSupabaseStore.js";

export type MetaOfferRow = {
  client_id?: string;
  account_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  creative_id?: string;
  creative_name?: string;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function candidateMatches(row: MetaOfferRow, sourceId: string, sourceType: string | null): boolean {
  const source = sourceType?.toLowerCase();
  if (source === "campaign") return row.campaign_id === sourceId;
  if (source === "adset") return row.adset_id === sourceId;
  if (source === "ad") return row.ad_id === sourceId;
  if (source === "creative") return row.creative_id === sourceId;
  return [row.campaign_id, row.adset_id, row.ad_id, row.creative_id].includes(sourceId);
}

export function resolveEvolutionMetaAttribution(
  event: NormalizedEvolutionEvent,
  leadId: string,
  sourceEventId: string,
  offers: MetaOfferRow[],
): EvolutionMetaAttributionInput | null {
  if (event.origin.platform !== "meta") return null;

  const sourceId = event.origin.metaSourceId;
  const match = sourceId ? offers.find((row) => candidateMatches(row, sourceId, event.origin.metaSourceType)) : undefined;

  return {
    leadId,
    sourceEventId,
    clientId: text(match?.client_id),
    accountId: text(match?.account_id),
    campaignId: text(match?.campaign_id),
    campaignName: text(match?.campaign_name),
    adsetId: text(match?.adset_id),
    adsetName: text(match?.adset_name),
    adId: text(match?.ad_id),
    adName: text(match?.ad_name),
    creativeId: text(match?.creative_id),
    creativeName: text(match?.creative_name),
    matchedBy: match ? `meta_source_id:${event.origin.metaSourceType ?? "id"}` : "meta_source_id_sem_correspondencia",
    matchStatus: match ? "matched" : "unresolved",
  };
}
