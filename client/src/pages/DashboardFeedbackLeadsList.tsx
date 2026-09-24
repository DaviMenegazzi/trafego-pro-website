import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, FileSpreadsheet, Handshake, Inbox, Percent, Plus, RefreshCw, Star, Users } from "lucide-react";
import { Button, DateRangePicker, EmptyState, IconButton, MenuButton, Page, PageHeader, Select, Sheet, StatTile, Surface } from "@/components/ds";
import { cn } from "@/lib/utils";

/** Nota 1–5 com cor pela faixa (o número continua escrito). */
function Rating({ value }: { value: number }) {
  if (!value) return <span className="text-zinc-600">—</span>;
  const tone = value >= 4 ? "bg-emerald-500/12 text-emerald-300" : value === 3 ? "bg-white/[0.06] text-zinc-300" : "bg-rose-500/12 text-rose-300";
  return <span className={cn("inline-flex min-w-[2.5rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", tone)}>{value}/5</span>;
}
import { formatDate, formatDateRange, formatDateTime, formatNumber, formatRatio } from "@/lib/format";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

type Feedback = {
  id: number;
  unit: string;
  responsible: string;
  weekStart: string;
  weekEnd: string;
  totalLeads: number;
  leadsContacted: number;
  leadsResponded: number;
  leadsConverted: number;
  leadsLost: number;
  leadsInNegotiation: number;
  lossReason: string;
  leadQuality: number;
  observations: string;
  agencySatisfaction: number;
  communicationClarity: string;
  agencyAdjustment: string;
  submittedAt: string;
  submittedByEmail: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("tp_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function useAdminGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) { setLocation("/login"); return; }
    try {
      if (JSON.parse(localStorage.getItem("tp_user") ?? "{}").role !== "admin") setLocation("/dashboard");
    } catch { setLocation("/login"); }
  }, [setLocation]);
}

