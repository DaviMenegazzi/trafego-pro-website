# Projeto Tráfego Pro — TODO

## Páginas e Rotas

- [x] Página institucional Tráfego Pro na raiz / (design dark, estrelas animadas, Space Grotesk + Inter)
- [x] Landing page Vida Card Tupanciretã em /tupancireta (10 seções estratégicas)
- [x] Landing page Vida Card Júlio de Castilhos em /juliodecastilhos
- [x] Rota 404 corrigida (espaço extra removido)
- [x] Animações de scroll (fade-in e slide-up) em todas as seções

## Dashboard & Login

- [x] Criar rota de login com email/senha customizado (API Express /api/auth/login)
- [x] Criar página de login com design Tráfego Pro (preto/branco)
- [x] Criar dashboard com sidebar e gerenciamento de clientes
- [x] Proteger rota /dashboard apenas para admin (hook useAdminAuth)
- [x] Adicionar dados mockados de clientes (Vida Card Tupanciretã, Júlio de Castilhos)
- [x] Criar página de detalhes de cada cliente no dashboard
- [x] Configurar proxy Vite → Express para rotas /api/*
- [x] Servidor Express rodando na porta 4000 (dev) com API JWT

## Identidade Visual

- [x] Logo Tráfego Pro (branca) integrada no header e footer
- [x] Fontes Space Grotesk (títulos) + Inter Extra Light (corpo)
- [x] Paleta Tráfego Pro: #0a0a0a, branco, cinzas
- [x] Paleta Vida Card: verde #1FBD8F, azul escuro, branco

## CRUD de Clientes com Excel

- [x] Banco de dados JSON persistente com lowdb (LowSync) em data/db.json
- [x] API REST completa: GET, POST, PUT, DELETE /api/clients e /api/campaigns
- [x] Exportação para Excel (.xlsx) via GET /api/clients/export/excel
- [x] Importação de Excel via POST /api/clients/import/excel
- [x] Interface CRUD no dashboard: listagem, modal de criação, modal de edição, confirmação de exclusão
- [x] CRUD de campanhas na tela de detalhe do cliente
- [x] Botões Importar Excel e Exportar Excel na listagem de clientes
- [x] Toast de feedback para todas as operações
- [x] 17 testes vitest passando (CRUD de clientes e campanhas)
