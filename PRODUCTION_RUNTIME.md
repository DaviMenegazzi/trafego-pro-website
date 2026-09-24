# Runtime de produção

## Estratégia

O projeto utiliza o hosting gerido do WebDev em modo **Autoscale**, com runtime Node.js para executar o servidor Express. Não é um site estático: o mesmo processo Node serve a API `/api/*`, a autenticação, a persistência SQL e os ficheiros do frontend em produção.

## Build e arranque

O build de produção é definido pelos scripts versionados no `package.json`:

```text
pnpm run build
NODE_ENV=production node dist/index.js
```

O build gera o frontend com Vite e empacota `server/index.ts` para `dist/index.js` com esbuild. Em produção, o Express serve `dist/public` e aplica o fallback do frontend para as rotas do cliente.

## Porta e ambiente

O servidor utiliza `process.env.PORT` quando fornecido pelo ambiente gerido. Se a plataforma não fornecer a porta, usa `3000` em produção e `4000` apenas no desenvolvimento local. A aplicação não hardcodeia uma porta de produção incompatível com o hosting.

As variáveis de produção, incluindo `DATABASE_URL`, `JWT_SECRET`, credenciais de autenticação e configurações externas, devem ser mantidas no gestor de Secrets do projeto. Nenhum valor secreto deve ser escrito neste documento, no código-fonte ou em ficheiros versionados.

O módulo financeiro usa o Firebase Admin apenas no servidor. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` ou `GOOGLE_APPLICATION_CREDENTIALS` e valide `/api/finance` com uma sessão administrativa antes de publicar `firebase.database.rules.json`. Em seguida, publique as regras do Realtime Database com o Firebase CLI (`firebase deploy --only database --project trafegopro-5206e`). As regras bloqueiam todo acesso direto do navegador; o Admin SDK mantém a API operacional. O banco continua publicamente legível até essas regras serem publicadas no projeto Firebase.

A migração `supabase/migrations/20260923210945_restrict_meta_daily_summary.sql` restringe as métricas às unidades autorizadas. Valide-a no projeto Supabase e mantenha `SUPABASE_SERVICE_KEY` no servidor para a rotina de backup, pois clientes comuns não recebem mais permissão de escrita na tabela.

## VPS (desde 2026-09-24)

O site também roda na VPS da Evolution, em `/opt/trafego-pro`, no container `trafego_pro` (limites: 512 MB de RAM e 0,5 vCPU), atrás do nginx em `https://www.trafego.pro` (e `https://trafegopro.147.93.10.249.sslip.io`). O DNS do domínio fica na Hostinger, com registros A de `@` e `www` para `147.93.10.249`; o certificado Let's Encrypt é renovado pelo certbot. Os arquivos ficam em `deploy/vps/`.

- Dados próprios do site (feedbacks, formulários, publicações sociais, tokens da API externa) ficam no Supabase `trafegopro-analise` (`db/site_tables_supabase.sql`). Não existe mais MySQL em produção.
- As mídias das publicações vão para o bucket público `social-media` e os currículos para o bucket `talent-resumes`.
- As rotas `/api/scheduled/*` aceitam o header `X-Cron-Secret` (`CRON_SECRET`); o cron fica em `/etc/cron.d/trafego-pro`.
- Deploy: `pnpm build` local → enviar `dist`, `package.json`, `pnpm-lock.yaml`, `patches` e `deploy/vps/*` para `/opt/trafego-pro` → `docker compose build && docker compose up -d`. Nunca rode o `vite build` na VPS.
- Financeiro: sem conta de serviço do Firebase (não temos acesso de dono ao projeto `trafegopro-5206e`), o servidor usa a API REST do Realtime Database. O site só libera `/api/finance` para admin ativo no Supabase, mas o banco do Firebase continua aberto na internet até o dono publicar `firebase.database.rules.json`. Se `FIREBASE_SERVICE_ACCOUNT_JSON` for configurada, o servidor volta a usar o Admin SDK automaticamente.
- Dados antigos do MySQL do Manus: `scripts/migrate-manus-mysql-to-supabase.mjs`.

## Verificação

A configuração foi validada com `pnpm check`, `pnpm test` e `pnpm build`. O servidor de desenvolvimento iniciou o Express na porta dinâmica esperada e o checkpoint de produção foi criado pelo hosting gerido.
