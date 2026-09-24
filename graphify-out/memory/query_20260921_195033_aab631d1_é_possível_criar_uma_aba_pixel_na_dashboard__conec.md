---
type: "query"
date: "2026-09-21T19:50:33.059400+00:00"
question: "É possível criar uma aba Pixel na dashboard, conectar instâncias da Evolution API por unidade via QR Code e mostrar somente mensagens de leads?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["App.tsx", "AppLayout.tsx", "evolutionRoutes.ts", "evolutionSupabaseStore.ts", "EvolutionAdmin.tsx"]
---

# Q: É possível criar uma aba Pixel na dashboard, conectar instâncias da Evolution API por unidade via QR Code e mostrar somente mensagens de leads?

## Answer

Expanded from original query via graph vocab: [dashboard, evolution, client, unit, instance, messages, webhook, route, scope, auth, meta, leads]. Sim. O projeto já possuía webhook, persistência Evolution, escopo por unidade e painel administrativo. O MVP foi encaixado em App.tsx e AppLayout.tsx, com DashboardPixel.tsx para a experiência por unidade, evolutionRoutes.ts para autorização e isolamento no servidor, evolutionApiClient.ts para criar a instância/QR sem expor a API key e evolutionPixelPolicy.ts para o filtro conservador de leads.

## Outcome

- Signal: useful

## Source Nodes

- App.tsx
- AppLayout.tsx
- evolutionRoutes.ts
- evolutionSupabaseStore.ts
- EvolutionAdmin.tsx