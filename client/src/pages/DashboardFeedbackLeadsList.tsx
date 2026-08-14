import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, ChevronDown, ChevronUp, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

type Feedback = {
  id: number;
  unit: string;
  responsible: string;
  weekStart: string;
  totalLeads: number;
  leadsCard: number;
  leadsConsultation: number;
  leadsDentistry: number;
  leadsBusinessPJ: number;
  leadsOutOfArea: number;
  leadsAnswered: number;
  leadsNoAnswer: number;
  salesClosed: number;
  mainReason: string;
  creativeFeedback: string;
  generalObservations: string;
  supportNeeded: string;
  submittedAt: string;
  submittedByEmail: string;
  createdAt: string;
};

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("tp_token") ?? ""}` };
}

function useAdminGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) {
      setLocation("/login");
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      if (user.role !== "admin") setLocation("/dashboard");
    } catch {
      setLocation("/login");
    }
  }, [setLocation]);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

function NumberMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function DashboardFeedbackLeadsList() {
  useAdminGuard();
  const [, setLocation] = useLocation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [unit, setUnit] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Tráfego Pro — Feedbacks de Leads";
  }, []);

  const units = useMemo(() => Array.from(new Set(feedbacks.map((item) => item.unit))).sort((a, b) => a.localeCompare(b, "pt-BR")), [feedbacks]);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unit) params.set("unit", unit);
      if (weekStart) params.set("weekStart", weekStart);
      if (weekEnd) params.set("weekEnd", weekEnd);
      const query = params.toString();
      const response = await fetch(`/api/feedback-leads${query ? `?${query}` : ""}`, { headers: authHeaders() });
      if (response.status === 401) {
        setLocation("/login");
        return;
      }
      if (response.status === 403) {
        toast.error("Esta aba é exclusiva para administradores.");
        setLocation("/dashboard");
        return;
      }
      if (!response.ok) throw new Error("Falha ao carregar feedbacks");
      setFeedbacks(await response.json());
    } catch {
      toast.error("Não foi possível carregar os feedbacks armazenados.");
    } finally {
      setLoading(false);
    }
  }, [setLocation, unit, weekEnd, weekStart]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="size-4" /> Área administrativa
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feedbacks de conversão</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Consulte os retornos enviados pelas unidades. Os registros ficam armazenados na base SQL interna do projeto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/feedback-leads" className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              Novo feedback
            </Link>
            <button onClick={fetchFeedbacks} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90" type="button">
              <RefreshCw className="size-3.5" /> Atualizar
            </button>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
          <label className="space-y-2 text-xs font-medium text-foreground">
            <span>Unidade</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40">
              <option value="">Todas as unidades</option>
              {units.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-medium text-foreground">
            <span>Semana inicial</span>
            <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="space-y-2 text-xs font-medium text-foreground">
            <span>Semana final</span>
            <input type="date" value={weekEnd} onChange={(event) => setWeekEnd(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground md:pb-3">
            <CalendarDays className="size-4 text-primary" /> {feedbacks.length} registro{feedbacks.length === 1 ? "" : "s"}
          </div>
        </section>

        {loading && <div className="rounded-2xl border border-border/70 bg-card/60 p-10 text-center text-sm text-muted-foreground">Carregando feedbacks...</div>}

        {!loading && feedbacks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
            <Inbox className="mb-3 size-10 text-muted-foreground/50" />
            <h2 className="text-base font-semibold text-foreground">Nenhum feedback encontrado</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">Quando uma unidade enviar o formulário, o registro aparecerá aqui.</p>
          </div>
        )}

        {!loading && feedbacks.length > 0 && (
          <div className="space-y-3">
            {feedbacks.map((feedback) => {
              const expanded = expandedId === feedback.id;
              return (
                <article key={feedback.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-sm">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : feedback.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20 md:px-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-semibold text-primary">{feedback.unit.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="truncate text-sm font-semibold text-foreground">{feedback.unit}</h2>
                        <span className="text-xs text-muted-foreground">Semana de {formatDate(feedback.weekStart)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{feedback.responsible} · {feedback.submittedByEmail || "utilizador autenticado"}</p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{feedback.totalLeads} leads</span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">{feedback.salesClosed} vendas</span>
                    </div>
                    {expanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="space-y-5 border-t border-border/60 px-4 py-5 md:px-5">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <NumberMetric label="Leads recebidos" value={feedback.totalLeads} />
                        <NumberMetric label="Respondidos" value={feedback.leadsAnswered} />
                        <NumberMetric label="Sem retorno" value={feedback.leadsNoAnswer} />
                        <NumberMetric label="Vendas fechadas" value={feedback.salesClosed} />
                      </div>
                      <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Origem dos leads</h3>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                          <NumberMetric label="Cartão" value={feedback.leadsCard} />
                          <NumberMetric label="Consulta" value={feedback.leadsConsultation} />
                          <NumberMetric label="Odontologia" value={feedback.leadsDentistry} />
                          <NumberMetric label="Empresarial" value={feedback.leadsBusinessPJ} />
                          <NumberMetric label="Fora da área" value={feedback.leadsOutOfArea} />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-border/60 bg-background/30 p-4"><h3 className="text-xs font-semibold text-foreground">Motivo principal</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{feedback.mainReason || "Não informado"}</p></div>
                        <div className="rounded-xl border border-border/60 bg-background/30 p-4"><h3 className="text-xs font-semibold text-foreground">Criativo ou anúncio</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{feedback.creativeFeedback || "Não informado"}</p></div>
                        <div className="rounded-xl border border-border/60 bg-background/30 p-4"><h3 className="text-xs font-semibold text-foreground">Suporte solicitado</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{feedback.supportNeeded || "Não informado"}</p></div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/30 p-4"><h3 className="text-xs font-semibold text-foreground">Observações gerais</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{feedback.generalObservations || "Não informado"}</p></div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
