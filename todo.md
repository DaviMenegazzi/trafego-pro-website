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
- [x] Salvar um checkpoint específico após a validação autenticada do primeiro carregamento

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

## Correção de contatos e conversas Evolution

- [x] Identificar corretamente o contato remoto para mensagens recebidas e enviadas
- [x] Preservar e exibir o nome do remetente real, sem usar o perfil da instância como fallback indevido
- [x] Processar atualizações de contato da Evolution quando mensagens não incluírem o nome do remetente
- [x] Carregar no histórico as mensagens enviadas e recebidas, incluindo registros já existentes quando possível
- [x] Cobrir em testes mensagens de entrada, saída e nomes de contato
- [x] Validar a correção no painel administrativo
- [x] Salvar checkpoint da correção de contatos e conversas

## Evolution multi-instância por unidade

- [x] Criar vínculo explícito entre cada instância Evolution e uma unidade
- [x] Permitir cadastrar e editar a identificação de instâncias no painel administrativo
- [x] Adicionar filtro por unidade e por instância às visões de operação, conversas e atribuição
- [x] Exibir consolidados de leads e métricas para todas as instâncias ou apenas a seleção atual
- [x] Cobrir em testes a segregação e a agregação de múltiplas instâncias
- [x] Validar no navegador os filtros e o cadastro multi-instância
- [x] Salvar checkpoint da expansão multi-instância

## Documentação do projeto

- [x] Atualizar README com arquitetura, autenticação Supabase, fontes de dados e rotas
- [x] Documentar o módulo Evolution isolado, Supabase dedicado, webhook e operação multi-instância
- [x] Validar e salvar checkpoint da documentação atualizada

## CRM Evolution por instância

- [x] Criar as etapas do funil: não respondido, respondido, follow-up, respondeu, negociação e fechado
- [x] Persistir a etapa, histórico de movimentação e responsável no Supabase Evolution
- [x] Armazenar e exibir o número completo somente no CRM administrativo, recuperando eventos históricos quando disponível
- [x] Criar endpoints administrativos de consulta e mudança de etapa por instância
- [x] Criar a aba CRM com pipeline drag-and-drop filtrado pela instância selecionada
- [x] Exibir detalhe do contato com telefone, mensagens, origem, campanha, conjunto e criativo disponíveis
- [x] Cobrir movimentação, persistência e isolamento entre instâncias em testes
- [x] Validar no navegador e salvar checkpoint do CRM Evolution

## Correção de usabilidade do pipeline CRM

- [x] Eliminar o overflow lateral do pipeline CRM em desktop e dispositivos móveis
- [x] Corrigir a movimentação por arrastar e soltar entre as etapas do pipeline
- [x] Adicionar cobertura automatizada para a interação de mudança de etapa
- [x] Validar visualmente o pipeline e salvar checkpoint da correção

## Classificação automática diária de leads por IA

- [x] Confirmar o provedor, as credenciais e a disponibilidade de crédito antes da integração
- [x] Criar processamento diário que analise as dez últimas mensagens de cada lead por instância
- [x] Definir saída estruturada com etapa, confiança e justificativa da classificação
- [x] Atualizar automaticamente apenas classificações com confiança adequada e preservar a auditoria
- [x] Registrar cada execução, decisão e erro para consulta administrativa
- [x] Cobrir cenários de classificação, falha do provedor e idempotência em testes
- [x] Validar o agendamento diário e salvar checkpoint da automação

## Proteção do CRM durante classificação por IA

- [x] Bloquear no servidor as mudanças manuais de etapa enquanto a rotina de IA estiver em execução
- [x] Desabilitar visualmente o arrastar e soltar durante a classificação automática
- [x] Exibir o label “Última atualização feita pela IA da Tráfego Pro” com data e etapa aplicadas
- [x] Cobrir o bloqueio e os estados visuais em testes, validar e salvar checkpoint

## Incidente de segurança — segredos no Git

