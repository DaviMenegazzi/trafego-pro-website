# Especificação de Interações, Movimento & Acessibilidade — Módulo Pixel (/pixel)

**Versão:** 2.0.0-canonical  
**Data:** 2026-09-04  
**Autor:** Interaction Designer (`interaction_designer_m4`)  
**Status:** Aprovado / Normativo para os Milestones M5 (Implementação Frontend) e M6 (QA & Verificação)  
**Alvo Principal:** `client/src/pages/EvolutionAdmin.tsx` e componentes satélites  
**Referências Canônicas:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`, `client/src/lib/crmPipeline.ts`  
**Diretório de Trabalho Exclusivo:** `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\interaction_designer_m4`

---

## 1. Princípios de Interação & Motion Architecture

O módulo **Pixel** é uma ferramenta de missão crítica para administradores e gestores de tráfego. Todas as interações devem transmitir **estabilidade operacional**, **alta velocidade de resposta** e **previsibilidade tátil**. Inspirado no design language de produtos como Linear, Vercel e Retool, o sistema de movimento é utilitário e refinado, nunca ornamentado.

### 1.1 Princípios Fundamentais

1. **Zero Jitter & Estabilidade de Layout (Zero CLS):**
   Nenhuma transição, abertura de modal ou troca de estado deve deslocar elementos vizinhos de forma brusca. Espaços para spinners, badges e tooltips são pré-reservados.
2. **Feedback Físico Imediato (Haptic Visual Feedback):**
   Toda ação interativa responde em menos de 100ms. Cliques utilizam micro-compressão suave (`active:scale-[0.98]` ou `active:scale-95`), hovers elevam a luminosidade da borda de forma gradativa (`duration-150`), e drags conferem sensação de elevação física tridimensional.
3. **Acessibilidade Inegociável (WCAG 2.1 AA Keyboard First):**
   100% dos fluxos (incluindo o pipeline Drag-and-Drop do CRM) devem ser operáveis via teclado, com focus rings de alto contraste (mínimo de 12:1 contra o fundo) e anúncios auditivos claros via `aria-live`.
4. **Respeito Estrito a Preferências de Movimento (`prefers-reduced-motion`):**
   Usuários com sensibilidade vestibular têm animações de deslocamento e pulsos desativados via classes `motion-reduce:transition-none` e `motion-reduce:animate-none`.
5. **Sanitização Absoluta & Blindagem:**
   - **Zero emojis**: substituição obrigatória por ícones vetoriais `lucide-react`.
   - **Zero menções a "Evolution" na UI visível** (marca canônica: "Pixel").
   - **Zero novas dependências**: aproveitamento integral dos pacotes já instalados no `package.json` (`@dnd-kit/core`, `@dnd-kit/utilities`, `lucide-react`, `tailwindcss 4`).

---

## 2. Catálogo Detalhado de Micro-Interações por Componente

### 2.1 Header Unificado de Produto (`PixelHeader`)

O cabeçalho substitui a semiótica de isolamento técnico por uma presença de produto de alto escalão com feedback de sincronização em tempo real.

```
+----------------------------------------------------------------------------------------------------+
| [Ícone Signal Halo]  TRÁFEGO PRO · CENTRAL DE RASTREAMENTO  (• Em tempo real - pulse verde)       |
|                      Pixel & Atribuição                                                            |
|                      Monitoramento contínuo de instâncias...       [Sincronização] [Atualizar (CTA)]|
+----------------------------------------------------------------------------------------------------+
```

#### 2.1.1 Micro-interação do Botão "Atualizar dados" (CTA Primário)
- **Estado de Repouso (Default):**
  - Classes: `bg-cyan-300 text-[#082124] px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all duration-150`
  - Cursor: `cursor-pointer`
- **Estado de Pairar (Hover):**
  - Classes: `hover:bg-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,.30)]`
  - Transição: Aumento suave de luminosidade do ciano e halo expansivo de 20px.
- **Estado de Pressionamento (Active):**
  - Classes: `active:scale-[0.98] active:brightness-95`
  - Transição: Micro-compressão tátil instantânea (0.98x).
- **Estado de Carregamento (Loading / Sincronizando):**
  - Classes: `disabled:cursor-not-allowed disabled:opacity-75 bg-cyan-300/80`
  - Comportamento: O ícone `RefreshCw` recebe a classe `animate-spin` com rotação infinita suave a 1 rotação por segundo (`animation: spin 1s linear infinite`).
  - **Prevenção de Salto de Layout:** A largura do botão deve ter largura mínima fixa (`min-w-[145px] justify-center`) para que a alternância entre o texto "Atualizar dados" e "Sincronizando…" não altere a largura do botão nem empurre os elementos vizinhos.
- **Foco via Teclado (Focus-Visible):**
  - Classes: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]`

#### 2.1.2 Micro-indicador "Em tempo real"
- Pílula verde esmeralda com ponto de pulso:
  - Container: `border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300 rounded-full`
  - Ponto interior: `h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse` com ciclo de pulso de 2 segundos.
  - Redução de movimento: `motion-reduce:animate-none`.

---

### 2.2 Segmented Tabs Navigation (`PixelSegmentedTabs`)

Substitui o antigo fundo ciano sólido (que competia com botões de ação) por uma barra segmentada em estilo pílula com indicador luminoso inferior e navegação fluida por teclado.

```
+----------------------------------------------------------------------------------------------------+
|  [ [Activity] Operação ]   [ [Users] CRM (42) ]   [ [Mouse] Atribuição ]   [ [Message] Conversas ] |
|        ============== (cyan bar indicador)                                                        |
+----------------------------------------------------------------------------------------------------+
```

#### 2.2.1 Estados e Transições das Abas
- **Container da Tablist:**
  - Classes: `inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[.025] p-1.5 shadow-inner`
  - Papel ARIA: `role="tablist"` com `aria-orientation="horizontal"`.
- **Aba Inativa:**
  - Classes: `group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-400 border border-transparent transition-all duration-150 hover:bg-white/[.04] hover:text-zinc-200`
  - Ícone: `text-zinc-400 group-hover:text-zinc-200 transition-colors`
  - Badge numérico: `bg-white/5 text-zinc-400 group-hover:text-zinc-300`
  - Papel ARIA: `role="tab"` com `aria-selected="false"` e `tabIndex={-1}`.
- **Aba Ativa:**
  - Classes: `group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium bg-white/[.08] text-white border border-white/10 shadow-sm shadow-black/40`
  - Ícone: `text-cyan-300`
  - Badge numérico: `bg-cyan-400/20 text-cyan-200 border border-cyan-400/30`
  - Papel ARIA: `role="tab"` com `aria-selected="true"` e `tabIndex={0}`.
- **Micro-indicador Ciano (Active Underline Indicator):**
  - Renderizado apenas sob a aba ativa:
    `<span className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.7)] transition-all duration-200 ease-out" />`
  - Confere âncora óptica luminosa sem sobrecarregar a área clicável.

