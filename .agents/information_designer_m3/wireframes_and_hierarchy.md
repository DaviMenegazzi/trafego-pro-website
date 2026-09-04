# Arquitetura de Informação & Wireframes Textuais — Módulo Pixel (/pixel)

**Versão:** 2.0.0-canonical  
**Data:** 2026-09-04  
**Autor:** Information Designer (`information_designer_m3`)  
**Status:** Aprovado para Especificação de Interação (M4) e Implementação Frontend (M5)  
**Alvo Principal:** `client/src/pages/EvolutionAdmin.tsx`  
**Referência Canônica:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`  
**Diretório de Trabalho:** `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3`

---

## 1. Visão Geral da Arquitetura de Informação Macro

O módulo **Pixel** é a central de inteligência de tráfego conversacional da Tráfego Pro, responsável pelo rastreamento contínuo de instâncias de WhatsApp, esteira comercial CRM com movimentação por arraste (drag-and-drop), correlação multicanal de anúncios Meta Ads / Google Ads e auditoria operacional de webhooks.

### 1.1 Eliminação do Enquadramento de "Painel Isolado"
A arquitetura anterior rebaixava o módulo através de cabeçalhos segregadores ("Módulo isolado · administrativo"), rodapés depreciativos e botões de fuga ("Voltar à dashboard").  
A nova arquitetura integra o Pixel ao ecossistema da plataforma como um módulo operacional de primeira linha (**"Operations-Grade"**), compartilhando os mesmos tokens de superfície, grid de 4px, container mestre `max-w-[1440px]` e estilo de controles de `SocialPublishingAdmin.tsx`.

### 1.2 Estrutura Esquelética Global (Shell Comum a Todas as Telas)

Toda a experiência do usuário dentro de `/pixel` é estruturada em torno de 3 camadas superiores persistentes:

```
+-------------------------------------------------------------------------------------------------------+
| CAMADA 1: PixelHeader (Cabeçalho de Produto Integrado)                                                |
| [Ícone Signal Glow]  TRÁFEGO PRO · CENTRAL DE RASTREAMENTO    [Status Em tempo real]                  |
|                      Pixel & Atribuição                       [Sincronização Ativa] [Atualizar Dados] |
|                      Monitoramento contínuo de instâncias...                                          |
+-------------------------------------------------------------------------------------------------------+
| CAMADA 2: PixelScopeBar (Barra de Escopo Flutuante / Sticky lg:sticky lg:top-3 lg:z-20)               |
| [ Select Unidade: Todas / Unidade A ]  [ Select Instância: Todas / Whats B ]  [ 3 instâncias · 42 leads]
+-------------------------------------------------------------------------------------------------------+
| CAMADA 3: PixelSegmentedTabs (Barra de Navegação em Segmentos Pílula)                                  |
| [ Operação (4) ]  [ CRM (42) ]  [ Atribuição Meta ]  [ Conversas ]  [ Origem & tags ]  [ Auditoria ]  |
+-------------------------------------------------------------------------------------------------------+
| CAMADA 4: Conteúdo Ativo da Aba (Renderização condicional view === "...")                             |
|                                                                                                       |
|  (Operação | CRM | Atribuição Meta | Conversas | Origem & tags | Auditoria)                          |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
| CAMADA 5: Rodapé de Sistema                                                                           |
| Tráfego Pro Pixel · Engine de Rastreamento v2.0                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Shell Global & Componentes de Navegação Persistentes

### 2.1 Wireframe Textual: PixelHeader

```
+-------------------------------------------------------------------------------------------------------+
| [ Signal ]  TRÁFEGO PRO · CENTRAL DE RASTREAMENTO  (• Em tempo real)                                  |
|             Pixel & Atribuição                                    [ Clock3 Sincronização ] [ Refresh ]|
|             Monitoramento contínuo de instâncias WhatsApp,                                 Atualizar  |
|             pipeline comercial CRM, correlação de campanhas                                dados      |
|             Meta/Google e auditoria de webhooks.                                                      |
+-------------------------------------------------------------------------------------------------------+
```

- **Container:** `mb-8 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between`
- **Ícone de Identidade:** Grid `h-12 w-12` (48px), borda `border-cyan-300/25`, fundo `bg-cyan-400/10`, halo `shadow-[0_0_30px_rgba(34,211,238,.15)]`, ícone `Signal` `h-5 w-5` ciano.
- **Eyebrow:** `text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300`.
- **Status Badge:** Pílula `border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 text-[9px] uppercase tracking-wider` com pulso animado.
- **Título H1:** `font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl`.
- **Subtítulo:** `text-sm font-light leading-6 text-zinc-300 max-w-2xl`.
- **Ações de Topo:**
  - Badge informativo de sincronização: `border border-white/8 bg-white/[.02] px-3 py-2 text-xs text-zinc-400 rounded-xl`.
  - Botão Primário CTA: `bg-cyan-300 text-[#082124] px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:bg-cyan-200 active:scale-[0.98]`. Ícone `RefreshCw` com animação `animate-spin` em estado de carregamento.

---

### 2.2 Wireframe Textual: Sticky Scope Bar (`PixelScopeBar`)

Fixada no topo durante a rolagem no desktop (`lg:sticky lg:top-3 lg:z-20`), permitindo ao operador trocar de unidade ou filtrar por instância sem perder a posição de leitura.

