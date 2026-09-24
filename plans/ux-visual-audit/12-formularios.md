# Formulários & Endpoints

Capturas: `img/16-formularios.png`, `img/16-formularios-mobile.png`, `img/16-formularios-endpoints.png`, `img/16-formularios-detalhe.png`, `img/16-formularios-novo.png`.

Duas tarefas diferentes numa tela: **ler leads** que chegaram de landing pages (diária, também para clientes) e **configurar endpoints** (rara, só admin).

## Cabeçalho

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Sobrelinha "GESTÃO DE FORMULÁRIOS EXTERNOS" + parágrafo | 🔁 | `PageHeader` "Formulários". |
| 16 | "Atualizar" (`title=`) | 🔁 | `IconButton`. |
| 17 | "Novo Formulário / Endpoint" | 🗂️ | Pertence à aba Endpoints; na aba de submissões compete com a leitura. Fica só na aba Endpoints (onde hoje existe um segundo botão igual, #20). |
| — | 4 KPIs: Total de submissões, Hoje, Franquias ativas, Endpoints configurados | 🔁 | Os dois primeiros são de leitura (ficam, como texto no cabeçalho da tabela: "64 submissões · 1 hoje"). Os dois últimos são de configuração (vão para a aba Endpoints). |
| 18–19 | Abas "Submissões Recebidas 64" / "Endpoints & Chaves de API 4" | ✅ | Texto: "Submissões" / "Endpoints". |

## Submissões — `img/16-formularios.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 20 | Busca | ✅ | — |
| 21–22 | Unidade e Formulário (`<select>` nativos) | 🔁 | `Select`. |
| 23 | "Exportar XLSX" (branco, o mais forte) | ⋯ | Menu Exportar. |
| 24–151 | 64 cartões de 90px com "WhatsApp" + "Ver detalhes" em cada um (**página de 7.700px**, 16.650px no celular) | 🔁 | Tabela paginada (25 por página): Contato · Telefone · Plano · Formulário · Unidade · Recebido. Clique na linha abre o detalhe; "WhatsApp" vira `IconButton` com tooltip na linha. |
| — | Selos de cor diferente por formulário e por plano | 🔁 | Texto neutro. |

Esboço:

```
Formulários                                                               ⟳  [Exportar ⌄]
[Submissões 64] [Endpoints 4]
[🔍 Buscar contato, telefone, e-mail]  [Unidade ⌄]  [Formulário ⌄]           64 · 1 hoje
┌───────────────────┬─────────────────┬────────────┬──────────────────┬───────────────┬────────┬───┐
│ Contato           │ Telefone        │ Plano      │ Formulário       │ Unidade       │ Recebido│   │
│ Ana Paula Ribeiro │ (55) 98100-1000 │ Família    │ LP Plano Família │ Vida Card Ijuí│ há 2 h  │ ◔ │
└───────────────────┴─────────────────┴────────────┴──────────────────┴───────────────┴────────┴───┘
                                                                   ‹ 1 2 3 ›
```

## Detalhe da submissão — `img/16-formularios-detalhe.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 152 | Copiar | ✅ | — |
| 153 | Fechar (só ícone, sem rótulo) | 🔁 | `aria-label`. |
| 154 | "Conversar no WhatsApp" | ⭐ | Principal. |
| 155 | "Excluir registro" (link de 16px) | ✅ | Tem confirmação em linha; ok. |
| 156 | "Fechar" | ✂️ | Duplica o ×. |

## Endpoints — `img/16-formularios-endpoints.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 20 | "Criar Novo Endpoint" | ⭐ | Único lugar do "novo". |
| — | "Prefixo: tpf_live_8f2a…", CORS em mono | ✅ | É código; mono cabe. |
| — | "Expira: 24/10/2026" em âmbar | ✅ | — |
| 21, 23… | "Ver Código de Integração" | ✅ | — |
| 22, 24… | "Revogar" | ✅ | Tem confirmação (irreversível); passar para `ConfirmDialog`. |

## Novo endpoint — `img/16-formularios-novo.png`

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 153 | Nome | ✅ | — |
| 154–155 | "Marcar todas" / "Desmarcar" (16px) | ✅ | Alvo maior. |
| 157 | Origens permitidas (textarea) | ✅ | — |
| 158 | Expiração (`<select>` "Sem expiração (Recomendado para La…)" cortado) | 🔁 | `Select` com texto que cabe. |
| 160 | "Gerar Endpoint e Chave" | ✅ | — |
