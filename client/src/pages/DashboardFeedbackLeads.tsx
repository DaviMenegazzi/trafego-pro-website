import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, dateToIso, Field, IconButton, Input, isoToDate, Page, SegmentedControl, Select, Surface, Textarea } from "@/components/ds";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Send, ShieldCheck } from "lucide-react";
import { useAdminAuth, getToken } from "@/hooks/useAdminAuth";
import {
  COMMUNICATION_OPTIONS,
  FALLBACK_UNITS,
  FEEDBACK_LAYOUT,
  LOSS_REASONS,
  RATING_OPTIONS,
  getAuthorizedUnitNames,
  validateFeedbackCounts,
} from "./feedbackLeadsConfig";
import { submitFeedbackLead } from "./feedbackLeadsApi";

export { FALLBACK_UNITS, LOSS_REASONS } from "./feedbackLeadsConfig";

type FormData = {
  unit: string;
  responsible: string;
  weekStart: string;
  weekEnd: string;
  totalLeads: string;
  leadsContacted: string;
  leadsResponded: string;
  leadsConverted: string;
  leadsLost: string;
  leadsInNegotiation: string;
  lossReason: string;
  leadQuality: string;
  observations: string;
  agencySatisfaction: string;
  communicationClarity: string;
  agencyAdjustment: string;
};

const emptyForm: FormData = {
  unit: "", responsible: "", weekStart: "", weekEnd: "", totalLeads: "", leadsContacted: "",
  leadsResponded: "", leadsConverted: "", leadsLost: "", leadsInNegotiation: "", lossReason: "",
  leadQuality: "", observations: "", agencySatisfaction: "", communicationClarity: "", agencyAdjustment: "",
};

function StandaloneFeedbackShell({ children, userName, onLogout }: { children: React.ReactNode; userName?: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Voltar para Tráfego Pro">
            <img src="/brand/logo_trafego_pro_white_9daf2f2e.webp" alt="Tráfego Pro" className="h-6 w-auto" />
            <span className="hidden border-l border-white/15 pl-3 text-xs font-light tracking-[0.18em] text-white/45 sm:inline">FEEDBACK SEMANAL</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-light text-white/45 sm:inline">{userName || "Usuário autenticado"}</span>
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/45 hover:bg-white/5 hover:text-white">
              <LogOut className="size-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-emerald-300/10 bg-[#0d1212]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3.5 text-sm text-white/60 sm:px-8"><ShieldCheck className="size-3.5 text-emerald-400/80" /> Página protegida · seus dados são enviados apenas após autenticação</div>
      </div>
      <main>{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-3 text-sm text-white/35 sm:px-8">Tráfego Pro · Feedback semanal de leads</footer>
    </div>
  );
}

function FeedbackLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-white/70">Verificando autenticação…</div>;
}

function FormSection({ step, title, description, children }: { step: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-white/[0.06] pb-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs font-semibold text-zinc-200">{step}</span>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </Surface>
  );
}

const COUNT_FIELDS: { name: keyof FormData & ("totalLeads" | "leadsContacted" | "leadsResponded" | "leadsConverted" | "leadsLost" | "leadsInNegotiation"); label: string }[] = [
  { name: "totalLeads", label: "Leads recebidos" },
  { name: "leadsContacted", label: "Contatados" },
  { name: "leadsResponded", label: "Responderam" },
  { name: "leadsConverted", label: "Fecharam" },
  { name: "leadsLost", label: "Perdidos ou descartados" },
  { name: "leadsInNegotiation", label: "Ainda em negociação" },
];

function RatingField({ label, value, onChange, low, high, error }: { label: string; value: string; onChange: (v: string) => void; low: string; high: string; error?: string }) {
  return (
    <Field label={label} required error={error}>
      <SegmentedControl
        aria-label={label}
        value={value as "1" | "2" | "3" | "4" | "5"}
        onValueChange={onChange}
        fullWidth
        options={RATING_OPTIONS.map((r) => ({ value: String(r) as "1" | "2" | "3" | "4" | "5", label: String(r) }))}
      />
      <div className="mt-1 flex justify-between text-xs text-zinc-500"><span>1 · {low}</span><span>5 · {high}</span></div>
    </Field>
  );
}

