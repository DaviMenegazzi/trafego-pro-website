# Project: Redesenho Visual do Módulo Pixel (/pixel)

## Architecture
- Rota: `/pixel` (React 19, Vite 7, Tailwind 4, Wouter)
- Arquivo central: `client/src/pages/EvolutionAdmin.tsx`
- Componentes de apoio: `client/src/lib/evolutionScope.ts`, `evolutionAdminPolicy.ts`, `@dnd-kit`, `lucide-react`, `client/src/components/ui/`
- Arquivo visual de referência (irmão mais próximo): `client/src/pages/SocialPublishingAdmin.tsx`
- Identidade visual da dashboard: Dark operations-grade (Linear/Vercel/Retool-like), `#090a0b` base, `border-white/8`, `bg-white/[.025]`, acento cyan-300 com halo sutil, tipografia Inter 300 e Space Grotesk light para títulos.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Diagnóstico Visual & WCAG | Levantamento de inconsistências, densidade, contraste e fricção por aba | M1: Audit | ORIGINAL_REQUEST |
| 2 | Design System Spec | Tokens, paleta, hierarquia de superfícies, estados de componentes | M2: UI Arch | ORIGINAL_REQUEST |
| 3 | Information Design & Wireframes | Wireframes textuais, grid de 4px, hierarquia das 6 abas | M3: Info Design | ORIGINAL_REQUEST |
| 4 | Interaction Spec | Micro-interações, hover, DnD shimmer, loading skeletons, a11y | M4: Interaction | ORIGINAL_REQUEST |
| 5 | Implementação Frontend | Código em client/src/pages/EvolutionAdmin.tsx sem quebra de lógica ou types | M5: Frontend | ORIGINAL_REQUEST |
| 6 | QA & Verificação Visual | Validação de contraste, responsividade, testes vitest e ausência de 'Evolution' | M6: QA Review | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1_design_auditor | Auditoria de UI/UX, contraste WCAG, inconsistências por aba | none | DONE |
| 2 | M2_ui_architect | Tokens e Design System alinhado com a Dashboard | M1 | DONE |
| 3 | M3_information_designer | Estrutura de informação e wireframes textuais por aba | M2 | DONE |
| 4 | M4_interaction_designer | Especificação de interações, DnD e estados dinâmicos | M3 | DONE |
| 5 | M5_frontend_implementer | Implementação Tailwind 4 + React em EvolutionAdmin.tsx | M4 | DONE |
| 6 | M6_qa_reviewer | Validação rigorosa e vitest run | M5 | DONE |

## Code Layout
- Target Principal: `client/src/pages/EvolutionAdmin.tsx`
- Subcomponentes (se necessário): `client/src/components/pixel/`
- Referência: `client/src/pages/SocialPublishingAdmin.tsx`
- Restrição: Proibido renomear arquivos existentes ou adicionar pacotes novos.
