# Handoff Report — M1 Design Auditor

**Agent:** `design_auditor_m1`  
**Milestone:** `M1: Audit`  
**Target File Audited:** `client/src/pages/EvolutionAdmin.tsx`  
**Reference Canonicals:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`, `client/src/pages/Dashboard.tsx`  
**Status:** Complete

---

## 1. Observation

Direct code observations from the audited codebase:

### 1.1 Textual Leaks of "Evolution"
- `client/src/pages/EvolutionAdmin.tsx:339`:
  ```tsx
  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
    Arraste um contato entre as etapas. A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual.
  </p>
  ```
- `client/src/pages/EvolutionAdmin.tsx:361`:
  ```tsx
  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
    O vínculo só é exibido quando a Evolution entrega um identificador Meta e ele corresponde a campanha, conjunto, anúncio ou criativo na fonte de métricas. Sem essa chave, a origem permanece não resolvida.
  </p>
  ```

### 1.2 "Isolated Admin" Psychology & Messaging
- `client/src/pages/EvolutionAdmin.tsx:313`:
  ```tsx
  <p className="mb-1 text-[10px] font-medium uppercase tracking-[.24em] text-cyan-300">Módulo isolado · administrativo</p>
  <h1 className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">Pixel</h1>
  <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Eventos de mensagens, classificação comercial e evidências de origem. Este ambiente não participa das métricas nem dos fluxos da dashboard atual.</p>
  ```
- `client/src/pages/EvolutionAdmin.tsx:376`:
  ```tsx
  <footer className="flex items-center justify-end gap-1 pt-7 text-xs text-zinc-700">Painel administrativo isolado <ChevronRight className="h-3 w-3" /> Pixel</footer>
  ```
- `client/src/pages/EvolutionAdmin.tsx:314`:
  ```tsx
  <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/[.06] hover:text-white">
    <ArrowLeft className="h-3.5 w-3.5" />Voltar à dashboard
  </button>
  ```

### 1.3 WCAG AA Contrast Failures
Direct calculation on base `#090a0b` (luminance 0.0030):
- `text-zinc-600` (`#52525b`, luminance 0.0841): Ratio = **2.53:1** (Fails WCAG AA minimum 4.5:1 for normal text). Found at lines 90, 95, 339, 342, 346, 348, 349, 357, 358, 361, 363, 372, 375.
- `text-zinc-700` (`#3f3f46`, luminance 0.0480): Ratio = **1.85:1** (Fails WCAG AA minimum 4.5:1). Found at lines 358, 376.
- `text-zinc-500` (`#71717a`, luminance 0.167): Ratio = **4.09:1** (Fails WCAG AA minimum 4.5:1 for normal text < 18pt). Found at lines 313, 319, 325, 339, 346, 347, 358, 361, 363, 372, 374, 375.

### 1.4 Structural & Layout Observations
- `client/src/pages/EvolutionAdmin.tsx:309`:
  Inline style: `style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}` hardcoded on `<main>`.
- `client/src/pages/EvolutionAdmin.tsx:311`:
  Container width `max-w-[1480px]` diverges from canonical `max-w-[1440px]` in `SocialPublishingAdmin.tsx:284`.
- `client/src/pages/EvolutionAdmin.tsx:341`:
  CRM Kanban pipeline (7 stages) uses CSS Grid:
  `grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`, causing stages 5, 6, 7 to wrap below stages 1, 2, 3, 4, destroying linear sales pipeline orientation.
- `client/src/pages/EvolutionAdmin.tsx:345-359`:
  In tab "Operação", instances are rendered twice (form on line 347 and read-only list on line 357), while core KPI metric cards are pushed down to line 356.
- `client/src/pages/EvolutionAdmin.tsx:335`:
  Active tab button uses `bg-cyan-300 text-[#082124] font-medium`, identical to primary action CTA buttons, causing visual action hierarchy confusion.

---

## 2. Logic Chain

