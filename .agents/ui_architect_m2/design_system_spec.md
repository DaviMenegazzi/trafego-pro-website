# Especificação do Design System — Módulo Pixel (/pixel)

**Versão:** 2.0.0-canonical  
**Data:** 2026-09-04  
**Autor:** UI Architect (`ui_architect_m2`)  
**Status:** Oficial / Normativo para os Milestones M3, M4, M5 e M6  
**Alvo Principal:** `client/src/pages/EvolutionAdmin.tsx` e componentes satélites  
**Referências Canônicas:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`, `client/src/pages/Dashboard.tsx`

---

## 1. Visão Geral & Princípios Fundamentais

O redesenho visual do módulo **Pixel** tem como objetivo eliminar a percepção de utilitário técnico isolado ("painel administrativo de segunda classe") e integrá-lo como um pilar de primeira linha da plataforma **Tráfego Pro**: a **Central de Rastreamento & Atribuição WhatsApp**.

### 1.1 Princípios de Design

1. **Operations-Grade (Estética Linear / Vercel / Retool):**
   Densidade de informação refinada, contraste calculado, superfícies translúcidas e acentos luminosos ciano/índigo de precisão cirúrgica. Sem ornamentações supérfluas ou cores infantis.
2. **Dark-First Estrito:**
   Construído a partir da base `#090a0b`, empregando camadas de elevação com opacidades neutras (`bg-white/[.025]`, `border-white/8`) que conferem profundidade sem gerar poluição visual.
3. **Acessibilidade Inegociável (WCAG AA Estrito):**
   Todos os textos corporais, microcópia e labels informativos devem atingir no mínimo **4.5:1** de contraste sobre seu fundo imediato. Banimento completo de `text-zinc-600` e `text-zinc-700` em textos legíveis.
4. **Hierarquia Semiótica Clara:**
   O preenchimento sólido `bg-cyan-300 text-[#082124]` é de uso exclusivo para **ações primárias (CTAs)**. Abas, tags e filtros utilizam estilo de pílula sutil (`bg-white/[.08]` com microindicador).
5. **Sanitização de Marca & Eliminação de Emojis:**
   - **Zero menções a "Evolution"** na UI visível (substituir por "Pixel", "Gateway WhatsApp" ou "Conexão WhatsApp").
   - **Zero emojis**: substituição integral por ícones vetoriais padronizados da biblioteca `lucide-react` (dimensões `h-3.5 w-3.5` a `h-5 w-5`).

---

## 2. Inventário Completo de Tokens de Design

### 2.1 Paleta de Cores e Relações de Contraste (WCAG AA)

Todas as cores foram calculadas sobre o fundo base da aplicação (`#090a0b`, luminância relativa $L = 0.0030$).

| Token Semântico | Cor Hex | Classe Tailwind | Fundo de Referência | Contraste | Status WCAG AA | Uso Exclusivo |
|---|---|---|---|---|---|---|
| **Canvas Background** | `#090a0b` | `bg-[#090a0b]` | N/A | N/A | Base | Fundo da tela inteira |
| **Card Surface** | `rgba(255,255,255,0.025)` | `bg-white/[.025]` | `#090a0b` | N/A | Base | Cards mestres e containers |
| **Nested Surface** | `rgba(0,0,0,0.20)` | `bg-black/20` | `bg-white/[.025]` | N/A | Base | Sub-containers, seções internas |
| **Control Surface** | `#101214` | `bg-[#101214]` | `bg-white/[.025]` | N/A | Base | Inputs, selects, cards do Kanban |
| **Primary Text** | `#f4f4f5` | `text-zinc-100` | `#090a0b` | **18.1:1** | ✅ AAA Pass | Títulos, nomes de leads, valores KPI |
| **Secondary Text** | `#d4d4d8` | `text-zinc-300` | `#090a0b` | **13.2:1** | ✅ AAA Pass | Corpo de texto, mensagens, descrições |
| **Muted Micro-Label** | `#a1a1aa` | `text-zinc-400` | `#090a0b` | **7.6:1** | ✅ AAA Pass | Eyebrows, `<th>`, datas, metadados |
| **Disabled / Hint Text** | `#71717a` | `text-zinc-500` | `#090a0b` | **4.1:1** | ⚠️ Incidental | Apenas placeholders e estados inativos |
| **Cyan Accent (Primary)**| `#67e8f9` | `text-cyan-300` | `#090a0b` | **12.8:1** | ✅ AAA Pass | Ícones ativos, badges ciano, halos |
| **Cyan Action Background**| `#67e8f9` | `bg-cyan-300` | N/A | N/A | Base CTA | Fundo de botão primário |
| **Cyan Action Text** | `#082124` | `text-[#082124]` | `#67e8f9` | **10.8:1** | ✅ AAA Pass | Texto dentro de botão `bg-cyan-300` |
| **Emerald Accent (Success)**| `#6ee7b7`| `text-emerald-300` | `#090a0b` | **13.2:1** | ✅ AAA Pass | Conectado, lead ganho, tag verificada |
| **Amber Accent (Warning)** | `#fcd34d` | `text-amber-300` | `#090a0b` | **13.6:1** | ✅ AAA Pass | Aguardando, sinal observado, a validar |
| **Rose Accent (Danger)** | `#fda4af` | `text-rose-300` | `#090a0b` | **10.2:1** | ✅ AAA Pass | Erro, desconectado, lead perdido |
| **Violet Accent (AI Bot)**| `#c4b5fd` | `text-violet-300` | `#090a0b` | **10.5:1** | ✅ AAA Pass | Atualização automática por IA |
| **Indigo Accent (Decor)** | `#818cf8` | `text-indigo-300` | `#090a0b` | **8.9:1** | ✅ AAA Pass | Gradientes e acento secundário |

