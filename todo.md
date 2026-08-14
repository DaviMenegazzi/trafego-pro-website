# Projeto Tráfego Pro — TODO

## 🔒 Segurança (prioridade máxima)

- [x] Remover credenciais de admin hardcoded do servidor (backdoor no login)
- [x] Remover segredo do token (`JWT_SECRET`) fixo no código — agora só via env
- [x] Passwords com hash bcrypt (com migração automática das senhas em texto puro)
- [x] Admin inicial criado por env (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) no 1º boot
- [x] `data/db.json` removido do versionamento (agora no `.gitignore`)
- [x] `data/db.json` do repositório saneado (sem senha e sem contatos reais)
- [x] `data/db.example.json` criado como seed sem dados sensíveis
- [x] `.env.example` documentando todas as variáveis
- [ ] **Manual:** tornar o repositório privado
- [ ] **Manual:** trocar TODAS as senhas/segredos antigos (considerar comprometidos)
- [ ] **Manual:** `git rm --cached data/db.json` e commitar
- [ ] **Manual:** rodar `pnpm install` (baixa o bcryptjs) e `pnpm check`
- [ ] **Manual (opcional):** reescrever histórico do git para apagar o segredo antigo
      (BFG ou `git filter-repo`), já que o valor ficou registrado em commits passados

## Deploy

- [ ] Definir onde o back-end Express vai rodar (host com Node, não estático)
- [ ] Configurar `JWT_SECRET` e variáveis de admin no ambiente de produção
- [ ] Validar login + dashboard em produção (rotas `/api/*` no ar)

## Produto / dados (backlog)

- [ ] Fechar o funil de métricas: incluir retenção/churn e LTV (hoje para na conversa do WhatsApp)
- [ ] Rever orçamento por praça (evitar valor uniforme sem lógica de porte/potencial)
- [ ] Padronizar cadastro de clientes (telefone/estado/datas) antes de usar como fonte de decisão

## Páginas e Rotas (concluído)

- [x] Site institucional Tráfego Pro em `/`
- [x] Landing Vida Card Tupanciretã em `/tupancireta`
- [x] Landing Vida Card Júlio de Castilhos em `/juliodecastilhos`
- [x] Landing Vida Card Ijuí em `/ijui`
- [x] Rota 404

## Dashboard & Login (concluído)

- [x] Login com API Express (`/api/auth/login`)
- [x] Rota `/dashboard` protegida para admin (hook `useAdminAuth`)
- [x] CRUD de clientes e campanhas + import/export Excel
- [x] Páginas: pipeline, clientes, pagamentos, meu-trabalho, atualizações, configurações, feedback-leads
- [x] Testes vitest de CRUD

## Identidade Visual (concluído)

- [x] Logo, fontes (Space Grotesk + Inter) e paletas Tráfego Pro / Vida Card

## Página independente de feedback

- [x] Criar página independente `/feedback-leads` fora da dashboard
- [x] Proteger `/feedback-leads` com a autenticação existente
- [x] Conectar o formulário independente ao endpoint autenticado de feedback
- [x] Validar a nova página e o fluxo de envio no navegador
- [x] Escrever ou atualizar testes para a página independente de feedback

## Validações adicionais da página independente

- [x] Testar redirecionamento de `/feedback-leads` sem sessão e acesso com sessão válida
- [x] Testar no navegador o envio do formulário independente sem persistir dados reais
- [x] Ampliar testes automatizados para autenticação, rota e submissão do feedback

## Cobertura automatizada adicional

- [x] Adicionar testes do endpoint `/api/feedback-leads` para 401 sem token, sucesso com Bearer válido e erro de validação
- [x] Isolar e testar a lógica de guarda/redirecionamento da rota independente `/feedback-leads`
