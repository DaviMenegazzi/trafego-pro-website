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

- [x] Reproduzir login seguido de abertura da dashboard sem recarregar
- [x] Diagnosticar a sincronização entre cookie Supabase e consultas de unidades/métricas
- [x] Corrigir a atualização inicial das métricas após o login
- [x] Adicionar testes para o primeiro carregamento autenticado
- [x] Validar no navegador a correção do primeiro carregamento autenticado
- [ ] Salvar um checkpoint específico após a validação autenticada do primeiro carregamento

## Validação em sessão limpa

- [x] Limpar a sessão local e o cookie Supabase de forma controlada para testar o primeiro login
- [x] Confirmar que as primeiras consultas de unidades e métricas recebem a sessão Supabase
- [x] Acionar um refetch explícito após login se a sessão ainda não estiver pronta na primeira navegação

## Propagação assíncrona da sessão Supabase

- [x] Persistir um marcador pós-login para o dashboard repetir a consulta de unidades após a propagação do cookie

## Correção de 401 ao trocar unidade

- [x] Reproduzir de forma documentada a troca de unidade que retornava 401 no endpoint de métricas
- [x] Tratar respostas não JSON e sessão expirada sem expor erro de parsing
- [x] Corrigir a atualização de métricas após selecionar uma nova unidade
- [x] Adicionar testes e validar a troca de unidade no navegador
- [x] Salvar checkpoint da correção de sessão e métricas

## Período personalizado na dashboard

- [x] Adicionar a opção de período personalizado ao filtro de métricas
- [x] Criar seleção de data inicial e final consistente com o visual da dashboard
- [x] Aplicar o intervalo escolhido às consultas de métricas e validar as datas
- [x] Cobrir a lógica de intervalo personalizado em testes e validar build
- [x] Salvar checkpoint da melhoria de filtro de período

## Seletor de unidade no padrão da dashboard

- [x] Substituir o dropdown nativo de unidade por um menu visual consistente
- [x] Manter os estados de carregamento, ausência e unidades autorizadas no novo seletor
- [x] Cobrir a seleção de unidade autorizada e validar TypeScript, testes e build
- [x] Salvar checkpoint da melhoria do seletor de unidade

## Contraste dos filtros da dashboard

- [x] Ajustar as cores dos estados selecionados nos menus de período e unidade
- [x] Validar TypeScript, testes e build
- [x] Inspecionar no navegador as cores computadas do atalho ativo do filtro de período
- [x] Salvar e reler a evidência verificável para os filtros de período e unidade selecionados
- [x] Salvar checkpoint da correção de contraste

## Simplificação visual dos filtros

- [x] Remover os rótulos visuais de período e unidade junto aos seletores
- [x] Validar TypeScript, testes e build após o refinamento
- [x] Salvar checkpoint da simplificação dos filtros

## Análise de evolução do produto — sem implementação

- [x] Avaliar dashboard, feedbacks, login e controles de segurança
- [x] Mapear lacunas de integrações de mídia, incluindo Google Ads
- [x] Apresentar possibilidades priorizadas para decisão antes de qualquer alteração

## Avaliação de atribuição e contabilidade de leads — sem implementação

- [x] Mapear a captura de origem dos leads nas landing pages e rotas próprias
- [x] Comparar acompanhamento por CRM, WhatsApp e atualização manual de etapas comerciais
- [x] Apresentar arquitetura e decisões necessárias antes de implementar

## Avaliação de mensagens via Evolution API — sem implementação

- [x] Verificar eventos e webhooks disponíveis para mensagens recebidas
- [x] Avaliar classificação de contatos em lead e não lead com privacidade adequada
- [x] Apresentar limites e arquitetura recomendada antes de integrar

## Avaliação de atribuição direta Meta + WhatsApp — sem implementação

- [x] Verificar dados de campanhas de mensagem e eventos de conversão da Meta
- [x] Definir como correlacionar a origem Meta ao contato recebido pela Evolution API
- [x] Apresentar arquitetura e limites antes de integrar

## Módulo isolado Evolution — administrativo

- [x] Criar uma rota e um layout próprios, sem alterar os fluxos da dashboard existente
- [x] Criar as tabelas isoladas de instância, eventos, contatos e classificação de leads
- [x] Validar a sessão Supabase ativa e o papel admin em todas as rotas administrativas do módulo
- [x] Cobrir a rejeição de JWT sem sessão Supabase no módulo Evolution
- [x] Criar o endpoint de webhook Evolution com segredo, validação e idempotência
- [x] Exibir painel administrativo de saúde das instâncias, eventos recentes e leads classificados
- [x] Adicionar testes de isolamento, autorização e deduplicação de webhook
- [x] Validar que a rota isolada redireciona visitantes sem sessão para o login
- [x] Validar TypeScript, testes e build, além da rota isolada sem sessão no navegador
- [x] Validar no navegador o painel `/evolution` com sessão admin ativa e os estados de visão geral
- [x] Salvar checkpoint do módulo Evolution administrativo