- [x] Auditar arquivos rastreados, incluindo a configuração do projeto, sem revelar valores de segredos
- [x] Remover qualquer valor sensível presente em arquivos versionados e manter somente referências a variáveis de ambiente
- [x] Adicionar proteção automatizada contra chaves e credenciais antes de novos commits
- [x] Verificar o histórico Git e listar as credenciais que exigem rotação
- [x] Validar a higienização e salvar checkpoint de segurança
- [x] Pausar a automação diária de IA até a disponibilização de uma nova chave após a higienização

## Incidente de segurança — branch ajustes-dashboard

- [x] Reescrever o histórico de ajustes-dashboard removendo a configuração sensível e referências de credenciais
- [x] Forçar a atualização segura da branch remota ajustes-dashboard no GitHub
- [x] Verificar que nenhuma branch remota alcançável contém os padrões de credencial identificados
- [x] Documentar a rotação obrigatória da senha TiDB e da senha administrativa legada
- [x] Validar a contenção final e salvar checkpoint de segurança

## Unidades autorizadas no cadastro Evolution

- [x] Reutilizar as unidades autorizadas do Supabase da dashboard no módulo Evolution
- [x] Restringir no servidor a associação de instâncias apenas a unidades permitidas
- [x] Exibir no cadastro de instâncias somente as unidades permitidas ao utilizador atual
- [x] Cobrir a autorização de associação em testes e validar como administrador
- [x] Salvar checkpoint da integração de unidades

## Publicações sociais Meta

- [ ] Confirmar a configuração OAuth e as permissões necessárias para Facebook e Instagram profissional
- [x] Criar armazenamento isolado para contas conectadas, rascunhos, mídias, agendamentos e resultados de publicação
- [x] Criar módulo administrativo de calendário editorial, rascunhos e estados de publicação
- [x] Implementar conexão segura à Meta e seleção das páginas e perfis autorizados
- [x] Implementar rotina agendada de publicação, tentativas controladas e histórico de falhas
- [x] Cobrir autorização, calendário, agendamento e erros em testes
- [ ] Validar o módulo e salvar checkpoint de publicação social
- [x] Suportar publicação completa de feed, carrossel, vídeo e Reel no Facebook e Instagram profissional
- [x] Preparar o roteiro para criação da aplicação Meta e configuração da URL de retorno
- [ ] Criar a aplicação Meta, cadastrar as variáveis protegidas e validar uma publicação real por canal
- [ ] Ativar o agendamento de publicação após conectar a primeira Página Meta

## Ativação OAuth Meta

- [x] Cadastrar o App ID e o App Secret recebidos exclusivamente como segredos protegidos
- [x] Gerar e cadastrar a chave de criptografia dos tokens sociais como segredo protegido
- [ ] Validar a URL de autorização e concluir a associação de uma Página Meta a uma unidade autorizada
- [ ] Validar uma publicação real controlada antes de ativar a rotina recorrente
- [x] Manter a autorização Meta, a publicação real e a ativação do agendamento sob execução manual do utilizador

## Planeamento mensal em massa de publicações

- [x] Criar uma tabela de fila mensal por unidade com múltiplas peças editáveis
- [x] Persistir rascunhos locais no navegador para sobreviver a recargas de página
- [x] Validar em lote formato, canais, URLs HTTPS e datas futuras antes do envio
- [x] Enviar peças aprovadas em lotes graduais para a agenda persistente sem duplicação
- [x] Exibir o progresso, erros por linha e resultados de cada lote no calendário editorial
- [x] Cobrir rascunho local, validações, idempotência e envio em massa com testes
- [x] Validar visualmente e salvar checkpoint do planeador mensal

## Importação Excel e múltiplas Páginas Meta

- [x] Definir e disponibilizar modelo Excel para a fila mensal de publicações
- [x] Importar planilha localmente, mapear colunas e validar cada linha antes de adicioná-la à fila
- [x] Exibir pré-visualização e erros de importação sem enviar conteúdo ao servidor
- [x] Permitir escolher entre múltiplas Páginas Meta conectadas para cada linha da fila
- [x] Cobrir importação, persistência local e seleção de múltiplas conexões em testes
- [x] Validar a interface e salvar checkpoint do importador Excel

## Correção de segurança OAuth Meta