```
+-------------------------------------------------------------------------------------------------------+
| [ Unidade: Todas as unidades autorizadas      v ]  [ Instância: Todas as instâncias conectadas  v ]   |
|                                                    [ (•) 4 instância(s)  ·  128 contato(s)        ]   |
+-------------------------------------------------------------------------------------------------------+
```

- **Container:** `mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#090a0b]/85 p-3.5 shadow-xl backdrop-blur-md lg:sticky lg:top-3 lg:z-20 lg:flex-row lg:items-center lg:justify-between`.
- **Campos de Seleção:** Superfície `bg-[#101214]`, borda `border-white/10`, altura mínima de toque 40px (`py-2.5 px-3.5`), texto `text-xs text-zinc-100 font-light`, ícone `ChevronDown` posicionado à direita em `text-zinc-400`.
- **Painel de Contagem Rápida:** Pílula `border border-cyan-300/20 bg-cyan-400/5 px-3.5 py-2 text-xs text-cyan-100` exibindo contagem de instâncias ativas e total de leads sob o escopo.

---

### 2.3 Wireframe Textual: Segmented Tabs Navigation (`PixelSegmentedTabs`)

Substitui as abas anteriores com preenchimento sólido ciano (que competiam visualmente com o botão de ação principal) por uma barra de segmentos com pílulas discretas e microindicador luminoso inferior.

```
+-------------------------------------------------------------------------------------------------------+
| [ [Activity] Operação ]  [ [Users] CRM (42) ]  [ [Mouse] Atribuição ]  [ [Message] Conversas ] ...    |
|      ====== (cyan bar)                                                                                |
+-------------------------------------------------------------------------------------------------------+
```

- **Container:** `inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[.025] p-1.5 shadow-inner mb-8`.
- **Item Inativo:** `px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[.04] rounded-xl border border-transparent transition-all`.
- **Item Ativo:** `px-3.5 py-2 text-xs font-medium text-white bg-white/[.08] border border-white/10 rounded-xl shadow-sm relative`.
- **Micro-indicador de Seleção:** Linha ciano `absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.6)]`.
- **Pílula Numérica (Contador de Itens):** `px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-400/20 text-cyan-200` quando ativo, ou `bg-white/5 text-zinc-400` quando inativo.

---

## 3. Aba 1 — Operação (`view === "operacao"`)

### 3.1 Problemas Resolvidos da Interface Original
1. **Inversão Hierárquica:** Na tela original, os formulários técnicos apareciam no topo e os 4 KPIs executivos ficavam perdidos no meio da página.
2. **Duplicação de Listas:** A mesma lista de instâncias aparecia duas vezes: uma como formulário editável e outra como lista de visualização abaixo dos KPIs.
3. **Solução Adotada:**
   - **Topo:** Bloco Executivo de KPIs com 4 colunas em destaque imediato.
   - **Meio:** Seção integrada dividida em 2 colunas: Painel Operacional de Instâncias à esquerda (com edição de nome, atribuição de unidade e status pill) e Painel do Webhook Seguro à direita.
   - **Base:** Tabela de Triagem Comercial de Contatos Recebidos com ações padronizadas de clique ("É lead" / "Não lead") e área de toque acessível (≥ 36px).

### 3.2 Wireframe Textual ASCII — Aba Operação

```
=========================================================================================================
ABA 1: OPERAÇÃO (Resumo Executivo, Instâncias Conectadas e Triagem Comercial)
=========================================================================================================

[ 1. RESUMO EXECUTIVO DE MÉTRICAS (GRID DE 4 COLUNAS) ]
+-------------------------+-------------------------+-------------------------+-------------------------+
| EVENTOS HOJE [Activity] | CONTATOS RASTREADOS [Usr| A VALIDAR  [AlertCircle]| FECHADOS [CheckCircle2] |
| 1.428                   | 254                     | 19                      | 48                      |
| +12% nas últimas 24h    | Total sob o escopo      | Pendentes de triagem    | Convertidos em vendas   |
+-------------------------+-------------------------+-------------------------+-------------------------+

[ 2. GESTÃO DE CONEXÕES & WEBHOOK (SPLIT GRID: 1.5fr / 1fr) ]
+-----------------------------------------------------+-------------------------------------------------+
| GESTÃO OPERACIONAL DE INSTÂNCIAS                    | CONEXÃO SEGURA & WEBHOOK                        |
| Instâncias WhatsApp vinculadas às unidades          | Recepção de eventos em tempo real               |
|                                                     |                                                 |
| +-------------------------------------------------+ | +---------------------------------------------+ |
| | Instância: zap-unidade-sul                      | | | [Webhook] Endpoint oficial de integração    | |
| | Nome Exibição: [ WhatsApp Recepção Sul       ]  | | | https://trafegopro.com.br/api/evolution/... | |
| | Unidade:       [ Unidade Porto Alegre - Sul v]  | | |                               [ Copiar ]  | |
| | Status: [ (•) Conectada ]     [ Salvar Alteração] | | +---------------------------------------------+ |
| +-------------------------------------------------+ |                                                 |
| | Instância: zap-vendas-matriz                    | | [ShieldCheck] Autenticação Bearer obrigatória   |
| | Nome Exibição: [ Vendas Matriz               ]  | |               com o token de segurança.       |
| | Unidade:       [ Matriz Corporativa        v]  | |                                                 |
| | Status: [ (•) Conectada ]     [ Salvar Alteração] | | [Bot] Eventos recomendados ativos:            |
| +-------------------------------------------------+ |       - MESSAGES_UPSERT                         |
|                                                     |       - CONNECTION_UPDATE                       |
+-----------------------------------------------------+-------------------------------------------------+

[ 3. TRIAGEM COMERCIAL DE CONTATOS RECEBIDOS (TABELA DE DADOS) ]
+-------------------------------------------------------------------------------------------------------+
| TRIAGEM DE LEADS                                                                                      |
| Classificação comercial e estágio inicial do funil                                                    |
+-------------------------------------------------------------------------------------------------------+
| CONTATO            | INSTÂNCIA          | MSGS REC/ENV | CLASSIFICAÇÃO | ETAPA           | AÇÃO RÁPIDA |
+--------------------+--------------------+--------------+---------------+-----------------+-------------+
| Mariana Silva      | zap-unidade-sul    | 14 / 8       | [ Lead (•)  ] | [ Qualificado v]| [É Lead ]   |
| •••• 9842 · 14:32  | Porto Alegre - Sul |              |               |                 | [Não Lead]  |
+--------------------+--------------------+--------------+---------------+-----------------+-------------+
| Carlos Eduardo     | zap-vendas-matriz  | 3 / 1        | [ Pendente! ] | [ Novo        v]| [É Lead ]   |
| •••• 1120 · 11:15  | Matriz             |              |               |                 | [Não Lead]  |
+--------------------+--------------------+--------------+---------------+-----------------+-------------+
| Roberta Dias       | zap-unidade-sul    | 1 / 0        | [ Não Lead  ] | [ Perdido     v]| [Reverter]  |
| •••• 7731 · Ontem  | Porto Alegre - Sul |              |               |                 |             |
+-------------------------------------------------------------------------------------------------------+
```

