# Implementação da auditoria visual

Branch `davi/zen-hypatia-j9j6w6`. Uma fase por commit, cada uma verificada antes do commit (typecheck, testes, build e navegador). Capturas "depois" em [`after/`](after/) com a mesma numeração de [`img/`](img/).

## Verificação

| Verificação | Antes | Depois | Observação |
| --- | --- | --- | --- |
| `tsc --noEmit` | limpo | limpo | — |
| Testes (`vitest run`) | 222 ok · 18 falhas | 222 ok · 18 falhas (as mesmas) | As 18 falhas existiam antes da primeira mudança e dependem de credenciais externas (Supabase do Evolution, Supabase principal, Meta Graph API, MySQL do feedback). Lista abaixo. Nenhum teste novo falha. |
| Testes novos | — | `lib/format.test.ts`, `lib/navigation.test.ts`, `lib/feedbackCounts.test.ts` | Formatação pt-BR (moeda digitada, datas, meses), item ativo único do menu, validação do funil do feedback. |
| `vite build` | ok | ok | — |
| JS carregado na primeira visita (gzip) | **620,4 kB** (um arquivo só) | **130,1 kB** | Telas carregam sob demanda (`App.tsx`). Home, login e cadastro continuam no pacote inicial. Gráficos (106 kB), planilhas `xlsx` (142 kB) e o Financeiro só descem quando usados. |
| `index.html` (gzip) | 106 kB | 106 kB | Não mudou: o plugin `vite-plugin-manus-runtime` injeta um runtime React inteiro no HTML de produção. Ver pendências. |
| `alert()` / `confirm()` / `prompt()` do navegador | 34 / 6 / 1 | 0 / 0 / 0 | Fora das telas excluídas (Evolution, Publicações). Os 2 `alert()` restantes estão dentro do **código de exemplo** que o usuário copia para a landing page (`FormIntegrationCodeModal`), não na interface. |
| `<select>` nativo | 13+ | 0 | Idem. |
| `<input type="date">` | 4 | 0 | `DatePicker` com calendário pt-BR. |
| Botões só com `title=` | 60+ | 0 | `IconButton` com `aria-label` e `Tooltip`. Restam 5 `title=` em **texto truncado** (nome longo de unidade, data completa ao passar o mouse), de propósito. |
| Elementos interativos medidos (66 capturas desktop + celular, `tools/elstats.cjs`) | 2.658 · 806 com dica só em `title=` · 24 só-ícone sem nome · 128 controles nativos | 2.503 · **0** com `title=` · **0** só-ícone sem nome · 30 "nativos" | Os 30 restantes são os `<input type="checkbox">` ocultos que o Radix cria dentro de `<form>` para enviar o valor (invisíveis e fora do foco); os controles visíveis são do DS. |
| Navegador | — | Todas as telas em 1440×900 e 390×844, sem erro de código no console | Os únicos erros de console são recursos externos bloqueados no sandbox (Google Fonts, gtag, `manus-storage`), iguais aos de antes. Sem conteúdo cortado fora da tela (verificado por script em cada fase). |

Falhas de teste pré-existentes (idênticas antes e depois): `evolutionSupabaseConnection` (1), `evolutionSupabaseRpc` (2), `evolutionSupabaseSchema` (1), `evolutionWebhook` (5 + arquivo), `feedback-leads` (2, MySQL), `metaAdsValidation` (1), `metaAppCredentials` (1), `supabase` (5).

## Fases

