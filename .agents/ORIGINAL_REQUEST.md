# Original User Request

## 2026-09-04T21:47:46Z

# Teamwork Project — Redesenho Visual do Módulo Pixel (/pixel)

Working directory: C:/Users/Davi Menegazzi/Desktop/Projetos Dev/Website Tráfego Pro
Integrity mode: development

## MISSÃO
Você é o orquestrador de uma equipe multi-agente responsável por redesenhar visualmente o módulo "Pixel" da plataforma interna Tráfego Pro, para que ele deixe de parecer um painel administrativo isolado e passe a se apresentar como um produto integrado dentro da dashboard, com a mesma identidade visual, densidade e sofisticação dos demais módulos.

Você NÃO deve alterar comportamento, rotas de API, contratos de dados, autenticação, lógica de atribuição Meta/Google, RLS ou schema Supabase. Apenas UI/UX/visual.

---

## CONTEXTO DO PRODUTO
- Rota pública: `/pixel` (front-end React 19 + Vite 7 + Tailwind 4 + Wouter)
- Arquivo principal: `client/src/pages/EvolutionAdmin.tsx` (nome interno mantido; não renomear arquivos nem imports)
- Componentes de apoio: `client/src/lib/evolutionScope.ts`, `evolutionAdminPolicy.ts`, ícones lucide-react, DnD via `@dnd-kit`
- Papel do módulo: Monitor de WhatsApp que consolida instâncias, contatos, mensagens, pipeline CRM (drag-and-drop), atribuição de campanhas Meta/Google e auditoria de eventos de webhook. Só admins acessam.
- Abas atuais: Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria
- Nome do produto (user-facing): "Pixel" (jamais expor "Evolution" no UI)

---

## IDENTIDADE VISUAL DA DASHBOARD (obrigatório respeitar)
Extraia e siga estritamente o design language dos arquivos existentes do projeto — referências canônicas:
- `client/src/pages/EvolutionAdmin.tsx` (estado atual do Pixel)
- `client/src/pages/SocialPublishingAdmin.tsx` (irmão visual mais próximo)
- Páginas da dashboard em `client/src/pages/`
- `client/src/components/ui/` (shadcn base)

Tokens já em uso (a manter):
- Background base: `#090a0b`
- Superfícies: `bg-white/[.025]`, borda `border-white/8`
- Acento primário: cyan-300 (`#7dd3fc`-family) com halo `shadow-[0_0_30px_rgba(34,211,238,.12)]`
- Acento secundário: indigo-500 (gradientes decorativos)
- Tipografia: Inter 300 (texto), Space Grotesk light (headlines com `tracking-[-.04em]`)
- Micro-labels em UPPERCASE `tracking-[.18em]` cinza-600
- Corner radius: `rounded-2xl` em cards, `rounded-xl` em controles
- Tema: dark-first, sem toggle
- Estética: minimalista, denso mas respirável, "operations-grade" — inspiração Linear / Vercel / Retool, não SaaS colorido

---

## EQUIPE (6 agentes especialistas em sequência com loop de QA)
1. `design_auditor`: Diagnóstico completo de inconsistências, hierarquia, densidade, contraste WCAG AA, fricções por aba e elementos de "admin isolado".
2. `ui_architect`: Design System Spec — inventário de tokens e componentes reutilizáveis, estados (default/hover/active/loading/empty/error).
3. `information_designer`: Wireframes textuais + hierarquia por aba em múltiplos de 4 e breakpoints responsivos.
4. `interaction_designer`: Interaction spec — micro-interações, hover states, focus rings cyan, DnD com placeholder shimmer, skeleton loading, acessibilidade.
5. `frontend_implementer`: Diffs de código em Tailwind + React em `client/src/pages/EvolutionAdmin.tsx` (e `client/src/components/pixel/` se necessário). TypeScript strict clean, sem emojis.
6. `qa_reviewer`: Checklist de verificação — contraste, responsividade 1280/1440/1920, sem regressões de DnD/dados, zero menções a "Evolution", testes passando. Loop crítico: se falhas, volta para implementer até aprovar.

---

## RESTRIÇÕES DURAS
- ❌ Não renomear arquivos, funções, tipos, rotas de API, tabelas Supabase.
- ❌ Não adicionar dependências novas. Use o que já está em `package.json`.
- ❌ Não introduzir estados/contextos globais novos.
- ❌ Não mudar a lógica de negócio (atribuição, DnD, filtros por unidade/instância).
- ❌ Sem emojis, sem gifs, sem stock images.
- ✅ Todo texto em pt-BR neutro, técnico, sóbrio.
- ✅ Nome visível ao usuário SEMPRE "Pixel".
- ✅ Manter compatibilidade com testes existentes (`vitest run`).