- [x] Diagnosticar a URL de retorno enviada na autorização Meta
- [x] Forçar a geração de retorno HTTPS e evitar URLs de pré-visualização na produção
- [x] Atualizar o roteiro de configuração da aplicação Meta com a URL exata de retorno
- [x] Validar a URL OAuth e salvar checkpoint da correção

## Correção de escopos OAuth Meta

- [x] Confirmar a configuração do Login do Facebook para Empresas e o identificador de configuração OAuth
- [x] Ajustar a autorização para solicitar apenas permissões disponíveis na configuração Meta
- [x] Documentar as permissões de publicação que devem ser habilitadas no painel Meta
- [x] Validar a autorização sem escopos inválidos e salvar checkpoint

## Ativação de configuração Login para Empresas

- [x] Cadastrar o ID de configuração Meta recebido exclusivamente como segredo protegido
- [x] Enviar `config_id` na autorização e retirar a lista de escopos do diálogo OAuth
- [ ] Validar manualmente a conexão de Página após a publicação da correção OAuth

## Permissões Meta e atualização do OAuth

- [ ] Confirmar que a configuração Login para Empresas inclui todas as permissões de publicação necessárias
- [ ] Verificar a URL OAuth ativa no painel e eliminar redirecionamentos com URL antiga em cache
- [ ] Atualizar as instruções de teste manual e validar o fluxo após a configuração das permissões

## Caso de uso Meta para publicação social

- [ ] Identificar o caso de uso ou produto Meta que libera permissões de Página e Instagram profissional
- [ ] Adaptar a configuração OAuth ao fluxo compatível com publicação em Facebook e Instagram
- [ ] Atualizar o roteiro de criação da aplicação e validar a autorização manual

## Atualização de credencial Meta

- [x] Atualizar o App Secret exclusivamente como variável protegida
- [ ] Verificar nos logs que o callback OAuth deixa de rejeitar o segredo da aplicação
- [ ] Orientar nova autorização manual sem alterar o código do projeto

## Diagnóstico da conexão Meta concluída sem Página visível

- [ ] Inspecionar logs de produção e a sessão temporária após a autorização concluída
- [ ] Identificar o ponto de falha sem modificar o código do projeto
- [ ] Apresentar o diagnóstico e aguardar autorização para correção

## Upload local de mídia para publicações

- [x] Criar endpoint administrativo protegido para enviar imagens e vídeos locais ao armazenamento seguro
- [x] Validar tipo e tamanho de arquivo antes de persistir a mídia
- [x] Substituir o campo obrigatório de URL pelo seletor de arquivo e manter URL opcional para fluxos externos
- [x] Preencher automaticamente a fila mensal com a URL segura do arquivo enviado
- [x] Cobrir upload, validação e autorização em testes sem publicar conteúdo
- [ ] Validar a interface e salvar checkpoint do upload de mídia

## Diagnóstico de agendamento Meta não refletido

- [ ] Inspecionar a publicação criada, a conexão Meta selecionada e seu estado persistido
- [ ] Verificar se o processador de publicação está ativo e recebeu uma tarefa agendada
- [ ] Identificar a diferença entre agendar internamente e programar diretamente na Meta
- [ ] Apresentar o diagnóstico antes de alterar qualquer comportamento de publicação

## Estratégia gradual por conta Meta

- [ ] Confirmar as capacidades de agendamento nativo do Facebook e Instagram profissional
- [ ] Definir limites, intervalos e tentativas por conta Meta para a fila de publicação
- [ ] Criar uma flag auditável de automação por conexão e métricas de consumo da fila
- [ ] Apresentar a estratégia antes de alterar o processamento de publicação

## Verificação de agendamento nativo Meta

- [ ] Confirmar se a API oferece agendamento nativo para Instagram profissional vinculado à Página
- [ ] Confirmar se há agendamento conjunto nativo Facebook e Instagram pela mesma chamada
- [ ] Apresentar o resultado documentado antes de alterar o módulo

## Agendamento híbrido Facebook e Instagram

- [x] Agendar nativamente posts de Facebook com data futura dentro da janela suportada
- [x] Criar fila persistente de Instagram com execução idempotente no horário definido
- [ ] Adicionar tentativas progressivas, pausa por erro e auditoria por conexão Meta
- [x] Registrar a rotina gerenciada de processamento sem depender do navegador
- [ ] Cobrir os dois fluxos em testes sem publicar conteúdo real
- [ ] Validar a estratégia híbrida e salvar checkpoint

