---
type: "query"
date: "2026-09-21T20:26:43.811456+00:00"
question: "acessei a aba do pixel e retornou voce nao tem acesso a essa unidade sendo que eu to entrando como administrador"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionRoutes.ts", "auth.ts", "metaDirectService.ts", "metricsRoutes.ts"]
---

# Q: acessei a aba do pixel e retornou voce nao tem acesso a essa unidade sendo que eu to entrando como administrador

## Answer

Expanded from original query via vocab: [pixel, evolution, routes, auth, authorization, access, admin, role, unit, scope, scoped]. The dashboard client selector used Meta account IDs from metricsRoutes.ts while resolvePixelUnit in evolutionRoutes.ts validated only Supabase clients IDs. Fixed resolvePixelUnit to validate the same authorized Meta catalog using isUserAllowedForMetaAccount, preserving restricted-user isolation; added alias support and tests.

## Outcome

- Signal: useful

## Source Nodes

- evolutionRoutes.ts
- auth.ts
- metaDirectService.ts
- metricsRoutes.ts