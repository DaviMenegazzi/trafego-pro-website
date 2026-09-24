# Métricas da Rede

Capturas: `img/11-metricas.png`, `img/11-metricas-mobile.png`, `img/11-metricas-guia.png`, `img/11-metricas-analise.png`.

Tela do gestor para priorizar: "quais unidades precisam de mim hoje". A lista ordenada por risco é o produto; o resto é apoio.

## Cabeçalho — `img/11-metricas.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo pulsante "Cockpit Estratégico de Tráfego & IA" | ✂️ | Não há IA nessa tela (é estatística descritiva sobre o histórico). Promessa indevida. |
| — | Título "Métricas Globais & Projeções da Rede" (2 linhas) + parágrafo técnico | 🔁 | "Métricas da Rede" (igual ao menu) + "12 unidades · faltam 6 dias para fechar o mês". |
| 16 | "Guia do Algoritmo" (expande um bloco de 4 cartões no topo) | 🪟 | Referência de consulta rara que empurra a lista 200px. Popover "Como ler" ancorado a um ícone "?" (emil: popover nasce do gatilho). |
| 17 | "Exportar CSV" | ⋯ | Menu Exportar. |
| 18 | "Expandir Todos" (quebra de linha, 124px) | ⋯ | Ação rara. |
| 19 | "Atualizar" (verde) | 🔁 | `IconButton`. |

## Guia — `img/11-metricas-guia.png`

| Trecho | Decisão | Por quê |
| --- | --- | --- |
| "há **97.5% de certeza estatística** de que o público saturou ou o anúncio perdeu tração" | 🔁 | μ+2σ diz que o custo está fora do padrão dos últimos 30 dias, não *por quê*. Texto: "o custo está acima do normal para esta unidade — vale investigar criativo e público." |
| "Probabilidade Binomial … chance real de bater a meta" | 🔁 | A meta vem de uma tabela **fixa no código** (`DEFAULT_MONTHLY_TARGETS`, 200 leads para qualquer unidade não cadastrada). Mostrar "meta padrão" quando a unidade não tiver meta própria. |

## KPIs

| Elemento | Decisão | Por quê |
| --- | --- | --- |
| 4 cartões (Investimento, Leads/Meta, CPL médio, Status das unidades) | 🔁 | Mesmo `StatTile` da Dashboard. "Status das unidades" em 3 cores coladas ("4 Críticas • 4 Atenção • 4 Saudáveis") vira uma barra empilhada fina com os rótulos embaixo (dataviz: parte-de-todo). |

## Filtros

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 20–23 | Todas / Críticas / Atenção / Saudáveis (4 estilos diferentes: branco, vermelho, âmbar, verde) | 🔁 | `SegmentedControl` neutro com contagem; a cor fica no ponto ao lado do rótulo. |
| 24 | Ordenar (`<select>` nativo) | 🔁 | `Select`. |
| 25 | Buscar unidade | ✅ | Primeiro da barra. |

## Linhas de unidade

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Números em formato americano: "R$ 9.91", "11.2%", "73.1% da meta", "Ritmo: 11.9/d" | 🔁 | O resto do app usa pt-BR ("R$ 9,91"). `lib/format.ts`. |
| — | Rótulos mono 9px CAIXA ALTA ("CPL 7D (SMA)", "PROB. META") | 🔁 | 11px, frase, sem mono. "SMA" → "média 7 dias". |
| — | Selos "Score: 84", "Estável", "Fadiga / Atenção", "Gatilho Crítico" | 🔁 | Dois selos por linha dizem quase o mesmo. Um selo de status (com ícone) + a nota A/B/C no avatar. |
| 26–37 | "Ver Análise ⌄" | 🔁 | A linha inteira expande (botão com `aria-expanded`). |
| — | Análise aberta (`11-metricas-analise`): barras de CPL diário em **marrom** + linha SMA verde + teto tracejado | 🔁 | Marrom (âmbar a 50%) não está na paleta e parece desativado. Barras azuis, linha da média em laranja, teto em linha de referência cinza rotulada. |

## Celular — `img/11-metricas-mobile.png`

A página tem 5.141px; o cabeçalho de 4 botões e o guia ocupam a primeira dobra. Com as decisões acima, a lista começa na primeira tela.
