# Tráfego Pro — Documentação Técnica

Plataforma interna da **Tráfego Pro** (assessoria de tráfego pago) composta por um site institucional público e um dashboard de gestão privado. O cliente principal da operação é a rede **Vida Card**.

---

## Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (React 19 + Tailwind 4 + Recharts)                    │
│                                                                 │
│  /                    Site institucional Tráfego Pro (público)   │
│  /login               Tela de autenticação                      │
│  /dashboard/*         Dashboard interno (protegido por JWT)     │
│                                                                 │
│  Toda chamada a /api/* passa pelo proxy do Vite em dev          │
│  (porta 3000 → 4000) e em produção é servida pelo Express.      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (fetch)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  EXPRESS (server/index.ts — porta 4000 em dev, 3000 em prod)    │
│                                                                 │
│  /api/auth/login       Autenticação (Supabase Auth + fallback)  │
│  /api/clients          CRUD de clientes (banco local LowDB)     │
│  /api/campaigns        CRUD de campanhas (banco local LowDB)    │
│  /api/users            Gerenciamento de usuários                │
│  /api/feedback-leads   Formulário de feedback por unidade        │
│  /api/metrics/*        Proxy para o Supabase (métricas Meta Ads)│
│                                                                 │
│  Middleware requireAuth valida o JWT em toda rota /api/*         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ supabase-js (server-side)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL + Auth + RLS)                             │
│                                                                 │
│  Tabelas:  clients, meta_ads_insights, meta_ads_offers,         │
│            demands, pipeline_boards, client_updates,            │
│            user_profiles, user_client_access, ad_accounts       │
│                                                                 │
│  Views:    vw_meta_ads_daily_summary, vw_meta_ads_offer_ads     │
│  RPCs:     fn_campaign_period_summary, fn_offers_by_period      │
│                                                                 │
│  RLS segmenta por client_group (personal / marketing_pro)       │
│  e por role (admin, viewer, designer, cs, traffic_manager...)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  LowDB (data/db.json — banco local JSON)                        │
│                                                                 │
│  Usado para: clientes (CRUD local), campanhas, usuários,        │
│  feedback de leads. Funciona como fallback quando o Supabase    │
│  não está configurado e como armazenamento de dados que não     │
│  existem no Supabase (feedback, pagamentos, tarefas).           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de arquivos

```
trafego-pro-website/
├── client/                          # Frontend React
│   ├── index.html                   # Entry HTML (fontes: Plus Jakarta Sans, Space Grotesk, Inter, Poppins)
│   ├── public/                      # Arquivos estáticos (favicon, robots.txt)
│   └── src/
│       ├── App.tsx                  # Router principal (wouter) — todas as rotas
│       ├── main.tsx                 # Entry point React
│       ├── index.css                # Tokens de design (CSS vars), temas, animações
│       ├── const.ts                 # Constantes do cliente
│       ├── contexts/
│       │   ├── ClientContext.tsx     # Provider global de clientes (merge Supabase + local)
│       │   └── ThemeContext.tsx      # Provider de tema (dark por padrão)
│       ├── hooks/
│       │   ├── useAdminAuth.ts      # Hook de verificação de admin
│       │   ├── useComposition.ts    # Composição de handlers
│       │   ├── useMobile.tsx        # Detecção de viewport mobile
│       │   └── usePersistFn.ts      # Persistência de referência de função
│       ├── lib/
│       │   └── utils.ts             # cn() e utilitários Tailwind
│       ├── components/
│       │   ├── AppLayout.tsx        # Layout do dashboard (sidebar + conteúdo)
│       │   ├── ErrorBoundary.tsx    # Captura de erros React
│       │   ├── Map.tsx              # Integração Google Maps
│       │   ├── trafego/             # Componentes do site institucional
│       │   │   ├── Nav.tsx          # Header com links de âncora + CTA WhatsApp
│       │   │   ├── Hero.tsx         # Seção hero principal
│       │   │   ├── Logos.tsx        # Marquee de logos de clientes
│       │   │   ├── About.tsx        # Seção "Quem somos" com stats
│       │   │   ├── Services.tsx     # Grid de serviços (6 cards)
│       │   │   ├── Method.tsx       # Metodologia em 4 passos
│       │   │   ├── CTA.tsx          # Call-to-action final
│       │   │   ├── Footer.tsx       # Rodapé
│       │   │   └── Reveal.tsx       # Animação de entrada (IntersectionObserver)
│       │   ├── ui/                  # Componentes shadcn/ui (60+ componentes)
│       │   └── *.tsx                # Componentes legados de landing pages Vida Card
│       └── pages/
│           ├── TrafegoProHome.tsx    # Site institucional (rota /)
│           ├── Login.tsx            # Tela de login (suporta nome ou email)
│           ├── NotFound.tsx         # Página 404
│           ├── Dashboard.tsx        # Visão geral de métricas Meta Ads
│           ├── DashboardAnuncios.tsx # Performance por anúncio/criativo
│           ├── DashboardPipeline.tsx # Kanban de tarefas (localStorage)
│           ├── DashboardClientes.tsx # CRUD de clientes
│           ├── DashboardPagamentos.tsx # Controle de pagamentos (localStorage)
│           ├── DashboardMeuTrabalho.tsx # Lista de tarefas pessoal (localStorage)
│           ├── DashboardAtualizacoes.tsx # Blog interno de atualizações (localStorage)
│           ├── DashboardFeedbackLeads.tsx # Formulário de feedback por unidade
│           └── DashboardConfiguracoes.tsx # Perfil, senha, notificações
│
├── server/                          # Backend Express
│   ├── env.ts                       # Carrega .env via process.loadEnvFile()
│   ├── index.ts                     # Servidor Express (rotas, auth, proxy Supabase)
│   ├── db.ts                        # Banco local LowDB (JSON) + seed + migrations
│   ├── supabase.ts                  # Client Supabase server-side (getSupabase, getAuthedSupabase)
│   ├── server-supabase.ts           # Versão alternativa do client Supabase (mesma lógica)
│   ├── auth.test.ts                 # Testes de autenticação
│   ├── clients.test.ts              # Testes de CRUD de clientes
│   └── supabase.test.ts            # Testes de integração Supabase
│
├── shared/
│   └── const.ts                     # Constantes compartilhadas (COOKIE_NAME, ONE_YEAR_MS)
│
├── data/
│   └── db.example.json              # Seed de exemplo (sem dados sensíveis)
│
├── patches/
│   └── wouter@3.7.1.patch           # Patch do router wouter
│
├── .env.example → env.example       # Template de variáveis de ambiente
├── package.json                     # Dependências e scripts
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite + proxy /api → :4000
├── vitest.config.ts                 # Config de testes
├── todo.md                          # Backlog de pendências
└── README.md                        # ← Este arquivo
```

---

## Sistema de autenticação

O sistema tem duas camadas de autenticação que operam em sequência com fallback automático.

### Fluxo completo de login

```
┌──────────┐    POST /api/auth/login     ┌────────────────────┐
│  Login   │  ─────────────────────────► │  server/index.ts    │
│  (React) │  { email|name, password }   │                    │
│          │                              │  1. Lê email ou    │
│          │                              │     name do body   │
│          │                              │                    │
│          │                              │  2. Se é email E   │
│          │                              │     Supabase está  │
│          │                              │     configurado:   │
│          │                              │     → tenta Supa-  │
│          │                              │       base Auth    │
│          │                              │                    │
│          │                              │  3. Fallback local:│
│          │                              │     → getUserByEmail│
│          │                              │       ou           │
│          │                              │       getUserByName│
│          │                              │     → checkPassword│
│          │                              │       (bcrypt)     │
│          │                              │                    │
│          │  ◄───────────────────────── │  4. signToken(JWT) │
│          │  { token, user }             │     HMAC-SHA256    │
│          │                              └────────────────────┘
│          │
│  Salva em localStorage:
│    tp_token = "xxx.yyy.zzz"
│    tp_user  = { name, email, role }
│          │
│  Redireciona para /dashboard
└──────────┘
```

### Camada 1 — Supabase Auth (primária)

Quando `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` estão definidos no `.env`, o servidor tenta autenticar o usuário via `supabase.auth.signInWithPassword()`. Esse caminho:

- Só funciona com email (Supabase não aceita login por nome de usuário).
- Se o usuário não existir no banco local (LowDB), cria automaticamente com `role: "admin"`.
- Se já existir, usa o role armazenado no banco local.
- Gera um JWT local (não usa o token do Supabase no frontend).

### Camada 2 — Autenticação local (fallback)

Se o Supabase não estiver configurado ou a autenticação Supabase falhar:

- Busca o usuário no banco local por email ou por nome.
- Verifica a senha com bcrypt (`checkPassword`).
- Se o usuário não existir e o Supabase não estiver configurado, cria automaticamente com `role: "admin"` (primeiro acesso).
- Senhas legadas em texto puro são migradas automaticamente para bcrypt no primeiro login bem-sucedido.

### Token JWT

O token é um JWT simplificado assinado com HMAC-SHA256:

```
Header:  { "alg": "HS256", "typ": "JWT" }  → base64url
Payload: { email, name, role, id, iat }     → base64url
Signature: HMAC-SHA256(header.payload, JWT_SECRET) → base64url
```

- **Segredo**: variável `JWT_SECRET` do `.env`. Em dev, se não definido, gera um segredo aleatório por boot (tokens expiram ao reiniciar o servidor). Em produção, é obrigatório.
- **Sem expiração**: o token não tem campo `exp`. Permanece válido enquanto o `JWT_SECRET` não mudar.
- **Armazenamento**: `localStorage` no navegador (`tp_token`).

### Middleware requireAuth

Toda rota `/api/*` (exceto `/api/auth/login`) passa pelo middleware `requireAuth`:

```
Request → Authorization: Bearer <token>
        → verifyToken(token) → payload ou null
        → Se null: 401 "Invalid token"
        → Se válido: req.user = payload → next()
```

O middleware aceita qualquer usuário autenticado com token válido. O controle granular de permissões (admin, viewer, designer, etc.) é feito pelo Supabase via RLS — o Express não filtra por role.

### Hierarquia de segredos no .env

```
JWT_SECRET              Obrigatório em produção. Assina os tokens de sessão.
ADMIN_EMAIL             Email do admin inicial (criado no primeiro boot).
ADMIN_PASSWORD          Senha do admin inicial (armazenada com bcrypt hash).
SUPABASE_URL            URL do projeto Supabase.
SUPABASE_SERVICE_KEY    (Opção A) Ignora RLS — acesso total.
SUPABASE_PUBLISHABLE_KEY (Opção B) Chave pública + login via credenciais:
SUPABASE_AUTH_EMAIL       → Email do usuário Supabase.
SUPABASE_AUTH_PASSWORD    → Senha do usuário Supabase.
```

---

## Integração com o Supabase — fluxo de dados

O frontend nunca fala diretamente com o Supabase. Toda leitura passa pelo Express, que atua como proxy autenticado.

### Como o Express se conecta ao Supabase

O módulo `server/supabase.ts` cria um client Supabase server-side com três modos de autorização (em ordem de prioridade):

```
1. SUPABASE_SERVICE_KEY definida
   → Ignora RLS completamente. Acesso total a todas as tabelas.

2. SUPABASE_PUBLISHABLE_KEY + SUPABASE_AUTH_EMAIL + SUPABASE_AUTH_PASSWORD
   → O servidor faz signInWithPassword() no Supabase Auth.
   → Obtém uma sessão de usuário real.
   → O RLS libera a leitura conforme as policies.
   → Sessão revalidada a cada ~50 minutos (TTL do access token).

3. Apenas SUPABASE_PUBLISHABLE_KEY (sem credenciais)
   → Acesso anônimo. Só funciona se o RLS permitir leitura ao role "anon".
   → Na prática retorna dados vazios.
```

### Endpoints de métricas e suas fontes no Supabase

```
GET /api/metrics/status
    → Retorna { configured: true/false }

GET /api/metrics/clients
    → Supabase: SELECT id, name FROM clients ORDER BY name
    → Alimenta o seletor de clientes na sidebar

GET /api/metrics/units
    → Supabase: SELECT id, name, client_group FROM clients ORDER BY name
    → Alimenta o dropdown de unidades no Feedback de Leads (dinâmico)

GET /api/metrics/daily?clientId=&start=&end=
    → Supabase: SELECT * FROM vw_meta_ads_daily_summary
    → Filtra por client_id, date_start (range)
    → Alimenta: KPIs, gráficos de linha (conversas/dia, investimento, custo/conversa)

GET /api/metrics/campaigns?clientId=&start=&end=
    → Supabase: RPC fn_campaign_period_summary(p_client_id, p_date_start, p_date_stop)
    → Agrega métricas por campanha no período
    → Alimenta: tabela "Desempenho por campanha"

GET /api/metrics/offers-rpc?clientId=&start=&end=
    → Supabase: RPC fn_offers_by_period (se existir)
    → Fallback: SELECT * FROM vw_meta_ads_offer_ads (view)
    → Alimenta: página Anúncios (split view, KPIs, gráficos, tabela)

GET /api/metrics/offers?clientId=&start=&end=
    → Supabase: SELECT * FROM vw_meta_ads_offer_ads
    → Alternativa direta à view sem RPC
```

### Modelo de dados do Supabase

```
clients
├── id (UUID)
├── name
├── client_group ("personal" | "marketing_pro")  ← segmenta visibilidade
└── ...campos de cadastro

meta_ads_insights (dados brutos do Meta Ads, 1 linha por dia/campanha)
├── client_id → clients.id
├── campaign_id, campaign_name
├── date_start
├── spend, impressions, clicks, leads
├── messaging_conversation_started
├── messaging_first_reply
├── messaging_conversation_replied
├── total_messaging_connections
├── inline_link_clicks
├── cpc, cpm, ctr, frequency
└── synced_at

meta_ads_offers (dados por anúncio individual)
├── client_id → clients.id
├── campaign_id, adset_id, ad_id
├── ad_name, offer_name, creative_name
├── ad_image_url
├── spend, conversations_started, leads_meta
├── cost_per_conversation, cpl_meta
├── offer_status ("ACTIVE", "PAUSED", ...)
└── synced_at

user_profiles
├── id → auth.users.id
├── email, name
├── role ("admin" | "viewer" | "designer" | "cs" | "account_manager"
│         | "traffic_manager" | "copywriter" | "client_viewer" | "none")
├── status ("active" | "inactive")
└── created_at

user_client_access
├── user_id → user_profiles.id
├── client_id → clients.id
└── (controle granular: quais clientes cada usuário pode ver)

demands (sistema de demandas por cliente)
├── client_id → clients.id
├── demand_comments, demand_attachments, demand_checklist_items (filhas)

pipeline_boards / pipeline_columns (kanban real)
├── client_id → clients.id (opcional)

client_updates (relatórios/atualizações)
├── client_id → clients.id (opcional)
├── status ("draft" | "published")
├── content_html, content_json

ad_accounts (contas de anúncio vinculadas)
├── client_id → clients.id
├── sync_function_name (nome da edge function de sync)
```

### Views e RPCs

**`vw_meta_ads_daily_summary`** — agregação diária das métricas de todas as campanhas. Campos: date_start, total_spend, total_conversas_iniciadas, total_impressions, custo_por_conversa, avg_cpc, avg_cpm, avg_ctr, avg_frequency.

**`vw_meta_ads_offer_ads`** — dados por anúncio com classificação automática de performance:

| Faixa de custo/conversa | Classificação |
|-------------------------|---------------|
| < R$ 5,00               | Excelente     |
| R$ 5,00 – R$ 8,99       | Positivo      |
| R$ 9,00 – R$ 12,99      | Atenção       |
| ≥ R$ 13,00              | Crítico       |
| Investimento sem conversas | Sem conversas |
| Conversas sem investimento | Residual      |

**`fn_campaign_period_summary(p_client_id, p_date_start, p_date_stop)`** — agrega meta_ads_insights por campanha dentro de um período. Retorna: campaign_name, total_spend, total_conversas_iniciadas, custo_por_conversa, avg_cpc, avg_cpm, avg_ctr.

### Row Level Security (RLS)

O acesso aos dados no Supabase é controlado por políticas RLS baseadas em dois eixos:

**1. Role do usuário** (via `user_profiles.role`):
- `admin` → acesso total a todos os clientes e dados (via função `is_active_admin()`).
- `viewer`, `designer`, `cs`, `account_manager`, `traffic_manager`, `copywriter` → acesso a clientes com `client_group = 'marketing_pro'` (via função `is_team_member()`).
- `client_viewer` → acesso apenas aos clientes vinculados em `user_client_access`.

**2. Grupo do cliente** (via `clients.client_group`):
- `marketing_pro` → visível para toda a equipe interna.
- `personal` → visível apenas para admins.

Toda tabela filha (demands, meta_ads_insights, meta_ads_offers, etc.) herda a restrição do client_group via JOIN com clients na policy.

---

## Banco local (LowDB)

O arquivo `data/db.json` armazena dados que não existem no Supabase ou que funcionam como fallback:

```json
{
  "clients": [],           // CRUD local de clientes (usado quando Supabase não está configurado)
  "campaigns": [],         // Campanhas vinculadas a clientes locais
  "users": [],             // Usuários do sistema (email, senha bcrypt, role)
  "feedbackLeads": [],     // Submissões do formulário de feedback
  "_nextClientId": 1,      // Auto-increment IDs
  "_nextCampaignId": 1,
  "_nextUserId": 1,
  "_nextFeedbackLeadId": 1
}
```

No primeiro boot, se o banco estiver vazio, um seed cria dois clientes de exemplo (Vida Card Tupanciretã e Júlio de Castilhos) com campanhas. Se `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem definidos, cria o admin inicial com senha em bcrypt.

### Merge de fontes de dados

O `ClientContext.tsx` no frontend faz merge das duas fontes:

```
1. Busca clientes do Supabase via GET /api/metrics/clients
2. Busca clientes do banco local via GET /api/clients
3. Supabase tem prioridade (aparece primeiro)
4. Clientes locais são incluídos apenas se o nome não duplicar
5. Resultado alimenta a sidebar e todos os filtros por cliente
```

---

## Páginas do dashboard

| Rota | Página | Fonte de dados | Persistência |
|------|--------|----------------|--------------|
| `/dashboard` | Visão geral de métricas | Supabase (views + RPCs) | — |
| `/dashboard/anuncios` | Performance por anúncio | Supabase (vw_meta_ads_offer_ads) | — |
| `/dashboard/clientes` | CRUD de clientes | Banco local (LowDB) | `data/db.json` |
| `/dashboard/pipeline` | Kanban de tarefas | Frontend | `localStorage` |
| `/dashboard/pagamentos` | Controle financeiro | Frontend | `localStorage` |
| `/dashboard/meu-trabalho` | Tarefas pessoais | Frontend | `localStorage` |
| `/dashboard/atualizacoes` | Blog interno | Frontend | `localStorage` |
| `/dashboard/feedback-leads` | Formulário de feedback | Banco local + Supabase (unidades) | `data/db.json` |
| `/dashboard/configuracoes` | Perfil e senha | Frontend + banco local | `localStorage` + `data/db.json` |

---

## Temas e design tokens

O sistema usa três escopos de tema via classes CSS:

- **`:root`** — tema claro padrão com paleta Vida Card (verde `#1FBD8F`, laranja `#FF8C42`).
- **`.trafego-dark`** — tema escuro aplicado apenas na home institucional (`TrafegoProHome.tsx`).
- **`.dashboard-dark`** — tema escuro aplicado no dashboard (`AppLayout.tsx`).

Fontes: Plus Jakarta Sans (display/títulos), Inter (corpo), Space Grotesk (login).

---

## Scripts

```bash
pnpm dev           # Inicia Vite (3000) + Express (4000) em paralelo
pnpm build         # Build de produção (Vite + esbuild para o server)
pnpm start         # Roda o servidor de produção (dist/)
pnpm check         # Type-check TypeScript
pnpm format        # Prettier em todo o projeto
```

---

## Variáveis de ambiente

Copie `env.example` para `.env` e preencha:

```env
JWT_SECRET=              # Obrigatório em produção (openssl rand -hex 32)
ADMIN_NAME=Admin         # Nome do admin inicial
ADMIN_EMAIL=             # Email do admin inicial
ADMIN_PASSWORD=          # Senha do admin inicial

SUPABASE_URL=            # URL do projeto Supabase
SUPABASE_PUBLISHABLE_KEY=# Chave pública (anon key)
SUPABASE_AUTH_EMAIL=     # Email para login no Supabase (server-side)
SUPABASE_AUTH_PASSWORD=  # Senha para login no Supabase (server-side)
# OU
SUPABASE_SERVICE_KEY=    # Service role key (ignora RLS)
```

---

## Pendências conhecidas (todo.md)

- Repositório ainda público — tornar privado e reescrever histórico do git.
- Pipeline, tarefas, atualizações e pagamentos usam localStorage — migrar para Supabase.
- O Supabase já tem tabelas para demands e pipeline_boards que não estão conectadas ao frontend.
- Funil de métricas para na conversa do WhatsApp — falta retenção/churn/LTV.
- Landing pages de unidades (Tupanciretã, Júlio de Castilhos, Ijuí) removidas das rotas.
