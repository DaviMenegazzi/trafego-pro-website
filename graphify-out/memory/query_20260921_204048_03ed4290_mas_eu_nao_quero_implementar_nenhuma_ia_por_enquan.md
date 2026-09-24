---
type: "query"
date: "2026-09-21T20:40:48.782252+00:00"
question: "mas eu nao quero implementar nenhuma IA por enquanto. é pra ser totalmente determinístico"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionRoutes.ts", "evolutionSupabaseStore.ts", "evolutionOrigin.ts", "evolutionWebhook.ts", "evolutionAiAutomation.ts"]
---

# Q: mas eu nao quero implementar nenhuma IA por enquanto. é pra ser totalmente determinístico

## Answer

Consulta expandida pelo vocabulário: pixel, evolution, lead, classification, visible, origin, evidence, message, pending, automation, webhook. O Pixel deve permanecer totalmente determinístico. O Evolution apenas entrega mensagens e metadados. A aplicação exibe: classification=lead sempre; classification=nao_lead nunca; classification=pendente apenas quando originEvidence é observed ou verified e originPlatform é meta, google_ads ou mixed. A automação de IA existente altera somente o estágio do CRM e não participa da classificação lead/não-lead nem da visibilidade no Pixel. Não será adicionada análise semântica por IA.

## Outcome

- Signal: useful

## Source Nodes

- evolutionRoutes.ts
- evolutionSupabaseStore.ts
- evolutionOrigin.ts
- evolutionWebhook.ts
- evolutionAiAutomation.ts