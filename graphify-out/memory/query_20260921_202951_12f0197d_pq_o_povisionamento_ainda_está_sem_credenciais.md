---
type: "query"
date: "2026-09-21T20:29:51.637997+00:00"
question: "pq o povisionamento ainda está sem credenciais?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["evolutionApiClient.ts", "evolutionRoutes.ts", "README.md"]
---

# Q: pq o povisionamento ainda está sem credenciais?

## Answer

Expanded from original query via vocab: [pixel, evolution, configured, credentials, api, webhook, public, url, key, secret]. EVOLUTION_API_URL, EVOLUTION_API_KEY, and EVOLUTION_WEBHOOK_SECRET are present. Provisioning remains false because both EVOLUTION_WEBHOOK_PUBLIC_URL and PUBLIC_APP_URL are missing. The VPS cannot call the private LAN URL, so a publicly reachable HTTPS webhook or tunnel is required for end-to-end message ingestion.

## Outcome

- Signal: useful

## Source Nodes

- evolutionApiClient.ts
- evolutionRoutes.ts
- README.md