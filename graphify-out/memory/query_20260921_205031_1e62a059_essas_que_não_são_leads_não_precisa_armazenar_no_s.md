---
type: "query"
date: "2026-09-21T20:50:31.178522+00:00"
question: "essas que não são leads não precisa armazenar no supabase"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionRoutes.ts", "evolutionSupabaseStore.ts", "evolutionPixelPolicy.ts", "evolutionWebhook.ts", "evolutionOrigin.ts"]
---

# Q: essas que não são leads não precisa armazenar no supabase

## Answer

Consulta expandida pelo vocabulário: lead, leads, evolution, webhook, supabase, persist, store, origin, evidence, message, classification, filter. A ingestão agora descarta antes da RPC mensagens novas sem evidência determinística de Meta/Google, mensagens de grupo e eventos de contatos que não correspondem a leads armazenados. O primeiro evento com evidência cria o lead; mensagens posteriores continuam sendo persistidas. Contatos classificados como nao_lead deixam de receber novas gravações. Eventos técnicos de conexão sem contato continuam sendo armazenados. Registros históricos não foram apagados.

## Outcome

- Signal: useful

## Source Nodes

- evolutionRoutes.ts
- evolutionSupabaseStore.ts
- evolutionPixelPolicy.ts
- evolutionWebhook.ts
- evolutionOrigin.ts