#### 2.2.2 Navegação por Teclado na Tablist (WCAG 2.1 AA)
- **Tecla `ArrowRight`:** Transfere o foco para a próxima aba. Se estiver na última, faz o ciclo para a primeira.
- **Tecla `ArrowLeft`:** Transfere o foco para a aba anterior. Se estiver na primeira, faz o ciclo para a última.
- **Tecla `Home`:** Foca imediatamente na primeira aba ("Operação").
- **Tecla `End`:** Foca imediatamente na última aba ("Auditoria").
- **Tecla `Enter` ou `Space`:** Ativa a aba focada e exibe o painel correspondente (`role="tabpanel"` associado via `aria-controls`).

---

### 2.3 Sticky Scope Bar (`PixelScopeBar`)

Barra de seleção de unidade e instância com fixação superior no scroll.

```
+----------------------------------------------------------------------------------------------------+
| [ Select Unidade: Todas as unidades v ]  [ Select Instância: Todas v ]  [ 4 instâncias · 128 leads ]|
+----------------------------------------------------------------------------------------------------+
```

#### 2.3.1 Transição de Rolagem (Sticky Blur Effect)
- **Posicionamento:** `lg:sticky lg:top-3 lg:z-20`
- **Superfície:** `rounded-2xl border border-white/10 bg-[#090a0b]/85 p-3.5 shadow-xl backdrop-blur-md transition-shadow duration-200`
- **Feedback de Rolagem:** Ao rolar a página, a barra flutua sobre o conteúdo; o efeito `backdrop-blur-md` (blur de 12px) e o fundo translúcido evitam interferência visual do texto que passa por baixo.
- **Micro-interação nos Seletores de Escopo (`<select>`):**
  - Superfície: `rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-9 text-xs text-zinc-100 font-light outline-none transition duration-150`
  - Hover: `hover:border-white/20 hover:bg-[#14181a]`
  - Focus: `focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40`
  - O ícone `ChevronDown` posicionado à direita ganha leve rotação ou destaque de cor ao receber foco.
- **Feedback ao Alterar Escopo:**
  - A pílula de contagem à direita (`4 instância(s) · 128 contato(s)`) atualiza imediatamente sem recarregar a tela, com breve realce de opacidade (`transition-opacity duration-200`).

---

### 2.4 Metric / KPI Cards (`PixelMetricCard`)

Cards de visão executiva com tipografia Space Grotesk e micro-animação de borda.

```
+------------------------------------------+
| EVENTOS HOJE [Activity]                  |
| 1.428                      +12% últimas  |
| Eventos recebidos hoje     24h           |
+------------------------------------------+
```

#### 2.4.1 Estados Interativos
- **Estado de Repouso:**
  - Classes: `rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10 transition-all duration-200`
- **Estado de Hover (Cards Informativos):**
  - Classes: `hover:border-cyan-300/30 hover:bg-white/[.035] hover:shadow-[0_0_30px_rgba(34,211,238,.08)]`
  - O ícone do card no canto superior direito sofre escala sutil (`group-hover:scale-105 transition-transform duration-200`).
- **Cards Interativos Clicáveis (Exemplo: Aba Origem & tags):**
  - Quando um card KPI é utilizado como filtro rápido da tabela:
    - Cursor: `cursor-pointer`
    - Estado Não Selecionado: borda neutra `border-white/8`.
    - Estado Selecionado (Filtro Ativo): `border-cyan-300/50 bg-cyan-400/[.06] shadow-[0_0_20px_rgba(34,211,238,.12)] ring-1 ring-cyan-300/40`.
    - Pressionamento (Active): `active:scale-[0.99]`.
    - Focus-Visible: `focus-visible:ring-2 focus-visible:ring-cyan-300/70`.

