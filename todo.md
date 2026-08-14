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

## Melhoria de legibilidade da página independente de feedback

- [x] Melhorar contraste e hierarquia visual da página `/feedback-leads`
- [x] Ajustar espaçamento, largura das colunas e leitura dos campos
- [x] Melhorar responsividade em telemóvel e desktop
- [x] Validar que autenticação e envio continuam funcionando após os ajustes visuais
- [x] Atualizar testes e salvar novo checkpoint da melhoria visual

## Validação final da melhoria visual

- [x] Validar `/feedback-leads` em viewport móvel real e registrar evidência de leitura e espaçamento
- [x] Adicionar ou atualizar testes automatizados relacionados à estrutura e estados da página após a refatoração visual
- [x] Salvar um novo checkpoint após concluir e validar a melhoria visual

## Permissões de unidades no feedback

- [x] Mapear a origem das unidades autorizadas no utilizador autenticado
- [x] Filtrar o dropdown de unidade pelas permissões da sessão
- [x] Validar no backend que o feedback só aceita unidades autorizadas
- [x] Adicionar testes para unidades permitidas e não permitidas
- [x] Validar a interface e salvar novo checkpoint

## Correções de segurança da filtragem de unidades

- [x] Remover o fallback que expõe as 17 unidades quando não há unidades autorizadas retornadas
- [x] Validar no navegador com uma sessão não-admin que só aparecem unidades permitidas
- [x] Adicionar teste HTTP 403 para submissão de unidade não autorizada
- [x] Adicionar teste do endpoint de unidades filtrado por `allowedClientIds`
- [x] Salvar checkpoint específico da regra de permissões por unidade

## Acesso do feedback para utilizadores com unidades atribuídas

- [x] Ajustar a guarda de `/feedback-leads` para aceitar sessões autenticadas não-admin com unidades autorizadas
- [x] Cobrir a nova regra de guarda em testes
- [x] Validar a sessão restrita no navegador sem alterar credenciais reais

## Feedbacks em SQL e aba administrativa

- [x] Criar tabela SQL persistente para feedbacks de conversão
- [x] Migrar o endpoint de submissão do feedback do lowdb para SQL
- [x] Criar endpoint administrativo protegido para listar feedbacks
- [x] Criar aba `/dashboard/feedback-leads/list` visível somente para admins
- [x] Adicionar filtros por unidade e semana e visualização dos detalhes
- [x] Adicionar testes de persistência, autorização admin e consulta
- [x] Executar migração, validar a interface e salvar checkpoint

## Exclusividade da aba administrativa

- [x] Ajustar a navegação lateral para exibir feedbacks enviados somente para role `admin`
- [x] Testar que `socio`, `gerente` e utilizadores de unidade não veem a aba administrativa

## Fecho da entrega SQL

- [x] Salvar novo checkpoint após a migração SQL e a aba administrativa de feedbacks
- [x] Validar no navegador uma sessão não-admin tentando abrir a aba administrativa