> **REGRA DE OURO DE CONTRASTE:**
> As classes `text-zinc-600` (contraste 2.53:1) e `text-zinc-700` (contraste 1.85:1) estão **estritamente proibidas** em qualquer elemento textual visível. Toda microcópia, label de campo e cabeçalho de tabela deve usar obrigatoriamente `text-zinc-400` ou superior.

---

### 2.2 Escala de Superfícies & Profundidade (Elevation System)

A arquitetura de camadas utiliza 6 níveis de profundidade:

```
Nível 0: Canvas (Fundo)
   └─ [#090a0b]
Nível 1: Card Base
   └─ bg-white/[.025] + border border-white/8
Nível 2: Sub-Superfície / Agrupador Interno
   └─ bg-black/20 + border border-white/6
Nível 3: Controles Interativos & Cartões de Dados
   └─ bg-[#101214] + border border-white/10
Nível 4: Barra de Ferramentas / Escopo Fixo
   └─ bg-[#090a0b]/80 + backdrop-blur-md + border border-white/10
Nível 5: Modais & Diálogos
   └─ bg-[#101214] + border border-white/10 + shadow-2xl shadow-black/80
Nível 6: Drag Overlay (Item em Arraste)
   └─ bg-[#151a1c] + border border-cyan-300/50 + shadow-2xl shadow-cyan-950/40
```

---

### 2.3 Sistema Tipográfico & Regras de Tracking

O projeto carrega **Inter** e **Space Grotesk** via Google Fonts.

| Papel Tipográfico | Família | Peso | Tamanho | Tracking | Leading | Classe Tailwind |
|---|---|---|---|---|---|---|
| **Page Title** | Space Grotesk | Light (300) | `text-3xl sm:text-4xl` | `tracking-[-.04em]` | `leading-tight` | `font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl` |
| **Section Heading** | Space Grotesk | Light (300) | `text-xl sm:text-2xl` | `tracking-[-.03em]` | `leading-snug` | `font-['Space_Grotesk'] text-xl font-light tracking-[-.03em] text-white sm:text-2xl` |
| **Card Heading** | Space Grotesk | Normal (400) | `text-lg` | `tracking-tight` | `leading-normal` | `font-['Space_Grotesk'] text-lg font-normal tracking-tight text-white` |
| **KPI Big Number** | Space Grotesk | Light (300) | `text-3xl` | `tracking-[-.05em]` | `leading-none` | `font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white` |
| **Section Eyebrow** | Inter | Medium (500) | `text-[10px]` | `tracking-[.18em]` | `leading-none` | `text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300` |
| **Micro-Label / `<th>`** | Inter | Medium (500) | `text-[10px]` | `tracking-[.18em]` | `leading-none` | `text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400` |
| **Body Primary** | Inter | Light (300) | `text-sm` | `tracking-normal` | `leading-6` | `text-sm font-light leading-6 text-zinc-100` |
| **Body Secondary** | Inter | Light (300) | `text-xs` | `tracking-normal` | `leading-5` | `text-xs font-light leading-5 text-zinc-300` |
| **Status Badge Text** | Inter | SemiBold (600)| `text-[10px]` | `tracking-wider` | `leading-none` | `text-[10px] font-semibold uppercase tracking-wider` |
| **Code / Identifier** | JetBrains Mono/UI | Regular (400) | `text-xs` | `tracking-normal` | `leading-relaxed`| `font-mono text-xs text-cyan-100` |