---

### 2.5 Data Tables Operacionais (`PixelDataTable`)

Aplicado na Triagem de Contatos, Atribuição Meta, Origem & tags e Auditoria.

#### 2.5.1 Estados das Linhas de Tabela (`<tr>`)
- **Hover na Linha:**
  - Classes: `transition-colors duration-150 hover:bg-white/[.025]`
  - Todas as células da linha clareiam sutilmente em conjunto, destacando o registro sob o cursor sem criar bordas pesadas.
- **Divisores de Linha:**
  - Classes: `divide-y divide-white/8` (substituindo a antiga `divide-white/7`, imperceptível em monitores escuros).

#### 2.5.2 Botões de Ação de Triagem Rápida ("É lead" / "Não lead")
- **Dimensão e Área de Toque:** Altura mínima estrita de 36px (`min-h-[36px] px-3 text-xs font-medium`), garantindo conformidade com critérios de usabilidade touch e desktop.
- **Botão "É lead":**
  - Default: `border-r border-white/10 text-emerald-300 bg-transparent`
  - Hover: `hover:bg-emerald-400/10 hover:text-emerald-200`
  - Active: `active:scale-95 active:bg-emerald-400/20`
  - Disabled: `disabled:opacity-40 disabled:cursor-not-allowed`
- **Botão "Não lead":**
  - Default: `text-zinc-400 bg-transparent`
  - Hover: `hover:bg-white/5 hover:text-zinc-200`
  - Active: `active:scale-95 active:bg-white/10`
  - Disabled: `disabled:opacity-40 disabled:cursor-not-allowed`

#### 2.5.3 Select Inline de Etapa do Funil na Linha
- Classes: `rounded-lg border border-white/10 bg-[#101214] px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40 disabled:opacity-50`
- Permite alteração instantânea com feedback imediato.

---

### 2.6 Feedback de Cópia Rápida (Copy to Clipboard com Micro-Tooltip)

Utilizado em identificadores de campanha, IDs de criativo, tokens de webhook, tags de clique (`ctwa_clid`, `gclid`) e payloads JSON.

#### 2.6.1 Comportamento & Estados do Componente `CopyButton`
```tsx
// Exemplo canônico de Micro-interação de Cópia
function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback gracioso
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copiado para a área de transferência" : `Copiar ${label}`}
      className="group relative inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] text-zinc-300 transition hover:border-cyan-300/30 hover:bg-white/[.06] hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/60 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-300 animate-in zoom-in-75 duration-150" />
          <span className="text-emerald-300 font-medium">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 text-zinc-400 group-hover:text-cyan-300 transition-colors" />
          <span>{label}</span>
        </>
      )}
      
      {/* Tooltip Flutuante Opcional */}
      {copied && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md border border-emerald-400/30 bg-[#0d1416] px-2 py-0.5 text-[9px] font-medium text-emerald-200 shadow-lg shadow-black/60 animate-in fade-in zoom-in-90 duration-150"
        >
          Copiado!
        </span>
      )}
    </button>
  );
}
```

- **Duração do Estado "Copiado!":** Exatamente 1.500ms (1.5 segundos).
- **Feedback Auditivo / A11y:** O texto alternativo `aria-label` muda dinamicamente e anuncia no leitor de tela `Copiado para a área de transferência`.
- **Transição:** Zoom suave com `Check` esmeralda que reverte automaticamente ao ícone de `Copy`.

---

### 2.7 Modal de Detalhes do Lead (`crmDetailLead`) & Diálogos

O modal exibe metadados, histórico de estágios e a conversa de WhatsApp completa do contato selecionado.

#### 2.7.1 Transições de Abertura e Fechamento
- **Backdrop (Overlay Fundo):**
  - Classes: `fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-opacity duration-200`
  - Animação de Entrada: `animate-in fade-in duration-200`
  - Animação de Saída: `animate-out fade-out duration-150`
- **Janela do Diálogo (Modal Window):**
  - Classes: `relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#101214] shadow-2xl shadow-black/80 transition-all duration-200`
  - Animação de Entrada: `animate-in zoom-in-95 fade-in duration-200`
  - Animação de Saída: `animate-out zoom-out-95 fade-out duration-150`
- **Bloqueio de Scroll do Body:**
  - Quando o modal é montado, o elemento `document.body` recebe `overflow-hidden` para evitar rolagem concorrente da página principal de fundo. Ao desmontar, o estilo original é restaurado.
- **Fechamento via Teclado e Clique Externo:**
  - Tecla `Escape`: Fecha o modal imediatamente.
  - Clique no backdrop (fora da janela do diálogo): Fecha o modal.
  - Foco é retornado ao card que disparou a abertura (`returnFocus`).

#### 2.7.2 Linha do Tempo de Mensagens no Modal / Aba Conversas
- **Auto-Scroll Ancorado na Base:**
  - Ao carregar a conversa ou selecionar um novo contato, um `useEffect` executa rolagem suave até a última mensagem:
    `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });`
  - Elimina a frustração de abrir um chat e estar preso no cabeçalho com mensagens antigas.
