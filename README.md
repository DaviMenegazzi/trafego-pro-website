# Tráfego Pro

Plataforma interna da **Tráfego Pro** para acompanhar mídia, unidades, feedbacks de leads e conversas de WhatsApp. O projeto reúne o site público, a dashboard protegida e o **Evolution Monitor**, um módulo administrativo isolado para mensagens e atribuição.

> A dashboard e o Evolution Monitor compartilham autenticação administrativa, mas não compartilham a persistência operacional. Métricas e unidades permanecem no Supabase principal; eventos, contatos e conversas do WhatsApp ficam em um Supabase exclusivo do Evolution.

## Arquitetura

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Interface | React 19, Vite 7, Tailwind 4 e Wouter | Site, dashboard, feedbacks e Evolution Monitor |
| API | Express 4 e TypeScript | Sessão, autorização, métricas, feedbacks e webhooks |
| Dados principais | Supabase principal | Unidades, acessos e métricas Meta Ads |
| Feedbacks | MySQL por `DATABASE_URL` | Feedback semanal e exportação XLSX |
| Evolution | Supabase exclusivo | Instâncias, eventos, contatos, mensagens e atribuição |

```text
Navegador
├── /                         site institucional
├── /login                    autenticação
├── /dashboard/*              dashboard protegida
├── /feedback-leads           feedback semanal autenticado
└── /evolution                Evolution Monitor (somente admins)
             │ HTTPS /api/*
Express ─────┼── Supabase principal: unidades, permissões e Meta Ads
             ├── MySQL: feedbacks semanais
             └── Supabase Evolution: mensagens, leads e auditoria
```

## Rotas

| Rota | Finalidade | Acesso |
|---|---|---|
| `/` | Site institucional | Público |
| `/login` | Login com Supabase Auth | Público |
| `/dashboard` | KPIs, campanhas, períodos e unidades | Sessão autorizada |
| `/dashboard/anuncios` | Anúncios, ofertas e criativos | Sessão autorizada |
| `/dashboard/feedback-leads` | Formulário semanal por unidade | Sessão autorizada |
| `/dashboard/feedback-leads/list` | Consulta e XLSX de feedbacks | Admin |
| `/dashboard/usuarios` | Usuários e acessos | Admin |
| `/evolution` | Instâncias, conversas, origem e atribuição | Admin |

## Autenticação e unidades

O login usa **Supabase Auth**. A aplicação mantém um JWT local (`tp_token`) para a API e um cookie HTTP-only (`tp_supabase_access`) para consultas que respeitam RLS no Supabase principal. O navegador nunca recebe chaves de serviço.

As unidades autorizadas são resolvidas exclusivamente por `user_client_access`; não existe fallback para armazenamento local. Rotas administrativas verificam a função `admin` no servidor. Quando a sessão Supabase expira, a aplicação limpa a sessão local e encaminha ao login, em vez de tentar interpretar uma resposta HTML como JSON.

## Dashboard e métricas Meta Ads

| Fonte | Uso |
|---|---|
| `clients` e `user_client_access` | Unidades autorizadas e seletor de contexto |
| `vw_meta_ads_daily_summary` | KPIs e séries diárias |
| `fn_campaign_period_summary` | Desempenho consolidado por campanha |
| `vw_meta_ads_offer_ads` | Anúncios, ofertas, criativos e indicadores por peça |

O filtro de período tem atalhos e intervalo personalizado. A troca de unidade cancela requisições obsoletas, evitando que respostas antigas sobrescrevam o contexto mais recente.

## Feedbacks semanais

Os feedbacks de leads são gravados na tabela SQL `lead_feedbacks`. O formulário registra semana, volume de leads, atendimento, conversão, motivos de perda, qualidade e satisfação. Usuários só podem enviar registros para as unidades atribuídas; a listagem e a exportação XLSX são administrativas.

## Evolution Monitor

O Evolution Monitor é isolado em `/evolution` e não altera os fluxos, métricas ou dados da dashboard.

### Supabase exclusivo

| Entidade | Dados armazenados |
|---|---|
| Instâncias | Identificador do WhatsApp, nome operacional, unidade e conexão |
| Eventos | Recebimento idempotente, horário e sinais seguros de origem |
| Contatos e leads | Número minimizado na interface, classificação e etapa comercial |
| Mensagens | Histórico completo, direção e horário por contato |
| Atribuições | `ctwa_clid`, referências Meta, UTMs, `gclid` e vínculo auditável |