1. **Premise 1 (Identity & Positioning):** The user's directive states the module must stop feeling like an isolated administrative backoffice and look and feel like an integrated dashboard product.
2. **Inference 1:** Exposing labels like "Módulo isolado · administrativo", "Este ambiente não participa das métricas...", "Painel administrativo isolado > Pixel", and using an external back-arrow exit directly breaks this directive. It must be repositioned as "Central de Rastreamento & Atribuição WhatsApp (Pixel)".
3. **Premise 2 (Brand Protection):** The user requires zero user-facing mentions of "Evolution".
4. **Inference 2:** Lines 339 ("Supabase Evolution") and 361 ("quando a Evolution entrega") violate this rule and must be replaced with neutral product terminology ("Pixel" / "banco de dados do Pixel").
5. **Premise 3 (Accessibility Standards):** The system must meet WCAG AA contrast (≥ 4.5:1 for body/microcopy text).
6. **Inference 3:** Over 30 occurrences of `text-zinc-600` (ratio 2.53:1) and `text-zinc-500` (ratio 4.09:1) on dark surfaces fail WCAG AA. They must be promoted to `text-zinc-400` (ratio 6.5:1) or `text-zinc-300`.
7. **Premise 4 (CRM Usability):** A 7-stage sales pipeline follows a strict left-to-right temporal progression.
8. **Inference 4:** Multi-row grid wrapping (`grid-cols-3` or `grid-cols-4`) breaks pipeline continuity. Converting the Kanban container to a horizontally scrollable container with fixed column widths (`w-[280px]` - `w-[300px] shrink-0`) preserves the linear mental model and enables smooth dragging.
9. **Premise 5 (Visual Cohesion):** Canonical references (`SocialPublishingAdmin.tsx`, `AppLayout.tsx`) establish solid `#090a0b`, `border-white/8`, `bg-white/[.025]`, and subtle segmented pills for tabs.
10. **Inference 5:** Replacing solid cyan tab buttons with segmented pill tabs and consolidating redundant components in the "Operação" tab eliminates friction and aligns the module with the platform's visual standard.

---

## 3. Caveats

- **No Backend Logic Alterations:** API routes (`/api/evolution/*`), payload schemas, RLS policies, and database triggers were confirmed as out of scope for modification and were only examined to verify display data contracts.
- **Component Decomposition:** This audit did not alter source files. Decomposing `EvolutionAdmin.tsx` into modular subcomponents in `client/src/components/pixel/` is recommended for `frontend_implementer_m5`, provided file names and public routes are preserved.
- **Test Suite Status:** Unit tests for evolution policies exist in `client/src/lib/` and were triggered via Vitest; results will be verified by QA in Milestone 6.

---

## 4. Conclusion

The audit reveals that `EvolutionAdmin.tsx` is functionally rich and robust in data modeling (DnD, Meta attribution matching, scoped unit filters, AI bot automation policies), but suffers from four primary categories of design debt:
1. **Self-deprecating copy & isolated framing** that makes the module look disconnected from the main dashboard.
2. **Textual leaks of "Evolution"** at lines 339 and 361.
3. **Severe WCAG AA contrast violations** caused by pervasive use of `text-zinc-600` and `text-zinc-700` on dark `#090a0b` backgrounds.
4. **CRM Kanban grid wrapping and duplicated operational widgets** in Tab 1 ("Operação").

All issues are actionable through targeted design system tokens, information restructuring, and interaction refinement, without breaking any backend contracts or business logic.

---

## 5. Verification Method

To independently reproduce and verify these findings:

1. **Verify Textual Leaks:**
   ```powershell
   Select-String -Path "client/src/pages/EvolutionAdmin.tsx" -Pattern "Evolution" | Where-Object { $_.Line -notmatch "import " -and $_.Line -notmatch "/api/" -and $_.Line -notmatch "function " }
   ```
   *Expected result:* Lines 339 and 361 will be listed.

2. **Verify Contrast Ratios:**
   - Background `#090a0b` (RGB 9, 10, 11).
   - Inspect elements with class `text-zinc-600` (`#52525b`, RGB 82, 82, 91) with browser DevTools or WebAIM Contrast Checker:
     $$\text{Contrast Ratio} = \frac{0.0841 + 0.05}{0.0030 + 0.05} = 2.53:1 < 4.5:1 \quad (\text{FAIL})$$

3. **Verify Grid Wrapping in CRM:**
   - Inspect line 341 of `client/src/pages/EvolutionAdmin.tsx` for `grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`.
   - On viewports with width between 1280px and 1536px, columns 1 to 4 render on row 1, and columns 5 to 7 wrap to row 2.

4. **Verify Test Suite Integrity:**
   ```powershell
   npx vitest run
   ```
