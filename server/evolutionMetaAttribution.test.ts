import { describe, expect, it } from "vitest";
import { normalizeEvolutionWebhook } from "./evolutionWebhook.js";
import { resolveEvolutionMetaAttribution } from "./evolutionMetaAttribution.js";

describe("atribuição Meta do Evolution", () => {
  it("vincula uma referência de anúncio ao criativo, conjunto e campanha correspondentes", () => {
    const event = normalizeEvolutionWebhook({
      event: "messages.upsert", instance: "vida-card", data: {
        key: { id: "meta-attribution", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Quero saber mais" },
        referral: { ctwa_clid: "ctwa-abc", source_id: "ad-99", source_type: "ad" },
      },
    });
    if (!event) throw new Error("Evento inválido");

    expect(resolveEvolutionMetaAttribution(event, "lead-1", "event-1", [{
      client_id: "client-1", account_id: "act_1", campaign_id: "campaign-1", campaign_name: "Campanha WhatsApp",
      adset_id: "adset-1", adset_name: "Conjunto Mensagens", ad_id: "ad-99", ad_name: "Criativo principal",
      creative_id: "creative-1", creative_name: "Imagem Vida Card",
    }])).toMatchObject({
      leadId: "lead-1", matchStatus: "matched", campaignName: "Campanha WhatsApp", adsetName: "Conjunto Mensagens", creativeName: "Imagem Vida Card",
    });
  });

  it("não atribui uma conversa Meta quando a referência não encontra anúncio correspondente", () => {
    const event = normalizeEvolutionWebhook({
      event: "messages.upsert", instance: "vida-card", data: {
        key: { id: "meta-unresolved", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Mensagem" }, referral: { ctwa_clid: "ctwa-unknown", source_id: "ad-ausente", source_type: "ad" },
      },
    });
    if (!event) throw new Error("Evento inválido");

    expect(resolveEvolutionMetaAttribution(event, "lead-2", "event-2", [])).toMatchObject({ matchStatus: "unresolved", campaignId: null, adId: null });
  });
});