---

### 2.4 Espaçamento, Grid e Alinhamento

- **Grid Base:** Múltiplos estritos de 4px (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px, `p-8` = 32px).
- **Largura Máxima do Container:**
  - Padronizado com `SocialPublishingAdmin.tsx`: `max-w-[1440px]` com margens automáticas (`mx-auto px-5 py-6 sm:px-8 lg:px-10`).
- **Gaps do Grid:**
  - Métricas e KPI Cards: `gap-3 sm:grid-cols-2 xl:grid-cols-4`
  - Seções mestras: `gap-6`
  - Kanban columns: `flex gap-4 overflow-x-auto pb-4 pt-1`

---

### 2.5 Raios de Borda (Corner Radius)

- **Cards e Seções Principais:** `rounded-2xl` (16px)
- **Controles, Botões, Inputs e Sub-cards:** `rounded-xl` (12px)
- **Badges compactos e Ações de Célula:** `rounded-lg` (8px)
- **Status Pills e Indicadores de Contagem:** `rounded-full` (9999px)

---

### 2.6 Sombras, Halos e Efeitos Visuais

- **Glow / Halo Primário (Cyan):**
  `shadow-[0_0_30px_rgba(34,211,238,.12)]`
- **Glow Secundário (Indigo):**
  `shadow-[0_0_30px_rgba(99,102,241,.12)]`
- **Sombra de Card Elevado:**
  `shadow-2xl shadow-black/40`
- **Sombra de Modal / Diálogo:**
  `shadow-2xl shadow-black/80`
- **Blur de Fundo em Sticky Bars:**
  `backdrop-blur-md`
