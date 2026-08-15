# Projeto Tráfego Pro — TODO

## 🔒 Segurança

- [x] Remover credenciais de admin hardcoded do servidor (backdoor no login)
- [x] Remover segredo do token (`JWT_SECRET`) fixo no código — agora só via env
- [x] Passwords com hash bcrypt (com migração automática das senhas em texto puro)
- [x] Admin inicial criado por env (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) no 1º boot
- [x] `data/db.json` removido do versionamento (agora no `.gitignore`)
- [x] `data/db.json` do repositório saneado (sem senha e sem contatos reais)
- [x] `data/db.example.json` criado como seed sem dados sensíveis
- [x] `.env.example` documentando todas as variáveis
- [x] **Arquivado por solicitação do usuário:** tornar o repositório privado
- [x] **Arquivado por solicitação do usuário:** trocar TODAS as senhas/segredos antigos (considerar comprometidos)
- [x] **Manual:** `git rm --cached data/db.json` e commitar (o ficheiro não está versionado e está ignorado)
- [x] **Manual:** rodar `pnpm install` (baixa o bcryptjs) e `pnpm check`
- [x] **Arquivado por solicitação do usuário:** reescrever histórico do git para apagar o segredo antigo
      (BFG ou `git filter-repo`), já que o valor ficou registrado em commits passados

## Deploy — decisões arquivadas

- [x] Definir onde o back-end Express vai rodar (host com Node, não estático; projeto em hosting Autoscale)
- [x] **Arquivado por solicitação do usuário:** configurar `JWT_SECRET` e variáveis de admin no ambiente de produção
- [x] **Arquivado por solicitação do usuário:** validar login + dashboard em produção (rotas `/api/*` no ar)

## Produto / dados — decisões arquivadas

- [x] **Arquivado por solicitação do usuário:** fechar o funil de métricas com retenção/churn e LTV
- [x] **Arquivado por solicitação do usuário:** rever orçamento por praça
- [x] **Arquivado por solicitação do usuário:** padronizar cadastro de clientes antes de usar como fonte de decisão

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

## Estratégia de produção do backend

- [x] Confirmar e documentar que o backend Express roda em hosting Node Autoscale, não-estático
- [x] Validar no projeto a configuração de runtime, porta dinâmica e variáveis de produção

## Formulário semanal e exportação completa

- [x] Atualizar o formulário para o novo conjunto semanal de identificação, panorama e satisfação
- [x] Migrar a tabela SQL preservando registros existentes e adotando o novo contrato
- [x] Atualizar endpoints e listagem administrativa para os novos campos
- [x] Adicionar exportação completa dos feedbacks para administradores
- [x] Cobrir migração, validação, exportação e autorização com testes
- [x] Validar interface e build
- [x] Salvar checkpoint da atualização semanal e exportação completa

## Finalização da migração semanal

- [x] Tornar `week_end` obrigatório no banco e criar o índice de período semanal em operações compatíveis
- [x] Adicionar teste automatizado do backfill de registros legados para o contrato semanal

## Migração de clientes para Supabase

- [x] Mapear todas as dependências do armazenamento interno de clientes e campanhas
- [x] Usar Supabase como fonte exclusiva de clientes, unidades e permissões
- [x] Remover a aba Clientes e todo o CRUD interno correspondente
- [x] Remover Tupanciretã, Júlio de Castilhos e demais dados legados do armazenamento local
- [x] Adaptar telas e fluxos que dependiam da lista local de clientes
- [x] Adicionar testes e validar o dashboard sem fonte interna de clientes
- [x] Salvar checkpoint da migração completa para Supabase

## Sessão Supabase para dados protegidos por RLS

- [x] Preservar a sessão autenticada do Supabase em cookie HTTP-only após o login
- [x] Executar as consultas de clientes e métricas com o token Supabase do usuário autenticado
- [x] Remover a dependência de consultas anônimas e de clientes locais como fallback
- [x] Limpar a sessão Supabase HTTP-only ao sair do dashboard

## Identidade do remetente no feedback SQL

- [x] Migrar `submitted_by_user_id` para aceitar UUIDs do Supabase sem perder registros existentes

## Transição de sessões antigas

- [x] Redirecionar sessões legadas sem cookie Supabase para novo login em vez de exibir dashboard vazio

