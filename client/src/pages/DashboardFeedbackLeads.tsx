import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const fieldClassName =
  "mt-1 h-11 w-full rounded-xl border border-white/15 bg-[#0b0e11] px-3 text-sm text-white shadow-inner shadow-black/10 outline-none transition placeholder:text-white/35 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15";
const labelClassName = "text-sm font-medium leading-5 text-white/80";
const cardClassName = "rounded-2xl border border-white/10 bg-[#111519] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)] sm:p-6";

function StandaloneFeedbackShell({ children, userName, onLogout }: { children: React.ReactNode; userName?: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Voltar para Tráfego Pro">
            <img src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" alt="Tráfego Pro" className="h-6 w-auto" />
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

function FormSectionHeading({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 pb-4">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-xs font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-300/30">{step}</span>
      <div><h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2><p className="mt-1 text-sm leading-5 text-white/50">{description}</p></div>
    </div>
  );
}

function NumberField({ name, label, value, onChange }: { name: keyof FormData; label: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={labelClassName}>{label} *</Label>
      <Input id={name} name={name} type="number" min="0" step="1" value={value} onChange={onChange} placeholder="0" required />
    </div>
  );
}

export function StandaloneFeedbackLeads() {
  return <DashboardFeedbackLeadsContent standalone />;
}

export default function DashboardFeedbackLeads() {
  return <DashboardFeedbackLeadsContent />;
}

function DashboardFeedbackLeadsContent({ standalone = false }: { standalone?: boolean }) {
  const { user, loading: authLoading, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    fetch("/api/metrics/units", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("unidades")))
      .then((data) => setUnits(getAuthorizedUnitNames(Array.isArray(data.clients) ? data.clients : [], FALLBACK_UNITS, user.allowedClientIds ?? [], user.role)))
      .catch(() => setUnits([]));
  }, [user]);

  if (authLoading || !user) return <FeedbackLoading />;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.unit || !formData.responsible || !formData.weekStart || !formData.weekEnd) {
      toast.error("Preencha a identificação e o período de referência.");
      return;
    }
    if (formData.weekStart > formData.weekEnd) {
      toast.error("A data inicial não pode ser posterior à data final.");
      return;
    }
    const token = getToken();
    if (!token) { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); return; }
    setLoading(true);
    try {
      await submitFeedbackLead(formData, token);
      toast.success("Feedback semanal salvo com sucesso!");
      setFormData(emptyForm);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); }
      else toast.error(error instanceof Error ? error.message : "Erro ao salvar feedback. Tente novamente.");
    } finally { setLoading(false); }
  };

  const content = (
    <div className="feedback-form-shell flex-1 overflow-auto">
      <div className={FEEDBACK_LAYOUT.page}>
        <div className="flex items-start gap-3 sm:gap-4">
          <button onClick={() => setLocation(standalone ? "/" : "/dashboard")} className="mt-0.5 rounded-xl border border-white/10 p-2.5 text-white/60 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white" title="Voltar"><ArrowLeft className="size-5" /></button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Feedback Semanal de Leads{formData.unit ? ` — ${formData.unit}` : ""}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">Registre o panorama dos leads e a percepção da unidade sobre a entrega da Tráfego Pro.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={FEEDBACK_LAYOUT.form}>
          <Card className={cardClassName}>
            <FormSectionHeading step="1" title="Identificação" description="Informe quem preencheu, a unidade e o período semanal analisado." />
            <div className={FEEDBACK_LAYOUT.identityGrid}>
              <div className="space-y-2"><Label htmlFor="responsible" className={labelClassName}>Nome do gerente/vendedor responsável *</Label><Input id="responsible" name="responsible" value={formData.responsible} onChange={handleChange} placeholder="Nome do responsável" required /></div>
              <div className="space-y-2"><Label htmlFor="unit" className={labelClassName}>Unidade *</Label><select id="unit" name="unit" value={formData.unit} onChange={handleChange} required disabled={units.length === 0} className={fieldClassName}><option value="">{units.length ? "Selecione a unidade" : "Nenhuma unidade disponível para este usuário"}</option>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="weekStart" className={labelClassName}>Início *</Label><Input id="weekStart" name="weekStart" type="date" value={formData.weekStart} onChange={handleChange} required /></div><div className="space-y-2"><Label htmlFor="weekEnd" className={labelClassName}>Fim *</Label><Input id="weekEnd" name="weekEnd" type="date" min={formData.weekStart || undefined} value={formData.weekEnd} onChange={handleChange} required /></div></div>
            </div>
          </Card>

          <Card className={cardClassName}>
            <FormSectionHeading step="2" title="Panorama geral de leads da semana" description="Acompanhe volume, evolução do atendimento, conversão e percepção sobre a qualidade." />
            <div className={FEEDBACK_LAYOUT.metricsGrid}>
              <NumberField name="totalLeads" label="Quantos leads foram recebidos essa semana?" value={formData.totalLeads} onChange={handleChange} />
              <NumberField name="leadsContacted" label="Quantos foram contatados?" value={formData.leadsContacted} onChange={handleChange} />
              <NumberField name="leadsResponded" label="Quantos retornaram/responderam?" value={formData.leadsResponded} onChange={handleChange} />
              <NumberField name="leadsConverted" label="Quantos fecharam (converteram)?" value={formData.leadsConverted} onChange={handleChange} />
              <NumberField name="leadsLost" label="Quantos foram perdidos/descartados?" value={formData.leadsLost} onChange={handleChange} />
              <NumberField name="leadsInNegotiation" label="Quantos ainda estão em negociação?" value={formData.leadsInNegotiation} onChange={handleChange} />
              <div className="space-y-2"><Label htmlFor="lossReason" className={labelClassName}>Principal motivo de perda *</Label><select id="lossReason" name="lossReason" value={formData.lossReason} onChange={handleChange} required className={fieldClassName}><option value="">Selecione o motivo</option>{LOSS_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="leadQuality" className={labelClassName}>Qualidade geral dos leads (1 a 5) *</Label><select id="leadQuality" name="leadQuality" value={formData.leadQuality} onChange={handleChange} required className={fieldClassName}><option value="">Selecione uma nota</option>{RATING_OPTIONS.map((rating) => <option key={rating} value={rating}>{rating} — {rating === 1 ? "Muito baixa" : rating === 5 ? "Muito alta" : ""}</option>)}</select></div>
            </div>
            <div className="mt-4 space-y-2"><Label htmlFor="observations" className={labelClassName}>Observações livres <span className="font-normal text-white/40">(opcional)</span></Label><Textarea id="observations" name="observations" value={formData.observations} onChange={handleChange} placeholder="Registre um contexto importante sobre os leads da semana..." rows={3} /></div>
          </Card>

          <Card className={cardClassName}>
            <FormSectionHeading step="3" title="Satisfação de entrega da agência" description="Compartilhe a percepção da unidade para orientar a próxima semana da Tráfego Pro." />
            <div className={FEEDBACK_LAYOUT.metricsGrid}>
              <div className="space-y-2"><Label htmlFor="agencySatisfaction" className={labelClassName}>Satisfação com a Tráfego Pro (1 a 5) *</Label><select id="agencySatisfaction" name="agencySatisfaction" value={formData.agencySatisfaction} onChange={handleChange} required className={fieldClassName}><option value="">Selecione uma nota</option>{RATING_OPTIONS.map((rating) => <option key={rating} value={rating}>{rating} — {rating === 1 ? "Muito insatisfeito" : rating === 5 ? "Muito satisfeito" : ""}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="communicationClarity" className={labelClassName}>A comunicação com a agência foi clara? *</Label><select id="communicationClarity" name="communicationClarity" value={formData.communicationClarity} onChange={handleChange} required className={fieldClassName}><option value="">Selecione uma opção</option>{COMMUNICATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            </div>
            <div className="mt-4 space-y-2"><Label htmlFor="agencyAdjustment" className={labelClassName}>Algo que a agência deveria ajustar na próxima semana? <span className="font-normal text-white/40">(opcional)</span></Label><Textarea id="agencyAdjustment" name="agencyAdjustment" value={formData.agencyAdjustment} onChange={handleChange} placeholder="Descreva qualquer ajuste, prioridade ou ponto de atenção..." rows={3} /></div>
          </Card>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setLocation(standalone ? "/" : "/dashboard")} className="h-11 rounded-xl border-white/15 bg-transparent px-5 text-white/70 hover:bg-white/5 hover:text-white">Cancelar</Button>
            <Button type="submit" disabled={loading || units.length === 0} className="h-11 gap-2 rounded-xl bg-emerald-300 px-5 font-semibold text-[#06120b] shadow-[0_8px_24px_rgba(110,231,183,0.16)] hover:bg-emerald-200"><Send className="size-4" />{loading ? "Salvando..." : "Enviar feedback semanal"}</Button>
          </div>
        </form>
      </div>
    </div>
  );

  return standalone ? <StandaloneFeedbackShell userName={user.name} onLogout={logout}>{content}</StandaloneFeedbackShell> : <AppLayout>{content}</AppLayout>;
}
