# Dispatch — qa_reviewer

## Missão
Você é o QA Reviewer (especialista 6 da equipe de redesenho do Pixel).
Sua missão é realizar uma auditoria rigorosa e adversarial de qualidade, integridade e conformidade sobre a implementação entregue em `client/src/pages/EvolutionAdmin.tsx`.

Seu diretório de trabalho exclusivo é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6`

Arquivos de entrada obrigatórios:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5\handoff.md`
- Arquivo alvo implementado: `client/src/pages/EvolutionAdmin.tsx`

Checklist de Verificação Rigorosa:
1. **Contraste WCAG AA**: Nenhuma classe de texto de baixo contraste (`text-zinc-600`, `text-zinc-700`) em elementos textuais legíveis. Uso correto de `text-zinc-400` (7.6:1) e `text-zinc-300` (13.2:1).
2. **Sanitização de Marca**: Nenhuma string com "Evolution" visível para o usuário final em botões, títulos, rodapé, textos de ajuda ou badges. Confirmar substituição por "Pixel" / "Central de Rastreamento & Atribuição".
3. **Ausência Absoluta de Emojis**: Confirmar via regex Unicode que não restou nenhum caractere emoji no arquivo.
4. **Responsividade & Layout**: Container mestre `max-w-[1440px]`, esteira horizontal contínua de 7 colunas no CRM Kanban (`w-[290px] shrink-0`), sticky scope bar com blur no scroll.
5. **Preservação de Lógica de Negócio e DnD**: Integração correta com `@dnd-kit/core`, handlers `onDragEnd`, `moveCrmLead`, filtros por instância/unidade e integridade dos hooks do React.
6. **Execução e Sucesso dos Testes**: Rodar `npx vitest run client` e `npx tsc --noEmit`. Todos os testes devem passar com 100% de sucesso.
7. **Veredito**: Emitir veredito explícito: `APPROVE` ou `REQUEST_CHANGES`.

Entregáveis:
1. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6\qa_report.md` (Checklist detalhado com evidências de execução).
2. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6\handoff.md` (Handoff estruturado em 5 seções canônicas com Veredito).

## 2026-09-04T22:14:17Z
Você é o QA Reviewer (especialista 6 da equipe de redesenho do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6

Você DEVE ler antes de avaliar:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md
4. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md
5. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md
6. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\frontend_implementer_m5\handoff.md
7. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6\DISPATCH.md
8. client/src/pages/EvolutionAdmin.tsx

Realize uma bateria completa e rigorosa de verificações:
1. Contraste WCAG AA: verificar se há uso indevido de text-zinc-600 ou text-zinc-700 em textos visíveis.
2. Sanitização de Marca: verificar se há qualquer vazamento da palavra "Evolution" na UI visível (em tags JSX, botões, labels, footer).
3. Zero Emojis: verificar ausência de caracteres emojis.
4. Preservação de contratos, lógica de negócio, filtros por unidade/instância e funcionamento do Kanban DnD.
5. Execução de TypeScript check: npx tsc --noEmit.
6. Execução de suíte de testes: npx vitest run client.
7. Build: npx vite build.

Produza seu relatório de QA em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6\qa_report.md
e seu handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\qa_reviewer_m6\handoff.md

Emita um veredito claro: APPROVE ou REQUEST_CHANGES.
Ao finalizar, envie uma mensagem com o resumo da avaliação e o veredito final.
