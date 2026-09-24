# Dashboard

Capturas: `img/04-dashboard.png`, `img/04-dashboard-mobile.png`, `img/04-dashboard-periodo.png`, `img/04-dashboard-unidade.png`, `img/04-dashboard-analise.png`, `img/04-dashboard-print.png`, `img/04-dashboard-vazio.png`, `img/04-dashboard-erro.png`, `img/04-dashboard-banco.png`.

É a tela mais usada: cliente e gestor abrem para responder "quanto gastei, quantas conversas, quanto custou cada uma". Tudo o que compete com essa resposta desce ou vai para um menu.

## Cabeçalho e barra de filtros — `img/04-dashboard.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo pulsante "● Visão de Performance & Mídia" | ✂️ | Pulso animado permanente sem estado para comunicar (apple-design: feedback só com causa). |
| — | Título "Dashboard de Resultados" (36px) + parágrafo | 🔁 | Vira `PageHeader`: "Resultados" + uma linha curta com unidade e período ("Vida Card Ijuí · últimos 30 dias"). |
| — | Cartão "UNIDADE ATIVA · Vida Card Ijuí" | ✂️ | Terceira vez que a unidade aparece (sidebar, filtro, cartão). Entra no subtítulo do cabeçalho. |
| — | Faixa verde "Dados sincronizados em tempo real via Meta Graph API · Sincronizado às 09:00" | 🔁 | Faixa de largura total que empurra o conteúdo em **toda** visita, dizendo que está tudo normal. Vira texto discreto no cabeçalho: "Atualizado às 09:00". "Tempo real" sai (há cache de 3 min). |
| — | Faixa âmbar "Exibindo dados do Banco de Dados (Supabase)…" (`04-dashboard-banco`) | 🔁 | Útil quando o dado vem do banco, mas ocupa 130px, fala de tecnologia (Supabase, Graph API) e tem um ícone girando. Vira um aviso de uma linha: "Mostrando dados salvos às 09:00 — a Meta limitou consultas. Nova tentativa em ~9 min." |
| 10 | Período "30 dias" (popover) | 🔁 | Os atalhos 7/30/90 ficam escondidos atrás de clique, mas são a troca mais comum. Vira `SegmentedControl` [7d · 30d · 90d · Personalizado], e só "Personalizado" abre o popover ancorado. |
| 11 | Unidade "Vida Card Ijuí" (popover) | ✂️ | Duplica o seletor da sidebar (#2), que altera o mesmo contexto. Dois controles para a mesma coisa confundem ("qual manda?"). No celular fica o do topo. |
| 12 | "Gerar Print (WhatsApp)" (verde, `title=`) | ⋯ | Ação de exportação, semanal, só admin. Não deve competir com os dados. Vai para o menu "Exportar". |
| 13 | "Exportar Excel" (`title=`) | ⋯ | Idem. |
| 14 | "Atualizar dados" | 🔁 | Vira `IconButton` com tooltip "Atualizar" ao lado do "Atualizado às 09:00". |

Esboço:

```
Resultados                                          Atualizado às 09:00  ⟳   [Exportar ⌄]
Vida Card Ijuí · últimos 30 dias                                               ├ Imagem para WhatsApp
[ 7d | 30d | 90d | Personalizado ]                                             └ Planilha Excel
```

## Popover de período — `img/04-dashboard-periodo.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 16–18 | Atalhos 7/30/90 dentro do popover | ✂️ | Saem para o controle segmentado. |
| 19–20 | `<input type="date">` nativos | 🔁 | Formato do navegador (aparece "08/26/2026", mês/dia) e ícone de calendário do sistema. `DateRangePicker` com calendário em pt-BR. |
| 21–22 | Cancelar / Aplicar período | ✅ | — |

## KPIs e métricas complementares

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | 4 cartões de KPI com rótulo mono CAIXA ALTA (11px, tracking 0,16em) e ícone colorido | 🔁 | Rótulo mono espaçado é a assinatura de "template de dashboard". dataviz: número é herói, rótulo em texto secundário, cor de texto neutra — a cor de identidade vai num marcador, não no número. Custo por conversa mantém a cor de **status** (verde/âmbar/vermelho) com a palavra ("Bom", "Atenção", "Alto") ao lado. |
| — | "MÉTRICAS COMPLEMENTARES & TRÁFEGO" (8 mini-cartões) | 🔁 | 8 caixas com borda para 8 números. Vira uma faixa única com divisórias, sem caixa por número (menos ruído, mesma densidade). |
| 15 | Acordeão "ANÁLISE AVANÇADA & PROJEÇÕES · Score 48 (C) · Gatilho Crítico · Prob. Meta 22%" | 🗂️ | Aberto, empurra os gráficos 900px para baixo (`04-dashboard-analise`) com diagnóstico, score ponderado, projeção binomial, gráfico e 3 painéis estatísticos. É um relatório, não um resumo. Fica o cartão-resumo (score, status, probabilidade) e o conteúdo vai para uma **aba "Análise"** na própria Dashboard. |

## Gráficos

| Gráfico | Decisão | Por quê |
| --- | --- | --- |
| Conversas iniciadas por dia (área, verde, 3px) | 🔁 | Traço de 3px e pontos em todos os 30 dias. dataviz: linha de 2px, marcadores só no hover, área com preenchimento leve. Cor: aqua validado. |
| **Investimento x Conversas (eixo duplo)** | 🔁 | **Eixo duplo** é o anti-padrão nº 1 da dataviz: as duas escalas são arbitrárias e o cruzamento das linhas não significa nada. Troca por "Investimento por dia" (barras, um eixo, azul). |
| Custo por conversa (área vermelha) | 🔁 | Usa o vermelho de status como cor de série: tudo parece alerta. Laranja validado + linha de referência pontilhada na média do período. |
| Tooltips (`#18181b`, raio 14) | ✅ | Manter, com valores formatados em pt-BR (hoje "investimento: 104.62" cru). |

Paleta (validada, ver README): conversas `#199e70`, investimento `#3987e5`, custo `#d95926`.

## Tabela "Desempenho por campanha"

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | 11 colunas em 1.102px | 🔁 | A coluna **Status fica cortada** à direita ("ATEN…", "CRÍT…") e CPC/CPM quebram em duas linhas ("R$ / 0,68"). Valores monetários com `nowrap`; Impressões e Cliques saem da tabela padrão (estão no total acima) ou a tabela ganha rolagem horizontal com a primeira coluna fixa. |
| — | Números em `font-mono` | 🔁 | `tabular-nums` já alinha; o mono deixa a tabela com cara de terminal. |
| — | Selo de status em CAIXA ALTA | 🔁 | Selo em frase ("Atenção"), com ícone. |
| — | Cartões de campanha no celular (clique na `div`) | 🔁 | `div onClick` sem teclado. Vira `button` com `aria-expanded`. |

## Estados

| Estado | Decisão | Por quê |
| --- | --- | --- |
| Vazio (`04-dashboard-vazio`) | ✅ | Mensagem boa. Faltou ação: "Ver últimos 90 dias". |
| Erro (`04-dashboard-erro`) | 🔁 | Quando o endpoint unificado falha e os antigos respondem vazio, a tela diz "Sem dados para este período" — o usuário conclui que não houve resultado. Diferenciar "não conseguimos buscar" de "não houve dados". |
| Modal "Exportar Relatório Executivo" (`04-dashboard-print`) | 🔁 | Cortado pela sidebar (ver Estrutura global). Selo "ULTRA HD" e "Baixar PNG (2.5x HD)" são jargão: "Baixar imagem". Três botões de mesmo peso → primária "Baixar imagem", secundárias "Copiar imagem" e "Copiar texto". |

## Celular — `img/04-dashboard-mobile.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 12 | Unidade (repetida) | ✂️ | Já está no topo (#2). |
| 13–15 | Atualizar, Print, Excel | 🔁 | Estouram a largura (página com **456px**). Ficam só "⟳" e o menu "Exportar". |
| 16–19 | Chips 7/30/90/Customizado (28–30px) | 🔁 | `SegmentedControl` com 36px de altura. |
| 20 | Acordeão de análise com 220px de altura | 🔁 | Cartão-resumo compacto. |