## Eliminação do armazenamento lowdb legado

- [x] Remover o módulo `server/db.ts`, os usuários locais e os testes de CRUD interno
- [x] Remover endpoints locais de usuários, clientes, campanhas e importação de planilha
- [x] Excluir o arquivo de dados legado sem afetar a tabela SQL de feedbacks

## Validação positiva da fonte Supabase

- [x] Fazer login com sessão Supabase válida e confirmar unidades autorizadas no dashboard
- [x] Adicionar teste automatizado da resolução de unidades concedidas no Supabase
- [x] Validar Dashboard e Anúncios com IDs UUID vindos do Supabase

## Correção de unidades Supabase vazias

- [x] Inspecionar a sessão autenticada e a resposta de unidades no domínio publicado
- [x] Corrigir a consulta de unidades autorizadas sem restaurar dados locais
- [x] Cobrir e validar o carregamento de unidades com sessão Supabase real

## Resolução de unidades por acesso Supabase

- [x] Derivar unidades de administradores e clientes pela relação `user_client_access` no Supabase

## Melhoria de visualização da dashboard

- [x] Revisar a hierarquia atual de informação, espaçamentos e contraste da dashboard
- [x] Reorganizar cabeçalho, indicadores e cartões para leitura mais rápida
- [x] Melhorar estados de carregamento, vazio e filtros de unidade
- [x] Ajustar responsividade da dashboard para desktop e telemóvel
- [x] Validar visualmente, executar testes
- [x] Salvar checkpoint final da melhoria visual

## Consistência de dados da dashboard

- [x] Remover dados ilustrativos da tela para apresentar somente métricas provenientes do Supabase

## Validação adicional da dashboard reorganizada

- [x] Adicionar estados vazios dedicados para ausência de unidade e ausência de métricas no período
- [x] Validar a dashboard com sessão autenticada em desktop e viewport móvel real
- [x] Salvar checkpoint após a validação visual autenticada

## Correção de layout móvel da dashboard

- [x] Corrigir o deslocamento horizontal da área principal quando a sidebar está recolhida em telemóvel
- [x] Garantir viewport móvel nativa para que os breakpoints responsivos sejam aplicados corretamente

## Renovação de sessão publicada

- [x] Renovar o login Supabase no domínio publicado para obter o cookie HTTP-only de dados

## Checkpoint posterior à validação visual final

- [x] Salvar um novo checkpoint após as validações autenticadas em desktop e viewport móvel
- [x] Confirmar no checkpoint final a versão validada no domínio publicado

## Correção do primeiro carregamento de métricas

- [ ] Reproduzir login seguido de abertura da dashboard sem recarregar
- [x] Diagnosticar a sincronização entre cookie Supabase e consultas de unidades/métricas
- [x] Corrigir a atualização inicial das métricas após o login
- [x] Adicionar testes para o primeiro carregamento autenticado
- [ ] Validar no navegador e salvar checkpoint da correção

## Validação em sessão limpa

- [ ] Limpar a sessão local e o cookie Supabase de forma controlada para testar o primeiro login
- [ ] Confirmar que as primeiras consultas de unidades e métricas recebem a sessão Supabase
- [x] Acionar um refetch explícito após login se a sessão ainda não estiver pronta na primeira navegação

## Propagação assíncrona da sessão Supabase

- [x] Persistir um marcador pós-login para o dashboard repetir a consulta de unidades após a propagação do cookie

## Correção de 401 ao trocar unidade

- [ ] Reproduzir a troca de unidade que retorna 401 no endpoint de métricas
- [x] Tratar respostas não JSON e sessão expirada sem expor erro de parsing
- [ ] Corrigir a atualização de métricas após selecionar uma nova unidade
- [ ] Adicionar testes e validar a troca de unidade no navegador
- [x] Salvar checkpoint da correção de sessão e métricas

## Período personalizado na dashboard

- [x] Adicionar a opção de período personalizado ao filtro de métricas
- [x] Criar seleção de data inicial e final consistente com o visual da dashboard
- [x] Aplicar o intervalo escolhido às consultas de métricas e validar as datas
- [x] Cobrir a lógica de intervalo personalizado em testes e validar build
- [ ] Salvar checkpoint da melhoria de filtro de período