## Calendário e gestão de agendamentos sociais

- [ ] Exibir agendamentos em calendário fixo por mês, com navegação e leitura de estados
- [ ] Mover o compositor de publicação para uma tela flutuante individual
- [ ] Criar ações de editar e excluir por agendamento no calendário
- [ ] Cancelar ou atualizar o agendamento nativo Facebook antes da data de publicação
- [ ] Editar ou excluir itens pendentes da fila interna Instagram sem disparar publicação
- [ ] Cobrir autorização, edição, exclusão e cancelamento em testes
- [ ] Validar o calendário e salvar checkpoint da experiência de gestão

## Calendário mensal como página inicial

- [ ] Exibir uma grade mensal com dias da semana e posições vazias consistentes
- [ ] Adicionar navegação entre meses e retorno ao mês atual
- [ ] Posicionar cada agendamento no dia correto com estado e canais visíveis
- [ ] Manter Nova publicação e Planejar em massa em painéis flutuantes independentes
- [ ] Cobrir os cálculos de grade e navegação em testes
- [ ] Validar visualmente e salvar checkpoint do calendário mensal

## Painel flutuante de detalhes da publicação

- [x] Abrir um painel flutuante ao clicar em um item do calendário
- [x] Exibir conteúdo, data e hora, Página Meta, unidade, canais e estado
- [x] Disponibilizar ações permitidas de editar e excluir no painel
- [x] Cobrir abertura e dados exibidos em testes e salvar checkpoint

## Controlador e hierarquia da Central de Publicações

- [ ] Criar controlador visual de unidade e Página Meta no topo do calendário
- [ ] Atualizar o calendário imediatamente ao mudar unidade ou Página
- [ ] Manter o calendário como elemento principal fixo da tela
- [ ] Mover criar agendamento e conectar Página para ações discretas em painel separado
- [ ] Redesenhar Planejar em massa no padrão visual dos filtros do Evolution
- [ ] Cobrir filtros de escopo em testes e validar a interface
- [ ] Salvar checkpoint da reorganização da Central

## Simplificação da página inicial da Central

- [ ] Remover o bloco redundante de resumo editorial acima do calendário
- [ ] Validar a hierarquia visual simplificada e salvar checkpoint

## Ocultação do painel operacional

- [ ] Ocultar o painel de conexão Meta e status do processador da página inicial
- [ ] Validar a Central simplificada e salvar checkpoint

## Criação contextual pelo calendário

- [ ] Mostrar um botão de adição ao passar o mouse em cada dia do calendário
- [ ] Abrir o compositor com a data do dia selecionado já preenchida
- [ ] Cobrir o preenchimento de data e validar a interação antes do checkpoint

## Correção de sessão na exclusão

- [ ] Diagnosticar a autenticação enviada ao excluir um agendamento
- [ ] Corrigir a gestão de sessão da Central sem alterar itens publicados
- [ ] Cobrir a exclusão autenticada e publicar a correção

## Página inicial pública sem login

- [x] Diagnosticar o redirecionamento de autenticação indevido na rota inicial
- [x] Manter a Home pública sem leitura ou exigência de sessão
- [x] Restringir o login às rotas administrativas
- [x] Cobrir acesso público e proteção de rotas em testes
- [x] Validar no navegador e salvar checkpoint

## Padronização do seletor de unidades da dashboard

- [x] Localizar o seletor de unidade da aba e o seletor do corpo da dashboard
- [x] Reutilizar o padrão visual e de interação do seletor principal na aba
- [x] Cobrir a seleção de unidade e publicar a padronização

## Refinamento da sidebar compactada

- [x] Corrigir margens e alinhamento do seletor e navegação na sidebar
- [x] Refinar a transição e a hierarquia visual no estado compacto
- [x] Validar os dois estados e salvar checkpoint

## Reestilização da sidebar pela identidade Tráfego Pro

