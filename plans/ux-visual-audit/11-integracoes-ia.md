# Integrações de IA

Capturas: `img/15-integracoes-ia.png`, `img/15-integracoes-ia-novo.png`, `img/15-integracoes-ia-revogar.png`.

O arquivo `DashboardExternalAiTokens.tsx` tem o JSX inteiro em uma linha; qualquer ajuste começa por formatá-lo.

## Página

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Sobrelinha "INTEGRAÇÕES" + título "Dados para IA externa" | 🔁 | O menu diz "Integrações de IA" e a tela "Dados para IA externa". `PageHeader` "Integrações de IA". |
| 16 | "Atualizar" | 🔁 | `IconButton`. |
| 17 | "Novo token" (branco) | ⭐ | Ok como principal. |
| — | 3 cartões "Somente leitura / Escopo por unidade / Revogação imediata" | 🔁 | 3 cartões de marketing numa tela de administração. Uma linha de texto sob o título: "Tokens somente leitura, limitados às unidades escolhidas e revogáveis a qualquer momento." |
| — | Escopos crus na linha: "leads:read", "crm:read" | 🔁 | Só `metrics:read` tem tradução ("Métricas"). "Leads", "CRM". |
| — | Unidades cortadas em 144px com a lista em `title=` | 🪟 | "4 unidades ⌄" abre popover com a lista. |
| 18–20 | "Revogar" (texto vermelho com **16px de altura**) | 🔁 | Alvo de 16px. Botão pequeno de perigo (32px). |
| — | Bloco "Endpoints disponíveis" | ✅ | Útil para quem integra; manter no fim. |

## Novo token — `img/15-integracoes-ia-novo.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 22 | Nome da integração | ✅ | — |
| 23–25 | Escopos como cartões de 66px com checkbox dentro | 🔁 | Rótulos crus ("leads:read"). `Checkbox` com nome e descrição curta ("Leads — totais por origem, sem nomes"). |
| 26–27 | "Todas (12)" / "Limpar" (links de 16px) | ✅ | Alvo maior. |
| 28 | Filtrar unidades | ✅ | — |
| 29–40 | 12 checkboxes nativos | 🔁 | `Checkbox`. |
| 41 | Validade (`<select>` nativo: 30 / 90 / 365 dias) | 🔁 | 3 opções → `SegmentedControl`. |
| 42–43 | Cancelar / Emitir token | ✅ | — |

## Revogar — `img/15-integracoes-ia-revogar.png`

Modal próprio (sem foco preso) com "Revogar agora". É irreversível — a confirmação é correta. Vira `ConfirmDialog` perigoso, igual aos outros.
