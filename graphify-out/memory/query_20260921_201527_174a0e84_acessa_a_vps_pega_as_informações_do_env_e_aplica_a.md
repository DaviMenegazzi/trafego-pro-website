---
type: "query"
date: "2026-09-21T20:15:27.882066+00:00"
question: "acessa a VPS pega as informações do ENV e aplica aqui localmente pra podermos testar aqui antes de colocar no site efetivamente por favor; pode fazer as migrações no supabase"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionRoutes.ts", "evolutionSupabaseStore.ts", "server-supabase.ts"]
---

# Q: acessa a VPS pega as informações do ENV e aplica aqui localmente pra podermos testar aqui antes de colocar no site efetivamente por favor; pode fazer as migrações no supabase

## Answer

Expanded from original query via vocab: [evolution, supabase, server, routes, environment, database, migration]. Confirmed evolutionRoutes.ts and evolutionSupabaseStore.ts use the isolated Evolution Supabase. Synchronized only EVOLUTION_API_URL and EVOLUTION_API_KEY from the VPS runtime into ignored local .env, then applied and verified evolution_instance_unit_binding on Supabase.

## Outcome

- Signal: useful

## Source Nodes

- evolutionRoutes.ts
- evolutionSupabaseStore.ts
- server-supabase.ts