# Usuários e Permissões

Capturas: `img/14-usuarios.png`, `img/14-usuarios-mobile.png`, `img/14-usuarios-novo.png`, `img/14-usuarios-unidades.png`, `img/14-usuarios-senha.png`, `img/14-usuarios-excluir.png`.

Com 15 contas, a tela tem 80 elementos interativos: cada linha tem copiar, unidades, cargo, senha e excluir.

## Cabeçalho e filtros

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Título com ícone de escudo verde | 🔁 | `PageHeader` "Usuários". |
| 16 | "Cadastrar Usuário" (verde com brilho `shadow-[0_0_20px]`) | ⭐ | Ação principal; sem o brilho (efeito de template). |
| — | 4 cartões Total / Ativos / Pendentes / Inativos (`div` clicáveis) | ✂️ | Fazem exatamente o que as abas #19–22 fazem, duas vezes na tela, e sem teclado. Os números entram nas abas: "Todos 15 · Pendentes 2 · Ativos 12 · Inativos 1". O selo "Requer Aprovação" + ícone pulsante vira a contagem em âmbar na aba Pendentes. |
| 17 | Busca | ✅ | — |
| 18 | Cargo (`<select>` nativo com **16px de altura** dentro de uma caixa de 30px) | 🔁 | `Select`. |
| 19–22 | Todos / Pendentes / Ativos / Inativos (24px) | 🔁 | `SegmentedControl` 32px com contagem. |

## Linha de usuário

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Avatar com inicial | ✅ | — |
| — | Selos de cargo (Admin roxo, Cliente amarelo, Visualizador azul) + status | 🔁 | Amarelo para "Cliente" colide com o âmbar de "Pendente" (dataviz: cores de status são reservadas). Cargo em texto neutro; só o status tem cor. |
| 23 | Copiar e-mail (16×16, `title=`) | 👆 | Aparece no hover da linha; 28px de alvo; toast "E-mail copiado". |
| 24 | "1 unidade ⌄" / "Todas (Admin)" | 🪟 | Hoje expande um painel dentro da linha que empurra a lista. Popover ancorado com as unidades e "Vincular unidade". |
| 25 | Cargo (`<select>` nativo por linha — 15 na tela) | 🔁 | `Select` compacto. Promover alguém a **Admin** (ou tirar o próprio acesso de admin) dá acesso total: passa por `ConfirmDialog`. Os demais cargos mudam na hora, com toast. |
| 26 | Redefinir senha (ícone, `title=`) | ⋯ | Menu ⋯ da linha. |
| 27 | Desativar ou excluir (lixeira, `title=`) | ⋯ | Menu ⋯, com o diálogo atual. |
| 50 | "Aprovar" | ✅ | Ação principal da linha pendente. |
| 51 | "Recusar" | 🔁 | Recusa **sem confirmação** e sem desfazer. `ConfirmDialog`. |

Esboço da linha:

```
(A) Ana Paula Ribeiro  · Cliente   ● Ativo        [2 unidades ⌄]  [Cliente ⌄]  ⋯
    ana.paula.ribeiro@vidacard.com.br  ⧉(hover)                                 ├ Redefinir senha
                                                                                └ Desativar ou excluir
```

## Modais

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 97 (senha) | Nova senha **pré-preenchida com `Trafego@2026`** (mono) | 🔁 | Senha padrão conhecida por toda a equipe; clicar em "Confirmar" sem pensar deixa a conta com ela. Campo vazio + botão "Gerar senha forte" (gera no navegador, aleatória) + "Copiar". |
| 99 (senha) | "Confirmar Nova Senha" (laranja) | ✅ | Laranja = atenção; ok. |
| 100 (novo) | Placeholder "Ex: Trafego@2026 (ou deixe vazio p…)" | 🔁 | Mesmo problema: sugere a senha padrão. "Deixe vazio para gerar uma senha temporária". |
| 99 (novo) | Cargo (`<select>`) | 🔁 | `Select`. |
| 96–97 (excluir) | Radio nativo Desativar / Excluir permanentemente (13px) | 🔁 | `RadioGroup`; "Excluir permanentemente" com texto de consequência em vermelho. |
| 99 (excluir) | "Confirmar Desativação" | ✅ | O rótulo muda com a opção. |

## Celular — `img/14-usuarios-mobile.png`

A linha empilha 5 controles; com o menu ⋯ ficam 3 (unidades, cargo, ⋯).