- **Focos Acessíveis:**
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]`

---

## 3. Catálogo de Componentes Canônicos (Especificação Completa de Estados)

### 3.1 Header Unificado de Produto (`PixelHeader`)

Substitui o cabeçalho de "módulo isolado" por uma apresentação integrada, técnica e de alta hierarquia.

```tsx
<header className="mb-8 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
  <div className="flex gap-4">
    {/* Ícone de Destaque com Halo */}
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.15)]">
      <Signal className="h-5 w-5" />
    </div>
    
    <div>
      {/* Eyebrow de Produto Integrado */}
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[.18em] text-cyan-300">
          Tráfego Pro · Central de Rastreamento
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Em tempo real
        </span>
      </div>
      
      {/* Título Oficial do Módulo */}
      <h1 className="mt-1 font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">
        Pixel & Atribuição
      </h1>
      
      {/* Descrição Sóbria e Integrada */}
      <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-zinc-300">
        Monitoramento contínuo de instâncias WhatsApp, pipeline comercial CRM, correlação de campanhas Meta/Google e auditoria de eventos.
      </p>
    </div>
  </div>

  {/* Ações de Topo */}
  <div className="flex flex-wrap items-center gap-3">
    <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2 text-xs text-zinc-400">
      <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
      <span>Sincronização ativa</span>
    </div>
    
    {/* Botão de Atualização Primário */}
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-[#082124] shadow-sm transition hover:bg-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      <span>{refreshing ? "Sincronizando…" : "Atualizar dados"}</span>
    </button>
  </div>
</header>
```

#### Tabela de Estados do Header

| Estado | Elemento Alvo | Classes Tailwind |
|---|---|---|
| **Default** | Botão Atualizar | `bg-cyan-300 text-[#082124] shadow-sm` |
| **Hover** | Botão Atualizar | `hover:bg-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,.25)]` |
| **Active** | Botão Atualizar | `active:scale-[0.98]` |
| **Focus-Visible** | Botão Atualizar | `focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0b]` |
| **Loading** | Botão Atualizar | `disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:animate-spin` |

---

### 3.2 Segmented Tabs (Navegação de Abas)

Resolve o problema crítico diagnosticado na auditoria: a aba ativa **não deve** ter o peso visual nem o fundo ciano sólido de um botão CTA.

```tsx
<nav aria-label="Navegação do Pixel" className="mb-8">
  <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[.025] p-1.5 shadow-inner">
    {tabs.map(({ id, label, Icon, count }) => {
      const active = view === id;
      return (
        <button
          key={id}
          onClick={() => setView(id)}
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150",
            active
              ? "bg-white/[.08] text-white border border-white/10 shadow-sm shadow-black/40"
              : "text-zinc-400 hover:bg-white/[.04] hover:text-zinc-200 border border-transparent"
          )}
        >
          {/* Microindicador Ciano na Aba Ativa */}
          {active && (
            <span className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.6)]" />
          )}
          <Icon className={cn("h-3.5 w-3.5 transition-colors", active ? "text-cyan-300" : "text-zinc-400 group-hover:text-zinc-200")} />
          <span>{label}</span>
          {typeof count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                active ? "bg-cyan-400/20 text-cyan-200" : "bg-white/5 text-zinc-400"
              )}
            >
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
</nav>
```

#### Tabela de Estados da Aba

| Estado | Item Inativo | Item Ativo |
|---|---|---|
| **Default** | `border border-transparent text-zinc-400` | `border border-white/10 bg-white/[.08] text-white` |
| **Hover** | `hover:bg-white/[.04] hover:text-zinc-200` | `hover:bg-white/[.10]` |
| **Focus-Visible** | `focus-visible:ring-2 focus-visible:ring-cyan-300/50` | `focus-visible:ring-2 focus-visible:ring-cyan-300/70` |
| **Icon State** | `text-zinc-400 group-hover:text-zinc-200` | `text-cyan-300` |
| **Badge State**| `bg-white/5 text-zinc-400` | `bg-cyan-400/20 text-cyan-200` |

---

### 3.3 Barra de Escopo Pegajosa (`PixelScopeBar`)

Projetada para fixar no topo durante a rolagem (`sticky`), facilitando a navegação operacional contínua por unidade e instância WhatsApp.

```tsx
<section
  aria-label="Filtro de escopo operacional"
  className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#090a0b]/85 p-3.5 shadow-xl backdrop-blur-md lg:sticky lg:top-3 lg:z-20 lg:flex-row lg:items-center lg:justify-between"
>
  <div className="flex flex-1 flex-wrap items-center gap-3">
    {/* Seletor de Unidade */}
    <div className="min-w-[220px] flex-1 sm:max-w-xs">
      <label htmlFor="unitScope" className="sr-only">Unidade</label>
      <div className="relative">
        <select
          id="unitScope"
          value={unitScope}
          onChange={(e) => { setUnitScope(e.target.value); setInstanceScope("all"); }}
          className="w-full appearance-none rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-8 text-xs font-light text-zinc-100 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
        >
          <option value="all">Todas as unidades autorizadas</option>
          {unitOptions.map((unit) => (
            <option key={unit} value={unit}>{unit === "__unassigned" ? "Sem unidade atribuída" : unit}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>

    {/* Seletor de Instância WhatsApp */}
    <div className="min-w-[220px] flex-1 sm:max-w-xs">
      <label htmlFor="instanceScope" className="sr-only">Instância WhatsApp</label>
      <div className="relative">
        <select
          id="instanceScope"
          value={instanceScope}
          onChange={(e) => setInstanceScope(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-8 text-xs font-light text-zinc-100 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
        >
          <option value="all">Todas as instâncias conectadas</option>
          {scopedInstances.map((inst) => (
            <option key={inst.instanceName} value={inst.instanceName}>{inst.displayName || inst.instanceName}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  </div>

  {/* Resumo de Contagem Operacional */}
  <div className="flex items-center gap-2 self-start lg:self-auto">
    <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/5 px-3.5 py-2 text-xs text-cyan-100">
      <span className="h-2 w-2 rounded-full bg-cyan-400" />
      <span><strong className="font-semibold text-white">{scopedInstances.length}</strong> instância(s)</span>
      <span className="text-zinc-600">·</span>
      <span><strong className="font-semibold text-white">{scopedSummary.totalLeads}</strong> contato(s)</span>
    </div>
  </div>
</section>
```

---

### 3.4 Metric / KPI Cards (`PixelMetricCard`)

Cards executivos com micro-rótulos em caixa alta, tipografia Space Grotesk e halo sutil no hover.

```tsx
<article className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-lg shadow-black/10 transition-all duration-200 hover:border-cyan-300/30 hover:bg-white/[.035] hover:shadow-[0_0_30px_rgba(34,211,238,.08)]">
  {/* Linha de Destaque Superior */}
  <div className="mb-4 flex items-center justify-between">
    <span className="text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400 group-hover:text-zinc-300 transition-colors">
      {label}
    </span>
    <div className={cn("grid h-8 w-8 place-items-center rounded-xl border border-white/5 transition-transform group-hover:scale-105", bg, color)}>
      <Icon className="h-4 w-4" />
    </div>
  </div>

  {/* Valor Principal */}
  <div className="flex items-baseline justify-between gap-2">
    <strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">
      {value}
    </strong>
    {trend && (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-300">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {trend}
      </span>
    )}
  </div>

  {/* Descrição Auxiliar */}
  {description && (
    <p className="mt-2 text-xs font-light text-zinc-400">
      {description}
    </p>
  )}
</article>
```

#### Especificação de Cores por Métrica

| Métrica | Ícone | Cor Ícone | Fundo Ícone |
|---|---|---|---|
| **Eventos hoje** | `Activity` | `text-cyan-300` | `bg-cyan-400/10 border-cyan-300/20` |
| **Contatos rastreados** | `UsersRound` | `text-indigo-300` | `bg-indigo-400/10 border-indigo-300/20` |
| **A validar / Triagem**| `CircleAlert`| `text-amber-300` | `bg-amber-400/10 border-amber-300/20` |
| **Fechados / Won** | `CheckCircle2`| `text-emerald-300`| `bg-emerald-400/10 border-emerald-300/20` |
| **Meta Verificado** | `BadgeCheck` | `text-emerald-300`| `bg-emerald-400/10 border-emerald-300/20` |
| **Meta Observado** | `Signal` | `text-amber-300` | `bg-amber-400/10 border-amber-300/20` |
| **Google Ads** | `Tag` | `text-sky-300` | `bg-sky-400/10 border-sky-300/20` |
| **Sem Evidência** | `CircleSlash`| `text-zinc-400` | `bg-white/[.04] border-white/8` |

---

### 3.5 Status Badges & Pills (`PixelStatusPill`)

Padronização de etiquetas para instâncias, atribuição e classificação de funil, **sem emojis** e com conformidade estrita WCAG AA.

```tsx
// Exemplo canônico de Status Pill
<span className={cn(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
  badgeVariantClasses[variant]
)}>
  <StatusIcon className="h-3 w-3 shrink-0" />
  <span>{label}</span>
</span>
```

#### Catálogo Exato de Variantes

| Estado / Tipo | Ícone Lucide | Classes Tailwind Completas |
|---|---|---|
| **Instância Conectada** | `CheckCircle2` | `border-emerald-400/25 bg-emerald-400/10 text-emerald-300` |
| **Instância Desconectada** | `AlertTriangle`| `border-rose-400/25 bg-rose-400/10 text-rose-300` |
| **Instância Aguardando** | `Clock3` | `border-amber-400/25 bg-amber-400/10 text-amber-300` |
| **Atribuição Confirmada**| `BadgeCheck` | `border-emerald-400/25 bg-emerald-400/10 text-emerald-300` |
| **Atribuição Não Resolvida**| `HelpCircle`| `border-amber-400/25 bg-amber-400/10 text-amber-300` |
| **Evidência Verificada** | `ShieldCheck` | `border-emerald-400/25 bg-emerald-400/10 text-emerald-300` |
| **Sinal Observado** | `Radio` | `border-amber-400/25 bg-amber-400/10 text-amber-300` |
| **Sem Evidência** | `Minus` | `border-white/10 bg-white/[.04] text-zinc-400` |
| **Classificação: Lead** | `UserCheck` | `border-emerald-400/25 bg-emerald-400/10 text-emerald-300` |
| **Classificação: Não Lead**| `UserX` | `border-white/10 bg-white/[.03] text-zinc-400` |
| **Classificação: Pendente**| `Hourglass` | `border-amber-400/25 bg-amber-400/10 text-amber-300` |
| **Atualizado por IA** | `Bot` | `border-violet-300/30 bg-violet-400/10 text-violet-300` |

---

### 3.6 Controles de Formulário (Input, Select, Search)

```tsx
// Input Padrão
const inputClass = "block w-full rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 text-xs font-light text-zinc-100 placeholder:text-zinc-500 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50";

// Select Padrão
const selectClass = "block w-full appearance-none rounded-xl border border-white/10 bg-[#101214] px-3.5 py-2.5 pr-8 text-xs font-light text-zinc-100 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50";

// Label Padrão de Formulário
const formLabelClass = "block text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400 mb-1.5";
```

#### Campo de Busca com Ícone

```tsx
<div className="relative">
  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
  <input
    type="search"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Filtrar por nome, telefone ou tag…"
    className="w-full rounded-xl border border-white/10 bg-[#101214] py-2.5 pl-9 pr-8 text-xs font-light text-zinc-100 placeholder:text-zinc-500 outline-none transition hover:border-white/20 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery("")}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )}
</div>
```

---

### 3.7 Tabelas de Dados Operacionais (`PixelDataTable`)

Aplicado nas abas **Operação (Triagem)**, **Atribuição Meta**, **Origem & tags** e **Auditoria**.

```tsx
<div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] shadow-lg">
  <div className="overflow-x-auto">
    <table className="min-w-full text-left">
      <thead className="border-b border-white/8 bg-black/10 text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400">
        <tr>
          <th className="px-5 py-3.5">Contato</th>
          <th className="px-4 py-3.5">Instância</th>
          <th className="px-4 py-3.5">Mensagens</th>
          <th className="px-4 py-3.5">Classificação</th>
          <th className="px-4 py-3.5">Etapa</th>
          <th className="px-5 py-3.5 text-right">Ações</th>
        </tr>
      </thead>
      
      <tbody className="divide-y divide-white/8 text-xs">
        {leads.map((lead) => (
          <tr key={lead.id} className="transition-colors hover:bg-white/[.02]">
            {/* Célula de Contato */}
            <td className="px-5 py-4">
              <p className="font-normal text-zinc-100">{lead.contactName || "Contato sem nome"}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">•••• {lead.phoneLast4 || "—"} · {formatDate(lead.lastMessageAt)}</p>
            </td>

            {/* Célula de Instância */}
            <td className="px-4 py-4 text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {lead.instanceName}
              </span>
            </td>

            {/* Célula de Mensagens */}
            <td className="px-4 py-4 text-zinc-300">
              <span className="font-medium text-cyan-200">{lead.messagesReceived}</span>
              <span className="mx-1 text-zinc-500">/</span>
              <span>{lead.messagesSent}</span>
            </td>

            {/* Célula de Classificação */}
            <td className="px-4 py-4">
              <PixelStatusPill status={lead.classification} />
            </td>

            {/* Célula de Etapa com Select */}
            <td className="px-4 py-4">
              <select
                value={lead.funnelStage}
                onChange={(e) => updateLeadStage(lead, e.target.value)}
                className="rounded-lg border border-white/10 bg-[#101214] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-300/60"
              >
                {stages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </td>

            {/* Ações com Área de Toque Adequada (≥ 36px) */}
            <td className="px-5 py-4 text-right">
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 shadow-sm">
                <button
                  onClick={() => updateLeadClassification(lead, "lead")}
                  className="min-h-[36px] border-r border-white/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/10 active:bg-emerald-400/20"
                >
                  É lead
                </button>
                <button
                  onClick={() => updateLeadClassification(lead, "nao_lead")}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/5 active:bg-white/10 hover:text-zinc-200"
                >
                  Não lead
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

---

### 3.8 CRM Kanban Columns & Cards

Redesenho da grade quebrada de 4 colunas para uma esteira horizontal contínua de 7 colunas sequenciais.

#### Container do Kanban

```tsx
<div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
  {crmStages.map((stage) => (
    <CrmStageColumn
      key={stage.value}
      stage={stage}
      leads={leadsByStage[stage.value]}
      // ...
    />
  ))}
</div>
```

#### Coluna de Estágio (`CrmStageColumn`)

```tsx
<article
  ref={setNodeRef}
  className={cn(
    "flex w-[290px] shrink-0 flex-col rounded-2xl border bg-black/20 p-3 transition-colors duration-200",
    stage.borderColor,
    isOver
      ? "border-cyan-300/60 bg-cyan-950/20 ring-2 ring-cyan-300/40 ring-offset-2 ring-offset-[#090a0b]"
      : "border-white/8 hover:border-white/15"
  )}
>
  {/* Cabeçalho da Coluna com Barra de Progresso/Acento */}
  <header className="mb-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", stage.indicatorColor)} />
        <h3 className="text-xs font-medium text-zinc-100">{stage.label}</h3>
      </div>
      <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
        {leads.length}
      </span>
    </div>
    <div className={cn("mt-2 h-0.5 w-full rounded-full opacity-60", stage.barBg)} />
  </header>

  {/* Lista de Cards com Scroll Interno */}
  <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[660px] pr-1">
    {leads.length === 0 ? (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs transition-colors",
          isOver
            ? "border-cyan-300/60 bg-cyan-400/[.04] text-cyan-200"
            : "border-white/8 text-zinc-500"
        )}
      >
        {isOver ? "Solte o contato aqui" : "Nenhum lead nesta etapa"}
      </div>
    ) : (
      leads.map((lead) => (
        <CrmLeadCard key={lead.id} lead={lead} ... />
      ))
    )}
  </div>
