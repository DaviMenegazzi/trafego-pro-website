import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Send, LogOut, ShieldCheck } from "lucide-react";
import { useAdminAuth, getToken } from "@/hooks/useAdminAuth";
import { FALLBACK_UNITS, FEEDBACK_LAYOUT, REASONS, getAuthorizedUnitNames } from "./feedbackLeadsConfig";
import { submitFeedbackLead } from "./feedbackLeadsApi";
export { FALLBACK_UNITS, REASONS } from "./feedbackLeadsConfig";

function StandaloneFeedbackShell({
  children,
  userName,
  onLogout,
}: {
  children: React.ReactNode;
  userName?: string;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Voltar para Tráfego Pro">
            <img src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" alt="Tráfego Pro" className="h-6 w-auto" />
            <span className="hidden border-l border-white/15 pl-3 text-xs font-light tracking-[0.18em] text-white/45 sm:inline">
              FEEDBACK DE LEADS
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-light text-white/45 sm:inline">{userName || "Usuário autenticado"}</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/45 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-emerald-300/10 bg-[#0d1212]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3.5 text-sm text-white/60 sm:px-8">
          <ShieldCheck className="size-3.5 text-emerald-400/80" />
          Página protegida · seus dados são enviados apenas após autenticação
        </div>
      </div>
      <main>{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-3 text-sm text-white/35 sm:px-8">
        Tráfego Pro · Feedback semanal de conversão
      </footer>
    </div>
  );
}

export function StandaloneFeedbackLeads() {
  return <DashboardFeedbackLeadsContent standalone />;
}

function FeedbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-white/70">
      Verificando autenticação…
    </div>
  );
}

// Fallback hardcoded — usado apenas se o Supabase não estiver configurado

type FormData = {
  unit: string;
  responsible: string;
  weekStart: string;
  totalLeads: string;
  leadsCard: string;
  leadsConsultation: string;
  leadsDentistry: string;
  leadsBusinessPJ: string;
  leadsOutOfArea: string;
  leadsAnswered: string;
  leadsNoAnswer: string;
  salesClosed: string;
  mainReason: string;
  creativeFeedback: string;
  generalObservations: string;
  supportNeeded: string;
};

const fieldClassName =
  "mt-1 h-11 w-full rounded-xl border border-white/15 bg-[#0b0e11] px-3 text-sm text-white shadow-inner shadow-black/10 outline-none transition placeholder:text-white/35 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15";
const labelClassName = "text-sm font-medium leading-5 text-white/80";
const cardClassName = "rounded-2xl border border-white/10 bg-[#111519] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.16)] sm:p-6";

function FormSectionHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 pb-4">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-xs font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-300/30">
        {step}
      </span>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-white/50">{description}</p>
      </div>
    </div>
  );
}

export default function DashboardFeedbackLeads() {
  return <DashboardFeedbackLeadsContent />;
}