- **Balões de Mensagem:**
  - **Mensagem Recebida (Contato):**
    - Container: `max-w-[82%] rounded-2xl px-4 py-3 border border-white/10 bg-white/[.045] text-zinc-100`
    - Metadados: `text-[10px] text-zinc-400 mt-1.5`
  - **Mensagem Enviada (Unidade):**
    - Container: `max-w-[82%] rounded-2xl px-4 py-3 bg-cyan-300 text-[#062428] font-normal`
    - Metadados: `text-[10px] text-[#124348] font-medium mt-1.5`

---

## 3. Especificação Detalhada de Drag-and-Drop (DnD) com `@dnd-kit`

O CRM Kanban é a funcionalidade mais interativa do módulo Pixel. A movimentação entre etapas deve ser suave, precisa, sem tremor (jitter) e 100% acessível por teclado.

```
+-------------------------------------------------------------------------------------------------------+
| PIPELINE COMERCIAL                                                                                    |
| [ Search Filtrar lead... ]                                        [ 42 leads no escopo selecionado ]  |
+-------------------------------------------------------------------------------------------------------+
| NÃO RESPONDIDO | RESPONDIDO    | FOLLOW UP     | RESPONDEU     | NEGOCIAÇÃO    | FECHOU        | PERDIDO|
| (•) 12 leads   | (•) 8 leads   | (•) 5 leads   | (•) 6 leads   | (•) 7 leads   | (•) 3 leads   | (•) 1  |
| =============  | ============= | ============= | ============= | ============= | ============= | =======|
| +------------+ | +------------+ | +-----------+ |               | +-----------+ |               |        |
| | Mariana S. | | | Carlos E.  | | | Shimmer   | |               | | Bruno F.  | |               |        |
| | •• 9842    | | | •• 1120    | | | Drop Zone | |               | | •• 1920   | |               |        |
| +------------+ | +------------+ | +-----------+ |               | +-----------+ |               |        |
+-------------------------------------------------------------------------------------------------------+
```

### 3.1 Arquitetura de Sensores `@dnd-kit`

Para evitar conflito entre o clique de abrir detalhes e o arraste do card, os sensores devem ser configurados com precisão cirúrgica:

```tsx
const pointerSensor = useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8, // Exige 8px de movimento intencional antes de iniciar o drag
  },
});

const keyboardSensor = useSensor(KeyboardSensor, {
  coordinateGetter: sortableKeyboardCoordinates, // Suporte a setas para navegação
});

const dndSensors = useSensors(pointerSensor, keyboardSensor);
```

- **Por que `distance: 8`?**  
  Se a restrição de distância fosse 0 ou ausente, qualquer clique rápido no card para abrir o modal de detalhes (`openCrmDetail`) seria interpretado como início de arraste, bloqueando a abertura. 8 pixels é a distância padrão da indústria para distinguir com segurança um "clique" de um "arraste".

---

### 3.2 Eliminação de Jitter & Conflito de Transformação CSS

#### O Problema Diagnosticado:
Na implementação anterior, o componente `CrmLeadCard` continha:
`style={{ transform: CSS.Translate.toString(transform) }}`
Isso fazia com que o card original dentro da coluna se movesse pela tela seguindo o cursor, enquanto o `<DragOverlay>` renderizava simultaneamente outro card clonado. O resultado era duplicidade visual, cards saltando de posição e instabilidade na rolagem horizontal.

#### A Solução Canônica:
1. **O Card Original na Coluna (Item Arrastado):**
   - Durante o arraste (`isDragging === true`), o card original **não deve se mover com `transform`**. Ele permanece estático em sua coluna como uma sombra/fantasma translúcida:
   - `style={isDragging ? undefined : { transform: CSS.Translate.toString(transform) }}`
   - Classes do fantasma: `opacity-30 border-dashed border-cyan-400/40 bg-cyan-950/20 pointer-events-none scale-95`
2. **O DragOverlay (Clone Flutuante):**
   - 100% da renderização do movimento físico é realizada pelo `<DragOverlay>`, que é anexado a um portal e segue o cursor sem interferir no fluxo do DOM.

---

### 3.3 Estados do Card no CRM Kanban

| Estado | Localização | Classes Tailwind | Efeito Visual |
|---|---|---|---|
| **Repouso (Idle)** | Coluna | `rounded-xl border border-white/10 bg-[#101214] p-3.5 shadow-md transition-all duration-150 cursor-grab hover:border-cyan-300/40 hover:bg-[#14181a]` | Cartão escuro elegante, borda suave, cursor em formato de mão aberta. |
| **Hover** | Coluna | `hover:border-cyan-300/40 hover:bg-[#14181a] hover:shadow-lg hover:shadow-black/40` | Realce da borda ciano e elevação de sombra. Alça `GripVertical` ganha opacidade total. |
| **Pressionado (Active)** | Coluna | `active:scale-[0.99]` | Micro-pressão física. |
| **Arrastado (isDragging)** | Coluna (Origem) | `opacity-30 border-dashed border-cyan-400/30 bg-cyan-950/20 scale-95 transition-all` | O card na coluna de origem vira um fantasma compacto, indicando que foi levantado. |
| **DragOverlay (Item Flutuante)** | Overlay sob Cursor | `w-[280px] rounded-xl border border-cyan-300/60 bg-[#151a1c] p-3.5 shadow-2xl shadow-cyan-950/50 scale-105 rotate-1 cursor-grabbing ring-1 ring-cyan-300/40` | Card levemente inclinado (1 grau), aumentado (1.05x), sombra profunda ciano, mão fechada. |
| **Drop Zone (Slot na Coluna Destino)** | Coluna Destino | `min-h-[110px] rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-400/[.06] animate-pulse flex items-center justify-center text-cyan-200 text-xs font-medium` | Retângulo pontilhado pulsante com texto "Solte o contato aqui", indicando o slot livre. |
| **Coluna Destino (isOver)** | Container Coluna | `border-cyan-300/60 bg-cyan-950/20 ring-2 ring-cyan-300/40 ring-offset-2 ring-offset-[#090a0b] transition-all duration-200` | Coluna inteira ilumina com anel ciano e fundo sutilmente azulado. |
| **Bloqueado por IA (`automationLocked`)** | Coluna | `cursor-not-allowed opacity-70 border-white/5` | Arraste desativado. Hover exibe cursor de proibição e banner explicativo. |

