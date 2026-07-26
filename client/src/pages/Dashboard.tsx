import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download, RefreshCw, ChevronDown } from "lucide-react";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) setLocation("/login");
  }, [setLocation]);
}

// ─── Dados de performance (Vida Card | Canela) ────────────────────────────────
// KPIs e tabela refletem o Performance Hub. A série diária é ilustrativa e será
// substituída pelos dados reais ao sincronizar com a Meta.
const KPIS = [
  { label: "Investimento total", value: "R$ 1.403,58" },
  { label: "Conversas iniciadas", value: "230" },
  { label: "Custo por conversa", value: "R$ 6,10" },
  { label: "Primeiras respostas", value: "145" },
  { label: "Leads Meta", value: "1" },
  { label: "Impressões", value: "205.456" },
  { label: "Cliques", value: "2.116" },
  { label: "CTR", value: "1,10%" },
  { label: "CPC", value: "R$ 0,78" },
  { label: "CPM", value: "R$ 8,43" },
  { label: "Frequência", value: "1,68" },
];

const FUNNEL = [
  { label: "Conexões por mensagem", value: 230 },
  { label: "Conversas iniciadas", value: 230 },
  { label: "Primeiras respostas", value: 145 },
  { label: "Conversas respondidas", value: 145 },
];

const CAMPAIGNS = [
  {
    name: "[TP] - [ENG] - [WHATS] - [CARTÃO] - [MAIO/26]",
    invest: "R$ 1.117,77", conversas: 212, custo: "R$ 5,27", leads: 0,
    impressoes: "179.701", cliques: "1.804", ctr: "1,00%", cpc: "R$ 0,62", cpm: "R$ 6,22",
    status: "Positivo",
  },
  {
    name: "[TP] - [ENG] - [WHATS] - [EMPRESARIAL] - [JUNHO/26]",
    invest: "R$ 285,81", conversas: 18, custo: "R$ 15,88", leads: 1,
    impressoes: "25.755", cliques: "312", ctr: "1,21%", cpc: "R$ 0,92", cpm: "R$ 11,10",
    status: "Crítico",
  },
];

const daily = [
  { d: "30/06", conversas: 4, investimento: 42, custo: 10.5 },
  { d: "01/07", conversas: 9, investimento: 58, custo: 6.4 },
  { d: "02/07", conversas: 12, investimento: 61, custo: 5.1 },
  { d: "03/07", conversas: 8, investimento: 47, custo: 5.9 },
  { d: "04/07", conversas: 15, investimento: 66, custo: 4.4 },
  { d: "05/07", conversas: 6, investimento: 39, custo: 6.5 },
  { d: "06/07", conversas: 5, investimento: 33, custo: 6.6 },
  { d: "07/07", conversas: 14, investimento: 70, custo: 5.0 },
  { d: "08/07", conversas: 18, investimento: 82, custo: 4.6 },
  { d: "09/07", conversas: 11, investimento: 54, custo: 4.9 },
  { d: "10/07", conversas: 22, investimento: 96, custo: 4.4 },
  { d: "11/07", conversas: 13, investimento: 60, custo: 4.6 },
  { d: "12/07", conversas: 7, investimento: 41, custo: 5.9 },
  { d: "13/07", conversas: 6, investimento: 35, custo: 5.8 },
  { d: "14/07", conversas: 16, investimento: 74, custo: 4.6 },
  { d: "15/07", conversas: 12, investimento: 58, custo: 4.8 },
  { d: "16/07", conversas: 9, investimento: 49, custo: 5.4 },
  { d: "17/07", conversas: 10, investimento: 52, custo: 5.2 },
  { d: "18/07", conversas: 8, investimento: 44, custo: 5.5 },
  { d: "19/07", conversas: 5, investimento: 31, custo: 6.2 },
  { d: "20/07", conversas: 7, investimento: 38, custo: 5.4 },
  { d: "23/07", conversas: 6, investimento: 40, custo: 6.7 },
];

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  fontSize: 12,
  color: "var(--color-foreground)",
};
const axisTick = { fontSize: 11, fill: "var(--color-muted-foreground)" };

