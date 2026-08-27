# API externa de IA — expansão v1

Todos os endpoints requerem `Authorization: Bearer <token>` e respeitam as unidades vinculadas ao token.

| Rota | Escopo | Fonte atual |
|---|---|---|
| `/api/external/v1/metrics` | `metrics:read` | Meta agregada por unidade |
| `/api/external/v1/ads/metrics` | `ads:metrics:read` | Meta por anúncio quando disponível |
| `/api/external/v1/creatives` | `creatives:read` | Metadados disponíveis dos anúncios Meta |
| `/api/external/v1/leads` | `leads:read` | Preparado para integração de provedores |
| `/api/external/v1/targets` | `targets:read` | Preparado para configuração de metas |

Campos sem origem integrada retornam `null`, coleções vazias ou `sourceStatus: "pending_provider_integration"`. A API não estima receitas, metas, estágios ou métricas de mídia ausentes.