export default function DashboardFeedbackLeadsList() {
  useAdminGuard();
  const [, setLocation] = useLocation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [unit, setUnit] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { document.title = "Tráfego Pro — Feedbacks de Leads"; }, []);
  const units = useMemo(() => Array.from(new Set(feedbacks.map((item) => item.unit))).sort((a, b) => a.localeCompare(b, "pt-BR")), [feedbacks]);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unit) params.set("unit", unit);
      if (weekStart) params.set("weekStart", weekStart);
      if (weekEnd) params.set("weekEnd", weekEnd);
      const response = await fetch(`/api/feedback-leads${params.size ? `?${params}` : ""}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (response.status === 401) { setLocation("/login"); return; }
      if (response.status === 403) { toast.error("Esta aba é exclusiva para administradores."); setLocation("/dashboard"); return; }
      if (!response.ok) throw new Error("Falha ao carregar feedbacks");
      setFeedbacks(await response.json());
    } catch { toast.error("Não foi possível carregar os feedbacks armazenados."); }
    finally { setLoading(false); }
  }, [setLocation, unit, weekEnd, weekStart]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const exportAll = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/feedback-leads/export", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (response.status === 401) { setLocation("/login"); return; }
      if (response.status === 403) { toast.error("A exportação é exclusiva para administradores."); setLocation("/dashboard"); return; }
      if (!response.ok) throw new Error("Falha ao exportar");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "feedbacks-semanais-completo.xlsx"; link.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação completa iniciada.");
    } catch { toast.error("Não foi possível exportar os feedbacks."); }
    finally { setExporting(false); }
  };

  const open = feedbacks.find((f) => f.id === openId) ?? null;

  // Resumo dos registros filtrados: o que a tabela diz, em quatro números.
  const summary = useMemo(() => {
    const received = feedbacks.reduce((a, f) => a + (f.totalLeads || 0), 0);
    const closed = feedbacks.reduce((a, f) => a + (f.leadsConverted || 0), 0);
    const avg = (pick: (f: Feedback) => number) => {
      const vals = feedbacks.map(pick).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return { received, closed, rate: received > 0 ? closed / received : 0, quality: avg((f) => f.leadQuality), satisfaction: avg((f) => f.agencySatisfaction) };
  }, [feedbacks]);

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Feedbacks enviados"
          subtitle="Retornos semanais das unidades sobre leads e sobre a entrega da agência."
          actions={
            <>
              <IconButton label="Atualizar" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={() => void fetchFeedbacks()} disabled={loading} />
              <MenuButton
                label="Exportar"
                icon={<Download />}
                disabled={exporting}
                items={[{ label: exporting ? "Preparando planilha…" : "Planilha com todos os feedbacks", hint: "Todas as unidades e semanas", icon: <FileSpreadsheet />, onSelect: () => void exportAll() }]}
              />
              <Button variant="primary" onClick={() => setLocation("/dashboard/feedback-leads")}>
                <Plus />
                Novo feedback
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Unidade"
              value={unit}
              onValueChange={setUnit}
              className="w-60"
              options={[{ value: "", label: "Todas as unidades" }, ...units.map((item) => ({ value: item, label: item }))]}
              placeholder="Todas as unidades"
            />
            <DateRangePicker
              aria-label="Semanas"
              value={{ start: weekStart, end: weekEnd }}
              onChange={(range) => { setWeekStart(range.start); setWeekEnd(range.end); }}
              placeholder="Todas as semanas"
              className="w-auto"
            />
            {(unit || weekStart || weekEnd) && (
              <Button variant="ghost" size="sm" onClick={() => { setUnit(""); setWeekStart(""); setWeekEnd(""); }}>Limpar filtros</Button>
            )}
            <span className="ml-auto text-sm text-zinc-400" aria-live="polite">{loading ? "Carregando…" : `${formatNumber(feedbacks.length)} ${feedbacks.length === 1 ? "registro" : "registros"}`}</span>
          </div>
        </PageHeader>

        {feedbacks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={<Users />} accent="aqua" label="Leads recebidos" value={formatNumber(summary.received)} hint={`em ${formatNumber(feedbacks.length)} feedbacks`} />
            <StatTile icon={<Handshake />} accent="brand" label="Fecharam" value={formatNumber(summary.closed)} hint={`${formatRatio(summary.rate)} de conversão`} />
            <StatTile icon={<Star />} accent="violet" label="Qualidade média dos leads" value={summary.quality ? `${formatNumber(summary.quality, 1)}/5` : "—"} hint="nota das unidades" />
            <StatTile icon={<Percent />} accent="blue" label="Satisfação com a agência" value={summary.satisfaction ? `${formatNumber(summary.satisfaction, 1)}/5` : "—"} hint="média das respostas" />
          </div>
        )}

        <Surface className="overflow-hidden">
          {loading && feedbacks.length === 0 ? (
            <EmptyState title="Carregando feedbacks…" />
          ) : feedbacks.length === 0 ? (
            <EmptyState icon={<Inbox />} title="Nenhum feedback encontrado" description="Quando uma unidade enviar o formulário semanal, ele aparece aqui." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Unidade</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Semana</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Responsável</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Recebidos</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Fecharam</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Conversão</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Qualidade</th>
                    <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">Satisfação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {feedbacks.map((feedback) => (
                    <tr key={feedback.id} className="whitespace-nowrap tabular-nums text-zinc-300 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 pl-5 pr-3">
                        <button type="button" onClick={() => setOpenId(feedback.id)} className="rounded-md text-left font-medium text-zinc-100 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                          {feedback.unit}
                        </button>
                      </td>
                      <td className="px-3 py-3">{formatDateRange(feedback.weekStart, feedback.weekEnd)}</td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-zinc-400">{feedback.responsible}</td>
                      <td className="px-3 py-3 text-right">{formatNumber(feedback.totalLeads)}</td>
                      <td className="px-3 py-3 text-right font-medium text-white">{formatNumber(feedback.leadsConverted)}</td>
                      <td className="px-3 py-3 text-right">
                        {feedback.totalLeads > 0 ? formatRatio(feedback.leadsConverted / feedback.totalLeads) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right"><Rating value={feedback.leadQuality} /></td>
                      <td className="py-3 pl-3 pr-5 text-right"><Rating value={feedback.agencySatisfaction} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </Page>

      <Sheet
        open={Boolean(open)}
        onOpenChange={(value) => { if (!value) setOpenId(null); }}
        title={open ? `${open.unit} · ${formatDateRange(open.weekStart, open.weekEnd)}` : "Feedback"}
        description={open ? `Enviado por ${open.responsible}${open.submittedByEmail ? ` (${open.submittedByEmail})` : ""} em ${formatDateTime(open.submittedAt)}` : undefined}
      >
        {open && <FeedbackDetail feedback={open} />}
      </Sheet>
    </AppLayout>
  );
}

function FeedbackDetail({ feedback }: { feedback: Feedback }) {
  const funnel = [
    { label: "Recebidos", value: feedback.totalLeads },
    { label: "Contatados", value: feedback.leadsContacted },
    { label: "Responderam", value: feedback.leadsResponded },
    { label: "Fecharam", value: feedback.leadsConverted },
  ];
  const max = Math.max(1, feedback.totalLeads);
  const texts: [string, string][] = [
    ["Motivo principal de perda", feedback.lossReason || "Não informado"],
    ["Qualidade dos leads", feedback.leadQuality ? `${feedback.leadQuality}/5` : "Não informado"],
    ["Satisfação com a agência", feedback.agencySatisfaction ? `${feedback.agencySatisfaction}/5` : "Não informado"],
    ["Comunicação clara", feedback.communicationClarity || "Não informado"],
    ["Observações", feedback.observations || "—"],
    ["Ajustes para a próxima semana", feedback.agencyAdjustment || "—"],
  ];
  return (
    <div className="space-y-6">
      <section aria-label="Funil da semana" className="space-y-2.5">
        {funnel.map((step) => (
          <div key={step.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="text-zinc-400">{step.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="block h-full rounded-full bg-zinc-300" style={{ width: `${(step.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums text-white">{formatNumber(step.value)}</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-zinc-500">
          Perdidos: {formatNumber(feedback.leadsLost)} · Em negociação: {formatNumber(feedback.leadsInNegotiation)}
        </p>
      </section>
      <dl className="space-y-4 border-t border-white/[0.06] pt-5">
        {texts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-zinc-600">Semana de {formatDate(feedback.weekStart)} a {formatDate(feedback.weekEnd)}</p>
    </div>
  );
}
