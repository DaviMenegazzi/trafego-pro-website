import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Activity, ArrowLeft, Bot, CheckCircle2, ChevronRight, CircleAlert, Clock3, Database, RefreshCw, ShieldCheck, Signal, UsersRound, Webhook } from "lucide-react";
import { canAccessEvolutionPanel } from "@/lib/evolutionAdminPolicy";

type Summary = { totalLeads: number; pendingLeads: number; qualifiedLeads: number; closedLeads: number; eventsToday: number };
type Instance = { instanceName: string; displayName: string | null; unitName: string | null; connectionStatus: string; lastEventAt: string | null; lastMessageAt: string | null };
type EventItem = { id: number; instanceName: string; eventType: string; direction: string; messageType: string | null; messagePreview: string | null; occurredAt: string | null; receivedAt: string };
type Lead = { id: number; instanceName: string; phoneLast4: string | null; contactName: string | null; classification: "pendente" | "lead" | "nao_lead"; funnelStage: "novo" | "qualificado" | "negociacao" | "perdido" | "fechado"; classificationNote: string | null; firstContactAt: string; lastMessageAt: string; messagesReceived: number; messagesSent: number; classifiedByEmail: string | null; classifiedAt: string | null };
type Overview = { summary: Summary; instances: Instance[]; events: EventItem[]; leads: Lead[] };

const stages: Array<{ value: Lead["funnelStage"]; label: string }> = [
  { value: "novo", label: "Novo" }, { value: "qualificado", label: "Qualificado" },
  { value: "negociacao", label: "Negociação" }, { value: "perdido", label: "Perdido" }, { value: "fechado", label: "Fechado" },
];

const emptyOverview: Overview = {
  summary: { totalLeads: 0, pendingLeads: 0, qualifiedLeads: 0, closedLeads: 0, eventsToday: 0 }, instances: [], events: [], leads: [],
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: string): string {
  if (status === "open" || status === "connected") return "bg-emerald-400/12 text-emerald-300 border-emerald-400/20";
  if (status === "close" || status === "disconnected") return "bg-rose-400/12 text-rose-300 border-rose-400/20";
  return "bg-white/6 text-zinc-400 border-white/10";
}

function classificationLabel(value: Lead["classification"]): string {
  return value === "lead" ? "Lead" : value === "nao_lead" ? "Não lead" : "Pendente";
}