- [x] Reforçar a presença da marca e a hierarquia visual da navegação
- [x] Criar estados ativos, hover e compacto coerentes com a paleta da Tráfego Pro
- [x] Ajustar o perfil, o seletor de unidade e os controles de colapso ao novo acabamento
- [x] Validar responsividade, acessibilidade e salvar checkpoint da reestilização

## Sidebar monocromática e tipográfica

- [x] Remover o monograma TP do cabeçalho da sidebar
- [x] Manter apenas a identificação textual TRÁFEGO PRO no cabeçalho
- [x] Remover acentos azulados e aplicar contraste somente em preto, grafite, cinza e branco
- [x] Validar a sidebar simplificada e salvar checkpoint

## Paleta monocromática da sidebar

- [x] Remover acentos azulados da sidebar, dos estados e dos controles
- [x] Aplicar contrastes em preto, grafite, cinza e branco para legibilidade
- [x] Validar a paleta e salvar checkpoint

## Correção de exclusão de agendamento

- [ ] Identificar o estado e a resposta que bloqueiam a exclusão atual
- [ ] Corrigir o cancelamento de itens futuros sem permitir remover itens publicados
- [ ] Cobrir a exclusão em teste e publicar a correção validada

## Avaliação de token Meta Business

- [x] Mapear quais integrações atuais usam tokens Meta para métricas, publicação e atribuição
- [x] Verificar a compatibilidade e os escopos do novo token sem persistir o valor em código ou Git
- [x] Recomendar se o token deve substituir alguma integração atual e registrar o procedimento seguro de rotação

## Validação isolada de token Meta renovado

- [x] Receber o token renovado por campo seguro e não persistir o valor em código ou Git
- [x] Validar a expiração, `ads_read` e as contas de anúncio acessíveis pela Graph API
- [x] Apresentar o resultado sem alterar a dashboard nem a sincronização atual

## API externa segura para IA

- [ ] Criar ou confirmar as tabelas SQL de tokens externos e eventos de auditoria
- [ ] Implementar geração de token opaco, armazenamento por hash, expiração e revogação imediata
- [ ] Implementar endpoints externos de métricas, resumo de leads e resumo de CRM, com escopo por unidade
- [ ] Aplicar autenticação Bearer, rate limit e respostas seguras à API externa
- [ ] Criar página administrativa para emitir, consultar metadados e revogar tokens
- [ ] Adicionar navegação administrativa de integrações de IA para usuários admin
- [ ] Configurar o usuário técnico de leitura do Supabase com privilégios mínimos
- [ ] Cobrir emissão, revogação, expiração, escopo de unidade, rate limit e leitura externa em testes Vitest
- [ ] Documentar os endpoints e um exemplo seguro de consumo por IA externa
- [ ] Validar TypeScript, testes, build e fluxo visual antes da publicação

## Banco de Talentos Vida Card

- [x] Adaptar as entidades de unidade, gestor e permissões à estrutura Supabase já usada pela dashboard
- [x] Criar tabelas para configuração de formulário, campos dinâmicos, candidaturas e anexos
- [x] Criar rota pública por unidade para candidatura e página de confirmação
- [x] Implementar upload seguro de currículo com validação de PDF/DOCX e limite de tamanho
- [x] Implementar renderização dinâmica e validação dos campos do formulário público
- [x] Criar painel administrativo por unidade para configurar formulário e campos com ordenação drag-and-drop
- [x] Criar listagem, filtros, detalhe, alteração de status e anotações para candidatos
- [x] Criar exportação XLSX de candidatos filtrados sem expor dados de outras unidades
- [x] Adicionar rotas e navegação administrativas respeitando o acesso por unidade e administradores
- [x] Cobrir RLS lógico, validação, upload, filtros, exportação e isolamento entre unidades em Vitest
- [ ] Validar responsividade, acessibilidade, TypeScript, testes, build e publicação

## Ajustes de experiência do Banco de Talentos

- [x] Corrigir a inclusão de múltiplos campos no construtor de formulário
- [x] Aplicar aos seletores do Banco de Talentos o padrão visual interno da dashboard
- [x] Exibir estado de publicação e ação explícita de despublicação no formulário
- [x] Exibir pop-up de sucesso com o link público copiável após salvar um formulário publicado
- [ ] Cobrir os ajustes de construtor e publicação em testes e validação visual

