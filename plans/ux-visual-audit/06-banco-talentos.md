# Banco de Talentos e página pública "Trabalhe conosco"

Capturas: `img/08-talentos.png`, `img/08-talentos-mobile.png`, `img/08-talentos-editor.png`, `img/08-talentos-candidatos.png`, `img/08-talentos-candidato.png`, `img/08-talentos-unidade.png`, `img/09-trabalhe-conosco.png`, `img/09-trabalhe-conosco-mobile.png`.

## Problema estrutural

A rota `/dashboard/banco-talentos` é registrada **fora do `ClientProvider`** (`App.tsx`). Resultado visível na captura: o bloco "CONTEXTO DE TRABALHO" da sidebar fica vazio (sem seletor de unidade), e a tela precisa de um seletor próprio (#9). Mover a rota para dentro do provedor e usar a unidade global.

## Lista de formulários — `img/08-talentos.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 9 | Seletor de unidade próprio (288px, canto superior) | ✂️ | Com a tela dentro do contexto global, some. Hoje, aberto (`08-talentos-unidade`), **a lista passa por baixo da barra de busca** (camadas erradas). |
| — | Cartão "Vida Card Ijuí · 2 formulários ativos · Formulários de Recrutamento · parágrafo" | 🔁 | Um cartão inteiro para título e um botão. Vira `PageHeader` "Banco de Talentos" com a ação à direita. |
| 10 | "Criar Novo Formulário" | ⭐ | Ação principal correta. Texto: "Novo formulário". |
| 11 | Busca | ✅ | — |
| 12–14 | Todos / Publicados / Rascunhos | ✅ | Já é um controle segmentado. Padronizar no componente. |
| 15, 19 | Excluir formulário (lixeira 22×22, `title=`, no topo do cartão) | ⋯ | Ação destrutiva no mesmo nível visual do contador de campos. Vai para o menu ⋯ do cartão. A confirmação existente fica (exclui candidaturas — irreversível). |
| 16, 20 | Copiar link (22×22, `title=`) | ✅ 🔁 | Útil e frequente; `IconButton` 32px com tooltip e toast "Link copiado". |
| — | Link em mono 10px "/trabalhe-conosco/vida-card-ijui" | ✅ | Mono aqui faz sentido (é um endereço). |
| 17, 21 | "Candidatos 35" | ✅ | — |
| 18, 22 | "Editar Form" (verde sólido, repetido em cada cartão) | 🔁 | Dois botões verdes sólidos por cartão competem com o "Novo formulário". Secundário; o cartão inteiro abre o editor. |

## Editor de formulário — `img/08-talentos-editor.png`

Cada pergunta tem **8 controles** visíveis ao mesmo tempo (arrastar, subir, descer, obrigatório, duplicar, editar, excluir). Com 6 perguntas são 48 controles antes do "Salvar".

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 10 | "Voltar para Formulários" | ✅ | — |
| 11 | Seletor de formulário | ✅ | — |
| 12–13 | "Construtor de Campos" / "Candidatos (35)" | ✅ | Abas. Texto "Perguntas" / "Candidatos". |
| 14 | "Adicionar Pergunta" (topo) | ✂️ | Duplica o #57 no fim da lista. Fica só o de baixo, onde a pergunta nova aparece. |
| 15, 22, 29… | Alça de arrastar (`title=`) | 👆 | Só aparece no hover da pergunta. |
| 16–17, 23–24… | Subir / descer (22×22) | 👆 | Só no hover; são o caminho de teclado para reordenar, então continuam focáveis. |
| 18, 25… | "Obrigatório" | ✅ | É estado, fica visível — como `Switch` pequeno. |
| 19–21, 26–28… | Duplicar, Editar, Excluir | ⋯ | Menu ⋯ por pergunta. Clicar no corpo da pergunta abre a edição. |
| 57 | "Adicionar outra pergunta ao formulário" | ✅ | — |
| 58 | "Disponível na Web" (checkbox nativo 16px) | 🔁 | É um liga/desliga de publicação: `Switch`. |
| 59 | Copiar link | ✅ | — |
| 60 | Editar link público → **`window.prompt()`** | 🔁 | Caixa de diálogo do navegador, sem validação visível. Diálogo com prefixo fixo `/trabalhe-conosco/` e validação de caracteres. |
| 61 | "Abrir formulário em nova aba" | ✅ | — |
| 62 | "Salvar Formulário" | ⭐ | Ação principal. Falta indicação de "alterações não salvas". |
| 63–67 | Textos da vaga (inputs 34px, textareas 50px com fonte 11px) | 🔁 | Fonte 11px em campo de texto. 14px. |
| 68 | "Excluir este formulário" (zona de perigo) | ✅ | Bem posicionado no fim. Único lugar de excluir, tirando a lixeira do cartão… mantém os dois (cartão via ⋯). |

## Candidatos — `img/08-talentos-candidatos.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | 6 cartões de contagem por status (filtram ao clicar) | 🔁 | Filtram, mas são `div` com `onClick`: não recebem foco nem têm estado anunciado, e falta "Reprovado". Viram `SegmentedControl` com contagem (Todos 35 · Novos 6 · Em análise 6 …), com teclado. |
| 14 | Busca | ✅ | — |
| 15 | Atualizar lista (só ícone) | ✅ | Tooltip. |
| 16 | "Exportar XLSX" (branco, o mais forte da tela) | ⋯ | Exportação não é a ação principal. |
| 17–51 | "Ver Respostas ›" em cada linha | 🔁 | A linha inteira abre o candidato (com teclado). O botão sai. |
| — | Avatar com inicial, selo "Currículo" | ✅ | — |

## Detalhe do candidato — `img/08-talentos-candidato.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 52 | "WhatsApp" (verde sólido) | ✅ | Ação principal do recrutador. |
| 53 | Fechar (×) | ✅ | — |
| 54–59 | 6 etapas do funil como botões | ✅ | Bom: status visível e alterável em um toque. |
| — | Fundo continua focável (elementos 1–51) | 🔁 | Ver Estrutura global: usar `Dialog`. |
| — | "ID: ts0..." no rodapé | ✂️ | Identificador interno. |
| 63 | Fechar (rodapé) | ✂️ | Duplica o ×. |

## Página pública "Trabalhe conosco" — `img/09-trabalhe-conosco.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1 | "TRÁFEGO PRO" no topo, link para o site da agência | 🔁 | O candidato está se candidatando à **Vida Card Ijuí**, não à agência. Topo com o logo da vaga (`bannerUrl`) ou nome da unidade; "Tráfego Pro" discreto no rodapé. |
| — | Selo "Oportunidade & Recrutamento" | ✂️ | Não informa nada. |
| 2–4 | Nome, e-mail, WhatsApp | ✅ | 46 → 44px. |
| 5 | Vaga (`<select>` nativo) | 🔁 | `Select`, ou botões de opção se forem até 4 vagas. |
| 6 | Experiência + "Opcional" **abaixo** do campo | 🔁 | "(opcional)" vai no rótulo, como no formulário de feedback. |
| — | Anexo: "PDF ou DOCX · até 5 MB" dentro da área **e** repetido embaixo | ✂️ | Texto duplicado. |
| 7 | Consentimento (checkbox nativo) | 🔁 | `Checkbox`. |
| 8 | "Enviar Candidatura" | ✅ ⭐ | — |
| — | Aviso do React "Each child in a list should have a unique key" | 🔁 | Erro no console da página pública. |
