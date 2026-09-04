# Relatório de Handoff — Interaction Designer (Milestone M4)

**Data:** 2026-09-04  
**Agente:** Interaction Designer (`interaction_designer_m4`)  
**Destinatário:** Orchestrator & Frontend Implementer (`frontend_implementer_m5`)  
**Tipo de Handoff:** Hard (Tarefa Concluída com Especificação Integral)  
**Artefatos Produzidos:**
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\interaction_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4\handoff.md`

---

## 1. Observation (Observações Diretas)

1. **Estrutura Atual de DnD em `client/src/pages/EvolutionAdmin.tsx`:**
   - Na linha 3, o arquivo importa: `import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";` e `import { CSS } from "@dnd-kit/utilities";`.
   - Na linha 90, o componente `CrmLeadCard` aplica: `<button ref={setNodeRef} type="button" style={{ transform: CSS.Translate.toString(transform) }} ... className={`... ${isDragging ? "cursor-grabbing opacity-35" : locked ? "cursor-not-allowed opacity-70" : "cursor-grab"}`}>`.
   - Na linha 341, o `<DragOverlay dropAnimation={null}>` renderiza um clone do card enquanto o card original também é transladado pelo CSS translate. Isso causa renderização duplicada de cards em movimento e jitter visual.
   - Na linha 149, a configuração de sensores é limitada ao ponteiro: `const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));`. Não há `KeyboardSensor` registrado, violando os critérios de acessibilidade para usuários que dependem exclusivamente de teclado.
