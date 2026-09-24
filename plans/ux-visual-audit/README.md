# Auditoria visual de UX — Tráfego Pro

Auditoria elemento por elemento do site público e da dashboard da Tráfego Pro (React 19 + Vite 7 + Tailwind 4, código em `client/src`).

**Fora do escopo, a pedido:** Evolution (`/evolution`, `/pixel`), Programação de posts (`/publicacoes`) e as telas desativadas no menu (Atualizações, Pipeline, Meu Trabalho, Pagamentos).

## Como a auditoria foi feita

- O app rodou de verdade (Vite) com a API **simulada no Playwright**: todas as chamadas `/api/*` e a leitura do Firebase do Financeiro foram interceptadas com dados de volume real — 12 unidades, 30 dias de métricas, 8 campanhas, 38 anúncios, 64 submissões de formulário, 35 candidatos, 26 feedbacks, 15 usuários, 22 despesas, 4 tokens de IA. Nada foi simulado como sucesso onde o produto real falharia.
- 67 capturas em `img/`, com cada elemento interativo **numerado**. As medidas (altura, largura, raio, fonte, cor, se é nativo, se usa `title=`) estão em `elements.json` (1.600 elementos únicos no desktop).
- Resolução 1440×900 no tema escuro; 390px nas telas principais; 1440 no "tema claro" da home e da Dashboard.
- Skills usadas nas justificativas: **apple-design** (hierarquia, agrupamento, familiaridade, confirmação só no irreversível), **emil-design-eng** (acabamento, popover ancorado, tamanhos consistentes, tabela Antes/Depois/Por quê) e **dataviz** (gráficos, KPIs, paleta validada por script).

> **Sobre o tema claro.** O produto é *dark-only*: `index.html` fixa `class="dark"`, o `ThemeProvider` não é alternável e as telas usam cores fixas (`text-zinc-*`, `bg-white/5`). As capturas `*-light.png` são idênticas às escuras. Não há o que auditar no claro; a paleta de gráficos proposta foi validada nos dois modos para quando existir.

## Legenda

| Símbolo | Decisão |
| --- | --- |
| ✅ | Manter |
| ⭐ | Promover a ação principal |
| ⋯ | Mover para o menu de ações |
| 🪟 | Popover (card flutuante ancorado) |
| 🗂️ | Outra aba ou página |
| 👆 | Só no hover ou na seleção |
| 🔁 | Redesenhar |
| ✂️ | Remover |

## Resumo por tela

Elementos = interativos visíveis na captura principal a 1440px (sem contar os 9–15 da sidebar).