</article>
```

#### Card de Lead no Kanban (`CrmLeadCard`)

```tsx
<div
  ref={setNodeRef}
  style={{ transform: CSS.Translate.toString(transform) }}
  {...attributes}
  {...listeners}
  onClick={() => onOpen(lead)}
  className={cn(
    "group relative w-full cursor-grab rounded-xl border border-white/10 bg-[#101214] p-3.5 text-left shadow-md transition-all duration-150",
    "hover:border-cyan-300/40 hover:bg-[#14181a] hover:shadow-lg hover:shadow-black/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
    isDragging && "cursor-grabbing opacity-35 ring-1 ring-cyan-300/50",
    locked && "cursor-not-allowed opacity-70"
  )}
>
  {/* Linha 1: Nome do Contato + Drag Handle Icon */}
  <div className="flex items-start justify-between gap-2">
    <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
      {lead.contactName || "Contato sem nome"}
    </p>
    <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-500 opacity-40 transition group-hover:opacity-100" />
  </div>

  {/* Linha 2: Telefone Formatado */}
  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
    <Phone className="h-3 w-3 text-zinc-500" />
    <span>{formatAdminPhone(lead)}</span>
  </p>

  {/* Linha 3: Tags de Origem ou Campanha Meta */}
  {attribution?.campaignName ? (
    <div className="mt-2.5 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-1.5">
      <p className="line-clamp-1 text-[10px] font-medium text-cyan-200">
        {attribution.campaignName}
      </p>
    </div>
  ) : (
    <div className="mt-2.5">
      <OriginPill platform={lead.originPlatform} evidence={lead.originEvidence} />
    </div>
  )}

  {/* Linha 4: Metadados Inferiores */}
  <div className="mt-2.5 flex items-center justify-between border-t border-white/6 pt-2 text-[10px] text-zinc-400">
    <span className="truncate max-w-[120px]">{lead.instanceName}</span>
    <span className="flex items-center gap-1">
      <MessageCircle className="h-3 w-3 text-cyan-300/70" />
      <span>{lead.messagesReceived} / {lead.messagesSent}</span>
    </span>
  </div>

  {/* Selo de IA quando aplicável */}
  {aiUpdated && (
    <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-300">
      <Bot className="h-3 w-3 text-violet-400" />
      <span>Classificado por IA</span>
    </div>
  )}