## Guia de instalação Evolution no WSL — sem alteração no projeto

- [x] Confirmar o método recomendado de instalação local e os requisitos de persistência
- [x] Documentar conexão do WhatsApp e configuração de webhook Bearer para o módulo isolado
- [x] Entregar roteiro de instalação e verificação operacional segura

## Guia rápido Evolution sem Docker — sem alteração no projeto

- [x] Confirmar o modo local mínimo para teste e suas dependências
- [x] Documentar a criação da instância, QR e webhook Bearer sem Docker
- [x] Entregar comandos de teste temporário no WSL

## Guia visual Evolution local — sem alteração no projeto

- [x] Confirmar a interface local adequada para criar e conectar a instância
- [x] Documentar a configuração visual do webhook Bearer para o Tráfego Pro
- [x] Entregar o roteiro local com intervenção mínima no terminal

## Diagnóstico PostgreSQL da Evolution no WSL — sem alteração no projeto

- [x] Confirmar a URL de banco usada pela Evolution e a existência do usuário local
- [x] Corrigir as credenciais PostgreSQL e validar a conexão antes da migração
- [x] Retestar a geração e a implantação do banco Evolution

## Orientação de webhook no Evolution Manager — sem alteração no projeto

- [x] Confirmar o caminho visual e os campos da integração de webhook na versão atual do Manager
- [x] Corrigir a orientação do Bearer e entregar o passo a passo preciso

## Teste de atribuição Meta Click-to-WhatsApp — sem alteração no projeto

- [x] Confirmar o identificador de referência e os pré-requisitos de um anúncio de mensagem real
- [x] Documentar a simulação controlada e a leitura dos resultados no módulo Evolution

## Simulação Evolution via Postman — sem alteração no projeto

- [x] Definir um payload de teste compatível com o webhook Evolution
- [x] Documentar a requisição Bearer, a deduplicação e os resultados esperados no painel

## Teste CTWA por outro anúncio ativo — sem alteração no projeto

- [x] Confirmar a compatibilidade do número de destino e a presença de `ctwa_clid` no teste
- [x] Documentar o procedimento e os limites atuais de validação

## Evolução Evolution — evidências de origem e auditoria

- [x] Preservar uma versão segura e limitada do payload de origem de cada evento Evolution
- [x] Extrair `ctwa_clid`, referência Meta, UTM, `gclid` e demais sinais de atribuição disponíveis
- [x] Criar status de evidência de origem, sem inferir Meta ou Google Ads quando não houver tag verificável
- [x] Criar abas isoladas para eventos brutos seguros, origem e auditoria de leads
- [x] Cobrir payloads Meta, Google Ads, ausência de sinal e autorização administrativa em testes
- [x] Validar TypeScript, testes, build e abas administrativas no navegador
- [x] Salvar checkpoint da evolução de origem do módulo Evolution

## Armazenamento Evolution em Supabase separado

- [x] Configurar uma conexão Supabase exclusiva para os dados do módulo Evolution
- [x] Criar esquema isolado de instâncias, eventos, leads e evidências de origem no novo projeto
- [x] Migrar apenas o webhook e o painel Evolution para a nova persistência
- [x] Garantir que dashboard, métricas e feedbacks continuem usando as fontes atuais sem alteração
- [x] Validar autorização, armazenamento e consulta no Supabase exclusivo
- [x] Salvar checkpoint da migração de armazenamento Evolution

## Evolution — atribuição Meta e conversas

- [x] Mapear campos disponíveis de campanha, conjunto e criativo na fonte Meta atual
- [x] Criar estrutura isolada de mensagens e vínculo de atribuição no Supabase Evolution
- [x] Correlacionar evidências verificáveis de lead com campanha, conjunto e criativo Meta
- [x] Criar a aba Atribuição Meta no `/evolution`
- [x] Criar a aba Conversas com linha do tempo de mensagens por contato
- [x] Cobrir ausência de `ctwa_clid`, correspondência Meta e leitura de conversas em testes
- [x] Validar TypeScript, testes, build e novas abas administrativas no navegador
- [x] Salvar checkpoint da expansão de atribuição e conversas

## Robustez das novas abas Evolution

- [x] Tratar respostas não JSON das consultas de atribuição e conversas sem expor erro de parsing
