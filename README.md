# Tráfego Pro

Plataforma da operação **Tráfego Pro**: reúne, no mesmo projeto, o site institucional da
agência, as landing pages de venda do **Vida Card** (uma por praça) e um painel interno de
gestão de clientes, campanhas, pipeline, pagamentos e feedback de leads.

> ⚠️ **Não é um site estático.** Existe um back-end Express com autenticação e banco de dados.
> O deploy precisa rodar o servidor Node — um host apenas estático quebra login e dashboard.

---

## O que tem aqui

**1. Site institucional** — apresentação da agência.
- `/` → `TrafegoProHome`

**2. Landing pages de venda (Vida Card), por praça**
- `/tupancireta` → `Home`
- `/juliodecastilhos` → `JulioDeCastilhos`
- `/ijui` → `Ijui`

Cada landing traz diagnóstico, lógica de campanha, planos de Meta Ads e Google Ads, KPIs,
ofertas e scripts. Os blocos ficam em `client/src/components/` (ex.: `StrategicDiagnosis`,
`CampaignLogic`, `MetaAdsPlan`, `GoogleAdsPlan`, `KPIs`, `MainOffers`, `InfluencerScripts`).

**3. Painel interno (requer login de admin)**
- `/login` → autenticação
- `/dashboard` → visão geral (KPIs, gráficos, campanhas)
- `/dashboard/pipeline` → kanban de demandas
- `/dashboard/clientes` → CRUD de clientes (+ import/export Excel)
- `/dashboard/pagamentos` → controle de pagamentos
- `/dashboard/meu-trabalho` → tarefas atribuídas
- `/dashboard/atualizacoes` → posts/updates
- `/dashboard/feedback-leads` → formulário de feedback de leads
- `/dashboard/configuracoes` → configurações (gestão de usuários)

---

## Stack

- **Front:** React 19 + Tailwind 4 + shadcn/ui, roteamento com Wouter.
- **Back:** Express + banco JSON (lowdb) em `data/db.json`. Sessão via token HMAC-SHA256.
- **Senhas:** armazenadas com hash **bcrypt** (nunca em texto puro).
- **Testes:** vitest (`server/*.test.ts`).

```
client/src/
  pages/       ← páginas (landings + dashboard)
  components/  ← blocos das landings e UI (shadcn em components/ui)
  contexts/    ← ThemeContext, ClientContext
  hooks/       ← useAdminAuth, etc.
server/
  index.ts     ← API Express + auth
  db.ts        ← camada de dados (lowdb) e seed
data/
  db.example.json  ← seed de exemplo (versionado, sem dados reais)
  db.json          ← banco de runtime (IGNORADO pelo git — contém dados reais)
```

---

## Configuração (obrigatória antes de rodar)

Toda credencial vem de variáveis de ambiente. Nada de segredo no código.

1. Copie o template e preencha:
   ```bash
   cp .env.example .env
   ```
2. Gere um segredo forte para `JWT_SECRET`:
   ```bash
   openssl rand -hex 32
   ```
3. Defina o admin inicial em `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`).
   Ele é criado automaticamente no primeiro boot, **apenas** se ainda não houver
   nenhum usuário no banco. Depois disso, gerencie usuários pelo próprio painel.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | Sim (em produção) | Assina os tokens de sessão. Sem ela, o servidor não sobe em produção. |
| `ADMIN_EMAIL` | No 1º boot | E-mail do admin inicial. |
| `ADMIN_PASSWORD` | No 1º boot | Senha do admin inicial (guardada com hash). |
| `ADMIN_NAME` | Não | Nome do admin (padrão: "Admin"). |
| `PORT` | Não | Porta do Express (padrão 3000). |
| `DB_PATH` | Não | Caminho do banco de runtime. |

---

## Rodando localmente

```bash
pnpm install
pnpm dev        # front (Vite) — proxeia /api/* para o Express
pnpm check      # typecheck
pnpm test       # testes vitest   (se configurado no package.json)
```

O front precisa do Express no ar para as rotas `/api/*` (login, dashboard). Suba o
servidor Node junto (ver `server/index.ts`).

## Build e produção

```bash
pnpm build      # gera front + bundle do servidor em dist/
pnpm start      # NODE_ENV=production node dist/index.js
```

Em produção, defina `JWT_SECRET` e as variáveis de admin no ambiente do host.
O host **precisa** executar Node (o dashboard depende da API).

---

## Segurança — leia antes de publicar

- **Nunca** commite `.env` nem `data/db.json` (ambos já estão no `.gitignore`).
- Segredos e senhas vêm só de variáveis de ambiente.
- Senhas são gravadas com hash bcrypt; senhas antigas em texto puro são migradas
  automaticamente no primeiro login bem-sucedido.
- Se este repositório já foi público em algum momento, considere **todas** as senhas
  e segredos anteriores como comprometidos e troque-os.