export default function EvolutionAdmin() {
  const [, navigate] = useLocation();
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLead, setUpdatingLead] = useState<number | null>(null);
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("tp_token"), []);
  const webhookUrl = useMemo(() => `${window.location.origin}/api/evolution/webhook`, []);

  const requestHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("tp_token") ?? ""}`, "Content-Type": "application/json" }), []);

  const loadOverview = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/evolution/overview", { headers: requestHeaders() });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("tp_token");
        localStorage.removeItem("tp_user");
        navigate("/login");
        return;
      }
      const data = await response.json() as Overview | { error?: string };
      if (!response.ok || !("summary" in data)) throw new Error("error" in data ? data.error : "Não foi possível carregar o painel");
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o painel Evolution");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, requestHeaders]);

  useEffect(() => {
    const storedUser = localStorage.getItem("tp_user");
    if (!canAccessEvolutionPanel(token, storedUser)) {
      navigate("/login");
      return;
    }
    loadOverview();
  }, [loadOverview, navigate, token]);

  async function updateLead(lead: Lead, classification: Lead["classification"], funnelStage: Lead["funnelStage"]) {
    setUpdatingLead(lead.id);
    setError("");
    try {
      const response = await fetch(`/api/evolution/leads/${lead.id}`, {
        method: "PUT", headers: requestHeaders(), body: JSON.stringify({ classification, funnelStage }),
      });
      const data = await response.json() as Lead | { error?: string };
      if (!response.ok || !("id" in data)) throw new Error("error" in data ? data.error : "Não foi possível atualizar o lead");
      setOverview((current) => ({ ...current, leads: current.leads.map((item) => item.id === data.id ? data : item) }));
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o lead");
    } finally {
      setUpdatingLead(null);
    }
  }

  const metrics = [
    { label: "Eventos hoje", value: overview.summary.eventsToday, icon: Activity, color: "text-cyan-300", bg: "bg-cyan-400/10" },
    { label: "Contatos rastreados", value: overview.summary.totalLeads, icon: UsersRound, color: "text-indigo-300", bg: "bg-indigo-400/10" },
    { label: "A validar", value: overview.summary.pendingLeads, icon: CircleAlert, color: "text-amber-300", bg: "bg-amber-400/10" },
    { label: "Fechados", value: overview.summary.closedLeads, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-400/10" },
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#090a0b] grid place-items-center text-zinc-400" style={{ fontFamily: "Inter, sans-serif" }}><RefreshCw className="h-5 w-5 animate-spin" /><span className="sr-only">Carregando painel Evolution</span></div>;
  }

  return (
    <main className="min-h-screen bg-[#090a0b] text-zinc-100 selection:bg-cyan-300/30" style={{ fontFamily: "Inter, sans-serif", fontWeight: 300 }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/8 blur-[120px]" />
        <div className="absolute bottom-[-16rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/8 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-[1480px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.12)]"><Signal className="h-5 w-5" /></div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[.24em] text-cyan-300">Módulo isolado · administrativo</p>
              <h1 className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.04em] text-white sm:text-4xl">Evolution Monitor</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Eventos de mensagens, contatos e classificação comercial. Este ambiente não participa das métricas nem dos fluxos da dashboard atual.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-white/[.06] hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Voltar à dashboard</button>
            <button onClick={() => loadOverview(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3.5 py-2.5 text-xs font-medium text-[#082124] transition hover:bg-cyan-200 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Atualizar dados</button>
          </div>
        </header>

        {error && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon, color, bg }) => <article key={label} className="rounded-2xl border border-white/8 bg-white/[.025] p-5 shadow-2xl shadow-black/10"><div className="mb-5 flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className={`grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}><Icon className="h-4 w-4" /></span></div><strong className="font-['Space_Grotesk'] text-3xl font-light tracking-[-.05em] text-white">{value}</strong></article>)}
        </section>

        <section className="mb-8 grid gap-5 xl:grid-cols-[1.5fr_.9fr]">
          <article className="rounded-2xl border border-white/8 bg-white/[.025] p-6">
            <div className="mb-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Conexões</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Instâncias monitoradas</h2></div><Database className="h-5 w-5 text-zinc-600" /></div>
            {overview.instances.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-9 text-center"><Signal className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Nenhuma instância enviou eventos ainda.</p><p className="mt-1 text-xs text-zinc-600">A primeira chamada autenticada do webhook criará a instância aqui.</p></div> : <div className="divide-y divide-white/7">{overview.instances.map((instance) => <div key={instance.instanceName} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="text-sm text-zinc-100">{instance.displayName || instance.instanceName}</p><p className="mt-1 text-xs text-zinc-600">{instance.unitName || instance.instanceName} · última mensagem {formatDate(instance.lastMessageAt)}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.14em] ${statusClass(instance.connectionStatus)}`}>{instance.connectionStatus}</span></div>)}</div>}
          </article>
          <aside className="rounded-2xl border border-cyan-300/12 bg-gradient-to-br from-cyan-400/[.10] to-indigo-500/[.06] p-6">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300 text-[#082124]"><Webhook className="h-4 w-4" /></span><div><p className="text-xs uppercase tracking-[.18em] text-cyan-200/70">Conexão segura</p><h2 className="font-['Space_Grotesk'] text-lg font-light text-white">Endpoint do webhook</h2></div></div>
            <code className="block break-all rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-cyan-100">{webhookUrl}</code>
            <div className="mt-4 space-y-2 text-xs leading-5 text-zinc-400"><p className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />Configure o header <code className="text-zinc-200">Authorization: Bearer …</code> na instância Evolution.</p><p className="flex gap-2"><Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />Ative inicialmente <code className="text-zinc-200">MESSAGES_UPSERT</code> e <code className="text-zinc-200">CONNECTION_UPDATE</code>.</p></div>
          </aside>
        </section>

        <section className="mb-8 rounded-2xl border border-white/8 bg-white/[.025] p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Triagem comercial</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Contatos recebidos</h2></div><span className="text-xs text-zinc-600">Apenas dados mínimos para classificar o contato</span></div>
          {overview.leads.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><UsersRound className="mx-auto mb-3 h-5 w-5 text-zinc-600" /><p className="text-sm text-zinc-400">Os contatos aparecerão após a primeira mensagem recebida.</p></div> : <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead className="border-b border-white/8 text-[10px] uppercase tracking-[.16em] text-zinc-600"><tr><th className="pb-3 font-medium">Contato</th><th className="pb-3 font-medium">Instância</th><th className="pb-3 font-medium">Mensagens</th><th className="pb-3 font-medium">Classificação</th><th className="pb-3 font-medium">Etapa</th><th className="pb-3 text-right font-medium">Ação</th></tr></thead><tbody className="divide-y divide-white/7">{overview.leads.map((lead) => <tr key={lead.id}><td className="py-4"><p className="text-sm text-zinc-100">{lead.contactName || "Contato sem nome"}</p><p className="mt-1 text-xs text-zinc-600">•••• {lead.phoneLast4 || "—"} · {formatDate(lead.lastMessageAt)}</p></td><td className="py-4 text-xs text-zinc-400">{lead.instanceName}</td><td className="py-4 text-xs text-zinc-400"><span className="text-cyan-200">{lead.messagesReceived} recebidas</span><span className="mx-1 text-zinc-700">/</span>{lead.messagesSent} enviadas</td><td className="py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[.12em] ${lead.classification === "lead" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : lead.classification === "nao_lead" ? "border-zinc-500/20 bg-zinc-400/10 text-zinc-400" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{classificationLabel(lead.classification)}</span></td><td className="py-4"><select aria-label={`Etapa de ${lead.contactName || "contato"}`} value={lead.funnelStage} onChange={(event) => updateLead(lead, lead.classification, event.target.value as Lead["funnelStage"])} disabled={updatingLead === lead.id} className="rounded-lg border border-white/10 bg-[#101214] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-300/50 disabled:opacity-60">{stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></td><td className="py-4 text-right"><div className="inline-flex overflow-hidden rounded-lg border border-white/10"><button onClick={() => updateLead(lead, "lead", lead.funnelStage === "novo" ? "qualificado" : lead.funnelStage)} disabled={updatingLead === lead.id} className="border-r border-white/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-60">É lead</button><button onClick={() => updateLead(lead, "nao_lead", "perdido")} disabled={updatingLead === lead.id} className="px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 disabled:opacity-60">Não lead</button></div></td></tr>)}</tbody></table></div>}
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[.025] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-zinc-600">Auditoria</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Eventos recentes</h2></div><Clock3 className="h-5 w-5 text-zinc-600" /></div>{overview.events.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-zinc-500">Ainda não há eventos recebidos pelo webhook.</p> : <div className="divide-y divide-white/7">{overview.events.map((event) => <div key={event.id} className="grid gap-2 py-4 md:grid-cols-[180px_150px_1fr_130px]"><div><p className="text-xs text-zinc-300">{event.instanceName}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-zinc-600">{event.direction}</p></div><span className="self-start rounded-md bg-white/[.05] px-2 py-1 text-[10px] font-medium text-zinc-400">{event.eventType}</span><p className="truncate text-sm text-zinc-400">{event.messagePreview || "Evento do sistema — sem conteúdo de mensagem"}</p><time className="text-xs text-zinc-600 md:text-right">{formatDate(event.occurredAt || event.receivedAt)}</time></div>)}</div>}</section>
        <footer className="flex items-center justify-end gap-1 pt-7 text-xs text-zinc-700">Painel administrativo isolado <ChevronRight className="h-3 w-3" /> Evolution</footer>
      </div>
    </main>
  );
}