## Correções de candidatos e múltiplos formulários

- [x] Corrigir a listagem de candidatos para exibir somente as candidaturas do formulário selecionado
- [x] Corrigir a exportação para preservar todas as respostas e os dados básicos do candidato
- [x] Remover a restrição de um formulário por unidade sem afetar formulários já criados
- [x] Criar seleção, criação e gestão de múltiplos formulários dentro de cada unidade
- [x] Manter links públicos, publicação e candidaturas isolados por formulário
- [x] Cobrir persistência, listagem e exportação por formulário em testes Vitest
- [ ] Validar no navegador a criação, candidatura, listagem e exportação de mais de um formulário

## Reorganização de clareza do Banco de Talentos

- [ ] Reavaliar a hierarquia atual de unidade, formulário, candidatos e ações primárias
- [ ] Separar a seleção de formulário da edição de campos e da gestão de candidaturas
- [ ] Reduzir controles concorrentes e tornar o estado de publicação inequívoco
- [ ] Validar a jornada reorganizada com os fluxos de formulário, candidato e exportação

## Sincronização e publicação de eventos

- [x] Verificar branch local, commits remotos e arquivos de eventos pendentes
- [ ] Sincronizar as alterações corretas sem sobrescrever trabalho concorrente
- [ ] Validar os eventos atualizados antes de publicar
- [ ] Publicar e confirmar a versão com os eventos corrigidos

## Contas Meta na integração de IA externa

- [x] Mapear a resolução atual de unidades e contas exibidas na integração de IA
- [x] Usar a lista de contas autorizadas pelo token Meta como fonte de seleção da integração
- [x] Preservar escopos, revogação, auditoria e limite de acesso dos tokens externos
- [x] Cobrir a resolução de contas Meta em testes e publicar a correção

## Reaproveitamento do token Meta existente

- [x] Usar a mesma variável de token Meta já consumida pela dashboard na integração de IA externa
- [x] Validar que a lista de contas carregada pela IA corresponde à lista da dashboard

## Edição de slug do formulário

- [x] Adicionar ação visual ao lado do link público para editar o slug do formulário
- [x] Validar formato e unicidade do slug antes de salvar
- [x] Preservar autorização por unidade e exibir o link atualizado após a alteração
- [x] Cobrir o fluxo de alteração de slug em teste e publicar a melhoria

## Otimização da API externa de IA

- [x] Mapear as fontes reais para métricas de mídia, CRM, criativos, metas e leads individuais
- [x] Definir escopos adicionais e o contrato paginado para dados granulares
- [ ] Adicionar métricas de alcance, frequência, visualizações de página e vídeo ao endpoint de métricas
- [ ] Permitir granularidade por unidade, campanha e anúncio com filtro de plataforma
- [ ] Adicionar valores financeiros e estágios detalhados ao resumo de CRM quando disponíveis
- [x] Criar endpoint paginado de leads sem expor telefones, mensagens ou dados pessoais desnecessários
- [x] Criar endpoint de catálogo de criativos com apenas metadados disponíveis
- [x] Criar endpoint de metas e orçamentos por unidade e período após persistir a configuração
- [ ] Cobrir escopo, paginação, privacidade e respostas ausentes em Vitest
- [x] Documentar campos disponíveis e dependências de dados pendentes

## SEO da página inicial

- [x] Adicionar entre três e oito palavras-chave focadas à meta tag da página inicial
- [x] Validar a presença da meta tag no HTML gerado

## Contrato de fontes futuras da API externa

- [x] Retornar campos financeiros, metas e etapas indisponíveis como nulos ou listas vazias, com indicação explícita da fonte pendente
- [x] Não fabricar métricas, valores de venda ou estados de CRM ausentes

## Supabase separado para Banco de Talentos

- [x] Preservar o Supabase da dashboard somente como fonte de autorizações de usuário e unidade
- [x] Conectar o Supabase separado do usuário para dados, anexos e configurações de recrutamento
- [x] Sincronizar ou resolver o catálogo mínimo de unidades autorizadas sem copiar usuários ou expor credenciais
