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

## Servidor MCP

`POST /api/mcp` expõe os mesmos dados como servidor MCP (transporte Streamable HTTP, sem sessão, somente leitura). Usa o mesmo token `tpai_live_...` no header `Authorization: Bearer`, com o mesmo rate limit (60 chamadas por minuto, contando cada requisição MCP) e a mesma auditoria. `GET` e `DELETE` em `/api/mcp` retornam 405.

As ferramentas listadas dependem dos escopos do token:

| Ferramenta | Escopo | Parâmetros |
|---|---|---|
| `list_units` | qualquer | nenhum |
| `get_metrics` | `metrics:read` | `unit_id`, `start` e `end` opcionais (YYYY-MM-DD, padrão últimos 30 dias) |
| `get_google_analytics` | `metrics:read` | `unit_id`, `start` e `end` opcionais — GA4 da(s) Landing Page(s) da unidade |
| `get_ads_metrics` | `ads:metrics:read` | `unit_id`, `start` e `end` opcionais |
| `get_creatives` | `creatives:read` | `unit_id` |
| `get_leads_summary` | `leads:summary:read` | `unit_id` |
| `get_fechamentos` | `leads:summary:read` | `unit_id`, `start` e `end` opcionais — semanas que tocam o período |
| `get_crm_summary` | `crm:summary:read` | `unit_id` |

`get_fechamentos` traz o que a unidade informou na aba Fechamentos (recebidos, fechados, em negociação, perdidos, motivo das perdas, notas e comentário), sem nome ou e-mail de quem enviou. As semanas seguem a regra do mês (sábado a sexta, pontas cortadas). Se a mesma semana foi enviada mais de uma vez, todos os envios vêm e só o mais recente (`isLatestForWeek`) entra em `totals`.

`get_google_analytics` traz o GA4 das Landing Pages vinculadas à unidade na tela Google Analytics: totais do período e do período anterior de mesmo tamanho (sessões, usuários, engajamento, tempo médio, conversões e taxa de conversão), conversões por tipo, série diária, campanhas do Google Ads (via vínculo Ads ↔ GA4), páginas de entrada, cidades e origem/mídia. Taxas vêm como fração (0.139 = 13,9%). `sourceStatus` é `ga4`, `not_linked` (unidade sem Landing Page) ou `not_configured` (conexão com o Google inativa).

Unidade fora do token ou período inválido retornam resultado com `isError: true`, sem consultar a fonte de dados.

Para conectar no Claude Code:

```bash
claude mcp add --transport http trafego-pro https://<dominio>/api/mcp \
  --header "Authorization: Bearer tpai_live_..."
```

Conectores personalizados do claude.ai exigem OAuth e ainda não são suportados por este endpoint.