</div>
```

---

### 3.9 Banners de Alerta, Notificação de IA & Empty States

#### Banner de Erro

```tsx
<div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200 shadow-lg shadow-rose-950/20">
  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
  <div className="flex-1 leading-6">{errorMessage}</div>
  <button onClick={onDismiss} className="text-rose-300 hover:text-white">
    <X className="h-4 w-4" />
  </button>
</div>
```

#### Banner de Automação por IA Ativa

```tsx
<div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-400/30 bg-violet-400/10 px-5 py-4 text-sm text-violet-100 shadow-lg shadow-violet-950/20">
  <Bot className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-violet-300" />
  <div>
    <strong className="font-medium text-white">IA da Tráfego Pro em Execução</strong>
    <p className="mt-1 text-xs leading-5 text-violet-200/80">
      O pipeline está sendo classificado automaticamente. A movimentação manual de leads está temporariamente pausada para evitar concorrência.
    </p>
  </div>
</div>
```

#### Empty State Padronizado

```tsx
<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.01] p-10 text-center">
  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-400">
    <EmptyIcon className="h-6 w-6 text-zinc-400" />
  </div>
  <h3 className="mt-3 font-['Space_Grotesk'] text-base font-medium text-white">
    {title}
  </h3>
  <p className="mt-1 max-w-sm text-xs font-light leading-5 text-zinc-400">
    {description}
  </p>
  {actionButton && (
    <div className="mt-4">{actionButton}</div>
  )}