function formatWeek(start: string, end: string) {
  const a = isoToDate(start);
  const b = isoToDate(end);
  if (!a || !b) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(a.getDate())}/${pad(a.getMonth() + 1)} a ${pad(b.getDate())}/${pad(b.getMonth() + 1)}`;
}

function addDays(iso: string, days: number) {
  const date = isoToDate(iso);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return dateToIso(date);
}

export function StandaloneFeedbackLeads() {
  return <DashboardFeedbackLeadsContent standalone />;
}

export default function DashboardFeedbackLeads() {
  return <DashboardFeedbackLeadsContent />;
}

function DashboardFeedbackLeadsContent({ standalone = false }: { standalone?: boolean }) {
  const { user, loading: authLoading, logout } = useAdminAuth();
  const { clients, loading: clientsLoading } = useClientContext();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  // Preenche o responsável com o nome da conta e a unidade, quando só há uma.
  useEffect(() => {
    if (!user) return;
    setFormData((previous) => (previous.responsible ? previous : { ...previous, responsible: user.name ?? "" }));
  }, [user]);
  const authorizedUnits = useMemo(
    () => (user ? getAuthorizedUnitNames(clients, FALLBACK_UNITS, user.allowedClientIds ?? [], user.role) : []),
    [clients, user],
  );
  useEffect(() => {
    if (authorizedUnits.length === 1) setFormData((previous) => (previous.unit ? previous : { ...previous, unit: authorizedUnits[0] }));
  }, [authorizedUnits]);

  if (authLoading || !user) return <FeedbackLoading />;

  const units = getAuthorizedUnitNames(clients, FALLBACK_UNITS, user.allowedClientIds ?? [], user.role);
  const unitSelectDisabled = clientsLoading || units.length === 0;
  const countErrors = validateFeedbackCounts(formData);
  const hasCountErrors = Object.keys(countErrors).length > 0;
  const set = (name: keyof FormData, value: string) => setFormData((previous) => ({ ...previous, [name]: value }));

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    set(event.target.name as keyof FormData, event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!formData.unit || !formData.responsible || !formData.weekStart || !formData.weekEnd) {
      toast.error("Preencha a identificação e o período de referência.");
      return;
    }
    if (formData.weekStart > formData.weekEnd) {
      toast.error("A data inicial não pode ser posterior à data final.");
      return;
    }
    if (COUNT_FIELDS.some((f) => formData[f.name] === "") || !formData.lossReason || !formData.leadQuality || !formData.agencySatisfaction || !formData.communicationClarity) {
      toast.error("Preencha os campos obrigatórios destacados.");
      return;
    }
    if (hasCountErrors) {
      toast.error("Revise os números: eles não fecham entre si.");
      return;
    }
    const token = getToken();
    if (!token) { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); return; }
    setLoading(true);
    try {
      await submitFeedbackLead(formData, token);
      toast.success(`Feedback da semana ${formatWeek(formData.weekStart, formData.weekEnd)} enviado.`);
      setSubmitted(false);
      setFormData({ ...emptyForm, unit: formData.unit, responsible: formData.responsible });
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); }
      else toast.error(error instanceof Error ? error.message : "Erro ao salvar feedback. Tente novamente.");
    } finally { setLoading(false); }
  };

  const required = (name: keyof FormData) => (submitted && !formData[name] ? "Obrigatório." : undefined);

  const content = (
    <Page width="medium">
      <div className="flex items-start gap-3">
        <IconButton label="Voltar" icon={<ArrowLeft />} variant="secondary" onClick={() => setLocation(standalone ? "/" : "/dashboard")} className="mt-0.5" />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[28px]">Feedback semanal de leads</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Registre o que aconteceu com os leads da semana e como foi a entrega da Tráfego Pro. Leva cerca de 2 minutos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormSection step="1" title="Identificação" description="Quem preenche, a unidade e a semana analisada.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Responsável pelo preenchimento" htmlFor="responsible" required error={required("responsible")}>
              <Input id="responsible" name="responsible" size="lg" value={formData.responsible} onChange={handleChange} placeholder="Nome do gerente ou vendedor" aria-invalid={Boolean(required("responsible"))} />
            </Field>
            <Field label="Unidade" htmlFor="unit" required error={required("unit")} hint={!clientsLoading && units.length === 0 ? "Nenhuma unidade disponível para este usuário." : undefined}>
              <Select
                id="unit"
                size="lg"
                value={formData.unit}
                onValueChange={(v) => set("unit", v)}
                disabled={unitSelectDisabled}
                invalid={Boolean(required("unit"))}
                placeholder={clientsLoading ? "Carregando unidades…" : "Selecione a unidade"}
                options={units.map((u) => ({ value: u, label: u }))}
              />
            </Field>
            <Field label="Início da semana" htmlFor="weekStart" required error={required("weekStart")}>
              <DatePicker
                id="weekStart"
                size="lg"
                value={formData.weekStart}
                invalid={Boolean(required("weekStart"))}
                onChange={(iso) => setFormData((previous) => ({ ...previous, weekStart: iso, weekEnd: previous.weekEnd && previous.weekEnd >= iso ? previous.weekEnd : addDays(iso, 6) }))}
              />
            </Field>
            <Field label="Fim da semana" htmlFor="weekEnd" required error={required("weekEnd") ?? (formData.weekStart && formData.weekEnd && formData.weekEnd < formData.weekStart ? "O fim não pode vir antes do início." : undefined)} hint="Sugerido automaticamente: 7 dias.">
              <DatePicker id="weekEnd" size="lg" value={formData.weekEnd} min={formData.weekStart || undefined} invalid={Boolean(required("weekEnd"))} onChange={(iso) => set("weekEnd", iso)} />
            </Field>
          </div>
        </FormSection>

        <FormSection step="2" title="Leads da semana" description="Do recebimento ao desfecho. Os números precisam fechar entre si.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {COUNT_FIELDS.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={f.name} required error={countErrors[f.name] ?? required(f.name)}>
                <Input
                  id={f.name}
                  name={f.name}
                  size="lg"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={formData[f.name]}
                  onChange={handleChange}
                  placeholder="0"
                  aria-invalid={Boolean(countErrors[f.name] ?? required(f.name))}
                  className="tabular-nums"
                />
              </Field>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Principal motivo de perda" htmlFor="lossReason" required error={required("lossReason")}>
              <Select id="lossReason" size="lg" value={formData.lossReason} onValueChange={(v) => set("lossReason", v)} invalid={Boolean(required("lossReason"))} placeholder="Selecione o motivo" options={LOSS_REASONS.map((r) => ({ value: r, label: r }))} />
            </Field>
            <RatingField label="Qualidade geral dos leads" value={formData.leadQuality} onChange={(v) => set("leadQuality", v)} low="muito baixa" high="muito alta" error={required("leadQuality")} />
          </div>
          <Field label="Observações" htmlFor="observations" optional className="mt-5">
            <Textarea id="observations" name="observations" value={formData.observations} onChange={handleChange} placeholder="Algum contexto importante sobre os leads da semana?" rows={3} />
          </Field>
        </FormSection>

        <FormSection step="3" title="Entrega da agência" description="Sua percepção orienta a próxima semana da Tráfego Pro.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RatingField label="Satisfação com a Tráfego Pro" value={formData.agencySatisfaction} onChange={(v) => set("agencySatisfaction", v)} low="muito insatisfeito" high="muito satisfeito" error={required("agencySatisfaction")} />
            <Field label="A comunicação com a agência foi clara?" required error={required("communicationClarity")}>
              <SegmentedControl
                aria-label="A comunicação com a agência foi clara?"
                value={formData.communicationClarity as (typeof COMMUNICATION_OPTIONS)[number]}
                onValueChange={(v) => set("communicationClarity", v)}
                fullWidth
                options={COMMUNICATION_OPTIONS.map((o) => ({ value: o, label: o }))}
              />
            </Field>
          </div>
          <Field label="Algo que a agência deveria ajustar na próxima semana?" htmlFor="agencyAdjustment" optional className="mt-5">
            <Textarea id="agencyAdjustment" name="agencyAdjustment" value={formData.agencyAdjustment} onChange={handleChange} placeholder="Ajustes, prioridades ou pontos de atenção" rows={3} />
          </Field>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={() => setLocation(standalone ? "/" : "/dashboard")}>Cancelar</Button>
          <Button type="submit" variant="primary" size="lg" loading={loading} disabled={unitSelectDisabled}>
            <Send />
            {loading ? "Enviando…" : "Enviar feedback"}
          </Button>
        </div>
      </form>
    </Page>
  );

  return standalone ? <StandaloneFeedbackShell userName={user.name} onLogout={logout}>{content}</StandaloneFeedbackShell> : <AppLayout>{content}</AppLayout>;
}
