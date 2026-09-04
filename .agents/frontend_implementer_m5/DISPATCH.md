# Dispatch — frontend_implementer

## Missão
Você é o Frontend Implementer (especialista 5 da equipe de redesenho do Pixel).
Sua missão é implementar em código React 19 + Tailwind 4 o redesign visual e de UX completo do módulo Pixel no arquivo:
`client/src/pages/EvolutionAdmin.tsx` (e subcomponentes em `client/src/components/pixel/` caso deseje modularizar), seguindo estritamente as especificações produzidas pelos 4 especialistas anteriores.

Seu diretório de trabalho exclusivo é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5`

Arquivos de entrada obrigatórios:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md`
- Arquivo alvo: `client/src/pages/EvolutionAdmin.tsx`

RESTRIÇÕES DURAS INEGOCIÁVEIS:
- NÃO renomear arquivos, funções, tipos, rotas de API, tabelas Supabase. O arquivo principal continua sendo client/src/pages/EvolutionAdmin.tsx.
- NÃO adicionar dependências novas ao package.json.
- NÃO introduzir estados/contextos globais novos.
- NÃO mudar lógica de negócio, atribuição, DnD ou filtros.
- SEM emojis, gifs ou imagens genéricas.
- Todo texto em pt-BR sóbrio e técnico.
- Nome visível no produto SEMPRE "Pixel" (zero menções a "Evolution" na UI visível).
- Garantir que testes continuem passando (`npx vitest run`).

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A qa_reviewer will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Entregáveis:
1. Modificações no código de `client/src/pages/EvolutionAdmin.tsx` (e `client/src/components/pixel/` se aplicável).
2. Verificação de TypeScript e execução dos testes (`npx vitest run`).
3. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5\handoff.md` estruturado com as 5 seções canônicas.

## 2026-09-04T22:01:52Z
USER_REQUEST:
Você é o Frontend Implementer (especialista 5 da equipe de redesenho do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5

Você DEVE ler antes de codificar:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md
4. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md
5. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md
6. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5\DISPATCH.md
7. client/src/pages/EvolutionAdmin.tsx

RESTRIÇÕES DURAS INEGOCIÁVEIS:
- NÃO renomear arquivos, funções, tipos, rotas de API, tabelas Supabase. O arquivo principal continua sendo client/src/pages/EvolutionAdmin.tsx.
- NÃO adicionar dependências novas ao package.json.
- NÃO introduzir estados/contextos globais novos.
- NÃO mudar lógica de negócio, atribuição, DnD ou filtros.
- SEM emojis, gifs ou imagens genéricas.
- Todo texto em pt-BR neutro, sóbrio e técnico.
- Nome visível no produto SEMPRE "Pixel" (zero menções a "Evolution" na UI visível — verificar linhas 339, 361, footer, badges, etc.).
- Garantir que testes continuem passando (vitest run).

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A qa_reviewer will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execução:
1. Aplique o redesign em client/src/pages/EvolutionAdmin.tsx (e subcomponentes em client/src/components/pixel/ se conveniente), seguindo os tokens e classes de ui_architect, os wireframes de information_designer e as micro-interações de interaction_designer.
2. Certifique-se de que o DnD utilize o padrão sem jitter com DragOverlay e drop zone shimmer.
3. Certifique-se de que a esteira do CRM tenha 7 colunas horizontais contínuas (w-[290px] shrink-0) com scroll horizontal.
4. Rode a verificação de tipos e a suíte de testes (npx vitest run).
5. Escreva o relatório completo de handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5\handoff.md

Ao finalizar, envie uma mensagem com o resumo das alterações e o resultado dos testes.