</div>
```

#### Skeleton Loading

```tsx
<div className="animate-pulse space-y-3">
  <div className="h-6 w-1/3 rounded-lg bg-white/10" />
  <div className="h-4 w-1/2 rounded bg-white/5" />
  <div className="h-20 w-full rounded-xl bg-white/5" />
</div>
```

---

## 4. Guia de Conformidade & Sanitização Textual

### 4.1 Substituição Mandatória de Nomenclatura (De -> Para)

| Localização no Código | Texto Original (Incorreto / Vazamento) | Texto Padronizado (Canônico) | Racional |
|---|---|---|---|
| `EvolutionAdmin.tsx:313` | `Módulo isolado · administrativo` | `Tráfego Pro · Central de Rastreamento` | Elimina estigma de isolamento; posiciona como core product |
| `EvolutionAdmin.tsx:313` | `Este ambiente não participa das métricas nem dos fluxos da dashboard atual.` | `Monitoramento contínuo de instâncias WhatsApp, pipeline comercial CRM e correlação de campanhas.` | Transmite autoridade operacional em vez de exclusão |
| `EvolutionAdmin.tsx:314` | `<ArrowLeft /> Voltar à dashboard` | Removido ou substituído por badge de status / atalho integrado | O usuário já está dentro da dashboard; não deve parecer saída externa |
| `EvolutionAdmin.tsx:339` | `A movimentação fica registrada no Supabase Evolution...` | `A movimentação fica sincronizada em tempo real no Pixel e isolada por instância.` | **Violação zero**: remove menção explícita a "Evolution" |
| `EvolutionAdmin.tsx:361` | `quando a Evolution entrega um identificador Meta...` | `quando o webhook do Pixel recebe um identificador Meta e correlaciona com a fonte de métricas.` | **Violação zero**: remove menção explícita a "Evolution" |
| `EvolutionAdmin.tsx:376` | `Painel administrativo isolado > Pixel` | Removido ou substituído por `Tráfego Pro Pixel · Engine v2.0` com `text-zinc-400` | Elimina texto depreciativo e corrige contraste |

---

### 4.2 Matriz de Substituição: Emojis -> Ícones Lucide-React

O design system proíbe expressamente emojis no código de UI.

| Conceito / Semiótica | Emoji Anteriormente Proposto | Ícone Lucide Obrigatório | Classe Tailwind Canônica |
|---|---|---|---|
| **Conexão / Status Ativo** | 🟢 | `CheckCircle2` | `h-3 w-3 text-emerald-300` |
| **Conexão Desconectada** | 🔴 | `AlertTriangle` | `h-3 w-3 text-rose-300` |
| **Aguardando Conexão** | 🟡 | `Clock3` | `h-3 w-3 text-amber-300` |
| **Telefone / WhatsApp** | 📱 / 📞 | `Phone` | `h-3 w-3 text-zinc-400` |
| **Robô / Automação IA** | 🤖 | `Bot` | `h-3.5 w-3.5 text-violet-300` |
| **Tag / Origem** | 🏷️ | `Tag` | `h-3 w-3 text-cyan-300` |
| **Verificado / Meta** | ✅ | `BadgeCheck` | `h-3.5 w-3.5 text-emerald-300` |
| **Campanha / Clique** | 🎯 / 🖱️ | `MousePointerClick` | `h-3.5 w-3.5 text-cyan-300` |
| **Conversas / Chat** | 💬 | `MessageCircleMore` | `h-3.5 w-3.5 text-indigo-300` |
| **Auditoria / Webhook** | 🔍 / 📜 | `FileJson` / `Webhook` | `h-3.5 w-3.5 text-zinc-400` |
| **Arraste / Drag Handle** | ↕️ / ⠿ | `GripVertical` | `h-3.5 w-3.5 text-zinc-500` |

---

## 5. Matriz de Compatibilidade Técnica

- **React:** React 19 (`@types/react` ~19.0)
- **Vite:** Vite 7
- **Tailwind CSS:** Tailwind 4 (`@import "tailwindcss";` com suporte a classes dinâmicas arbitrárias de opacidade `bg-white/[.025]` e `border-white/8`)
- **DnD:** `@dnd-kit/core` v6, `@dnd-kit/utilities` v3 (suporte touch-none, sensors PointerSensor com distance constraint 8px)
- **Roteamento:** `wouter` v3 (`useLocation`)
- **Ícones:** `lucide-react` v1

*Documentação homologada pelo UI Architect para consumo imediato pelos milestones M3 (Information Designer) e M5 (Frontend Implementer).*