### 3.3 Especificação de Grid e Espaçamento (4px Scale) — Operação
- **Container Geral:** `space-y-8` (32px entre blocos mestres).
- **Grid de KPIs:** `grid gap-3 sm:grid-cols-2 xl:grid-cols-4` (gaps de 12px, cards com padding de 20px `p-5`, raio `rounded-2xl`).
- **Seção Split (Instâncias + Webhook):** `grid gap-6 xl:grid-cols-[1.5fr_1fr]` (gap de 24px).
  - Card de Instâncias: `bg-white/[.025] border border-white/8 rounded-2xl p-6`.
  - Formulário por Instância: `bg-black/20 border border-white/6 rounded-xl p-4 grid gap-3 md:grid-cols-[1.2fr_1.2fr_auto_auto] items-end`.
  - Painel de Webhook: `rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[.08] to-indigo-500/[.04] p-6 flex flex-col justify-between`.
- **Tabela de Triagem:** Container com `rounded-2xl border border-white/8 bg-white/[.025] overflow-hidden`.
  - Cabeçalho: `px-5 py-3.5 text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400 bg-black/10`.
  - Linhas: `px-5 py-4 border-b border-white/8 hover:bg-white/[.02]`.
  - Botões de Ação: `min-h-[36px] px-3 text-xs font-medium rounded-lg border border-white/10`.

---

## 4. Aba 2 — CRM Pipeline (`view === "crm"`)

### 4.1 Problemas Resolvidos da Interface Original
1. **Quebra de Funil:** A interface anterior usava grid responsivo que quebrava as 7 colunas em 3 ou 4 por linha, destruindo a noção de avanço linear do lead.
2. **Vazamento Textual:** Texto explicativo citava explicitamente `"Supabase Evolution"`.
3. **Arrastes sem Retorno Visual:** Não havia placeholder/drop-zone visível, gerando incerteza durante o drop.
4. **Falta de Busca Rápida:** Operador não conseguia localizar um lead específico entre dezenas de cards sem rolar coluna a coluna.

### 4.2 Solução Adotada
- **Barra de Ferramentas Superior do CRM:**
  - Resumo de métricas do funil (Leads no escopo, taxa de conversão, total movimentado).
  - Campo de busca instantâneo com ícone `Search` (filtra por nome, telefone ou campanha).
- **Banner de Concorrência por IA:**
  - Quando a IA está reclassificando contatos em lote, exibe banner informativo ciano/violeta com bloqueio suave do arraste (`locked = true`).
  - Quando concluído, exibe quem foi o último contato reclassificado com timestamp.
- **Esteira Horizontal Contínua de 7 Colunas:**
  - Container `flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin`.
  - Cada coluna possui largura fixa exata de **290px** (`w-[290px] shrink-0`).
  - Rolagem interna independente por coluna com `max-h-[660px]`.
  - Indicador de drop zone com anel ciano e fundo sutil (`border-cyan-300/60 bg-cyan-950/20 ring-2 ring-cyan-300/40`).
- **Modal / Drawer de Detalhes do Lead (`crmDetailLead`):**
  - Layout dividido em duas seções: Metadados de Origem/Atribuição + Histórico de Movimentações à esquerda, e Chat Completo à direita com rolagem automática para o fim.

### 4.3 Wireframe Textual ASCII — Aba CRM Kanban

