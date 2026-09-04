# Relatório de Auditoria Visual & Design System — Módulo Pixel (/pixel)

**Data:** 2026-09-04  
**Auditor:** Design Auditor (`design_auditor_m1`)  
**Alvo Principal:** `client/src/pages/EvolutionAdmin.tsx`  
**Referência Canônica:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`, `client/src/pages/Dashboard.tsx`  
**Status da Auditoria:** Concluída com Diagnóstico Crítico e Recomendações de Ação

---

## 1. Diagnóstico de Consistência com o Restante da Dashboard

### 1.1 Síndrome do "Painel Administrativo Isolado"
O maior problema do módulo Pixel atual não é funcional, mas de **enquadramento de produto**. A interface comunica repetidamente e explicitamente ao usuário que ele está em um "ambiente isolado e de segunda classe":
- **Linha 313**: Eyebrow `Módulo isolado · administrativo` e copy: *"Eventos de mensagens, classificação comercial e evidências de origem. Este ambiente não participa das métricas nem dos fluxos da dashboard atual."*
- **Linha 376**: Rodapé melancólico `Painel administrativo isolado > Pixel` com classe `text-zinc-700` (ilegível, contraste 1.85:1).
- **Linha 314**: Botão de retorno `Voltar à dashboard` estilizado como uma saída de emergência externa (`<ArrowLeft className="h-3.5 w-3.5" />Voltar à dashboard`), reforçando a sensação de descontinuidade do sistema.

**Impacto:** Um administrador ou gestor de tráfego que navega da Dashboard para o `/pixel` sente que saiu do sistema principal e caiu em um utilitário técnico bruto/desconectado.

### 1.2 Superfícies, Cores e Alinhamento de Design Tokens
A paleta base está parcialmente alinhada com as diretrizes (#090a0b, cyan-300, border-white/8), mas sofre de desvios e implementações inline:
- **Background e Tipografia no Elemento Raiz**:
  - Na linha 309, `<main className="min-h-screen overflow-x-hidden bg-[#090a0b] text-zinc-100 selection:bg-cyan-300/30" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>` utiliza estilos inline (`style={{ fontFamily: ... }}`) em vez de classes utilitárias do Tailwind (`font-sans font-light`), violando o padrão do projeto.
  - Na linha 305 (loading screen): `style={{ fontFamily: "Inter, sans-serif" }}` também injetado inline.
- **Max-Width do Container**:
  - `EvolutionAdmin.tsx` define `max-w-[1480px]` (linha 311), enquanto a referência canônica `SocialPublishingAdmin.tsx` usa `max-w-[1440px]` (linha 284). Esse desalinhamento de 40px gera quebras visuais em telas de 1440p e 1536p.
- **Hierarquia de Camadas e Superfícies (Surface Nesting)**:
  - Container do card: `bg-white/[.025]` com borda `border-white/8` (correto).
  - Sub-cards internos: ora usam `bg-black/15` (linhas 342, 347), ora `bg-white/[.045]` (linha 363), ora `bg-[#101214]` (linhas 320, 326, 348), ora `bg-[#101214]/95` (linha 90). Há 4 tons de fundo escuro competindo entre si sem uma escala padronizada de elevação.
- **Barra de Abas (Navegação Superior)**:
  - Na linha 335, a aba ativa recebe `bg-cyan-300 text-[#082124] font-medium`.
  - Isso faz com que a aba selecionada tenha o **mesmo peso visual e cor de um botão de ação primário** (ex.: "Atualizar dados", linha 314). Na dashboard Tráfego Pro e referências padrão (Linear/Vercel), abas usam estilo de pílula sutil (`bg-white/[.08] text-white border-white/10`) com micro-indicador ou sublinhado de acento cyan, reservando o preenchimento sólido `bg-cyan-300` estritamente para ações de escrita (CTAs).

---

## 2. Análise Aprofundada Aba por Aba

### Aba 1: Operação (`view === "operacao"`)
1. **Estrutura Invertida e Caótica**:
   - A aba começa com o bloco de edição *"Instâncias por unidade"* (linha 345-353), seguido depois pelos KPI Cards (linha 356), depois por *"Instâncias monitoradas"* (linha 357), depois *"Endpoint do webhook"* (linha 357) e finalmente *"Contatos recebidos"* (linha 358).
   - **Duplicação de Componente**: As instâncias são listadas DUAS vezes na mesma aba: uma como formulário editável (linha 347) e outra como lista somente-leitura (linha 357). Isso cria confusão imediata no usuário ("onde vejo o status da instância?").
2. **Posicionamento dos KPIs**:
   - As 4 métricas vitais (*Eventos hoje*, *Contatos rastreados*, *A validar*, *Fechados*) aparecem abaixo do bloco de formulários em vez de estarem no topo como resumo executivo imediato.
3. **Tabela de Triagem Comercial Deslocada**:
   - A tabela *"Contatos recebidos"* permite marcar "É lead" / "Não lead" e alterar a etapa do funil. Essa funcionalidade é de triagem de CRM e conflita diretamente com o propósito da Aba 2 (CRM Kanban). Se o usuário opera no CRM, ter outra tabela de classificação rápida na aba de Operação fragmenta o fluxo de trabalho.

### Aba 2: CRM (`view === "crm"`)
1. **Vazamento Textual Grave**:
   - **Linha 339**: *"Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual."*
   - O termo **"Supabase Evolution"** está exposto diretamente ao usuário final!
2. **Quebra de Grid no Kanban Linear (7 Etapas)**:
   - A grade está configurada como: `grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` (linha 341).
   - Um funil comercial possui 7 etapas sequenciais (Novo lead -> Lead respondido -> Follow up -> Lead respondeu -> Negociação -> Fechou -> Perdido). Ao quebrar em 4 colunas na linha 1 e 3 colunas na linha 2, a continuidade visual do pipeline é destruída. O usuário precisa arrastar um contato "para baixo e para a esquerda" para avançar de estágio.
   - Padrão da indústria (Linear/Jira): container horizontal com scroll (`flex gap-4 overflow-x-auto pb-4 pt-1`) e colunas com largura fixa (`w-[280px]` a `w-[300px] shrink-0`).
3. **Fricção de Drag-and-Drop (DnD) e Feedback Visual**:
   - O card em arraste (`isDragging`) apenas reduz a opacidade para 35% (`opacity-35`). Não há placeholder visual animado (shimmer/dashed box) indicando onde o card vai se acomodar.
   - A coluna de destino apenas ativa um anel sutil (`ring-2 ring-cyan-300/60`), sem reação das cartas vizinhas.
4. **Sobrecarga Textual e Falta de Destaque no Card**:
   - Cada card do CRM (`CrmLeadCard`, linhas 87-90) acumula: Nome, Telefone com ícone, Nome da instância, contadores de mensagens enviadas/recebidas, Campanha Meta ou origem, e badge de IA. Tudo em tons escuros e cinzas (`text-zinc-500`, `text-zinc-600`), tornando o card um bloco cinza indiferenciado sem âncora de leitura.
5. **Modal Lateral de Detalhes (`crmDetailLead`)**:
   - Abre como modal centralizado/inferior (`role="dialog"`), mas renderiza um chat comprimido e histórico vertical sem rolagem fluida.

### Aba 3: Atribuição Meta (`view === "atribuicao"`)
1. **Vazamento Textual**:
   - **Linha 361**: *"O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha, conjunto, anúncio ou criativo na fonte de métricas. Sem essa chave, a origem permanece não resolvida."*
   - O termo **"quando a Evolution entrega"** expõe o nome do backend.
2. **Ausência de Filtros e Busca**:
   - Uma tabela ampla (`min-w-[1100px]`) sem campo de busca por nome de contato, campanha ou filtro de status ("Correspondência confirmada" vs "Não resolvida"). Em contas ativas com centenas de leads, encontrar uma atribuição específica exige rolagem manual exaustiva.
3. **Poluição Visual com IDs Brutos**:
   - Cada célula renderiza o nome textual acompanhado de um bloco mono cinza (`code className="mt-1 block text-[10px] text-zinc-600"`). A cor `text-zinc-600` falha em contraste e polui a tabela com hashes longos sem botão de cópia com um clique.

### Aba 4: Conversas (`view === "conversas"`)
1. **Layout Split-Pane Rígido**:
   - Dividido em `lg:grid-cols-[340px_1fr]`, com altura fixa `min-h-[590px]` e lista de contatos em `max-h-[520px]`.
2. **Ausência de Busca de Contato**:
   - O painel esquerdo exibe uma lista vertical crua de leads. Não existe campo de filtro por nome ou telefone. Se houver 80 contatos no escopo, o operador precisa rolar cegamente para achar a conversa.
3. **Ausência de Auto-Scroll ao Final da Conversa**:
   - Ao clicar em um contato, as mensagens são carregadas, mas o scroll permanece no topo (mensagens mais antigas), forçando o usuário a rolar para baixo para ler a última mensagem recebida.
4. **Contraste no Balão de Saída**:
   - A metadata de envio nos balões ciano usa `text-[#164044]` em `bg-cyan-300`. Embora passe tecnicamente no contraste matemático, tem baixa distinção perceptiva em telas com reflexo ou menor saturação.

### Aba 5: Origem & tags (`view === "origem"`)
1. **KPI Cards Competentes, Tabela Desprovida de Filtro**:
   - Os 4 cards no topo (*Meta verificado*, *Meta observado*, *Google Ads observado*, *Sem evidência*) são claros e têm boa iconografia.
   - Contudo, a tabela abaixo lista todos os contatos sem permitir filtrar por um dos 4 status clicando no KPI card correspondente (falta de interatividade "clique para filtrar").
2. **Truncamento de Tags Longas**:
   - O código `<code className="rounded bg-black/20 px-2 py-1 text-xs text-cyan-100">{lead.metaCtwaClid || lead.googleClickId || "—"}</code>` estoura a célula quando o `ctwa_clid` possui dezenas de caracteres, forçando scroll horizontal da tabela inteira.

### Aba 6: Auditoria (`view === "auditoria"`)
1. **Risco de Degradação de Performance no DOM**:
   - Renderiza todos os eventos recebidos (`overview.events.map`, linha 375) sem paginação ou virtualização de lista. Em produção, milhares de webhooks por semana farão o navegador travar.
2. **Exibição Bruta de Payload**:
   - O payload JSON é impresso inteiro dentro de uma tag `<pre>` com quebras de linha completas (`JSON.stringify(event.attributionPayload, null, 2)`). Um único evento com payload grande ocupa a tela inteira. Deveria ser colapsável com botão de expansão e "Copiar JSON".
3. **Falta de Filtros Operacionais**:
   - Impossível filtrar por tipo de evento (`MESSAGES_UPSERT`, `CONNECTION_UPDATE`) ou direção (`incoming` / `outgoing`).

---

## 3. Problemas de Contraste WCAG AA, Hierarquia Visual e Tipografia

### 3.1 Violações de Contraste WCAG AA no Tema Dark
Calculamos as razões de luminância exatas sobre o fundo base `#090a0b`:

| Elemento / Token | Cor Hex / Classe | Fundo | Razão de Contraste | Status WCAG AA (Mín. 4.5:1) |
|---|---|---|---|---|
| **Textos secundários e micro-labels** | `#52525b` (`text-zinc-600`) | `#090a0b` | **2.53:1** | ❌ **REPROVADO GRAVE** |
| **Rodapé de página (linha 376)** | `#3f3f46` (`text-zinc-700`) | `#090a0b` | **1.85:1** | ❌ **REPROVADO CRÍTICO** |
| **Labels de formulário (linhas 348, 349)** | `#52525b` (`text-zinc-600`) | `#090a0b` | **2.53:1** | ❌ **REPROVADO GRAVE** |
| **Cabeçalhos de tabelas `<th>`** | `#52525b` (`text-zinc-600`) | `#090a0b` | **2.53:1** | ❌ **REPROVADO GRAVE** |
| **Subtítulos e descrições `text-sm`** | `#71717a` (`text-zinc-500`) | `#090a0b` | **4.09:1** | ❌ **REPROVADO** (mínimo 4.5:1 para texto normal) |
| **Texto de cards vazios** | `#71717a` (`text-zinc-500`) | `#090a0b` | **4.09:1** | ❌ **REPROVADO** |
| **Textos corporais regulares** | `#d4d4d8` (`text-zinc-300`) | `#090a0b` | **10.1:1** | ✅ APROVADO |
| **Destaques ciano primários** | `#67e8f9` (`text-cyan-300`) | `#090a0b` | **12.8:1** | ✅ APROVADO |
| **Texto escuro em botão ciano** | `#082124` | `#67e8f9` | **11.5:1** | ✅ APROVADO |

**Conclusão sobre Contraste:**  
O uso generalizado de `text-zinc-600` e `text-zinc-500` torna múltiplos textos ilegíveis para pessoas com baixa acuidade visual ou em ambientes iluminados. É imperativo elevar esses elementos para `text-zinc-400` (contraste ~6.5:1) ou `text-zinc-300`.

### 3.2 Inconsistências de Tracking e Tipografia
Detectamos 5 variações discrepantes de espaçamento entre letras (`letter-spacing`) em textos em caixa alta (UPPERCASE):
- `tracking-[.24em]`: Cabeçalho principal (linha 313)
- `tracking-[.18em]`: Eyebrows de seções (linhas 339, 342, 346, 357, 358, 361, 363, 372, 375)
- `tracking-[.16em]`: Eyebrows do modal e cabeçalhos de tabela (linhas 342, 358, 361, 372)
- `tracking-[.14em]`: Labels de formulário e status (linhas 348, 349, 357, 375)
- `tracking-[.12em]`: Badges e pílulas (linhas 84, 350, 358, 361)

**Recomendação de Unificação:**  
Adotar estritamente o padrão da dashboard:
- Micro-eyebrows e labels de formulário: `text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400`
- Badges e pílulas de status: `text-[10px] font-semibold uppercase tracking-wider`
- Títulos: `font-['Space_Grotesk'] font-light tracking-[-.04em] text-white`

---

## 4. Pontos de Atrito no Kanban CRM, Tabelas e Controles de Escopo

### 4.1 Barra de Escopo (Unidades e Instâncias)
- **Localização e Estilo**:
  A barra de escopo (`section aria-label="Escopo de instâncias"`, linhas 318-332) é estática e utiliza selects nativos do navegador (`<select className="... bg-[#101214] ...">`). Na referência `SocialPublishingAdmin.tsx`, a barra é flutuante/pegajosa (`lg:sticky lg:top-3 lg:z-20`) com blur de fundo (`bg-[#0d1215]/90 backdrop-blur-md`), mantendo o filtro acessível durante a rolagem.
- **Falta de Integração com o Seletor Global de Unidades**:
  A dashboard principal possui o componente `ClientSelector` no cabeçalho/sidebar. O Pixel implementa um `<select>` próprio que não compartilha o estado visual unificado nem possui busca com digitação rápida.

### 4.2 Kanban CRM (Drag-and-Drop)
1. **Comportamento da Transformação CSS**:
   No `CrmLeadCard` (linha 90), `style={{ transform: CSS.Translate.toString(transform) }}` aplica a transformação diretamente ao card na coluna durante o arraste. Simultaneamente, o `<DragOverlay>` renderiza outro card sob o cursor. Isso causa duplicidade visual ou tremor durante o arraste se o container estiver rolando.
2. **Feedback ao Soltar (Drop Zone Shimmer)**:
   Quando o usuário arrasta um card sobre uma coluna, ela apenas aplica `ring-2 ring-cyan-300/60`. Falta uma animação suave de slot disponível (shimmer/placeholder com linha pontilhada ciano) que mostre exatamente onde o lead será alocado.
3. **Ausência de Ordenação e Filtros Rápidos no CRM**:
   Não há como ordenar por "Mais recentes", "Sem resposta há mais tempo" ou filtrar apenas leads com atribuição confirmada.

### 4.3 Tabelas de Dados (Triagem, Atribuição, Origem)
- **Sem Paginação nem Virtualização**: Todas as listas renderizam 100% dos dados na tela.
- **Botões de Ação na Tabela de Triagem**:
  `<button className="border-r border-white/10 px-2.5 py-1.5 text-xs text-emerald-300">É lead</button>` possui uma área de toque inferior a 32px de altura, dificultando cliques rápidos e precisos.
- **Headers com Linhas de Divisão Fracas**:
  `divide-y divide-white/7` usa uma opacidade de 7%, que em monitores calibrados para gama sRGB escura desaparece quase por completo. A borda canônica deve ser `divide-white/8` ou `divide-white/10`.

---

## 5. Menções Textuais a "Evolution" na UI Visível

Conforme a diretriz mandatória do projeto: **"O nome do produto visível ao usuário deve ser estritamente 'Pixel', com zero menções a 'Evolution'"**.

Identificamos duas violações textuais ativas no código de `client/src/pages/EvolutionAdmin.tsx`:

1. **Linha 339 (Aba CRM)**:
   - **Texto Atual**:
     > *"Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual."*
   - **Problema**: Expõe explicitamente o termo técnico "Supabase Evolution".
   - **Correção Recomendada**:
     > *"Arraste um contato entre as etapas. A movimentação fica sincronizada em tempo real e isolada por instância e unidade."*

2. **Linha 361 (Aba Atribuição Meta)**:
   - **Texto Atual**:
     > *"O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha, conjunto, anúncio ou criativo na fonte de métricas. Sem essa chave, a origem permanece não resolvida."*
   - **Problema**: Expõe explicitamente o termo "a Evolution entrega".
   - **Correção Recomendada**:
     > *"O vínculo é estabelecido quando o webhook do Pixel recebe um identificador Meta e correlaciona com as métricas de campanha, conjunto, anúncio ou criativo. Sem essa chave, a origem permanece como sinal observado ou não resolvida."*

---

## 6. Recomendações Diretas para os Próximos Especialistas

### 6.1 Para o UI Architect (`ui_architect_m2`)
1. **Criar Tokens de Superfície e Contraste**:
   - Estabelecer a escala estrita de superfícies escuras:
     - Fundo base: `#090a0b`
     - Camada 1 (cards base): `bg-white/[.025]` com borda `border-white/8`
     - Camada 2 (cards internos/sub-containers): `bg-white/[.015]` ou `bg-black/20` com borda `border-white/6`
     - Camada 3 (inputs/seletores/kanban cards): `bg-[#101214]` com borda `border-white/10`, foco `border-cyan-300/60`
   - **Banir `text-zinc-600` e `text-zinc-700`**: Padronizar todos os micro-textos e labels com `text-zinc-400` (garantindo índice WCAG AA ≥ 6.5:1).
2. **Componente Canônico de Abas**:
   - Projetar um segmented tab bar elegante: container com `bg-white/[.02] p-1 rounded-xl border border-white/8`, itens inativos com `text-zinc-400 hover:text-white`, item ativo com `bg-white/[.08] text-white border border-white/10` e indicador ciano sutil.
3. **Padronização de Badges e Pílulas**:
   - Status de conexão de instância (`connected`, `disconnected`, `waiting`).
   - Status de atribuição Meta (`matched` em esmeralda, `unresolved` em âmbar).
   - Selo de atualização por IA (`bg-violet-400/10 text-violet-300 border-violet-400/20`).

### 6.2 Para o Information Designer (`information_designer_m3`)
1. **Redesenho do Cabeçalho e Eliminação do Tom "Isolado"**:
   - Reformular a mensagem de boas-vindas para celebrar o Pixel como a **Central de Rastreamento & Atribuição WhatsApp**:
     - Eyebrow: `TRÁFEGO PRO · RASTREAMENTO EM TEMPO REAL`
     - Título: `Monitor Pixel`
     - Descrição: `Consolidação de instâncias WhatsApp, pipeline comercial CRM, atribuição de campanhas Meta/Google e auditoria de webhooks.`
     - Ações de topo: Botão "Atualizar dados" com spinner, atalho de retorno sutil e resumo numérico instantâneo.
2. **Reestruturação da Aba Operação**:
   - Iniciar obrigatoriamente pelos KPI Cards no topo da página.
   - Fundir as duas listas redundantes de instâncias em um único card refinado de gerenciamento operacional.
   - Posicionar o bloco de webhook e conexão de forma harmoniosa ao lado do resumo de instâncias.
3. **Reestruturação do CRM Kanban**:
   - Transformar a grade quebrada (grid de 3 a 4 colunas) em uma esteira horizontal contínua (`overflow-x-auto`) com as 7 etapas alinhadas lado a lado.
   - Altura máxima com scrollbar interno por coluna (`max-h-[640px]`).
   - Adicionar campo de busca rápida no topo do CRM (filtrar leads por nome ou telefone em tempo real).
4. **Reestruturação da Aba Conversas**:
   - Adicionar campo de pesquisa e indicador de última mensagem na coluna lateral de contatos.
   - Implementar rolagem ancorada na base (última mensagem recebida) na tela de conversa.
5. **Reestruturação da Aba Auditoria**:
   - Implementar payload colapsável em acordeão com botão "Copiar JSON" para evitar rolagem infinita.

---
*Relatório emitido por `design_auditor_m1` em conformidade com o protocolo de auditoria visual.*