const STATUS: Record<string, string> = {
  Positivo: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  Atenção: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  Crítico: "bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]",
};

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border/70">
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Dashboard"; }, []);

  const [period, setPeriod] = useState("30");
  const [campaign, setCampaign] = useState("all");

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vida Card | Canela</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em]">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Visão geral da performance de mídia.</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          <div className="relative">
            <select value={campaign} onChange={(e) => setCampaign(e.target.value)}
              className="appearance-none text-sm rounded-full border border-border bg-surface/60 px-4 py-2.5 pr-9 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">Todas as campanhas</option>
              {CAMPAIGNS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface transition-colors">
            <Download className="size-4" /> Baixar dados
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
            <RefreshCw className="size-4" /> Atualizar dados
          </button>
          <span className="text-xs text-muted-foreground">Última atualização: ainda não sincronizado nesta sessão</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-border border border-border rounded-3xl overflow-hidden">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-background p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{k.label}</div>
              <div className="mt-3 font-display text-2xl md:text-[1.7rem] font-semibold tracking-[-0.02em]">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground/60">Sem período anterior</div>
            </div>
          ))}
        </div>

        {/* Gráficos linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Conversas iniciadas por dia">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="conversas" stroke="var(--color-foreground)" strokeWidth={2} dot={false} name="Conversas" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Investimento x Conversas">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval={2} />
                <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line yAxisId="l" type="monotone" dataKey="investimento" stroke="var(--color-foreground)" strokeWidth={2} dot={false} name="Investimento (R$)" />
                <Line yAxisId="r" type="monotone" dataKey="conversas" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="4 3" dot={false} name="Conversas" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Gráficos linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Custo por conversa" note="R$ por conversa iniciada">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Line type="monotone" dataKey="custo" stroke="var(--color-foreground)" strokeWidth={2} dot={false} name="Custo/conversa" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {/* Funil de mensagens */}
          <Panel title="Funil de mensagens">
            <div className="space-y-5">
              {FUNNEL.map((f) => {
                const pct = Math.round((f.value / FUNNEL[0].value) * 100);
                return (
                  <div key={f.label}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">{f.label}</span>
                      <span className="font-display text-lg font-semibold tracking-[-0.01em]">{f.value}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/80" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Desempenho por campanha */}
        <Panel title="Desempenho por campanha" note="Resultados por campanha no período selecionado">
          <div className="overflow-x-auto -m-2 p-2">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-3 pr-4">Campanha</th>
                  <th className="text-right font-medium py-3 px-3">Investimento</th>
                  <th className="text-right font-medium py-3 px-3">Conversas</th>
                  <th className="text-right font-medium py-3 px-3">Custo/conversa</th>
                  <th className="text-right font-medium py-3 px-3">Leads Meta</th>
                  <th className="text-right font-medium py-3 px-3">Impressões</th>
                  <th className="text-right font-medium py-3 px-3">Cliques</th>
                  <th className="text-right font-medium py-3 px-3">CTR</th>
                  <th className="text-right font-medium py-3 px-3">CPC</th>
                  <th className="text-right font-medium py-3 px-3">CPM</th>
                  <th className="text-right font-medium py-3 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-surface/40 transition-colors">
                    <td className="py-3 pr-4 font-medium max-w-[280px]">{c.name}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.invest}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.conversas}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.custo}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.leads}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.impressoes}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.cliques}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.ctr}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.cpc}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{c.cpm}</td>
                    <td className="py-3 pl-3 text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS[c.status] ?? "bg-surface-2 text-muted-foreground"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/70">
            Série diária dos gráficos é ilustrativa — substituída pelos dados reais ao sincronizar com a Meta.
          </p>
        </Panel>
      </div>
    </AppLayout>
  );
}