| Commit | Fase | O que mudou |
| --- | --- | --- |
| `201fd7d` | Auditoria | Esta pasta: README, uma página por tela, 67 capturas numeradas, `elements.json`, ferramentas de captura. |
| `859e37d` | 1 · Base | `components/ds/`: Button (3 alturas: 32/36/44px), IconButton com tooltip obrigatório, Input/Textarea/Field (2 alturas: 36/44px), Select, SegmentedControl, Checkbox/Switch/Radio, Menu/ActionsMenu/Popover, Dialog/Sheet, ConfirmDialog (`useConfirm`), DatePicker/DateRangePicker pt-BR, PageHeader/Surface/StatTile/StatusBadge/EmptyState/InlineNotice, toast com "Desfazer". 3 raios (8/12/16px). `lib/format.ts` centraliza números, moeda, datas e meses em pt-BR. `lib/chartPalette.ts` com a paleta validada. |
| `b3f72d1` | 2 · Transversal | `alert()` → toast; `confirm()` → ConfirmDialog; `prompt()` → diálogo com prefixo e validação; `title=` em botões → Tooltip + `aria-label`; "Desconfirmar recebimento" virou ação direta com "Desfazer" (é reversível). |
| `fbea154` | 3 · Estrutura | Clicar no nome do usuário **fazia logout** → menu da conta (Configurações, Sair). Um só item ativo no menu. Grupo "Administração" sempre visível para admin. Sidebar recolhível lembrada entre visitas. `<main>` sem `z-10`: modais deixavam de ficar **atrás da sidebar**. Banco de Talentos passou para dentro do `ClientProvider` (a tela não recebia a unidade escolhida). 404 em pt-BR. |
| `c3795c1` | 4 · Dashboard | Um cabeçalho ("Resultados", atualizado às…), período 7/30/90 + Personalizado, Exportar em menu, gráficos separados sem eixo duplo (conversas aqua, investimento azul, custo laranja com linha da média), análise em aba própria, avisos de fonte/limite em `InlineNotice`, meta padrão sinalizada (novo campo `targetIsDefault` no servidor). |
| `5d2db9a` | 4 · Anúncios | Busca, status em SegmentedControl, classificação e ordenação em Select, filtros num popover no celular, Lista/Tabela/Galeria, detalhe em painel (Sheet no celular), um gráfico só: custo por conversa dos 15 anúncios com mais gasto. |
| `7b31b05` | 4 · Feedback | Validação do funil (fecharam ≤ receberam etc.) com teste; erros no campo; notas 1–5 em SegmentedControl; semana com DatePicker (fim sugerido); lista de enviados em tabela com gaveta de detalhe. |
| `2abdcbd` | 4 · Talentos | Formulários em cards com ⋯; editor compacto; candidatos com filtro por etapa; detalhe do candidato em Dialog (sem ID interno nem "Fechar" duplicado); página pública com o logo da vaga em vez de "TRÁFEGO PRO", "(opcional)" no rótulo, erros no campo e o aviso de `key` do React corrigido. |
| `75cf1e8` | 4 · Formulários | 64 cartões (7.700px) → tabela paginada (25 por página) com lista compacta no celular; detalhe em Sheet; "Novo endpoint" e números de configuração só na aba Endpoints; "hoje" passa a usar o dia local (antes, UTC). Fechar o código de integração sem copiar a chave recém-criada pede confirmação. |
| `21d687e` | 4 · Financeiro | **Bug que perdia dado:** o saldo do caixa era lido uma vez, antes do Firebase responder; "Salvar caixa" gravava 0. Corrigido (rascunho acompanha o banco até ser editado). Hooks depois de `return` corrigidos. Abas sublinhadas; unidade aberta vira página com "← Financeiro"; campo de moeda pt-BR (`CurrencyInput`); caixa e despesas fixas na aba Despesas; paleta validada no gráfico e tabela no lugar dos 3 cartões; checklists com grupos recolhíveis; tabelas com rolagem própria no celular (antes a página tinha 818px e cortava a tabela). |
| `7a6e20b` | 4 · Métricas | Guia em popover (texto de "97,5% de certeza" corrigido), selo "& IA" removido, números em pt-BR, filtros neutros com contagem, linha inteira expande, análise reaproveitada da Dashboard. |
| `db6204b` | 4 · Usuários | "Redefinir senha" deixa de vir com `Trafego@2026`; "Gerar senha forte" (no navegador) e copiar. Dar/tirar admin pede confirmação; "Recusar" também. Cartões duplicados removidos; unidades em popover; ações no ⋯. |
| `0841ce2` | 4 · Integrações de IA | Arquivo formatado (era uma linha), título igual ao menu, escopos com nome e descrição, "Revogar" com alvo de 32px + ConfirmDialog, validade em SegmentedControl. |
| `1ca80db` | 4 · Configurações | Um botão de mostrar senha por campo (antes um revelava os três), dica do e-mail visível, regra de senha antes do erro. |
| `1404847` | 4 · Login/Cadastro | Três selos de segurança removidos, campos de 44px, Checkbox, olhos focáveis com nome, textos em frase. |
| `923ee95` | 4 · Home | "Área do cliente" no topo (no celular, "Entrar"); cartões de serviço sem a seta ↗ que sugeria link. |
| `84e09ca` | 5 · Bundle e relatório | Rotas sob demanda, ferramentas atualizadas e este relatório. |
| _commit seguinte_ | 5 · Capturas | `after/` com as 67 capturas e `after/elements.json`; botão "Fechar" dos modais de exportação ganhou `aria-label` (único só-ícone sem nome que as capturas acharam). |

## Desvios do plano e por quê

