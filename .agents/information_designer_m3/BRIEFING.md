# BRIEFING — 2026-09-04T21:58:00Z

## Mission
Desenhar a arquitetura de informação completa, layout textual (wireframes estruturados em ASCII/markdown) e hierarquia visual para cada uma das 6 abas do módulo Pixel, respeitando a escala de 4px, o container max-w-[1440px] e os breakpoints responsivos.

## 🔒 My Identity
- Archetype: explorer
- Roles: information_designer, specialist_3
- Working directory: C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3
- Original parent: b6bf4e58-74d3-44db-828f-9991b2d1b651
- Milestone: m3_information_design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement (produzir especificações e wireframes para o builder)
- Grid estrito de 4px e proporções exatas para cada container e componente
- Blindagem total contra menções a "Evolution" no produto/UI/labels (substituir por "Pixel", "WhatsApp Integrado", "Conexão WhatsApp")
- Proibição estrita de emojis na interface e documentação (utilizar ícones Lucide nomeados)
- Container macro max-w-[1440px] mx-auto px-6 py-6 com comportamento em 375/768px, 1280px, 1440px e 1920px
- Eliminar duplicações caóticas da aba Operação e estruturar o CRM Kanban com 7 colunas em esteira contínua

## Current Parent
- Conversation ID: b6bf4e58-74d3-44db-828f-9991b2d1b651
- Updated: 2026-09-04T21:58:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`
  - `PROJECT.md`
  - `.agents/design_auditor_m1/audit_report.md`
  - `.agents/ui_architect_m2/design_system_spec.md`
  - `client/src/pages/EvolutionAdmin.tsx`
  - `client/src/pages/SocialPublishingAdmin.tsx`
- **Key findings**:
  - Desconstrução completa da síndrome do "painel isolado".
  - Eliminação da redundância de instâncias na aba Operação (unificação em grid split 1.5fr / 1fr com webhook seguro).
  - Transformação do grid CRM de 4 colunas em esteira horizontal contínua de 7 colunas (w-[290px] shrink-0) com busca rápida e feedback de drop-zone.
  - Implementação de KPIs interativos (clique-para-filtrar) na aba Origem & tags e truncamento seguro de tags longas.
  - Substituição de payloads JSON brutos na Auditoria por acordeão expansível com botão de cópia.
  - Matriz de breakpoints detalhada para Mobile/Tablet (<1024px), 1280px, 1440px e 1920px.
- **Unexplored areas**: Nenhuma pendência na arquitetura de informação e wireframing.

## Key Decisions Made
- Estruturação do Shell Global em 3 camadas: PixelHeader, StickyScopeBar (lg:sticky lg:top-3 lg:z-20), PixelSegmentedTabs.
- Manutenção estrita das 6 abas canônicas: Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria.
- Adoção de wireframes ASCII de alta fidelidade bloco a bloco.
- Mapeamento completo de ícones Lucide substituindo todos os emojis.

## Artifact Index
- `wireframes_and_hierarchy.md` — Wireframes textuais diagramados, matriz de breakpoints e arquitetura de informação
- `handoff.md` — Relatório de handoff para M4 (Interaction Designer) e M5 (Frontend Implementer)
- `progress.md` — Liveness heartbeat