```
=========================================================================================================
ABA 2: CRM PIPELINE (Esteira Horizontal Contínua de 7 Estágios Sequenciais)
=========================================================================================================

[ 1. CABEÇALHO DO CRM & BARRA DE BUSCA RÁPIDA ]
+-------------------------------------------------------------------------------------------------------+
| PIPELINE COMERCIAL                                                                                    |
| Gestão de contatos e movimentação entre as etapas do funil de vendas.                                 |
|                                                                                                       |
| [ Search Filtrar lead por nome, telefone ou campanha...      ]    [ 42 leads no escopo selecionado ]  |
+-------------------------------------------------------------------------------------------------------+

[ 2. NOTIFICAÇÃO DE AUTOMAÇÃO IA (QUANDO ATIVA OU RECENTE) ]
+-------------------------------------------------------------------------------------------------------+
| [Bot] IA da Tráfego Pro em Execução · Reclassificando contatos em lote... (Arraste em pausa)          |
+-------------------------------------------------------------------------------------------------------+

[ 3. ESTEIRA HORIZONTAL CONTÍNUA (CONTAINER COM OVERFLOW-X: 7 COLUNAS FIXAS DE 290px) ]
<- Scroll Esquerda                                                                     Scroll Direita ->
+---------------+---------------+---------------+---------------+---------------+---------------+---------------+
| NÃO RESPOND.  | RESPONDIDO    | FOLLOW UP     | RESPONDEU     | NEGOCIAÇÃO    | FECHOU [Won]  | PERDIDO [Lost]|
| (•) 12 leads  | (•) 8 leads   | (•) 5 leads   | (•) 6 leads   | (•) 7 leads   | (•) 3 leads   | (•) 1 lead    |
| ============= | ============= | ============= | ============= | ============= | ============= | ============= |
| +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ |
| | Lucas V.  | | | Amanda S. | | | Bruno F.  | | | Carlos M. | | | Patrícia R. | | | Diego B.  | | | Renato G. | |
| | •• 4421   | | | •• 8832   | | | •• 1920   | | | •• 3310   | | | •• 5590   | | | •• 1002   | | | •• 7741   | |
| | [Meta Adv]| | | [Meta Org]| | | [Google]  | | | [Meta Adv]| | | [Meta Adv]| | | [Meta Adv]| | | [Sem Evid]| |
| | zap-sul   | | | zap-sul   | | | zap-norte | | | zap-sul   | | | zap-matriz| | | zap-sul   | | | zap-norte | |
| | 4 rec/2env| | | 8 rec/6env| | | 2 rec/3env| | | 9 rec/5env| | | 15rec/12env| | | 22rec/18env| | | 1 rec/0env| |
| +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ | +-----------+ |
| +-----------+ | +-----------+ |               | +-----------+ | +-----------+ | +-----------+ |               |
| | Juliana P.| | | Gabriel T.| |               | | Mariana S.| | | Roberto D.| | | Juliana C.| |               |
| | •• 9011   | | | •• 3341   | | (Drop Zone)   | | •• 9842   | | | •• 7120   | | | •• 8819   | | (Vazio)       |
| | [Meta Adv]| | | [Meta Org]| | Solte o       | | [Meta Adv]| | | [Meta Adv]| | | [Meta Adv]| |               |
| | zap-sul   | | | zap-norte | | lead aqui     | | zap-sul   | | | zap-matriz| | | zap-sul   | |               |
| +-----------+ | +-----------+ |               | +-----------+ | +-----------+ | +-----------+ |               |
+---------------+---------------+---------------+---------------+---------------+---------------+---------------+
```

### 4.4 Wireframe Textual ASCII — Modal / Drawer de Detalhes do Lead

```
+-------------------------------------------------------------------------------------------------------+
| [X Fechar] DETALHES DO CONTATO                                                                        |
| Mariana Silva · +55 (51) 99842-1432 · zap-unidade-sul (Porto Alegre)                                  |
+----------------------------------------------------+--------------------------------------------------+
| COLUNA ESQUERDA: METADADOS & HISTÓRICO             | COLUNA DIREITA: CONVERSA WHATSAPP INTEGRADA      |
|                                                    |                                                  |
| [ ORIGEM & ATRIBUIÇÃO META ]                       | 14:15 [Lead]                                     |
| [ShieldCheck] Meta Ads · Verificado (ctwa_clid)    | Olá, gostaria de saber os valores do plano       |
| Campanha: Implantes Odonto Inverno 2026            | individual para Porto Alegre.                    |
| Conjunto: Público Aberto - Raio 15km               |                                                  |
| Criativo: Video_Depoimento_Dra_Camila              | 14:18 [Unidade Sul]                              |
|                                                    | Olá Mariana! Tudo bem? Temos condições           |
| [ HISTÓRICO DE ETAPAS CRM ]                        | especiais neste mês. Deixe-me explicar...        |
| - Lead respondeu -> Negociação                     |                                                  |
|   04/09 14:30 · Davi Menegazzi                     | 14:22 [Lead]                                     |
| - Follow up -> Lead respondeu                      | Perfeito, como faço para agendar uma consulta?   |
|   04/09 11:20 · IA da Tráfego Pro                  |                                                  |
| - Entrada -> Follow up                             |                                                  |
|   03/09 18:00 · Sistema                            |                                                  |
+----------------------------------------------------+--------------------------------------------------+
```

---

## 5. Aba 3 — Atribuição Meta (`view === "atribuicao"`)

### 5.1 Problemas Resolvidos da Interface Original
1. **Vazamento Textual:** Texto afirmava `"quando a Evolution entrega um identificador Meta..."`. Corrigido para linguagem neutra de produto.
2. **Poluição por Hashes Longos:** Células continham hashes de ID em fontes cinzas ilegíveis (`text-zinc-600`), sem capacidade de cópia.
3. **Ausência de Filtros Operacionais:** Uma tabela gigante sem campo de pesquisa nem filtro por status de correspondência.

