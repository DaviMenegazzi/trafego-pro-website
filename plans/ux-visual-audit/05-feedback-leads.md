# Feedback de Leads (formulário) e Feedbacks enviados (lista)

Capturas: `img/07-feedback.png`, `img/07-feedback-mobile.png`, `img/13-feedbacks-lista.png`, `img/13-feedbacks-lista-aberto.png`.

## Formulário semanal — `img/07-feedback.png`

Formulário preenchido toda semana por gerentes de unidade, muitas vezes no celular. Precisa ser rápido de responder e impedir números incoerentes.

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 10 | "Voltar" (só ícone, `title=`) | 🔁 | `IconButton` com tooltip. |
| — | Título "Feedback Semanal de Leads — Vida Card Ijuí" | ✅ | — |
| 11 | Nome do responsável | ✅ | Preencher com o nome do usuário logado (editável). |
| 12 | Unidade (`<select>` nativo) | 🔁 | `Select`. Se o usuário tem uma só unidade, vem preenchido. |
| 13–14 | Início / Fim (`type="date"` nativos) | 🔁 | Formato do navegador. `DatePicker` pt-BR; ao escolher o início, o fim é sugerido +6 dias (a semana é sempre de 7 dias). |
| 15–20 | 6 campos numéricos (447px de largura para um número de 3 dígitos) | 🔁 | Campos largos demais para "68". Grade de 3 colunas no desktop. **Validação na hora**: contatados ≤ recebidos, responderam ≤ contatados, fecharam + perdidos + em negociação ≤ responderam. Hoje dá para enviar "10 recebidos, 50 fecharam". |
| 21 | Motivo de perda (`<select>`) | 🔁 | `Select`. |
| 22 | Qualidade 1 a 5 (`<select>` com "2 —", "3 —", "4 —") | 🔁 | Escala de 5 pontos escondida em lista suspensa, com opções "2 —" sem texto. `SegmentedControl` 1·2·3·4·5 com os extremos rotulados. |
| 23 | Observações | ✅ | — |
| 24 | Satisfação 1 a 5 (`<select>`) | 🔁 | Idem 22. |
| 25 | Comunicação clara? (Sim / Parcialmente / Não) | 🔁 | 3 opções → `SegmentedControl`. |
| 26 | Ajustes | ✅ | — |
| 27 | Cancelar | ✅ | — |
| 28 | "Enviar feedback semanal" (verde `emerald-300`) | ✅ ⭐ | Tom de verde diferente do resto do app (`emerald-500`). Unificar. |

Depois de enviar, o formulário é zerado e só um toast avisa. Mostrar "Feedback da semana dd/mm enviado" com link "Ver enviados" (admin) ou "Enviar outra semana".

## Feedbacks enviados — `img/13-feedbacks-lista.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo "ÁREA ADMINISTRATIVA" + parágrafo "registros ficam armazenados na base SQL interna" | ✂️ | Detalhe de engenharia. |
| 16 | "Novo feedback" (link fantasma) | ✅ | — |
| 17 | "Baixar banco completo" | ⋯ | Exportação. Menu "Exportar" → "Planilha (todas as unidades)". |
| 18 | "Atualizar" (branco, o botão mais forte da tela) | 🔁 | A ação mais destacada é a menos importante. `IconButton`. |
| 19 | Unidade (`<select>` nativo) | 🔁 | `Select`. |
| 20–21 | Semana inicial / final (`type="date"`, "mm/dd/yyyy") | 🔁 | `DateRangePicker`. |
| 22–47 | 26 acordeões de 72px com avatar "VI" | 🔁 | O avatar mostra as 2 primeiras letras da unidade: "VI" em **todas** as linhas (todas são "Vida Card …"). Uma tabela compara semanas e unidades de relance; o acordeão obriga a abrir uma por uma. Colunas: Unidade · Semana · Responsável · Recebidos · Convertidos · Taxa · Qualidade · Satisfação. Clique na linha abre o detalhe em gaveta lateral. |
| — | Detalhe aberto (`13-feedbacks-lista-aberto`) | 🔁 | 6 números em caixas + 6 caixas de texto. Na gaveta: funil (recebidos → contatados → responderam → convertidos) em uma barra, depois os textos. |

Esboço:

```
Feedbacks semanais                                            [Novo feedback] ⟳ [Exportar ⌄]
[Unidade ⌄] [01/09 – 24/09 📅]                                               26 registros
┌──────────────────┬─────────────┬────────────┬────────┬──────────┬──────┬──────┬──────┐
│ Unidade          │ Semana      │ Responsável│ Receb. │ Convert. │ Taxa │ Qual.│ Sat. │
├──────────────────┼─────────────┼────────────┼────────┼──────────┼──────┼──────┼──────┤
│ Vida Card Ijuí   │ 18–24/09    │ Ana Paula  │     68 │        6 │ 8,8% │ 1/5  │ 3/5  │
```