- **Sem tema claro.** O produto é só escuro (`class="dark"` fixo em `index.html`, cores zinc diretas em todas as telas). As capturas "-light" da auditoria já mostravam a mesma tela escura. Criar um tema claro seria um projeto à parte; a paleta clara dos gráficos foi validada e está em `chartPalette.ts` para quando existir.
- **Seletor de unidade no Banco de Talentos continua** quando a unidade do contexto não tem formulário, para o admin não ficar sem saída. Quando bate, some.
- **Celular: "rolagem horizontal" era, na verdade, conteúdo cortado.** A auditoria registrou rolagem; o `overflow-x-hidden` do layout escondia o que passava da tela (botão de Excel da Dashboard, tabela de cobranças). Corrigido com rolagem dentro da própria tabela e cabeçalhos que quebram linha.
- **Contagem de `alert()`**: o README diz 37; na interface eram 34 (2 estão no código de exemplo copiado para a landing, 1 era duplicado na contagem).
- **Escopos crus em Integrações de IA** ("leads:read") vinham do meu mock, não do servidor, que só emite `metrics:read`, `leads:summary:read` e `crm:summary:read`. Mesmo assim, todos os escopos aceitos pelo servidor ganharam nome e descrição.
- **Marquee da home** já respeitava `prefers-reduced-motion` (`index.css`); a auditoria estava errada nesse ponto. Nada mudou.
- **Dashboard sem Impressões/Cliques** na tabela de campanhas: com conversas, investimento e custo, a tabela cabia sem rolagem e sem coluna fixa. Continuam na exportação.
- **"Monitor de gatilhos" da análise** foi simplificado para "O que os dados mostram" + "Ação recomendada" + indicadores; os mesmos números, menos rótulos técnicos.
- **Coluna "Plano" em Formulários** não entrou: é um campo de alguns formulários, não de todos. Aparece no detalhe.
- **Bloco "Auditoria de segurança"** (IDs internos, hash de IP) saiu do detalhe da submissão, como o "ID: ts0…" do candidato: são identificadores internos. Continuam no banco e na exportação.
- **Senha mínima de 8 caracteres** ao redefinir a senha de outra pessoa (o servidor aceita 6 no autoatendimento). Mais rígido de propósito: quem redefine é um admin e pode gerar uma senha forte com um clique.

## Pendências (fora do escopo ou dependem de decisão)

1. **Divisão societária soma 115%.** Em `TabFinanceiro` a divisão de cada recebimento é caixa 50% + (patrono 30% + sócio 3 30% + Davi 30% + Lucas 30% + Ana 10%) da outra metade = 50% + 65%. A previsão usa 30/30/30/10 (100%). Não alterei regra de negócio; precisa de decisão de quem define a regra.
2. **Servidor ainda cai em `Trafego@2026`** se `/api/user-access/:id/reset-password` receber senha vazia (`userAccessRoutes.ts`). A interface não envia mais vazio, mas a API deveria recusar.
3. **Números da home** ("+500", "+50M", "98%") seguem fixos e sem fonte. Decisão do negócio.
4. **Metas mensais padrão** (`DEFAULT_MONTHLY_TARGETS`, 200 leads para unidade sem cadastro) continuam no código. A interface agora diz "meta padrão"; o ideal é um cadastro de metas por unidade.
5. **`vite-plugin-manus-runtime`** injeta ~370 kB (106 kB gzip) de JavaScript no `index.html` de produção. Vale confirmar se é necessário fora do ambiente Manus.
6. **Firebase RTDB do Financeiro** é lido direto do navegador; confirmar que as regras do banco exigem autenticação (a proteção atual é só a rota de admin no cliente).
7. **`FinancialSidebar.tsx`** não é usado por nenhuma tela; pode ser removido.
8. **Logo em `/manus-storage/…`** responde 500 no ambiente local (formulário público de feedback).

## Como revisar

```bash
git log --oneline 201fd7d^..HEAD      # uma fase por commit, mensagem com o porquê
npx tsc --noEmit && npx vitest run && npx vite build
```

- Compare `img/<id>.png` (antes) com `after/<id>.png` (depois); mesma numeração, mesmo mock.
- `after/elements.json` traz as medidas de cada elemento interativo nas capturas novas, no mesmo formato de `elements.json`.
- Para refazer as capturas: `tools/README.md` (servidor de desenvolvimento em `:5173`, depois `node capture.cjs shots-after.json ../after ../after/elements.json`).
- Vitrine dos componentes em desenvolvimento: `/dev/ds` (fora do build de produção).