| Tela | Arquivo | Hoje | Depois | Principal mudança |
| --- | --- | --- | --- | --- |
| Estrutura global (sidebar, topo, conta, modais) | [00-estrutura-global.md](00-estrutura-global.md) | 9–15 | 9–15 | Clicar no nome **desloga**; modais ficam **atrás da sidebar**; menu da conta |
| Home (site) | [01-home.md](01-home.md) | 10 | 11 | Link "Área do cliente"; números sem fonte no "Sobre" |
| Login e Cadastro | [02-login-cadastro.md](02-login-cadastro.md) | 7 / 9 | 7 / 9 | Botões de senha sem teclado; rótulos em CAIXA ALTA |
| Dashboard | [03-dashboard.md](03-dashboard.md) | 6 | 4 | Gráfico com **eixo duplo**; exportações num menu; seletor de unidade repetido |
| Anúncios | [04-anuncios.md](04-anuncios.md) | 49 | 8 + lista | 11 controles numa barra; tabela repete a lista; modo Lista · Tabela · Galeria |
| Feedback de Leads (form + enviados) | [05-feedback-leads.md](05-feedback-leads.md) | 18 / 32 | 18 / 10 + tabela | 5 selects nativos; lista em acordeão vira tabela |
| Banco de Talentos + Trabalhe conosco | [06-banco-talentos.md](06-banco-talentos.md) | 14 / 59 | 12 / 30 | 5 ações por pergunta → menu ⋯; `prompt()` no link; tela fora do contexto de unidade |
| Configurações | [07-configuracoes.md](07-configuracoes.md) | 5 / 9 | 5 / 9 | Um olho revela as 3 senhas; dica do e-mail só em `title=` |
| Métricas da Rede | [08-metricas-rede.md](08-metricas-rede.md) | 22 | 10 | Números em formato americano; promessa "97,5% de certeza"; metas fixas no código |
| Financeiro & Gestão | [09-financeiro.md](09-financeiro.md) | 79 | ~45 | **Saldo do caixa aparece 0** e "Salvar" apaga o valor real; 37 `alert()` + 6 `confirm()`; datas ISO cruas |
| Usuários | [10-usuarios.md](10-usuarios.md) | 80 | ~45 | Senha padrão pré-preenchida `Trafego@2026`; 3 ações por linha → menu ⋯ |
| Integrações de IA | [11-integracoes-ia.md](11-integracoes-ia.md) | 5 / 23 | 5 / 12 | Escopos crus (`leads:read`); 12 checkboxes nativos; "Revogar" com 16px de altura |
| Formulários & Endpoints | [12-formularios.md](12-formularios.md) | 136 | ~30 | 64 cartões numa página de 7.700px → tabela paginada |
| 404 | [00-estrutura-global.md](00-estrutura-global.md#404) | 1 | 1 | "Go Home" em inglês |

## Sinais transversais de "web codado" (medidos)

| Sinal | Medida | Onde |
| --- | --- | --- |
| Alturas de botão | **24 alturas diferentes** entre 14 e 54px (ex.: 16, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 44…) | todas as telas; `elements.json` |
| Alturas de campo | **18 alturas** de input/select/textarea (16 a 64px) | Financeiro (26, 34, 38, 50), Usuários (16, 30, 34, 38), Formulários (30, 34, 35, 38, 42) |
| `<select>` nativos | **63 na tela** (34 no código) | Financeiro 13, Usuários 16 (1 por linha), Formulários 3, Métricas 1, Feedback 5, Integrações 1, Talentos 1 |
| Checkbox/radio/date nativos | **24** fora os selects | Integrações (12), Login, Trabalhe conosco, filtros de data (Dashboard, Anúncios, Feedbacks) |
| Dicas via `title=` | **463 elementos na tela** (63 no código) | ícones de lixeira, copiar, editar, recolher sidebar — sem tooltip real, sem teclado |
| `alert()` do navegador | **37** | Financeiro (validação de formulários e erros) |
| `confirm()` do navegador | **6** | Financeiro: excluir ata, despesa, despesa fixa, demanda, unidade, desconfirmar recebimento |
| `prompt()` do navegador | **1** | Banco de Talentos: editar link público |
| Botões só com ícone | **214** na tela | 22×22px em Financeiro e Talentos (abaixo de 24px de alvo) |
| Fonte monoespaçada fora de código | **209** usos de `font-mono` | valores monetários, rótulos de KPI, datas, "Sincronizado às" |
| CAIXA ALTA + tracking | **289** usos de `uppercase` | abas do Financeiro, rótulos de KPI, botões ("SALVAR CAIXA", "+ ADICIONAR") |
| Texto de 8–10px | **222** usos (`text-[8px]`…`text-[10px]`) | rótulos, selos, notas |
| Raios de borda | 6 valores medidos (4, 10, 12, 16px, 0 e pílula) e 8 classes (`rounded`→`rounded-3xl`, `[32px]`) | cartões 16/24px, controles 12/16px, selos pílula |
| Pulsos animados | **16** `animate-pulse` | selos de cabeçalho, "Sincronizado", pendentes |
| `backdrop-blur` | **119** | quase todo cartão; custo de GPU e leitura |
| Modais sem foco preso | todos os modais próprios | números 52–63 na captura do candidato: o fundo continua focável |
| Modais atrás da sidebar | Print (Dashboard), Card WhatsApp e Legenda (Anúncios) | `main` cria contexto `z-10`; sidebar é `z-40` |
| Rolagem horizontal no celular | Dashboard **456px** em tela de 390; Financeiro **818px** | barra de ações e tabela de cobranças |
| Linhas clicáveis sem teclado | cartões de unidade (Financeiro), cabeçalho de campanha (Dashboard celular) | `div onClick` |
| Números em formato americano | "R$ 9.91", "11.2%", "1800.00", "2026_07", "2026-09-14T12:00:00.000Z" | Métricas da Rede, Financeiro |
| Banners que empurram o layout | faixa "Dados sincronizados em tempo real" (sempre), faixa âmbar de modo banco | Dashboard e Anúncios |
| Emoji em interface | 1 (`🏢` em `FinancialSidebar`) e `✓` em `KPIs.tsx` | os emojis das mensagens de WhatsApp são conteúdo, ficam |
| Crédito de biblioteca à vista | nenhum | — |

## Paleta de gráficos (dataviz)

Validação com `validate_palette.js`:

| Paleta | Modo | Resultado |
| --- | --- | --- |
| Atual Dashboard `#10B981, #F59E0B, #EF4444, #38BDF8` | escuro | **FALHA** na faixa de luminosidade (3 cores claras demais) e usa o **vermelho de status** como série |
| Atual Financeiro `#10b981, #f43f5e, #3b82f6` | escuro | **FALHA**: verde↔rosa ΔE 5,6 para deuteranopia (abaixo do piso 6) |
| Proposta `#199e70, #3987e5, #d95926` (aqua, azul, laranja) | escuro, todas as combinações | **PASSA** em tudo (CVD ≥ 9,4; visão normal ≥ 20,9; contraste ≥ 3:1) |
| Proposta `#1baf7a, #2a78d6, #eb6834` | claro, todas as combinações | Passa; aviso de contraste no aqua (2,82:1) → exige rótulo direto ou tabela |

Mapeamento fixo por entidade: **Conversas/Receita = aqua**, **Investimento/Lucro = azul**, **Custo/Despesas = laranja**. Vermelho/âmbar/verde ficam reservados para status (Crítico/Atenção/Positivo) e sempre com texto.

## Componentes que faltam no design system

O projeto tem shadcn em `components/ui`, mas as telas quase não o usam. Faltam, como componentes do produto:

| Componente | Para quê | Base |
| --- | --- | --- |
| `Button` com 3 alturas (32 / 36 / 44) e variantes primária, secundária, fantasma, perigo | acabar com as 24 alturas | `ui/button` (hoje sem uso nas telas) |
| `IconButton` com `Tooltip` obrigatório | trocar os `title=` e os alvos de 22px | `ui/tooltip` |
| `Field` + `Input` com 2 alturas (36 / 44) | campos iguais em todo o app | `ui/input` |
| `Select` próprio | trocar os 34 `<select>` nativos | `ui/select` (Radix) |
| `Checkbox` e `Switch` | Integrações, Login, Trabalhe conosco | `ui/checkbox`, `ui/switch` |
| `SegmentedControl` | período (7/30/90), status, modo de visualização, nota 1–5, validade | novo |
| `DatePicker` / `DateRangePicker` | trocar `<input type="date">` (formato do navegador) | `ui/calendar` + `Popover` |
| `DropdownMenu` (menu ⋯) | exportações, ações por linha | `ui/dropdown-menu` |
| `ConfirmDialog` + `useConfirm()` | trocar os 6 `confirm()` e os modais de confirmação feitos à mão | `ui/alert-dialog` |
| `Toast` com "Desfazer" | trocar `alert()`; ações reversíveis sem confirmação | `sonner` (já instalado) |
| `PageHeader` | título, subtítulo curto, ações — igual em todas as telas | novo |
| `StatTile` | KPIs sem mono/CAIXA ALTA | novo |
| `EmptyState` | estados vazios padronizados | `ui/empty` |
| `lib/format.ts` | moeda, número, %, data, data relativa, telefone, mês "2026_07" | novo |

## Dados falsos e promessas indevidas

| Onde | O quê |
| --- | --- |
| Home › Sobre | "+500 campanhas", "+50M em vendas", "98% de satisfação" fixos no código, sem fonte. Confirmar com o negócio antes de manter. |
| Métricas da Rede › Guia | "97,5% de certeza estatística de que o público saturou" — a banda μ+2σ indica custo fora do padrão, não prova saturação. |
| Métricas da Rede / Análise profunda | Metas mensais de leads **fixas no código** (`DEFAULT_MONTHLY_TARGETS`, e 200 para qualquer unidade não listada) exibidas como "Meta Mensal" sem aviso. |
| Métricas da Rede | Selo "Cockpit Estratégico de Tráfego & IA" — não há IA nessa tela; é estatística descritiva. |
| Dashboard / Anúncios | "Sincronizados em tempo real" e "Dashboard Atualizada em Tempo Real" (no card exportado): os dados vêm com cache de 3 minutos ou do banco. |
| Financeiro › Dashboard | "Desempenho em tempo real". |
| Login | "Ambiente seguro com criptografia" + "Acesso protegido" + "Acesso seguro" (3 selos genéricos na mesma tela). |
| Usuários | Senha de redefinição **pré-preenchida com `Trafego@2026`** — senha conhecida por todos. |
| Financeiro › Caixa | Campo "Saldo atual em caixa" mostra **0** porque é lido antes do Firebase responder; clicar "Salvar caixa" grava 0 por cima do saldo real. |

## Proposta de fases de implementação

1. **Base** — componentes da tabela acima, tamanhos padronizados (botões 32/36/44, campos 36/44, raios 8/12/16), `lib/format.ts`, paleta validada em `lib/chartPalette.ts`.
2. **Substituições transversais** — `confirm()` → `ConfirmDialog`; `alert()` → toast; `prompt()` → diálogo; `title=` de botões de ícone → `Tooltip`.
3. **Estrutura global** — menu da conta (sem logout no clique do nome), item ativo único na sidebar, modais acima da sidebar, Banco de Talentos dentro do contexto de unidade, sem rolagem horizontal no celular, 404 em português.
4. **Telas, da mais usada para a menos usada** — Dashboard → Anúncios → Feedback de Leads → Banco de Talentos → Formulários → Financeiro → Métricas da Rede → Usuários → Integrações de IA → Configurações → Login/Cadastro → Home.
5. **Verificação final** — typecheck, testes, build, capturas "depois" em `after/` com a mesma numeração, relatório `IMPLEMENTATION.md`.
