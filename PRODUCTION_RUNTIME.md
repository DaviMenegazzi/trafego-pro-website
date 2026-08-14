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

## Verificação

A configuração foi validada com `pnpm check`, `pnpm test` e `pnpm build`. O servidor de desenvolvimento iniciou o Express na porta dinâmica esperada e o checkpoint de produção foi criado pelo hosting gerido.
