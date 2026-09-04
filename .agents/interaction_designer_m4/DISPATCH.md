# Dispatch — interaction_designer

## Missão
Você é o Interaction Designer (especialista 4 da equipe de redesenho do Pixel).
Seu objetivo é produzir a especificação rigorosa de micro-interações, estados interativos, feedback tátil/visual, comportamento de Drag-and-Drop (DnD) com `@dnd-kit`, foco e acessibilidade de teclado, skeleton loaders e transições para o módulo Pixel.

Seu diretório de trabalho exclusivo é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4`

Arquivos de entrada obrigatórios:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`
- `client/src/pages/EvolutionAdmin.tsx`

Entregáveis:
1. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md`
2. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\handoff.md`

Conteúdo obrigatório da especificação de interações:
- **Micro-interações de Navegação e Header**:
  * Segmented tabs: transição suave do indicador ciano, hover state, foco via teclado (ArrowLeft/ArrowRight).
  * CTA "Atualizar dados": feedback de clique, estado loading com spinner sutil sem salto de layout.
  * Sticky Scope Bar: comportamento visual ao rolar a página (transição de opacidade/blur).
- **Drag-and-Drop com @dnd-kit (CRM Kanban)**:
  * Estados de arrasto: Card em repouso vs Card ativo/arrastado (`opacity-50`, escala `scale-105`, sombra `shadow-2xl shadow-cyan-950/50`, anel ciano sutil).
  * Placeholder / Drop Zone: indicador pontilhado com animação shimmer ciano (`border-cyan-400/40 bg-cyan-400/5 animate-pulse`).
  * Drop feedback: animação de encaixe suave (spring/ease transition).
  * Drag Handle acessível e suporte a teclado para movimentação entre colunas (Enter para pegar, Setas para mover, Espaço para soltar).
- **Controles e Formulários**:
  * Focus rings unificados: `focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:outline-none`.
  * Inputs com feedback de validação inline (sucesso verde sóbrio, erro vermelho sóbrio).
- **Data Tables & Listas**:
  * Linhas de tabela com hover state refinado (`hover:bg-white/[.04]`), clique para ação com feedback instantâneo.
  * Botões de cópia rápida de ID com tooltip "Copiado!" temporário de 1.5s.
- **Loading & Skeleton States**:
  * Skeletons padronizados para cada tipo de componente (KPI cards, tabelas, chat list, kanban columns).
  * Shimmer gradiente suave (`from-white/[.02] via-white/[.06] to-white/[.02]`).
- **Acessibilidade (a11y)**:
  * Conformidade com WCAG 2.1 AA (Keyboard focus visible, `aria-expanded`, `aria-selected`, `role="tab"`, `role="tablist"`).
- **Regras Duras**: Zero emojis, zero menções a "Evolution" na UI, nenhuma adição de biblioteca externa ao package.json.

## 2026-09-04T21:58:42Z
<USER_REQUEST>
Você é o Interaction Designer (especialista 4 da equipe de redesenho do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4

Você DEVE ler antes de iniciar:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md
4. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md
5. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md
6. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\DISPATCH.md
7. client/src/pages/EvolutionAdmin.tsx

Produza a especificação detalhada de interações em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md
e seu handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\handoff.md

Cobrir minuciosamente:
- Especificação de micro-interações para todos os componentes (header, tabs, cards, tabelas, modais, formulários).
- Especificação detalhada de Drag-and-Drop (DnD) com @dnd-kit (drag overlay, drop zone shimmer, animações de arraste e soltura sem jitter).
- Focus rings e navegação por teclado (WCAG 2.1 AA keyboard nav).
- Catálogo de Skeletons e estados de carregamento (KPIs, tabelas, kanban, chat).
- Estados de erro, validação inline e feedback de cópia rápida.
- Nenhuma dependência nova, zero emojis e zero menções a "Evolution" na UI.

Ao finalizar, envie uma mensagem com o resumo dos seus achados e confirme que os arquivos foram salvos.
</USER_REQUEST>

