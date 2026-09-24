---
type: "query"
date: "2026-09-21T20:36:53.995622+00:00"
question: "quais são os critérios pra ele ser um lead identificado nesse pixel pelo evolution?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionPixelPolicy.ts", "evolutionOrigin.ts", "evolutionWebhook.ts", "evolutionSupabaseStore.ts", "evolutionRoutes.ts"]
---

# Q: quais são os critérios pra ele ser um lead identificado nesse pixel pelo evolution?

## Answer

Vocabulário expandido: pixel, evolution, lead, leads, classification, visible, origin, evidence, campaign, meta, message, pending.
O Evolution não decide semanticamente se a conversa é lead. A aplicação salva contatos de mensagens diretas e aplica esta regra de visibilidade: classification=nao_lead oculta; classification=lead exibe; classification=pendente só exibe quando originEvidence não é none e originPlatform é meta, google_ads ou mixed. A origem é inferida por sinais como ctwa_clid/ctwaClid, source_id/sourceId, source_type=ad, fbclid, gclid, gbraid ou wbraid. ctwa_clid gera evidência verified; os demais sinais geram observed; sem sinal, evidence=none e platform=unknown. Grupos, status e newsletters são excluídos. A automação de IA atual classifica estágio de CRM, não lead versus não-lead.

## Outcome

- Signal: useful

## Source Nodes

- evolutionPixelPolicy.ts
- evolutionOrigin.ts
- evolutionWebhook.ts
- evolutionSupabaseStore.ts
- evolutionRoutes.ts