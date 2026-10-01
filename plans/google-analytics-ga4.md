# Google Analytics (GA4) e Google Ads no painel

Objetivo: ver no painel o desempenho das LPs (GA4) e das campanhas do Google Ads, ao lado do que já existe para a Meta.

## Decisões

- **Fonte única: GA4 Data API.** Com a conta do Google Ads vinculada à propriedade do GA4, a mesma API traz custo, cliques e impressões por campanha (`advertiserAdCost`, `advertiserAdClicks`, `advertiserAdImpressions` por `sessionGoogleAdsCampaignName`). Assim não dependemos do developer token nem da aprovação de Basic Access da Google Ads API.
- **Autenticação por conta de serviço**, sem SDK novo: o servidor assina o JWT com `jsonwebtoken` (já instalado), troca por um access token em `oauth2.googleapis.com` e chama `analyticsdata.googleapis.com` com `fetch`. Não entra dependência gRPC no bundle.
- **Métricas sem cópia no Supabase na fase 1.** O GA4 guarda os dados agregados e a API consulta qualquer período. Um cache em memória de 10 min evita repetir consultas (a cota do GA4 é por propriedade/dia e sobra para o nosso volume).
- **Vínculos cadastrados pelo administrador na tela.** Na tela Google Analytics, o administrador vincula à unidade selecionada o ID da propriedade do GA4 da Landing Page (e, opcionalmente, os domínios, quando a propriedade mede mais de um site). Os vínculos ficam na tabela `ga4_landing_pages` do Supabase do site (`db/ga4_landing_pages.sql`). Ao salvar, o servidor confere se a conta de serviço enxerga a propriedade.
- **Tela pública** ("Google Analytics", logo abaixo do Dashboard no menu) para todo usuário logado.
- **GA4 vinculado à conta da Meta.** A tela usa a unidade selecionada no menu (id da conta da Meta) e mostra só as Landing Pages vinculadas a ela. O servidor confere o acesso à unidade e o vínculo em toda consulta. Unidade sem Landing Page vinculada vê uma mensagem institucional com o link do WhatsApp do suporte da Tráfego Pro; o administrador vê o botão para vincular.

## Fase 1: GA4 (esta entrega)

1. `server/ga4Service.ts`: credencial, token com cache, `batchRunReports` com 4 relatórios (diário com total, páginas de destino, origem/mídia, campanhas do Google Ads), normalização e cache.
2. `server/routes/googleRoutes.ts`:
   - `GET /api/google/properties`: propriedades que o usuário pode ver.
   - `GET /api/google/report?propertyId&start&end`: relatório do período.
3. `client/src/pages/DashboardGoogle.tsx` em `/dashboard/google`, no design system: seletor de LP e período, KPIs (sessões, usuários, eventos-chave, taxa de conversão, investimento Google Ads), gráfico diário e tabelas de campanhas, páginas de destino e origem/mídia.
4. Testes do serviço (parse da configuração, normalização e acesso por unidade).

### O que precisa ser feito fora do código

1. No Google Cloud: criar um projeto, **ativar a "Google Analytics Data API"**, criar uma conta de serviço e gerar a chave JSON.
2. Em cada propriedade do GA4: Administrador → Gerenciamento de acesso à propriedade → adicionar o e-mail da conta de serviço como **Leitor**.
3. Em cada propriedade do GA4: Administrador → Vinculações de produtos → **Google Ads** → vincular a conta de anúncios da unidade (sem isso, a tabela de campanhas fica sem custo).
4. Conferir se as LPs têm a tag do GA4 e se os eventos de conversão (clique no WhatsApp, envio de formulário) estão marcados como **eventos-chave**.
5. No `.env` da VPS: `GA4_SERVICE_ACCOUNT_JSON`.
6. Criar a tabela `ga4_landing_pages` no Supabase do site (`db/ga4_landing_pages.sql`).
7. Na tela Google Analytics, com a unidade selecionada, vincular a Landing Page (botão "Vincular Landing Page").

## Fase 2: consolidação

- Na tela da unidade, colocar lado a lado Meta e Google: investimento total, leads por canal e custo por lead combinado.
- Backup diário no Supabase, só se for preciso cruzar com o CRM/Pixel por SQL.

## Fase 3 (opcional): Google Ads API direta

Só se o GA4 não bastar: palavras-chave, termos de pesquisa, índice de qualidade e dados por anúncio. Pede conta MCC, developer token com Basic Access (revisão do Google) e OAuth com refresh token.

## Landing Pages das unidades (levantamento de 30/09/2026)

O painel usa o **ID da propriedade**. Em 30/09 a conta de serviço leu as 11 propriedades; as que estão com zero sessões nos últimos 30 dias ainda não têm a tag instalada na LP.

| Unidade | ID da propriedade | ID de medição | ID do fluxo | Domínio | Situação |
|---|---|---|---|---|---|
| Júlio de Castilhos | 551916398 | G-EP1LJMSECH | 15514914760 | vidacardjc.com.br | |
| Passo Fundo | 551682423 | G-8ZH3Z1YLEE | 15501722260 | vidacardpf.com.br | |
| Canela | 551661471 | G-45S7WL4PEC | 15502049956 | vidacardcanela.com.br | |
| Uruguaiana | 551938325 | G-N9S7KS4JXK | 15514882274 | vidacarduruguaiana.com.br | |
| Caxias do Sul | 551937293 | G-R65DLD1PG4 | 15514943200 | vidacardcaxias.com.br | |
| Ijuí | 556859531 | G-VCWFGM83B4 | 15890470122 | www.vidacardijui.com.br | LP fora do ar; tag a instalar |
| Alegrete | 556844772 | G-NY1X59E74H | 15890482796 | vidacard-cccotaft.manus.space | tag a instalar |
| Bento Gonçalves | 556795081 | G-BLZBFHGQY2 | 15890512260 | vidacardbg.com.br | tag a instalar |
| Lajeado | 556834458 | G-1LTNWSXJC4 | 15890507449 | vidacard-5sne4ytj.manus.space | tag a instalar |
| Santo Ângelo | 556756807 | G-NC2RYBWXHQ | 15890522338 | vidacardsantoangelo.com.br | LP fora do ar; tag a instalar |
| Tupanciretã | 556854609 | G-PF7TSBY0RN | 15890488551 | www.vidacardtupan.com.br | tag a instalar |

Sem LP levantada: Santa Maria, Centro, Itaqui e BH Barreiro.