---

### 3.4 Configuração de DropAnimation Suave (Sem Solturas Bruscas)

Ao soltar o card, o `<DragOverlay>` utiliza uma animação de encaixe suave (spring easing) para que o card pouse elegantemente na coluna de destino em vez de sumir abruptamente:

```tsx
import { defaultDropAnimationSideEffects, type DropAnimation } from "@dnd-kit/core";

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
  duration: 220,
  easing: "cubic-bezier(0.2, 0, 0, 1)", // Deceleração orgânica sem oscilação excessiva
};
```

Uso no componente:
```tsx
<DragOverlay dropAnimation={dropAnimationConfig}>
  {activeCrmLead ? (
    <div className="w-[280px] select-none rounded-xl border border-cyan-300/60 bg-[#151a1c] p-3.5 shadow-2xl shadow-cyan-950/50 scale-105 rotate-1 cursor-grabbing ring-1 ring-cyan-300/40">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-white">{activeCrmLead.contactName || "Contato sem nome"}</p>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
        <Phone className="h-3 w-3 text-cyan-300" />
        <span>{formatAdminPhone(activeCrmLead)}</span>
      </p>
      <div className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2 text-[10px] text-zinc-400">
        <span>{activeCrmLead.instanceName}</span>
        <span className="text-cyan-200 font-medium">{activeCrmLead.messagesReceived} / {activeCrmLead.messagesSent}</span>
      </div>
    </div>
  ) : null}
</DragOverlay>
```

---

### 3.5 Suporte Completo a Teclado e Anúncios ARIA no Drag-and-Drop

Para atender ao critério **WCAG 2.1 AA (Operable - Keyboard)**:

1. **Foco no Card:** O botão do card recebe `tabIndex={0}` e foco visível `focus-visible:ring-2 focus-visible:ring-cyan-300/70`.
2. **Ativação por Teclado:**
   - Tecla `Espaço` ou `Enter`: Seleciona o card para movimentação.
   - Mensagem `aria-live`: *"Contato Mariana Silva selecionado. Use as setas para a esquerda e para a direita para mudar de etapa. Pressione Espaço para soltar ou Escape para cancelar."*
3. **Movimentação entre Etapas:**
   - Tecla `ArrowRight`: Move virtualmente o card para a próxima etapa (ex.: "Lead respondido" -> "Follow up").
   - Tecla `ArrowLeft`: Move virtualmente para a etapa anterior.
   - Mensagem `aria-live`: *"Movido para a coluna Follow up (etapa 3 de 7)."*
4. **Finalização:**
   - Tecla `Espaço` ou `Enter`: Confirma a soltura no novo estágio e dispara `moveCrmLead()`.
   - Mensagem `aria-live`: *"Contato Mariana Silva posicionado na etapa Follow up com sucesso."*
   - Tecla `Escape`: Cancela o movimento e restaura a posição original.
   - Mensagem `aria-live`: *"Movimentação cancelada."*

---

## 4. Focus Rings & Navegação por Teclado (WCAG 2.1 AA)

### 4.1 Token Unificado de Anel de Foco

Para garantir consistência e alto contraste em todos os controles, definimos um token utilitário único:

```css
/* Token de Foco Canônico WCAG AA */
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-cyan-300/70 
focus-visible:ring-offset-2 
focus-visible:ring-offset-[#090a0b]
```

#### Medição de Contraste do Indicador de Foco:
- Cor do anel: `cyan-300` (`#67e8f9`)
- Cor do offset/fundo: Canvas `#090a0b`
- **Razão de Contraste Calculada:** **12.8:1** (o critério WCAG 2.1 AA 1.4.11 exige mínimo de **3:1** para elementos gráficos e indicadores de foco. O padrão Tráfego Pro excede em mais de 4x a exigência legal).

---

### 4.2 Mapa de Atalhos e Teclas por Seção

