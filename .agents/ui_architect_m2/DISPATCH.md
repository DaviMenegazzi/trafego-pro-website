# Dispatch — ui_architect

## Missão
Você é o UI Architect (especialista 2 da equipe de redesign visual do Pixel).
Seu objetivo é criar a especificação formal do Design System (tokens, paleta de cores, tipografia, superfícies, bordas, sombras e catálogo de componentes reutilizáveis com todos os seus estados).

Seu diretório de trabalho exclusivo é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2`

Arquivos de entrada obrigatórios para leitura:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\handoff.md`
- Referência canônica: `client/src/pages/SocialPublishingAdmin.tsx`
- Componentes base: `client/src/components/ui/`
- Arquivo alvo: `client/src/pages/EvolutionAdmin.tsx`

Entregáveis:
1. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`
2. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\handoff.md`

Conteúdo obrigatório da especificação:
- Tokens de cor estritos com conformidade WCAG AA (fundo #090a0b, superfícies bg-white/[.025], bordas border-white/8, acento primário cyan-300 + halo, acento secundário indigo-500, hierarquia de texto zinc-100/300/400 garantindo contraste mínimo 4.5:1).
- Tokens tipográficos (Inter 300 para texto/dados, Space Grotesk light com tracking-[-.04em] para títulos, micro-labels em UPPERCASE tracking-[.18em] zinc-400).
- Tokens de raio (rounded-2xl para cards/containers, rounded-xl para botões/inputs/badges, rounded-full para status pills).
- Catálogo de componentes padronizados com especificação de classes Tailwind para todos os estados:
  * Page Header integrado (com badge de status ativo, sem botão de "Voltar à dashboard" nem menção de "módulo isolado")
  * Segmented Tabs (estilo pill com indicator refinado, sem botão cyan sólido gritante)
  * Metric/KPI Cards (com badge delta, halo no hover, rótulo uppercase)
  * Form Controls (Input, Select, Switch com foco ring-cyan-300/40)
  * Data Tables (header sóbrio, zebra/dividers border-white/5, cell typography, badges de status padronizados)
  * Status Pills (online, offline, pending, error, matched, unmatched - sem emojis, cores sóbrias)
  * Kanban Columns & Cards (container linear, header de etapa com contagem e barra de progresso, card com gravidade e drag handle)
  * Empty States, Skeletons e Error Banners padronizados

## 2026-09-04T21:52:38Z
Você é o UI Architect (especialista 2 da equipe de redesenho do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2

Você DEVE ler antes de iniciar:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md
4. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\handoff.md
5. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\DISPATCH.md
6. client/src/pages/SocialPublishingAdmin.tsx e client/src/pages/EvolutionAdmin.tsx

Produza a especificação completa de Design System em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md
e seu handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\handoff.md

Cobrir minuciosamente:
- Inventário completo de tokens (Cores com ratios WCAG AA, Superfícies, Tipografia, Espaçamentos, Raios, Sombras e Halos).
- Especificação exata de classes Tailwind para componentes e seus estados (default, hover, focus, active, loading, disabled, empty, error):
  * Header unificado de produto
  * Segmented Tabs (nav de abas)
  * Metric Cards (KPIs de operação e CRM)
  * Status Badges / Pills
  * Input / Select / Search controls
  * Data Tables (header, row, hover, action cells)
  * CRM Kanban Columns & Cards
  * Banners de alerta e empty states
- Regra de zero menções a "Evolution" na UI e zero emojis.

Ao finalizar, envie uma mensagem com o resumo dos seus achados e confirme que os arquivos foram salvos.