### 5.2 Solução Adotada
- **KPIs de Pareamento no Topo:** 4 cartões com Total de Contatos Meta, Correspondência Confirmada (Matched), Sinais Não Resolvidos (Unresolved) e Taxa de Correlação.
- **Barra de Filtros da Atribuição:**
  - Campo de busca por Contato, Campanha ou ID do anúncio.
  - Filtro segmentado de status: `[ Todos ]`, `[ Confirmados (Matched) ]`, `[ Não Resolvidos ]`.
- **Tabela de Atribuição de Alta Hierarquia:**
  - Célula de Campanha, Conjunto e Criativo com hierarquia clara (Nome amigável em destaque `text-zinc-100` e ID técnico compacto com botão de cópia com 1 clique).
  - Status em pílulas semânticas padronizadas (`BadgeCheck` verde para confirmado, `HelpCircle` âmbar para pendente).

### 5.3 Wireframe Textual ASCII — Aba Atribuição Meta

```
=========================================================================================================
ABA 3: ATRIBUIÇÃO META ADS (Correlação de Leads com Campanhas, Conjuntos e Criativos)
=========================================================================================================

[ 1. KPIS DE CORRELAÇÃO DE METADADOS ]
+-------------------------+-------------------------+-------------------------+-------------------------+
| TOTAL RASTREADO META    | CORRESPONDÊNCIA CONFIR. | NÃO RESOLVIDOS / SINAIS | TAXA DE PAREAMENTO      |
| 184                     | 162                     | 22                      | 88.0%                   |
| Leads com tags Meta     | Campanha e adsetId ok   | Tag sem vínculo de ID   | Eficácia da correlação  |
+-------------------------+-------------------------+-------------------------+-------------------------+

[ 2. CONTROLES DE FILTRAGEM ]
+-------------------------------------------------------------------------------------------------------+
| [ Search Buscar por contato, campanha ou criativo...      ]  Status: [ Todos | Confirmados | Pendentes]|
+-------------------------------------------------------------------------------------------------------+

[ 3. TABELA DE ATRIBUIÇÃO DE CAMPANHAS ]
+-------------------------------------------------------------------------------------------------------+
| CONTATO           | CAMPANHA META        | CONJUNTO DE ANÚNCIOS | CRIATIVO / ANÚNCIO  | STATUS / MATCH|
+-------------------+----------------------+----------------------+---------------------+---------------+
| Mariana Silva     | Implantes Inverno    | Raio 15km - POA      | Video_Dra_Camila    | [ Confirmado ]|
| •••• 9842         | ID: 120205... [copy] | ID: 120205... [copy] | ID: 120205... [copy]| Método: ctwa  |
+-------------------+----------------------+----------------------+---------------------+---------------+
| Carlos Eduardo    | Clareamento Express  | Interesses Saúde     | Carrossel_AntesDepois| [ Confirmado ]|
| •••• 1120         | ID: 120209... [copy] | ID: 120209... [copy] | ID: 120209... [copy]| Método: ctwa  |
+-------------------+----------------------+----------------------+---------------------+---------------+
| Juliana Prado     | Não Identificada     | —                    | —                   | [ Não Resolv. ]|
| •••• 9011         | (Sem chave de anúncio)|                     |                     | Sinal: link   |
+-------------------------------------------------------------------------------------------------------+
```

---

## 6. Aba 4 — Conversas (`view === "conversas"`)

### 6.1 Problemas Resolvidos da Interface Original
1. **Lista Cega de Contatos:** Coluna esquerda com contatos sem campo de busca e sem indicador de status/etapa.
2. **Rolagem Desconectada:** Ao selecionar um contato, a conversa abria ancorada no topo (mensagens de dias atrás), exigindo rolagem manual até a última mensagem recebida.
3. **Contraste de Balões de Saída:** Texto escuro sobre ciano com legibilidade comprometida em telas com alto reflexo.

### 6.2 Solução Adotada
- **Layout Split-Pane Proporcional:** `lg:grid-cols-[360px_1fr]` (360px fixos para lista de contatos, restante flexível para a conversa).
- **Painel de Contatos:**
  - Campo de busca instantânea no topo (`placeholder="Filtrar conversa por nome ou telefone..."`).
  - Cards de contato com: Nome em destaque, número oculto com 4 dígitos finais, horário da última mensagem e pílula ciano com contagem de mensagens (`X rec / Y env`).
  - Estado ativo estilizado com fundo sutil e borda de destaque ciano.
- **Painel de Conversação:**
  - Cabeçalho fixo com Nome do contato, Instância ativa, Unidade e botão rápido de abrir detalhes CRM.
  - Linha do tempo com scroll ancorado no fundo (`flex-1 overflow-y-auto space-y-3 p-6`).
  - Balões de mensagem:
    - **Entrada (Recebida):** Fundo translúcido `bg-white/[.045] border border-white/10`, texto `text-zinc-100`, metadados `text-zinc-400`.
    - **Saída (Enviada):** Fundo ciano primário `bg-cyan-300`, texto escuro de alto contraste `#062428` (`leading-6 font-normal`), metadados em `#124348`.

### 6.3 Wireframe Textual ASCII — Aba Conversas