RLS deve permanecer ativo no projeto Supabase exclusivo. O browser não consulta esse projeto diretamente: leitura e gravação acontecem no backend com uma chave de serviço mantida somente no ambiente.

### Webhook

```text
POST /api/evolution/webhook
Authorization: Bearer <EVOLUTION_WEBHOOK_SECRET>
Content-Type: application/json
```

| Evento | Finalidade |
|---|---|
| `MESSAGES_UPSERT` | Registra mensagens enviadas e recebidas, contato e conversa |
| `CONTACTS_UPSERT` | Atualiza o nome real do contato quando ausente na mensagem |
| `CONNECTION_UPDATE` | Atualiza o estado da instância |

O Evolution Manager atual não oferece campo visual para cabeçalhos HTTP. Quando necessário, configure `Authorization: Bearer ...` uma vez com Postman ou Insomnia na API da Evolution. O segredo deve corresponder a `EVOLUTION_WEBHOOK_SECRET`.

### Conversas, contatos e múltiplas instâncias

O histórico diferencia **Recebida do contato** de **Enviada pela unidade**. Para mensagens de saída, o identificador remoto é o contato; o perfil da instância nunca é usado como nome do lead. Eventos `CONTACTS_UPSERT` atualizam nomes reais. Históricos legados sem atualização permanecem como **Contato sem nome**, evitando informação incorreta.

Cada instância pode receber um nome operacional e uma unidade no painel. Filtros de **unidade** e **instância** são aplicados a Operação, Conversas, Atribuição Meta, Origem & tags e Auditoria. Assim, várias unidades e números podem ser analisados de forma consolidada ou individual.

### Atribuição de Meta e Google Ads

O módulo preserva `ctwa_clid`, referências Meta, UTMs e `gclid` quando chegam no payload. A classificação é conservadora:

| Situação | Resultado |
|---|---|
| Referência verificável corresponde aos dados Meta | Exibe campanha, conjunto, anúncio e criativo |
| Há sinal sem correspondência disponível | Exibe como evidência observada, sem inferência |
| Não há sinal | Mantém o lead sem atribuição verificável |

Uma mensagem na Evolution comprova a chegada da conversa, mas não comprova por si só a origem em Meta ou Google. A atribuição só é confirmada quando existe metadado rastreável.

## Variáveis de ambiente

Nunca registre valores reais no repositório.

```env
# Sessão e Supabase principal
JWT_SECRET=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Feedbacks SQL
DATABASE_URL=

# Supabase exclusivo do Evolution
EVOLUTION_SUPABASE_URL=
EVOLUTION_SUPABASE_SERVICE_ROLE_KEY=
EVOLUTION_WEBHOOK_SECRET=
```

## Desenvolvimento

```bash
pnpm install
pnpm dev       # Express + Vite
pnpm check     # TypeScript
pnpm test      # Vitest
pnpm build     # Build do cliente e servidor
```

Antes de publicar, execute:

```bash
pnpm check && pnpm test && pnpm build
```

## Estrutura relevante

```text
client/src/
├── App.tsx                         # Rotas públicas, dashboard e /evolution
├── contexts/ClientContext.tsx      # Unidades autorizadas da dashboard
├── pages/EvolutionAdmin.tsx        # Monitor, conversas, origem e multi-instância
└── lib/evolutionScope.ts           # Filtros por unidade e instância

server/
├── index.ts                        # Rotas Express, sessão e APIs
├── supabase.ts                     # Supabase principal e sessão do usuário
├── feedbackSql.ts                  # Feedbacks SQL
├── evolutionWebhook.ts             # Normalização de eventos Evolution
├── evolutionOrigin.ts              # Sinais de origem
├── evolutionMetaAttribution.ts     # Associação Meta auditável
└── evolutionSupabaseStore.ts       # Persistência exclusiva Evolution
```

## Testes e operação

A suíte cobre autenticação, RLS de unidades, respostas 401, feedbacks, webhook Bearer, deduplicação, mensagens enviadas e recebidas, atualizações de contatos, atribuição auditável e filtros multi-instância.

Ao adicionar um WhatsApp, conecte a instância na Evolution, encaminhe os eventos ao mesmo webhook Bearer e, em `/evolution`, atribua um nome operacional e uma unidade. Os dados passam a aparecer automaticamente nos filtros e consolidados do painel.