| Componente | Tecla | Ação Executada |
|---|---|---|
| **Segmented Tabs** | `ArrowRight` / `ArrowLeft` | Navega entre as abas em ciclo contínuo |
| **Segmented Tabs** | `Home` / `End` | Salta para a primeira / última aba |
| **Segmented Tabs** | `Enter` / `Space` | Ativa a aba em foco |
| **Scope Bar Selects**| `Alt + Down` / `Down` | Abre a lista de opções do select nativo |
| **Kanban Lead Card** | `Enter` | Abre o modal de detalhes do lead (`openCrmDetail`) |
| **Kanban Lead Card** | `Space` | Inicia o modo de movimentação por teclado |
| **Kanban (em drag)** | `ArrowLeft` / `ArrowRight` | Move o card entre as 7 colunas do funil |
| **Kanban (em drag)** | `Space` / `Enter` | Solta o card na coluna ativa e persiste no backend |
| **Kanban (em drag)** | `Escape` | Cancela o arraste e retorna o card ao ponto de partida |
| **Modal de Detalhes**| `Escape` | Fecha o modal e devolve o foco ao card de origem |
| **Modal de Detalhes**| `Tab` / `Shift+Tab` | Cicla o foco estritamente dentro do modal (Focus Trap) |
| **Tabela de Triagem** | `Enter` / `Space` | Aciona "É lead" ou "Não lead" no botão focado |
| **Botão de Cópia**   | `Enter` / `Space` | Copia o valor para a área de transferência |

---

### 4.3 Focus Trap no Modal de Detalhes

Para impedir que a navegação por teclado escape para trás do modal transparente:

```tsx
function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Foca no primeiro elemento interativo (normalmente botão fechar)
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, containerRef]);
}
```

---

## 5. Catálogo de Skeletons & Estados de Carregamento (Loading States)

Para prevenir Cumulative Layout Shift (CLS) e proporcionar sensação de agilidade operacional, o módulo Pixel utiliza esqueletos com a exata geometria e padding dos componentes finais.

### 5.1 Token Padronizado de Shimmer

```css
/* Shimmer de Alta Densidade Tráfego Pro */
bg-gradient-to-r from-white/[.02] via-white/[.06] to-white/[.02] 
bg-[length:200%_100%] 
animate-pulse
```
Para browsers com Tailwind 4 puro, combina-se `bg-white/[.04] animate-pulse rounded-xl`.

---

### 5.2 Catálogo por Tipo de Componente

#### 5.2.1 Full Page Initial Loading (Primeiro Carregamento)
Substitui a tela preta com spinner único por uma moldura de esqueleto completa que reflete a estrutura da página:

