import { describe, expect, it } from "vitest";
import { extractEvolutionOrigin } from "./evolutionOrigin.js";

describe("Evolution origin extraction", () => {
  it("preserva ctwa_clid e referência Meta como evidência verificada", () => {
    const origin = extractEvolutionOrigin({
      referral: {
        ctwa_clid: "CTWA-verified-123",
        source_id: "120000000000001",
        source_type: "ad",
        source_url: "https://l.facebook.com/l.php?utm_source=facebook&utm_campaign=lead-gen",
      },
    });

    expect(origin).toMatchObject({
      platform: "meta", evidence: "verified", metaCtwaClid: "CTWA-verified-123",
      metaSourceId: "120000000000001", metaSourceType: "ad",
    });
    expect(origin.payload).toMatchObject({ ctwa_clid: "CTWA-verified-123", utm_source: "facebook" });
    expect(origin.payload?.source_url).toBe("https://l.facebook.com/l.php");
  });

  it("identifica gclid e UTM como sinal observado do Google Ads", () => {
    const origin = extractEvolutionOrigin({
      contextInfo: {
        sourceUrl: "https://trafego.pro/contato?gclid=google-click-123&utm_source=google&utm_campaign=teste",
      },
    });

    expect(origin).toMatchObject({ platform: "google_ads", evidence: "observed", googleClickId: "google-click-123" });
    expect(origin.payload).toMatchObject({ gclid: "google-click-123", utm_source: "google", utm_campaign: "teste" });
    expect(origin.payload?.source_url).toBe("https://trafego.pro/contato");
  });

  it("não atribui plataforma quando o evento não contém tag verificável", () => {
    expect(extractEvolutionOrigin({ message: { conversation: "Olá, gostaria de informações" } })).toEqual({
      platform: "unknown", evidence: "none", metaCtwaClid: null, metaSourceId: null,
      metaSourceType: null, googleClickId: null, payload: null,
    });
  });

  it("reconhece a tag [REF:xyz] colada na landing page como evidência de Google Ads", () => {
    const origin = extractEvolutionOrigin({ ref_tag: "campanha-outubro" });
    expect(origin).toMatchObject({ platform: "google_ads", evidence: "observed" });
    expect(origin.payload).toMatchObject({ ref_tag: "campanha-outubro" });
  });

  it("reconhece UTM genérico (sem indicar plataforma) como evidência, sem forçar uma plataforma", () => {
    const origin = extractEvolutionOrigin({ source_url: "https://wa.me/5511999999999?text=Ola&utm_campaign=liquidacao" });
    expect(origin).toMatchObject({ platform: "unknown", evidence: "observed" });
    expect(origin.payload).toMatchObject({ utm_campaign: "liquidacao" });
  });

  it("não deixa um utm_source=facebook em URL derrubar a atribuição verificada por ctwa_clid", () => {
    const origin = extractEvolutionOrigin({
      referral: { ctwa_clid: "ctwa-1", source_url: "https://trafego.pro/contato?utm_source=facebook" },
    });
    expect(origin).toMatchObject({ platform: "meta", evidence: "verified" });
  });
});
