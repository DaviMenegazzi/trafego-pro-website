# Anúncios & Criativos

Capturas: `img/06-anuncios.png`, `img/06-anuncios-mobile.png`, `img/06-anuncios-galeria.png`, `img/06-anuncios-status.png`, `img/06-anuncios-legenda.png`, `img/06-anuncios-export.png`.

A pergunta da tela: "quais criativos estão trazendo conversa barata e quais estão queimando verba". Hoje a resposta aparece **três vezes** (lista com prévia, dois gráficos Top 15 e uma tabela de 38 linhas), e para chegar nela passa-se por 11 controles.

## Cabeçalho e barra de controles — `img/06-anuncios.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo pulsante, título 36px, parágrafo, cartão "UNIDADE ATIVA", faixa "sincronizados em tempo real" | 🔁 ✂️ | Mesmas decisões da Dashboard: `PageHeader` "Anúncios" + "Vida Card Ijuí · últimos 30 dias · atualizado às 09:00". |
| 10 | Busca "Buscar anúncio ou oferta…" (44px) | ✅ | Primeira da barra, 36px. |
| 11 | Período | 🔁 | `SegmentedControl` compartilhado com a Dashboard. |
| 12 | Unidade | ✂️ | Duplica o seletor global. |
| 13 | "Status: Todas" (popover com 3 opções) | 🔁 | Três opções mutuamente exclusivas escondidas atrás de clique. `SegmentedControl` [Todas · Ativas · Pausadas]. |
| 14 | "Performance: Todas" (popover com 7 opções) | 🔁 | Vira `Select` compacto "Classificação". |
| 15 | Ordenar "Conversas iniciadas" | 🔁 | Vira `Select` "Ordenar por", com direção no próprio item. |
| 16 | "Legenda" (abre modal) | 🪟 | Explicação de 7 classificações num **modal** que cobre a tela e fica atrás da sidebar (`06-anuncios-legenda`). Vira popover ancorado a um ícone "?" ao lado do filtro de classificação (emil: popover nasce do gatilho). |
| 17 | "Atualizar" | 🔁 | `IconButton` com tooltip, ao lado do "atualizado às". |
| 18 | "Exportar Card WhatsApp (HD)" | ⋯ | Menu "Exportar". |
| 19 | "Consolidado por Criativo" / "Exibir por Conjunto" (alterna texto) | 🔁 | Botão cujo rótulo muda de sentido ao clicar — o usuário não sabe se o texto é o estado atual ou a ação. Vira `Switch` "Agrupar por criativo" dentro do mesmo grupo de visualização. |
| 20 | "Galeria de Criativos" / "Modo Lista & Detalhes" | 🔁 | Idem: rótulo que alterna. Vira `SegmentedControl` [Lista · Tabela · Galeria]. |

Esboço da barra:

```
[🔍 Buscar anúncio ou oferta]  [7d|30d|90d|…]  [Todas|Ativas|Pausadas]  [Classificação ⌄] ⓘ  [Ordenar ⌄]
38 criativos · Agrupar por criativo (●)                          [Lista|Tabela|Galeria]   ⟳  [Exportar ⌄]
```

## Corpo

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 21–58 | Lista de anúncios (38 cartões de 108px, rolagem interna) + painel "Prévia & Detalhes" | ✅ 🔁 | É a melhor visualização da tela (mestre-detalhe). No painel, 12 mini-cartões de métrica com rótulo mono → lista de definição em duas colunas. |
| — | "Conversas por Anúncio (Top 15)" e "Investimento por Anúncio (Top 15)" | 🔁 | Duas barras horizontais com a mesma ordem de anúncios, cores verde e **roxo** (roxo não tem significado). Viram um só gráfico "Custo por conversa por anúncio" — é a métrica que a tela quer comparar — com o valor rotulado na ponta da barra (dataviz: rótulo direto, sem legenda para uma série). |
| — | "Dados Consolidados dos Anúncios" (tabela de 38 linhas abaixo de tudo) | 🗂️ | Repete a lista. Vira a visualização "Tabela" do controle segmentado — mesmo dado, escolhido pelo usuário, não empilhado. |
| — | Imagem "Sem imagem" em cada linha (38×) | 🔁 | Quando a Meta não envia imagem, a coluna vira 38 placas iguais. Mostrar a inicial da oferta num quadrado neutro, sem o texto "Sem imagem". |

## Galeria — `img/06-anuncios-galeria.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | "0 Criativos Ativos" enquanto a contagem diz "38 criativos localizados" | 🔁 | A galeria filtra por "tem imagem"; sem imagem, diz zero criativos. Texto: "Nenhum criativo ativo com imagem disponível." |
| 21 | "Baixar / Copiar Card HD" | ⋯ | Mesma ação do menu Exportar. |

## Modal "Exportar Card Executivo de Criativos" — `img/06-anuncios-export.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Cortado pela sidebar | 🔁 | Ver Estrutura global. |
| 60 | "Criativos Únicos" (selo que é botão, 25px, `title=`) | 🔁 | Parece selo, age como alternância. `Switch` com rótulo. |
| 61–63 | Copiar texto / Copiar imagem / Baixar PNG (2.5x HD) | 🔁 | Mesma hierarquia do modal da Dashboard. |
| — | Rodapé do card "Dashboard Atualizada em Tempo Real" | 🔁 | Promessa indevida num material que vai para o cliente. "Dados de dd/mm às hh:mm". |
| — | "LEADS WHATSAPP" no card e "Conversas iniciadas" na tela | 🔁 | Mesma métrica com dois nomes. Usar "Conversas" em tudo. |

## Celular — `img/06-anuncios-mobile.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 10–20 | 11 controles empilhados em 6 linhas antes do primeiro anúncio | 🔁 | Busca + um botão "Filtros" (abre gaveta com status, classificação, ordenação e agrupamento) + menu ⋯. |
| — | Página de 6.099px (lista + detalhe + 2 gráficos + tabela) | 🔁 | No celular, só a lista; tocar num anúncio abre o detalhe em gaveta. |