```
=========================================================================================================
ABA 4: CONVERSAS & HISTÓRICO DE MENSAGENS (Split-Pane 360px / 1fr)
=========================================================================================================

+----------------------------------------+--------------------------------------------------------------+
| COLUNA 1: LISTA DE CONTATOS (360px)    | COLUNA 2: LINHA DO TEMPO DA CONVERSA SELECIONADA             |
|                                        |                                                              |
| [ Search Filtrar conversa...         ] | [User] Mariana Silva · •••• 9842 · zap-unidade-sul           |
|                                        | Etapa: [ Negociação ]  ·  Origem: [ Meta Ads Verificado ]    |
| +------------------------------------+ |--------------------------------------------------------------|
| | Mariana Silva            14:32     | | [Recebida do Contato · 14:15]                                |
| | •••• 9842 · zap-sul                | | +----------------------------------------------------------+ |
| | "Gostaria de saber os valores..."  | | | Olá, gostaria de saber os valores do plano individual   | |
| | [ 14 rec / 8 env ]  (Selecionado)  | | | para Porto Alegre.                                       | |
| +------------------------------------+ | +----------------------------------------------------------+ |
| | Carlos Eduardo           11:15     | |                                                              |
| | •••• 1120 · zap-matriz             | |                               [Enviada pela Unidade · 14:18] |
| | "Qual o horário de atendimento?"   | | +----------------------------------------------------------+ |
| | [ 3 rec / 1 env ]                  | | | Olá Mariana! Tudo bem? Temos condições especiais neste  | |
| +------------------------------------+ | | | mês. Deixe-me explicar as coberturas...                 | |
| | Lucas Vieira             Ontem     | | +----------------------------------------------------------+ |
| | •••• 4421 · zap-sul                | |                                                              |
| | "Obrigado pelas informações!"      | | [Recebida do Contato · 14:22]                                |
| | [ 4 rec / 2 env ]                  | | +----------------------------------------------------------+ |
| +------------------------------------+ | | Perfeito, como faço para agendar uma consulta?            | |
|                                        | +----------------------------------------------------------+ |
+----------------------------------------+--------------------------------------------------------------+
```

---

## 7. Aba 5 — Origem & tags (`view === "origem"`)

### 7.1 Problemas Resolvidos da Interface Original
1. **Cards de Resumo Estáticos:** Os 4 cartões no topo não eram clicáveis para filtrar a tabela.
2. **Estouro de Células:** Identificadores como `metaCtwaClid` (que contêm até 80 caracteres) quebravam a largura da célula e forçavam rolagem indesejada.

### 7.2 Solução Adotada
- **4 KPI Cards Interativos com Ação de Filtro Rápido:**
  - Clicar no card "Meta verificado" filtra instantaneamente a tabela para exibir apenas leads com `verified`.
  - Indicador de filtro ativo ao redor do card selecionado.
- **Exibição Inteligente de Tags com Truncamento Seguro:**
  - Tags longas (`ctwa_clid`, `gclid`) são renderizadas com limite de largura (`max-w-[200px] truncate`), tipografia mono ciano e botão de cópia com feedback instantâneo.

### 7.3 Wireframe Textual ASCII — Aba Origem & tags

```
=========================================================================================================
ABA 5: ORIGEM & TAGS (Evidências de Rastreamento e Parâmetros Preservados)
=========================================================================================================

[ 1. KPIS INTERATIVOS DE EVIDÊNCIA (CLIQUE PARA FILTRAR A TABELA) ]
+-------------------------+-------------------------+-------------------------+-------------------------+
| [BadgeCheck] META VERIF.| [Signal] META OBSERVADO | [Tag] GOOGLE ADS        | [CircleSlash] SEM EVID. |
| 142                     | 42                      | 18                      | 52                      |
| Prova com ctwa_clid     | Sinal detectado em texto| Tag gclid ou anúncio    | Mensagem orgânica direta|
| [ * Filtro Ativo * ]    |                         |                         |                         |
+-------------------------+-------------------------+-------------------------+-------------------------+

[ 2. TABELA DE TAGS PRESERVADAS POR CONTATO ]
+-------------------------------------------------------------------------------------------------------+
| CONTATO            | PLATAFORMA ORIGEM | NÍVEL DE EVIDÊNCIA | TAG DISPONÍVEL (CLID/GCLID) | DETECTADO |
+--------------------+-------------------+--------------------+-----------------------------+-----------+
| Mariana Silva      | [ Meta Ads ]      | [ Verificado ]     | ctwa.AR...98421 [ Copiar ]  | 04/09 14h |
| •••• 9842 · zap-sul|                   |                    |                             |           |
+--------------------+-------------------+--------------------+-----------------------------+-----------+
| Carlos Eduardo     | [ Meta Ads ]      | [ Sinal Observado ]| ref_source_fb [ Copiar ]    | 04/09 11h |
| •••• 1120 · zap-mat|                   |                    |                             |           |
+--------------------+-------------------+--------------------+-----------------------------+-----------+
| Amanda Santos      | [ Google Ads ]    | [ Sinal Observado ]| gclid.CjwK...102 [ Copiar ] | 03/09 19h |
| •••• 8832 · zap-sul|                   |                    |                             |           |
+--------------------+-------------------+--------------------+-----------------------------+-----------+
| Pedro Alencar      | [ Sem Origem ]    | [ Sem Evidência ]  | —                           | 03/09 10h |
| •••• 4491 · zap-nor|                   |                    |                             |           |
+-------------------------------------------------------------------------------------------------------+
```

---

## 8. Aba 6 — Auditoria (`view === "auditoria"`)

