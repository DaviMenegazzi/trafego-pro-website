# Estrutura global

Capturas: `img/04-dashboard.png` (sidebar aberta), `img/05-sidebar-recolhida.png`, `img/05-sidebar-mobile.png`, `img/04-dashboard-mobile.png`, `img/04-dashboard-print.png`, `img/06-anuncios-legenda.png`, `img/17-404.png`.

A estrutura aparece em todas as telas internas, então um erro aqui se repete 12 vezes.

## Sidebar (desktop) — `img/04-dashboard.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1 | Recolher sidebar (28×28, só ícone, `title=`) | 🔁 | Alvo pequeno e dica em `title=`. Vira `IconButton` 32px com `Tooltip` "Recolher menu" (emil: tooltip real, instantâneo nos seguintes). |
| — | Marca "TRÁFEGO PRO / CENTRAL DE GESTÃO" (8px em CAIXA ALTA, tracking 0,24em) | 🔁 | Texto de 8px é ilegível. Manter a marca, remover o subtítulo de 8px. |
| — | Rótulo "CONTEXTO DE TRABALHO" (9px) | ✂️ | O seletor já diz o que é (ícone de prédio + nome). apple-design: "se precisa de rótulo, o mapeamento é fraco". |
| 2 | Seletor de unidade (popover com busca) | ✅ | É o seletor de contexto global e está bem feito (Radix, busca acima de 5 itens). Passa a ser **o único** seletor de unidade das telas (ver Dashboard e Anúncios). |
| 3–7 | Links principais | ✅ | Hierarquia clara. Ajuste: ícone e texto com o mesmo peso de cor; item ativo só com fundo, sem a barra interna de 3px *e* fundo. |
| 8 | "Administração" (acordeão) | 🔁 | Rótulo "ADMINISTRAÇÃO" (9px) + botão "Administração" dizem a mesma coisa duas vezes. Fica só o grupo com título, sempre aberto para admin (são 6 itens; esconder atrás de clique não simplifica — apple-design: simplicidade não é minimalismo). |
| 9–14 | Sub-itens admin | ✅ | Ok. **Bug:** em `/dashboard/feedback-leads/list` ficam ativos "Feedback de Leads" *e* "Feedbacks enviados" (`startsWith`). Casar o caminho mais longo. |
| 15 | Bloco do usuário "Davi Menegazzi · Admin · Sair" | 🔁 🪟 | **O botão inteiro faz logout.** Clicar no próprio nome encerra a sessão sem aviso. Vira um menu da conta ancorado (popover): nome e e-mail, "Configurações", separador, "Sair". Sair não precisa de confirmação (é reversível: basta entrar de novo). |

Esboço do rodapé da sidebar:

```
┌──────────────────────────────┐
│ (DM) Davi Menegazzi       ⌄  │  ← abre o menu
└──────────────────────────────┘
        ┌──────────────────────┐
        │ Davi Menegazzi       │
        │ davi@trafegopro…     │
        ├──────────────────────┤
        │ ⚙ Configurações      │
        │ ↪ Sair               │
        └──────────────────────┘
```

## Sidebar recolhida — `img/05-sidebar-recolhida.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Ícones com `title=` | 🔁 | Com a sidebar recolhida o nome só aparece em `title=` (demora ~1s, não aparece no teclado). Usar `Tooltip` à direita. |
| — | Seletor de unidade some | 🔁 | Ao recolher, o contexto desaparece por completo. Mostrar um ícone de prédio com tooltip do nome da unidade e o popover ao clicar. |

## Topo e navegação no celular — `img/04-dashboard-mobile.png`, `img/05-sidebar-mobile.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1 | Marca "TP TRÁFEGO PRO" | ✅ | — |
| 2 | Seletor de unidade compacto | ✅ | Bom: mantém o contexto no topo. |
| 3 | Botão de menu (36×36) | ✅ | Ajustar para 40px de alvo. |
| 21–22 | Barra inferior com só "Dashboard" e "Anúncios" | ✅ | São as duas telas de consumo diário do cliente; o resto fica no menu. |
| — | Rolagem horizontal | 🔁 | A página da Dashboard mede **456px** numa tela de 390px (barra de ações com Atualizar + Print + Excel). O Financeiro mede **818px**. Nenhuma tela pode passar de 100vw. |

## Modais — `img/04-dashboard-print.png`, `img/06-anuncios-legenda.png`, `img/06-anuncios-export.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Modal de Print, Card WhatsApp e Legenda | 🔁 | **Ficam por baixo da sidebar**: o lado esquerdo do modal é cortado ("ade:" em vez de "Unidade:") e o fundo escurecido não cobre a sidebar. Causa: `<main class="relative z-10">` cria um contexto de empilhamento abaixo da sidebar (`z-40`). Remover o `z-10` do `main` ou renderizar modais em portal. |
| — | Foco nos modais feitos à mão | 🔁 | Na captura do candidato (`08-talentos-candidato.png`) os elementos 1–51 do fundo continuam numerados: o modal não prende o foco nem torna o fundo inerte. Usar `ui/dialog` (Radix) em todos. |

## 404 — `img/17-404.png` {#404}

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1 | "Go Home" | 🔁 | Único texto em inglês do produto. "Voltar ao início", levando para `/dashboard` se houver sessão e para `/` se não houver. |
