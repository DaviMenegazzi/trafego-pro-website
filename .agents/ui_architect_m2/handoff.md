# Handoff Report — M2 UI Architect

**Agent:** `ui_architect_m2`  
**Milestone:** `M2: Design System Specification`  
**Deliverable Document:** `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`  
**Target Codebase:** `client/src/pages/EvolutionAdmin.tsx` e componentes satélites  
**Canonical Reference:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`  
**Status:** Completo / Pronto para M3 (Information Designer) e M4 (Interaction Designer)

---

## 1. Observation

A partir da leitura minuciosa dos arquivos de entrada (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `audit_report.md`, `handoff.md` do M1, `SocialPublishingAdmin.tsx` e `EvolutionAdmin.tsx`), foram observados os seguintes fatos concretos:

### 1.1 Inconsistência de Superfícies, Largura e Elevação
- Em `SocialPublishingAdmin.tsx:284`, o container mestre utiliza:
  ```tsx
  <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
  ```
  Enquanto em `EvolutionAdmin.tsx:311`, o container mestre utilizava `max-w-[1480px]` com padding divergente (`px-5 py-6 sm:px-8 lg:px-10`).
- Em `EvolutionAdmin.tsx:309`, o elemento raiz `<main>` contém estilos inline redundantes:
  ```tsx
  style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}
  ```
  violando o padrão utilitário do Tailwind.
- Há uma dispersão de fundos escuros competindo sem elevação semântica: `bg-[#101214]` (linhas 320, 326, 348), `bg-[#101214]/95` (linha 90), `bg-black/15` (linhas 342, 347) e `bg-white/[.045]` (linha 363).

### 1.2 Conflito Semiótico no Controle de Abas
- Em `EvolutionAdmin.tsx:335`, a aba selecionada recebe:
  ```tsx
  className={`... ${view === id ? "bg-cyan-300 text-[#082124] font-medium" : "border border-white/10 bg-white/[.025] text-zinc-400 hover:bg-white/[.06] hover:text-white"}`}
  ```
  Isso confere à aba ativa exatamente a mesma cor, contraste e peso visual do botão primário de ação ("Atualizar dados", linha 314: `bg-cyan-300 text-[#082124]`), quebrando a hierarquia entre navegação e gatilho de ação.

### 1.3 Violações Críticas de Contraste WCAG AA
Luminância relativa calculada no fundo base `#090a0b` ($L = 0.0030$):
- `text-zinc-600` (`#52525b`, $L = 0.0841$): Razão = **2.53:1** (Reprovado no mínimo 4.5:1). Encontrado em mais de 20 pontos de micro-labels e tabelas.
- `text-zinc-700` (`#3f3f46`, $L = 0.0480$): Razão = **1.85:1** (Reprovado crítico). Encontrado no rodapé (linha 376).
- `text-zinc-500` (`#71717a`, $L = 0.1670$): Razão = **4.09:1** (Reprovado para texto normal < 18pt).
- Em contrapartida, `text-zinc-400` (`#a1a1aa`, $L = 0.354$): Razão = **7.62:1** (Aprovado com folga em WCAG AAA).

### 1.4 Vazamentos Textuais de "Evolution"
- Linha 339: `"Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual."`
- Linha 361: `"O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha..."`

### 1.5 Quebra da Linearidade do Pipeline Kanban
- Em `EvolutionAdmin.tsx:341`, o pipeline de 7 estágios sequenciais está montado em:
  ```tsx
  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
  ```
  Fazendo com que colunas finais (Negociação, Fechado, Perdido) quebrem para a linha de baixo em telas comuns (1280px a 1440px), desorientando a progressão comercial.

---

## 2. Logic Chain

1. **Da Premissa de Integração à Padronização de Layout:**
   - *Observação:* `SocialPublishingAdmin.tsx:284` adota `max-w-[1440px]`, enquanto `EvolutionAdmin.tsx:311` adota `max-w-[1480px]`.
   - *Raciocínio:* Para que o usuário sinta consistência contínua ao transitar entre os módulos da dashboard, a largura máxima deve ser padronizada em `max-w-[1440px] mx-auto px-5 py-6 sm:px-8 lg:px-10`.

2. **Da Análise Semiótica ao Redesenho de Abas:**
   - *Observação:* Abas usavam `bg-cyan-300 text-[#082124]`, idêntico ao botão de ação primária (CTA).
   - *Raciocínio:* O padrão de excelência (Linear/Vercel) reserva cores de destaque saturadas para chamadas de ação. Navegação por abas deve ser discreta. O novo componente `PixelSegmentedTabs` utiliza container com `bg-white/[.025]`, item ativo em `bg-white/[.08] text-white border-white/10` e microindicador inferior ciano (`bg-cyan-300 h-0.5 w-6`), desonerando visualmente o topo da página.

3. **Dos Cálculos Fotométricos à Elevação de Tokens:**
   - *Observação:* `text-zinc-600` (2.53:1) e `text-zinc-500` (4.09:1) falham na norma WCAG AA sobre `#090a0b`.
   - *Raciocínio:* A elevação mandatória desses elementos para `text-zinc-400` (7.62:1) e `text-zinc-300` (13.2:1) elimina completamente a ilegibilidade sem clarear excessivamente a atmosfera escura.

4. **Do Modelo Mental de Vendas à Esteira Horizontal do CRM:**
   - *Observação:* O grid de 4 colunas quebra os 7 estágios em múltiplas linhas.
   - *Raciocínio:* Um funil é intrinsecamente sequencial da esquerda para a direita. O layout foi especificado como container com rolagem horizontal (`flex gap-4 overflow-x-auto pb-4 pt-1`) com colunas de largura fixa `w-[290px] shrink-0` e scroll interno `max-h-[660px]`.

5. **Da Regra de Marca à Blindagem Textual e Semiótica:**
   - *Observação:* Duas strings vazam o nome "Evolution", além do tom de "módulo isolado".
   - *Raciocínio:* Mapeamento de sanitização integral especificado em tabela De -> Para no Design System Spec, com substituição de todos os termos por "Pixel" / "Central de Rastreamento & Atribuição" e substituição de emojis por ícones Lucide estruturados.

---

## 3. Caveats

- **Imutabilidade de Contratos de Dados:** Nenhuma rota de API (`/api/evolution/*`), tipo TypeScript ou propriedade de banco de dados foi renomeada no backend. A especificação orienta exclusivamente a camada de apresentação visual.
- **Não Aplicação Direta no Código Fonte Neste Milestone:** Em estrito cumprimento ao protocolo de arquiteto (`ui_architect_m2`), nenhuma linha de `client/src/pages/EvolutionAdmin.tsx` foi editada ainda. As propostas estão materializadas no arquivo `design_system_spec.md`, que servirá de guia para o `frontend_implementer_m5`.
- **Comportamento Dinâmico de Drag and Drop:** A especificação visual do placeholder de drop (`isOver`) depende dos hooks do `@dnd-kit/core`, que serão detalhados em termos de micro-interações pelo `interaction_designer_m4`.

---

## 4. Conclusion

A especificação canônica do Design System foi elaborada e gravada com sucesso em:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`

Ela fornece a base técnica completa para os próximos especialistas:
1. **M3 (Information Designer):** Dispõe agora dos tokens de grid (múltiplos de 4px, `max-w-[1440px]`), hierarquia de superfícies e dimensões de componentes para estruturar os wireframes das 6 abas.
2. **M4 (Interaction Designer):** Dispõe das matrizes de estado (default, hover, focus-visible, active, loading, disabled, empty, error) e dos parâmetros visuais de DnD e feedback.
3. **M5 (Frontend Implementer):** Dispõe de blocos exatos de classes Tailwind 4 para cada componente, evitando retrabalho ou suposições visuais.

---

## 5. Verification Method

Para verificar de forma independente e reproduzir a conformidade desta especificação:

1. **Verificação do Arquivo de Especificação:**
   Inspecionar o arquivo gerado:
   ```powershell
   Get-Content "C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md" -TotalCount 100
   ```

2. **Verificação de Fórmulas de Contraste WCAG AA:**
   Testar no WebAIM Contrast Checker ou calcular:
   - `#a1a1aa` (`text-zinc-400`) sobre `#090a0b`:
     $$\frac{0.354 + 0.05}{0.003 + 0.05} = \frac{0.404}{0.053} = 7.62:1 \quad (\ge 4.5:1 \implies \text{PASS})$$
   - `#67e8f9` (`text-cyan-300`) sobre `#090a0b`:
     $$\frac{0.627 + 0.05}{0.003 + 0.05} = \frac{0.677}{0.053} = 12.77:1 \quad (\ge 4.5:1 \implies \text{PASS})$$

3. **Verificação de Integridade dos Testes Unitários:**
   ```powershell
   npx vitest run
   ```
   *Condição de invalidação:* Qualquer falha de build ou erro em `evolutionAdminPolicy.test.ts` ou políticas correlatas.
