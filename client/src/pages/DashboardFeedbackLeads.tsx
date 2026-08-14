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
import { FALLBACK_UNITS, REASONS } from "./feedbackLeadsConfig";
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
      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Voltar para Tráfego Pro">
            <img src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" alt="Tráfego Pro" className="h-5 w-auto" />
            <span className="hidden border-l border-white/15 pl-3 text-xs font-light tracking-[0.18em] text-white/45 sm:inline">
              FEEDBACK DE LEADS
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-light text-white/45 sm:inline">{userName || "Usuário autenticado"}</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-light text-white/70 transition hover:border-white/35 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-white/5 bg-[#0d0d0d]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3 text-xs font-light text-white/45 sm:px-8">
          <ShieldCheck className="size-3.5 text-emerald-400/80" />
          Página protegida · seus dados são enviados apenas após autenticação
        </div>
      </div>
      <main>{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-8 pt-2 text-xs font-light text-white/25 sm:px-8">
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
    <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm font-light text-white/55">
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

export default function DashboardFeedbackLeads() {
  return <DashboardFeedbackLeadsContent />;
}

function DashboardFeedbackLeadsContent({ standalone = false }: { standalone?: boolean }) {
  const { user, loading: authLoading, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const [units, setUnits] = useState<string[]>(() => [...FALLBACK_UNITS]);

  // Carrega unidades dinamicamente do Supabase (clients.name)
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/metrics/units", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.configured && Array.isArray(d.units) && d.units.length > 0) {
          setUnits(d.units);
        }
      })
      .catch(() => { /* mantém fallback */ });
  }, []);

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
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="size-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Feedback de Conversão de Leads
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha os dados da semana para identificar gargalos em tráfego, atendimento e conversão
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção: Identificação */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Identificação</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-medium">
                    Unidade *
                  </Label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Selecione a unidade</option>
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible" className="text-sm font-medium">
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
                  <Label htmlFor="weekStart" className="text-sm font-medium">
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
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Volume de Leads</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalLeads" className="text-sm font-medium">
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
                  <Label htmlFor="leadsCard" className="text-sm font-medium">
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
                  <Label htmlFor="leadsConsultation" className="text-sm font-medium">
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
                  <Label htmlFor="leadsDentistry" className="text-sm font-medium">
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
                  <Label htmlFor="leadsBusinessPJ" className="text-sm font-medium">
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
                  <Label htmlFor="leadsOutOfArea" className="text-sm font-medium">
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
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Atendimento e Conversão</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadsAnswered" className="text-sm font-medium">
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
                  <Label htmlFor="leadsNoAnswer" className="text-sm font-medium">
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
                  <Label htmlFor="salesClosed" className="text-sm font-medium">
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
                  <Label htmlFor="mainReason" className="text-sm font-medium">
                    Motivo principal de não conversão
                  </Label>
                  <select
                    id="mainReason"
                    name="mainReason"
                    value={formData.mainReason}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Qualitativo</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="creativeFeedback" className="text-sm font-medium">
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
                  <Label htmlFor="generalObservations" className="text-sm font-medium">
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
                  <Label htmlFor="supportNeeded" className="text-sm font-medium">
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
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/dashboard")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2"
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