```tsx
export function PixelPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#090a0b] text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between animate-pulse">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/[.05]" />
            <div className="space-y-2">
              <div className="h-3 w-36 rounded-md bg-white/[.05]" />
              <div className="h-8 w-64 rounded-lg bg-white/[.08]" />
              <div className="h-4 w-96 rounded-md bg-white/[.04]" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-32 rounded-xl bg-white/[.04]" />
            <div className="h-9 w-36 rounded-xl bg-cyan-300/20" />
          </div>
        </div>

        {/* Scope Bar Skeleton */}
        <div className="mb-6 h-16 rounded-2xl border border-white/10 bg-white/[.02] animate-pulse" />

        {/* Tabs Skeleton */}
        <div className="mb-8 flex gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-28 rounded-xl bg-white/[.03]" />
          ))}
        </div>

        {/* Content Skeleton: KPIs + Seção */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/8 bg-white/[.025] p-5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

#### 5.2.2 KPI Cards Skeleton (`MetricCardsSkeleton`)
Utilizado ao alternar unidades ou recarregar métricas em segundo plano:

```tsx
export function MetricCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <article key={i} className="rounded-2xl border border-white/8 bg-white/[.025] p-5 animate-pulse">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-2.5 w-24 rounded bg-white/[.06]" />
            <div className="h-8 w-8 rounded-xl bg-white/[.05]" />
          </div>
          <div className="h-8 w-20 rounded-lg bg-white/[.08]" />
          <div className="mt-3 h-3 w-32 rounded bg-white/[.04]" />
        </article>
      ))}
    </div>
  );
}
```

---

#### 5.2.3 Data Table Skeleton (`DataTableSkeleton`)
Preserva o cabeçalho oficial da tabela para evitar sobressaltos visuais e renderiza 5 linhas fantasma:

```tsx
export function DataTableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[.025]">
      <div className="border-b border-white/8 bg-black/10 px-5 py-3.5 flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="h-3 w-24 rounded bg-white/[.06] animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-white/8">
        {[...Array(rows)].map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-between px-5 py-4 animate-pulse">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 rounded bg-white/[.06]" />
              <div className="h-2.5 w-24 rounded bg-white/[.03]" />
            </div>
            <div className="h-4 w-28 rounded bg-white/[.04] hidden sm:block" />
            <div className="h-6 w-20 rounded-full bg-white/[.04]" />
            <div className="h-8 w-24 rounded-lg bg-white/[.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### 5.2.4 CRM Kanban Skeleton (`CrmKanbanSkeleton`)
Renderiza a esteira horizontal de 7 colunas com altura de 600px e 2 cards por coluna:

```tsx
export function CrmKanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
      {[1, 2, 3, 4, 5, 6, 7].map((col) => (
        <div key={col} className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-white/8 bg-black/20 p-3 animate-pulse">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-white/[.06]" />
            <div className="h-4 w-6 rounded-full bg-white/[.04]" />
          </div>
          <div className="h-0.5 w-full rounded bg-white/[.05] mb-3" />
          <div className="space-y-2.5">
            <div className="h-28 rounded-xl border border-white/6 bg-[#101214] p-3" />
            <div className="h-24 rounded-xl border border-white/6 bg-[#101214] p-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

#### 5.2.5 Chat & Timeline Skeleton (`ChatTimelineSkeleton`)
Utilizado durante o carregamento de mensagens na aba Conversas ou modal de detalhes:

```tsx
export function ChatTimelineSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      {/* Mensagem recebida */}
      <div className="flex justify-start">
        <div className="h-16 w-3/4 max-w-md rounded-2xl bg-white/[.045] border border-white/10 p-3" />
      </div>
      {/* Mensagem enviada */}
      <div className="flex justify-end">
        <div className="h-14 w-2/3 max-w-sm rounded-2xl bg-cyan-300/15 border border-cyan-300/20 p-3" />
      </div>
      {/* Mensagem recebida */}
      <div className="flex justify-start">
        <div className="h-20 w-4/5 max-w-lg rounded-2xl bg-white/[.045] border border-white/10 p-3" />
      </div>
    </div>
  );
}
```

---

## 6. Estados de Erro, Validação Inline & Empty States

### 6.1 Banner de Erro Global (`PixelErrorBanner`)
- **Acessibilidade:** `role="alert"` com anúncio prioritário via leitor de tela.
- **Estrutura:**
  ```tsx
  <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200 shadow-lg shadow-rose-950/20">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
    <div className="flex-1 leading-6">{error}</div>
    <button
      type="button"
      onClick={() => setError("")}
      className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-400/20 hover:text-white focus-visible:ring-1 focus-visible:ring-rose-300"
      aria-label="Fechar mensagem de erro"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
  ```

---

### 6.2 Validação Inline em Formulários (Edição de Instância)

No formulário da aba Operação (onde o administrador associa a instância a uma unidade autorizada):

1. **Estado Neutro:**
   - Borda: `border-white/10 bg-[#101214]`
   - Placeholder: `placeholder:text-zinc-500`
2. **Estado de Edição (Dirty / Digitado):**
   - Borda: `border-cyan-300/40`
3. **Estado de Salvamento (Saving):**
   - Botão "Salvar":
     `<button disabled className="rounded-lg bg-cyan-300/80 px-3 py-2 text-xs font-semibold text-[#082124] disabled:cursor-not-allowed inline-flex items-center gap-1.5 min-w-[76px] justify-center">`
     `<RefreshCw className="h-3 w-3 animate-spin" /> Salvando`
     `</button>`
   - Layout preservado sem saltos.
4. **Estado de Sucesso (Saved Feedback):**
   - O card da instância recebe um pulso sutil de borda esmeralda (`border-emerald-400/40 bg-emerald-400/[.03] transition-all duration-300`) que reverte após 2 segundos, confirmando visualmente a persistência da gravação.

---

### 6.3 Empty States Padronizados (Zero Emojis)

Substitui os antigos parágrafos com texto cinza escuro por caixas delimitadas com ícones `lucide-react`, títulos Space Grotesk e descrições claras:

```tsx
export function PixelEmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.01] p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-400">
        <Icon className="h-6 w-6 text-zinc-400" />
      </div>
      <h3 className="mt-3 font-['Space_Grotesk'] text-base font-medium text-white">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs font-light leading-5 text-zinc-400">
        {description}
      </p>
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  );
}
```

---

## 7. Blueprint de Implementação para o Frontend Implementer (M5)

Abaixo estão os snippets e hooks prontos para uso direto em `client/src/pages/EvolutionAdmin.tsx`.

### 7.1 Configuração Completa do `DndContext` e Sensores

```tsx
// client/src/pages/EvolutionAdmin.tsx - Bloco DnD Otimizado
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Configuração dos Sensores
const pointerSensor = useSensor(PointerSensor, {
  activationConstraint: { distance: 8 },
});
const keyboardSensor = useSensor(KeyboardSensor, {
  coordinateGetter: sortableKeyboardCoordinates,
});
const dndSensors = useSensors(pointerSensor, keyboardSensor);

// Animação de Soltura sem Jitter
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

function handleDragStart(event: DragStartEvent) {
  if (automationLocked) return;
  setActiveCrmLeadId(String(event.active.id));
}

function handleDragCancel() {
  setActiveCrmLeadId(null);
}

function handleCrmDragEnd(event: DragEndEvent) {
  setActiveCrmLeadId(null);
  if (automationLocked) return;
  const drop = resolveCrmDrop(
    scopedLeads,
    String(event.active.id),
    event.over ? String(event.over.id) : null
  );
  if (drop) void moveCrmLead(drop.lead, drop.stage);
}
```

### 7.2 Implementação do Card com DnD sem Jitter (`CrmLeadCard`)

```tsx
function CrmLeadCard({
  lead,
  attribution,
  moving,
  locked,
  onOpen,
}: {
  lead: Lead;
  attribution: MetaAttribution | undefined;
  moving: boolean;
  locked: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: locked,
  });

  const aiUpdated = wasLastCrmUpdateMadeByAi(lead.crmStageUpdatedBy);

  // CRÍTICO: Quando isDragging for true, NÃO aplicar transform ao card da coluna!
  // O DragOverlay faz o deslocamento. O card na coluna fica como fantasma/placeholder.
  const style = isDragging ? undefined : { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className={cn(
        "group relative w-full cursor-grab rounded-xl border p-3.5 text-left shadow-md transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]",
        isDragging
          ? "cursor-grabbing opacity-30 border-dashed border-cyan-400/40 bg-cyan-950/20 scale-95"
          : "border-white/10 bg-[#101214] hover:border-cyan-300/40 hover:bg-[#14181a] hover:shadow-lg hover:shadow-black/40",
        locked && "cursor-not-allowed opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
          {lead.contactName || "Contato sem nome"}
        </p>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-500 opacity-40 transition group-hover:opacity-100 group-hover:text-cyan-300" />
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
        <Phone className="h-3 w-3 text-zinc-500" />
        <span>{formatAdminPhone(lead)}</span>
      </p>

      {attribution?.campaignName ? (
        <div className="mt-2.5 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-1.5">
          <p className="line-clamp-1 text-[10px] font-medium text-cyan-200">
            {attribution.campaignName}
          </p>
        </div>
      ) : (
        <div className="mt-2.5">
          <OriginPill platform={lead.originPlatform} evidence={lead.originEvidence} />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/6 pt-2 text-[10px] text-zinc-400">
        <span className="truncate max-w-[120px]">{lead.instanceName}</span>
        <span className="flex items-center gap-1 font-mono text-zinc-400">
          <MessageCircleMore className="h-3 w-3 text-cyan-300/70" />
          <span>{lead.messagesReceived} / {lead.messagesSent}</span>
        </span>
      </div>

      {aiUpdated && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-300">
          <Bot className="h-3 w-3 text-violet-400" />
          <span>Classificado por IA</span>
        </div>
      )}

      {moving && (
        <p className="mt-2 text-[10px] font-medium text-cyan-300 animate-pulse">
          Movendo…
        </p>
      )}
    </div>
  );
}
```

### 7.3 Implementação da Coluna com Drop Zone Shimmer (`CrmStageColumn`)

```tsx
function CrmStageColumn({
  stage,
  leads,
  attributions,
  movingLeadId,
  locked,
  onOpen,
}: {
  stage: typeof crmStages[number];
  leads: Lead[];
  attributions: Map<string, MetaAttribution>;
  movingLeadId: string | null;
  locked: boolean;
  onOpen: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
    disabled: locked,
  });

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "flex w-[290px] shrink-0 flex-col rounded-2xl border p-3 transition-colors duration-200 bg-black/20",
        stage.color,
        isOver && "border-cyan-300/60 bg-cyan-950/20 ring-2 ring-cyan-300/40 ring-offset-2 ring-offset-[#090a0b]"
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-zinc-100">{stage.label}</h3>
        <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          {leads.length}
        </span>
      </header>

      {/* Lista com Rolagem Interna Independente */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[640px] pr-1">
        {/* Se o cursor estiver sobre esta coluna, exibe o placeholder de Drop Zone */}
        {isOver && (
          <div className="min-h-[90px] rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-400/[.06] animate-pulse flex items-center justify-center text-cyan-200 text-xs font-medium">
            Solte o contato aqui
          </div>
        )}

        {leads.length === 0 && !isOver ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-white/8 p-4 text-center text-xs text-zinc-500">
            {locked ? "Atualização automática em andamento" : "Nenhum lead nesta etapa"}
          </div>
        ) : (
          leads.map((lead) => (
            <CrmLeadCard
              key={lead.id}
              lead={lead}
              attribution={attributions.get(lead.id)}
              moving={movingLeadId === lead.id}
              locked={locked}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </article>
  );
}
```

---

## 8. Checklist de Conformidade do Interaction Designer

- [x] **Micro-interações de Navegação & Header**: Botão CTA com spinner sem salto de layout, badge em tempo real com pulso verde esmeralda, segmented tabs com microindicador ciano inferior e navegação por teclado.
- [x] **Sticky Scope Bar**: Fixação com `backdrop-blur-md` e fundo escuro translúcido ao rolar, selects com focus ring ciano e feedback de contagem em tempo real.
- [x] **Drag-and-Drop (DnD) com `@dnd-kit`**:
  * `PointerSensor` com restrição de distância de 8px (não engole cliques).
  * `KeyboardSensor` com navegação acessível por setas.
  * Eliminação de jitter (card original sem transform durante o drag, estilizado como fantasma com opacidade 30%).
  * `DragOverlay` com inclinação tátil de 1 grau, escala 1.05x, sombra ciano profunda.
  * Placeholder / Drop Zone shimmer pontilhado (`border-dashed border-cyan-400/50 bg-cyan-400/[.06] animate-pulse`).
  * Concorrência protegida com `automationLocked`.
- [x] **Focus Rings & Acessibilidade**:
  * Padrão único `focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]`.
  * Razão de contraste de 12.8:1 contra o fundo (muito acima de 3:1 WCAG AA).
  * Focus trap e tecla `Escape` em todos os modais.
- [x] **Catálogo de Skeletons**: Skeletons completos para Full Page, KPIs, Data Tables, CRM Kanban e Chat Timeline. Zero Cumulative Layout Shift (CLS).
- [x] **Feedback de Cópia Rápida**: Componente `CopyButton` com morphing para `Check` verde esmeralda e micro-tooltip "Copiado!" por 1.5s.
- [x] **Regras Duras**: Zero emojis (substituídos por ícones `lucide-react`), zero menções a "Evolution" na UI visível (nome padronizado: Pixel), zero novas dependências.

---
*Especificação de Interação e Movimento homologada para execução no Milestone M5.*
