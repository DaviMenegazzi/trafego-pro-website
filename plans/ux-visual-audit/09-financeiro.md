# Financeiro & Gestão

Capturas: `img/12-financeiro.png`, `img/12-financeiro-mobile.png`, `img/12-financeiro-despesas.png`, `img/12-financeiro-dashboard.png`, `img/12-financeiro-atas.png`, `img/12-financeiro-unidade.png`, `img/12-financeiro-nova.png`, `img/12-financeiro-seletor.png`.

Módulo interno de administração da agência. Concentra os sinais de "codado" do produto: **37 `alert()`, 6 `confirm()`, 13 `<select>` nativos**, datas ISO cruas e botões de 22px.

## Bug que perde dado (prioridade máxima)

**"Saldo atual em caixa" aparece `0` e "Salvar caixa" grava 0 por cima do saldo real.** O campo é inicializado uma única vez (`useState(dbState.caixa?.saldo)`) antes do Firebase responder, e nunca é atualizado quando o dado chega. A projeção "fim do ano" também parte de zero. O campo precisa acompanhar o dado enquanto não for editado.

## Cabeçalho e abas — `img/12-financeiro.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo "Módulo de Gestão Financeira · Firebase Realtime" (mono) | ✂️ | Nome de tecnologia na interface. |
| — | Título "Central Financeira & Franquias" + parágrafo | 🔁 | `PageHeader` "Financeiro". |
| 16 | "Visão Geral (Todas as Unidades)" — dropdown feito à mão (`div` fixa invisível para fechar) | 🔁 | Vira o `Select`/popover padrão com busca. O contador "12 CADASTRADAS" (mono verde) vai para dentro do popover. |
| 17–20 | Abas FINANCEIRO / DESPESAS / DASHBOARD / ATAS DE REUNIÃO (CAIXA ALTA, pílula verde sólida) | 🔁 | Abas em CAIXA ALTA com fundo verde sólido pesam mais que o conteúdo. Abas com sublinhado, em frase. No celular as abas **se sobrepõem** ("FINANDESPESASDASHBOARD"). |
| — | Aba extra com o nome da unidade quando se abre uma unidade | 🔁 | Aba que aparece e some. Com a unidade aberta, o cabeçalho mostra "← Financeiro / Vida Card Ijuí". |

## Aba Financeiro

É uma página de 3.100px com cinco blocos: unidades, caixa e despesas fixas, cobranças do mês, divisão societária e demonstrativo.

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 21 | "CADASTRAR NOVA UNIDADE" | ⭐ | Ação principal da aba; em frase: "Nova unidade". |
| — | Grade de 12 cartões de unidade (`div` clicável, ícone ↗ de "abrir fora") | 🔁 | Não recebem foco (não aparecem entre os elementos numerados). O ícone ↗ sugere nova aba, mas abre na mesma página. Vira `button` com seta →. |
| 22–24 | Caixa: saldo, meta, "SALVAR CAIXA" | 🗂️ | Caixa e despesas fixas são da empresa, não das unidades. Vão para a aba **Despesas**. |
| 25–28 | Nova despesa fixa: 3 campos + "+ ADICIONAR" em linha | 🗂️ | Idem. |
| 29–32 | Lixeiras sem rótulo (22×22, sem `aria-label`, sem `title`) | 🔁 | Botão invisível para leitor de tela. `IconButton` com tooltip + `ConfirmDialog` (hoje `confirm()`). |
| 33 | Mês da cobrança (`<select>` nativo) | 🔁 | `Select` com setas ‹ › para mês anterior/seguinte. |
| 34, 39… | Nome da unidade (botão de 16px de altura) | ✅ | Ok como link; alvo maior. |
| 35–36… | "Gerado" / "Gerada" / "Pendente" (boleto e NF) | ✅ | Alternância com estado visível; ok. `title=` vira tooltip. |
| 42, 47… | Valor recebido "1800.00" | 🔁 | Formato americano num campo de dinheiro. Campo de moeda pt-BR ("1.800,00"). |
| 43, 48… | "Confirmar" (laranja) | ✅ | Reversível (há "desconfirmar"), sem confirmação. Toast com "Desfazer". |
| 37–38… | Editar valor / Desconfirmar (22×22, `title=`) | ⋯ | Menu ⋯ da linha. Desconfirmar hoje usa `confirm()`; como é reversível, vira ação direta com toast "Desfazer" (apple-design: confirmação só no irreversível). |
| — | "div. em 2026-09-14T12:00:00.000Z" | 🔁 | Data ISO crua. "dividido em 14/09". |
| — | Demonstrativo com meses "2026_07", "2026_08" | 🔁 | Chave interna. "Jul 2026". |
| — | Checklist com "por davi · 2026-07-06T12:00:00.000Z" (`12-financeiro-unidade`) | 🔁 | Idem: "Davi · 06/07". |