2. **Navegação por Abas e Indicador Visual:**
   - Na linha 335, a barra de abas define: `className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition ${view === id ? "bg-cyan-300 text-[#082124] font-medium" : "border border-white/10 bg-white/[.025] text-zinc-400 hover:bg-white/[.06] hover:text-white"}`}`.
   - A aba ativa utiliza fundo ciano sólido idêntico ao botão de ação primária (CTA), criando concorrência semiótica grave e ausência de atributos ARIA (`role="tablist"`, `role="tab"`, `aria-selected`).
3. **Barra de Escopo Estática vs Flutuante:**
   - Na linha 318, `<section aria-label="Escopo de instâncias" className="mb-6 grid gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-4 md:grid-cols-[1fr_1fr_auto]">` rola para fora da tela junto com o conteúdo, forçando o operador a rolar de volta ao topo toda vez que precisa alternar entre instâncias ou unidades.
   - Em contrapartida, no arquivo canônico de referência `client/src/pages/SocialPublishingAdmin.tsx` (linha 289), a barra utiliza `lg:sticky lg:top-3 lg:z-20 lg:flex-row lg:items-center lg:justify-between` com `backdrop-blur-md bg-[#0d1215]/90`.
4. **Violações Textuais Ativas de Marca ("Evolution"):**
   - Na linha 339: *"Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual."*
   - Na linha 361: *"O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha, conjunto, anúncio ou criativo na fonte de métricas."*
   - Na linha 376: Rodapé com texto depreciativo *"Painel administrativo isolado > Pixel"* com classe ilegível `text-zinc-700` (contraste 1.85:1).
5. **Estado dos Testes Automatizados no Repositório:**
   - Execução do comando `pnpm vitest run`:
     - 54 arquivos de teste passaram com sucesso (197 testes unitários aprovados).
     - Todos os testes de escopo, CRM e RPC relacionados ao módulo (`evolutionScope.test.ts`, `crmPipeline.test.ts`, `evolutionAdminPolicy.test.ts`, `evolutionWebhook.test.ts`, `evolutionSupabaseRpc.test.ts`) passaram 100%.
     - As únicas 2 falhas pontuais ocorreram em `server/feedback-leads.test.ts` por ausência da variável de ambiente local `DATABASE_URL` para o banco de feedbacks, sem relação com o módulo Pixel.
6. **Dependências Instaladas no `package.json`:**
   - `@dnd-kit/core`: `^6.3.1`
   - `@dnd-kit/sortable`: `^10.0.0`
   - `@dnd-kit/utilities`: `^3.2.2`
   - `lucide-react`: `^0.453.0`
   - `clsx`: `^2.1.1`, `tailwind-merge`: `^3.3.1`
   - `react`: `^19.2.1`, `tailwindcss`: `^4.1.14`
   - Nenhuma dependência externa adicional é necessária.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

1. **Da Observação 1 (Jitter e Acessibilidade do DnD) para a Especificação:**
   - Como o `transform` estava sendo aplicado diretamente ao elemento que já possuía um clone no `DragOverlay`, ocorria descompasso visual (dois cards simultâneos movendo-se na tela).
   - Portanto, a regra estabelecida na especificação é: quando `isDragging === true`, o card na coluna original deve manter `transform: undefined` e assumir o estado de fantasma (`opacity-30 border-dashed border-cyan-400/40 bg-cyan-950/20 scale-95`), delegando 100% da animação de deslocamento ao `DragOverlay`.
   - Como apenas `PointerSensor` estava registrado, usuários de teclado não conseguiam mover leads entre colunas. A adição do `KeyboardSensor` com `sortableKeyboardCoordinates` associada ao mapa de teclas (`Space`/`Enter` para pegar/soltar, setas para navegar entre colunas e `Escape` para cancelar) e anúncios `aria-live` soluciona a conformidade com WCAG 2.1 AA sem adicionar bibliotecas.
2. **Da Observação 2 (Aba Ativa Competindo com CTA) para a Especificação:**
   - O uso de `bg-cyan-300 text-[#082124]` em abas confunde a hierarquia semiótica do usuário (ele não sabe o que é uma ação de disparo e o que é uma alternância de visualização).
   - A especificação padroniza a aba ativa como pílula translúcida `bg-white/[.08] text-white border-white/10` com um microindicador de barra luminosa ciano inferior (`h-0.5 w-6 bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.7)]`). O preenchimento sólido ciano fica restrito ao botão primário "Atualizar dados".
3. **Da Observação 3 (Scope Bar Estática) para a Especificação:**
   - Em operações diárias, o operador precisa rolar tabelas com dezenas de leads ou colunas de kanban com centenas de mensagens. Perder o filtro de unidade/instância no topo cria atrito operacional repetitivo.
   - A especificação adota `lg:sticky lg:top-3 lg:z-20` com `backdrop-blur-md` e `bg-[#090a0b]/85`, sincronizada com o padrão canônico de `SocialPublishingAdmin.tsx`.
4. **Da Observação 4 (Vazamentos Textuais) para a Especificação:**
   - As strings na UI que citavam "Supabase Evolution", "quando a Evolution entrega" e "Painel administrativo isolado" foram totalmente substituídas no guia de cópia por terminologia institucional de produto ("Pixel", "Central de Rastreamento & Atribuição WhatsApp", "sincronizada em tempo real"), mantendo intactos os nomes internos de variáveis e rotas de backend.
5. **Da Observação 5 e 6 (Testes e Pacotes Existentes) para a Especificação:**
   - Como os testes de contrato e regras de negócio passam com sucesso e o ecossistema `@dnd-kit` e `lucide-react` já está presente, todas as interações propostas são realizáveis de forma 100% nativa sem nenhuma alteração no `package.json`.

---

## 3. Caveats (Ressalvas & Limitações de Escopo)

1. **Modo Somente Leitura Deste Milestone (M4):**
   - Como o papel de Interaction Designer é analítico e projetual (read-only), nenhum código-fonte em `client/src/pages/EvolutionAdmin.tsx` foi alterado diretamente. O código completo e pronto para aplicação foi entregue no artefato `interaction_spec.md`.
2. **Comportamento do PointerSensor em Dispositivos Móveis:**
   - A distância de ativação de 8px (`activationConstraint: { distance: 8 }`) atende perfeitamente ao desktop e à maioria dos tablets, mas em telas touch de baixa sensibilidade pode exigir que o usuário pressione firmemente o card antes de arrastar. Em contrapartida, isso protege o toque de abrir o modal de detalhes por engano.
3. **Persistência de Estado do Accordion na Auditoria:**
   - A expansão do payload JSON na aba de Auditoria utiliza estado local do componente (React state). Se o usuário trocar de aba e retornar à Auditoria, os accordions retornam ao estado colapsado inicial, o que é o comportamento esperado para não sobrecarregar a memória do DOM.

---

## 4. Conclusion (Conclusão & Recomendações para M5)

O design de interação do módulo **Pixel** foi completamente estruturado e alinhado aos padrões da dashboard Tráfego Pro e referências de mercado de alta precisão (Linear, Vercel, Retool).

As principais entregas e garantias para a implementação (M5) são:
1. **DnD sem Jitter com `@dnd-kit`:** Separação estrita entre o card fantasma na coluna de origem (`opacity-30`, sem `transform`) e o card animado pelo `DragOverlay` (`scale-105`, `rotate-1`, sombra ciano e dropAnimation suave).
2. **Drop Zone Shimmer:** Indicador visual de slot disponível com linha pontilhada ciano pulsante ao passar o mouse sobre qualquer uma das 7 colunas do pipeline.
3. **Acessibilidade WCAG 2.1 AA:** Focus rings unificados com contraste de 12.8:1, suporte a navegação e movimentação de cards por teclado, focus trap em modais e leitores de tela assistidos via `aria-live`.
4. **Catálogo de Skeletons com Zero CLS:** Esqueletos padronizados para tela inicial, KPIs, tabelas, esteira kanban e chat.
5. **Sanitização Rigorosa:** Zero emojis em toda a interface e zero menções a "Evolution" na UI visível.

---

## 5. Verification Method (Método de Verificação Independente)

Para que o Implementador (`frontend_implementer_m5`) e o Revisor de QA (`qa_reviewer_m6`) possam validar de forma independente a especificação:

1. **Verificação de Regras Duras & Ausência de Termos Proibidos:**
   ```powershell
   # Verificar se restou qualquer menção textual a Evolution na UI do arquivo alvo
   grep -i "evolution" "client/src/pages/EvolutionAdmin.tsx"
   # Observação: Nomes de imports e rotas de API permanecem; textos em JSX/UI devem ser estritamente zero.
   ```
2. **Verificação de Ausência de Emojis:**
   ```powershell
   # Confirmar que nenhum caractere emoji existe no componente
   powershell -Command "Select-String -Path 'client/src/pages/EvolutionAdmin.tsx' -Pattern '[\uD83C-\uDBFF\uDC00-\uDFFF]+'"
   ```
3. **Execução da Suíte de Testes Existente:**
   ```powershell
   pnpm vitest run client/src/lib/crmPipeline.test.ts client/src/lib/evolutionScope.test.ts client/src/lib/evolutionAdminPolicy.test.ts
   ```
   - **Condição de Sucesso:** Todos os 5 testes dessas três suítes devem passar em 100%.
4. **Verificação Visual e Tátil no Navegador (Manual / QA):**
   - **DnD Jitter:** Ao arrastar um card no CRM, inspecione visualmente se o card na coluna original não se desloca pela tela junto com o cursor. Apenas o `DragOverlay` deve se mover.
   - **Drop Zone:** Ao passar o card sobre uma coluna vizinha, a coluna deve exibir o slot pontilhado pulsante ciano ("Solte o contato aqui").
   - **Focus Rings:** Pressione `Tab` sucessivamente pela página. Todos os botões, selects, abas e cards devem exibir um anel ciano vibrante com anel de afastamento preto (`ring-cyan-300/70 ring-offset-[#090a0b]`).
   - **Cópia Rápida:** Clique em qualquer botão de cópia de ID na aba Atribuição ou Origem. O ícone de cópia deve se transformar em um check verde esmeralda com o texto "Copiado!" por 1.5 segundos.

---
*Relatório de Handoff emitido por `interaction_designer_m4` em estrita conformidade com o Teamwork Protocol.*