### 8.1 Problemas Resolvidos da Interface Original
1. **Poluição por JSON Gigantes:** O dump bruto de objetos JSON ocupava a tela inteira sem recolhimento.
2. **Ausência de Filtros:** Sem busca nem filtro por evento (`MESSAGES_UPSERT`, `CONNECTION_UPDATE`).
3. **Sobrecarga de Renderização:** Sem agrupamento ou estado compacto.

### 8.2 Solução Adotada
- **Painel de Filtros Operacionais:**
  - Filtro por Tipo de Evento (`Todos`, `MESSAGES_UPSERT`, `CONNECTION_UPDATE`).
  - Filtro por Direção (`Entrada` / `Saída`).
- **Feed de Eventos Estilo Terminal / Console:**
  - Layout denso e linear com timestamp ISO/BR, nome da instância, tipo de evento em badge mono e preview conciso da mensagem.
  - Accordion expansível para o payload de atribuição (`[ Ver JSON (3 campos) ]`), com botão "Copiar JSON" integrado.

### 8.3 Wireframe Textual ASCII — Aba Auditoria

```
=========================================================================================================
ABA 6: AUDITORIA OPERACIONAL (Console de Eventos de Webhook e Payloads Sanitizados)
=========================================================================================================

[ 1. CABEÇALHO DO CONSOLE & FILTROS ]
+-------------------------------------------------------------------------------------------------------+
| CONSOLE DE AUDITORIA OPERACIONAL                                                                      |
| Registro cronológico de eventos e payloads recebidos pelo webhook do Pixel.                          |
|                                                                                                       |
| Evento: [ Todos os eventos v ]   Direção: [ Todas v ]   Instância: [ Todas as instâncias v ]          |
+-------------------------------------------------------------------------------------------------------+

[ 2. FEED CRONOLÓGICO DE EVENTOS ]
+-------------------------------------------------------------------------------------------------------+
| 04/09 14:32:11 · zap-unidade-sul · [ INCOMING ] · [ MESSAGES_UPSERT ]                                 |
| Contato: Mariana Silva (•••• 9842) · "Gostaria de saber os valores do plano individual..."            |
| > [ Expandir Payload de Atribuição (4 propriedades) ]  [ Copiar JSON ]                                |
|   {                                                                                                   |
|     "ctwa_clid": "AR...",                                                                             |
|     "source_id": "120205...",                                                                         |
|     "source_type": "ad"                                                                               |
|   }                                                                                                   |
+-------------------------------------------------------------------------------------------------------+
| 04/09 14:30:04 · zap-vendas-matriz · [ OUTGOING ] · [ MESSAGES_UPSERT ]                               |
| Mensagem enviada pelo atendente · "Olá! Em que podemos lhe ajudar hoje?"                             |
+-------------------------------------------------------------------------------------------------------+
| 04/09 12:00:00 · zap-unidade-sul · [ SYSTEM ] · [ CONNECTION_UPDATE ]                                 |
| Status de conexão atualizado para: open (Instância operacional)                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 9. Matriz de Breakpoints & Comportamento Responsivo

A interface foi projetada para quatro classes fundamentais de viewport, garantindo perfeita usabilidade desde smartphones até monitores Ultrawide de 1920px.

| Componente / Área | Mobile / Tablet (< 1024px) | Laptop / Desktop Compacto (1280px) | Desktop Padrão (1440px - Alvo) | Monitores Wide / Ultrawide (1920px) |
|---|---|---|---|---|
| **Container Mestre** | `w-full px-4 py-5` | `max-w-[1240px] mx-auto px-6` | `max-w-[1440px] mx-auto px-8 py-7` | `max-w-[1440px] mx-auto px-8` (Centralizado com margens balanceadas) |
| **PixelHeader** | Empilhado verticalmente (`flex-col gap-4`), botões em 100% | Linha horizontal (`flex-row justify-between`), botões alinhados | Linha horizontal espaçosa, halo ciano expandido | Linha horizontal elegante, respiro lateral |
| **PixelScopeBar** | Estática no topo, seletores em 100% de largura | `sticky top-3 z-20`, seletores compactos (`min-w-[180px]`) | `sticky top-3 z-20`, seletores confortáveis (`min-w-[220px]`) | `sticky top-3 z-20`, largura ancorada no grid mestre |
| **Segmented Tabs** | Rolagem horizontal com toque (`overflow-x-auto no-scrollbar`) | Linha contínua ajustada | Linha contínua com respiro e contadores | Linha contínua perfeitamente encaixada |
| **Aba Operação (KPIs)** | Grid de 1 ou 2 colunas (`grid-cols-1 sm:grid-cols-2`) | Grid de 4 colunas compacto | Grid de 4 colunas padrão (`xl:grid-cols-4`) | Grid de 4 colunas amplo |
| **Aba Operação (Split)**| Empilhado verticalmente (Instâncias acima, Webhook abaixo) | Split 2 colunas (`xl:grid-cols-[1.4fr_1fr]`) | Split 2 colunas (`xl:grid-cols-[1.5fr_1fr]`) | Split 2 colunas balanceado |
| **Aba CRM (Kanban)** | Rolagem horizontal suave com snap (`snap-x snap-mandatory`) | Rolagem horizontal com scrollbar fina, 7 colunas visíveis via scroll | Rolagem horizontal ampla, visualização imediata de 4 a 5 colunas simultâneas | Rolagem horizontal confortável, visualização de 5 a 6 colunas simultâneas |
| **Aba Conversas** | Alternância em abas (Lista de contatos OU Chat ativo) | Split-pane `[300px_1fr]` | Split-pane `[360px_1fr]` | Split-pane `[400px_1fr]` |
| **Tabelas de Dados** | Rolagem horizontal interna (`overflow-x-auto`) com min-w | Tabela fluida com truncamento inteligente de IDs | Tabela completa de alta densidade | Tabela ampla com máximo conforto visual |

---

## 10. Ledger de Proporções e Grid de 4px

Cada elemento visual segue estritamente a escala base de 4px:

| Token / Classe | Dimensão em Pixels | Uso no Módulo Pixel |
|---|---|---|
| `p-1` / `gap-1` | **4px** | Micro-paddings, tags compactas, gaps de ícones auxiliares |
| `p-1.5` / `gap-1.5` | **6px** | Padding do container de Segmented Tabs, gaps de badges |
| `p-2` / `gap-2` | **8px** | Gaps de cabeçalho, padding de botões compactos de ícone |
| `py-2.5 px-3.5` | **10px / 14px** | Inputs de formulário, selects da barra de escopo |
| `p-3` / `gap-3` | **12px** | Gap de KPI cards, padding interno das colunas do Kanban |
| `p-4` / `gap-4` | **16px** | Padding de cards de formulário de instância, gap entre colunas do CRM |
| `p-5` / `gap-5` | **20px** | Padding interno de KPI cards executivos |
| `p-6` / `gap-6` | **24px** | Padding de containers mestres de aba, gap do split-pane |
| `pb-7` / `py-7` | **28px** | Espaçamento inferior do cabeçalho de produto e padding vertical mestre |
| `p-8` / `gap-8` | **32px** | Espaçamento entre blocos de seção na aba de Operação |
| `rounded-lg` | **8px** | Botões de ação rápida de célula, selects internos de tabela |
| `rounded-xl` | **12px** | Inputs, selects, cards de lead do Kanban, sub-cards de instância |
| `rounded-2xl` | **16px** | Containers de seção, cards mestres de aba, modais, scope bar |
| `rounded-full` | **9999px** | Badges de status, pílulas de plataforma, contadores circulares |

---

## 11. Sanitização Textual & Blindagem de Marca

Conforme a diretriz mandatória de produto:
- **Zero menções a "Evolution" na UI visível**.
- Todo termo referente à engine técnica é traduzido para a linguagem de valor comercial da **Tráfego Pro**.

| Ocorrência Anterior / Incorreta | Substituição Obrigatória Canônica |
|---|---|
| `Módulo isolado · administrativo` | `Tráfego Pro · Central de Rastreamento` |
| `Este ambiente não participa das métricas...` | `Monitoramento contínuo de instâncias WhatsApp, pipeline comercial CRM, correlação de campanhas Meta/Google e auditoria de webhooks.` |
| `Voltar à dashboard` | Removido ou transformado em atalho integrado de navegação |
| `A movimentação fica registrada no Supabase Evolution...` | `A movimentação fica sincronizada em tempo real no Pixel e isolada por instância e unidade.` |
| `quando a Evolution entrega um identificador Meta...` | `quando o webhook do Pixel recebe um identificador Meta e correlaciona com a fonte de métricas.` |
| `Painel administrativo isolado > Pixel` | `Tráfego Pro Pixel · Engine de Rastreamento v2.0` |
| `Endpoint Evolution` | `Endpoint do Webhook Seguro` |

---

## 12. Sistema de Iconografia Lucide (Substituição Integral de Emojis)

**Proibição Absoluta de Emojis:** Nenhum caractere Unicode de emoji (como 🟢, 🔴, 🤖, 💬, 📱) pode ser injetado na interface. Todos foram mapeados para ícones vetoriais do `lucide-react`:

| Significado Visual / Semiótica | Ícone Lucide Obrigatório | Dimensão & Estilo |
|---|---|---|
| **Conexão Ativa / Aberta** | `CheckCircle2` | `h-3 w-3 text-emerald-300` |
| **Conexão Desconectada / Fechada** | `AlertTriangle` | `h-3 w-3 text-rose-300` |
| **Conexão em Espera** | `Clock3` | `h-3 w-3 text-amber-300` |
| **Telefone / Contato** | `Phone` | `h-3 w-3 text-zinc-400` |
| **Automação IA** | `Bot` | `h-3.5 w-3.5 text-violet-300 animate-pulse` |
| **Atribuição Meta Ads** | `BadgeCheck` | `h-3.5 w-3.5 text-emerald-300` |
| **Sinal Observado / Rádio** | `Signal` | `h-3.5 w-3.5 text-amber-300` |
| **Google Ads** | `Tag` | `h-3.5 w-3.5 text-sky-300` |
| **Sem Evidência / Neutro** | `CircleSlash` | `h-3.5 w-3.5 text-zinc-400` |
| **Lead Qualificado / Won** | `CheckCircle2` | `h-4 w-4 text-emerald-300` |
| **Lead Não Qualificado / Lost** | `UserX` | `h-3.5 w-3.5 text-zinc-400` |
| **Conversas / Chat** | `MessageCircleMore` | `h-4 w-4 text-indigo-300` |
| **Auditoria / Payload** | `FileJson` | `h-4 w-4 text-zinc-400` |
| **Webhook Seguro** | `Webhook` | `h-4 w-4 text-[#082124]` |
| **Alça de Arraste (DnD Handle)** | `GripVertical` | `h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300` |

---

*Especificação estrutural e wireframes finalizados em estrita conformidade com as diretrizes da Tráfego Pro.*