function DashboardFeedbackLeadsContent({ standalone = false }: { standalone?: boolean }) {
  const { user, loading: authLoading, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const [units, setUnits] = useState<string[]>([]);

  // Carrega apenas as unidades que o backend autorizou para esta sessão.
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    fetch("/api/metrics/units", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as unidades autorizadas");
        return response.json();
      })
      .then((data) => {
        const clients = Array.isArray(data.clients) ? data.clients : [];
        setUnits(getAuthorizedUnitNames(clients, [], user.allowedClientIds ?? [], user.role));
      })
      .catch(() => setUnits([]));
  }, [user]);

  const [formData, setFormData] = useState<FormData>({
    unit: "",
    responsible: "",
    weekStart: "",
    totalLeads: "",
    leadsCard: "",
    leadsConsultation: "",
    leadsDentistry: "",
    leadsBusinessPJ: "",
    leadsOutOfArea: "",
    leadsAnswered: "",
    leadsNoAnswer: "",
    salesClosed: "",
    mainReason: "",
    creativeFeedback: "",
    generalObservations: "",
    supportNeeded: "",
  });

  if (authLoading || !user) return <FeedbackLoading />;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.unit || !formData.responsible || !formData.weekStart) {
      toast.error("Por favor, preencha todos os campos de identificação");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Sessão expirada. Por favor, faça login novamente.");
      setLocation("/login");
      return;
    }

    setLoading(true);
    try {
      await submitFeedbackLead(formData, token);

      toast.success("Feedback salvo com sucesso!");
      setFormData({
        unit: "",
        responsible: "",
        weekStart: "",
        totalLeads: "",
        leadsCard: "",
        leadsConsultation: "",
        leadsDentistry: "",
        leadsBusinessPJ: "",
        leadsOutOfArea: "",
        leadsAnswered: "",
        leadsNoAnswer: "",
        salesClosed: "",
        mainReason: "",
        creativeFeedback: "",
        generalObservations: "",
        supportNeeded: "",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        setLocation("/login");
      } else {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar feedback. Tente novamente.");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="feedback-form-shell flex-1 overflow-auto">
      <div className={FEEDBACK_LAYOUT.page}>
          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="mt-0.5 rounded-xl border border-white/10 p-2.5 text-white/60 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white"
              title="Voltar"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Feedback de Conversão de Leads
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
                Preencha os dados da semana para identificar gargalos em tráfego, atendimento e conversão
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={FEEDBACK_LAYOUT.form}>
            {/* Seção: Identificação */}
            <Card className={cardClassName}>
              <FormSectionHeading step="1" title="Identificação" description="Informe a unidade, a pessoa responsável e a segunda-feira da semana." />
              <div className={FEEDBACK_LAYOUT.identityGrid}>
                <div className="space-y-2">
                  <Label htmlFor="unit" className={labelClassName}>
                    Unidade *
                  </Label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    disabled={units.length === 0}
                    className={fieldClassName}
                  >
                    <option value="">
                      {units.length > 0 ? "Selecione a unidade" : "Nenhuma unidade disponível para este usuário"}
                    </option>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible" className={labelClassName}>
                    Responsável pelo preenchimento *
                  </Label>
                  <Input
                    id="responsible"
                    name="responsible"
                    type="text"
                    value={formData.responsible}
                    onChange={handleChange}
                    placeholder="Nome do responsável"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekStart" className={labelClassName}>
                    Semana de referência (segunda-feira) *
                  </Label>
                  <Input
                    id="weekStart"
                    name="weekStart"
                    type="date"
                    value={formData.weekStart}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Seção: Volume de Leads */}
            <Card className={cardClassName}>
              <FormSectionHeading step="2" title="Volume de leads" description="Separe os leads por produto e sinalize contatos fora da área." />
              <div className={FEEDBACK_LAYOUT.metricsGrid}>
                <div className="space-y-2">
                  <Label htmlFor="totalLeads" className={labelClassName}>
                    Total de leads/conversas recebidos na semana
                  </Label>
                  <Input
                    id="totalLeads"
                    name="totalLeads"
                    type="number"
                    min="0"
                    value={formData.totalLeads}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsCard" className={labelClassName}>
                    Leads — Cartão (venda direta)
                  </Label>
                  <Input
                    id="leadsCard"
                    name="leadsCard"
                    type="number"
                    min="0"
                    value={formData.leadsCard}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsConsultation" className={labelClassName}>
                    Leads — Consulta/Agendamento
                  </Label>
                  <Input
                    id="leadsConsultation"
                    name="leadsConsultation"
                    type="number"
                    min="0"
                    value={formData.leadsConsultation}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsDentistry" className={labelClassName}>
                    Leads — Odontologia
                  </Label>
                  <Input
                    id="leadsDentistry"
                    name="leadsDentistry"
                    type="number"
                    min="0"
                    value={formData.leadsDentistry}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsBusinessPJ" className={labelClassName}>
                    Leads — Empresarial/PJ
                  </Label>
                  <Input
                    id="leadsBusinessPJ"
                    name="leadsBusinessPJ"
                    type="number"
                    min="0"
                    value={formData.leadsBusinessPJ}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsOutOfArea" className={labelClassName}>
                    Leads de fora da área de atuação
                  </Label>
                  <Input
                    id="leadsOutOfArea"
                    name="leadsOutOfArea"
                    type="number"
                    min="0"
                    value={formData.leadsOutOfArea}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>
            </Card>

            {/* Seção: Atendimento e Conversão */}
            <Card className={cardClassName}>
              <FormSectionHeading step="3" title="Atendimento e conversão" description="Compare resposta, perda de retorno e vendas fechadas." />
              <div className={FEEDBACK_LAYOUT.metricsGrid}>
                <div className="space-y-2">
                  <Label htmlFor="leadsAnswered" className={labelClassName}>
                    Leads respondidos
                  </Label>
                  <Input
                    id="leadsAnswered"
                    name="leadsAnswered"
                    type="number"
                    min="0"
                    value={formData.leadsAnswered}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsNoAnswer" className={labelClassName}>
                    Leads sem resposta/sem retorno
                  </Label>
                  <Input
                    id="leadsNoAnswer"
                    name="leadsNoAnswer"
                    type="number"
                    min="0"
                    value={formData.leadsNoAnswer}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesClosed" className={labelClassName}>
                    Vendas fechadas na semana
                  </Label>
                  <Input
                    id="salesClosed"
                    name="salesClosed"
                    type="number"
                    min="0"
                    value={formData.salesClosed}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainReason" className={labelClassName}>
                    Motivo principal de não conversão
                  </Label>
                  <select
                    id="mainReason"
                    name="mainReason"
                    value={formData.mainReason}
                    onChange={handleChange}
                    className={fieldClassName}
                  >
                    <option value="">Selecione um motivo</option>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Seção: Qualitativo */}
            <Card className={cardClassName}>
              <FormSectionHeading step="4" title="Qualitativo" description="Registre padrões percebidos e qualquer necessidade de apoio." />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="creativeFeedback" className={labelClassName}>
                    Algum criativo/anúncio específico gerou leads de qualidade nítida (bom ou ruim)?
                  </Label>
                  <Textarea
                    id="creativeFeedback"
                    name="creativeFeedback"
                    value={formData.creativeFeedback}
                    onChange={handleChange}
                    placeholder="Descreva os criativos que geraram bons ou maus resultados..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generalObservations" className={labelClassName}>
                    Observações gerais / pontos de atenção para a agência
                  </Label>
                  <Textarea
                    id="generalObservations"
                    name="generalObservations"
                    value={formData.generalObservations}
                    onChange={handleChange}
                    placeholder="Compartilhe observações importantes sobre a semana..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportNeeded" className={labelClassName}>
                    Precisa de suporte da agência esta semana? Em quê?
                  </Label>
                  <Textarea
                    id="supportNeeded"
                    name="supportNeeded"
                    value={formData.supportNeeded}
                    onChange={handleChange}
                    placeholder="Descreva o suporte necessário..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Botões de ação */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                className="h-11 rounded-xl border-white/15 bg-transparent px-5 text-white/70 hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 gap-2 rounded-xl bg-emerald-300 px-5 font-semibold text-[#06120b] shadow-[0_8px_24px_rgba(110,231,183,0.16)] hover:bg-emerald-200"
              >
                <Send className="size-4" />
                {loading ? "Salvando..." : "Enviar Feedback"}
              </Button>
            </div>
          </form>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <StandaloneFeedbackShell userName={user.name} onLogout={logout}>
        {content}
      </StandaloneFeedbackShell>
    );
  }

  return <AppLayout>{content}</AppLayout>;
}