## Aba Despesas — `img/12-financeiro-despesas.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 21 | "NOVA DESPESA" dentro de um cartão só para ele ("LANÇAR DESPESA DA OPERAÇÃO") | 🔁 | Um cartão de 90px para um botão. Botão no cabeçalho da tabela. |
| 22 | Mês (`<select>`) | 🔁 | `Select`. |
| 23… | "Pendente" / "Paga" (clicar alterna) | ✅ | Estado visível e reversível. |
| 24–25… | Editar / Excluir (22×22) | ⋯ | Menu ⋯ por linha; excluir com `ConfirmDialog`. |
| — | Descrição vazia "—" embaixo de cada nome | ✂️ | Linha vazia repetida 22 vezes. |
| — | "Resumo por mês" | ✅ | — |

## Aba Dashboard — `img/12-financeiro-dashboard.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | "Desempenho em tempo real" | 🔁 | Promessa. "Resumo de Setembro 2026". |
| — | KPIs com valor em mono verde/vermelho/azul | 🔁 | `StatTile`. |
| 22–23 | Colunas / Tendência | ✅ | `SegmentedControl`. |
| — | Gráfico: verde / vermelho / azul (`#10b981, #f43f5e, #3b82f6`) | 🔁 | Falha no validador: verde↔rosa com ΔE 5,6 para deuteranopia. Receita aqua, Despesas laranja, Lucro azul (validado). Barras agrupadas sem espaço entre grupos parecem uma série só. |
| — | 3 cartões mês a mês abaixo do gráfico | 🔁 | Repetem o gráfico em texto. Viram a tabela do gráfico (dataviz: sempre existe uma visão em tabela) — uma tabela, não três cartões. |
| — | "Inadimplência 8" | ✅ | — |

## Aba Atas — `img/12-financeiro-atas.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 21 | "REGISTRAR NOVA ATA" | ⭐ | Em frase. |
| 22–27 | "Excluir" em texto vermelho, `confirm()` | 🔁 | Menu ⋯ + `ConfirmDialog`. |
| — | Validação com `alert()` (5) | 🔁 | Erro inline no campo. |

## Detalhe da unidade — `img/12-financeiro-unidade.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 17 | "EXPORTAR UNIDADE" (54px de altura, quebra em duas linhas) | ⋯ | Menu ⋯ do cabeçalho da unidade. |
| 23 | Editar unidade | ✅ | — |
| 24 | Excluir (encerra e arquiva) — `confirm()` | 🔁 | Irreversível para o fluxo: `ConfirmDialog` perigoso com o nome da unidade. |
| — | Ficha com 9 campos em colunas estreitas ("Rua do Co…", "financeiro@…") | 🔁 | Texto cortado. Lista de definição em 2 colunas. |
| 25–124 | Três checklists lado a lado (Financeiro 10, Tráfego **75**, Social 12 itens) | 🔁 | A coluna do meio tem 3.900px. Grupos recolhíveis com progresso por grupo; só o primeiro grupo incompleto aberto. |
| 35, 111, 124 | "Adicionar Demanda" | ✅ | — |

## Cadastro de unidade — `img/12-financeiro-nova.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 21 | "FECHAR FORMULÁRIO" (o botão de abrir vira o de fechar) | 🔁 | O formulário abre **dentro da página**, empurrando tudo, e o mesmo botão muda de função. Vira `Dialog` com "Cancelar". |
| 22 | Vincular conta Meta (`<select>` 30px, "(Entrada manual / não vinculado)") | 🔁 | `Select` com busca. |
| 29, 32 | Vencimento e mês inicial (`<select>`) | 🔁 | `Select`. |
| 31 | Data de início (`type="date"`) | 🔁 | `DatePicker`. |
| — | 7 validações com `alert()` | 🔁 | Erro inline no campo. |

## Celular — `img/12-financeiro-mobile.png`

Página com **818px** de largura em tela de 390px: a tabela de cobranças não tem rolagem própria e estoura o layout. Tabela dentro de `overflow-x-auto`, ou linhas viram cartões.
