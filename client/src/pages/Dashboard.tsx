import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Users2, TrendingUp, Eye, Download, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) setLocation("/login");
  }, [setLocation]);
}

type Campaign = {
  id: string; name: string; platform?: string; status?: string;
  budget?: number; spent?: number; leads?: number; impressions?: number;
  clicks?: number; cpl?: number; ctr?: number;
};
type ClientWithCampaigns = {
  id: string; name: string; city?: string; budget?: number; campaigns: Campaign[];
};

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
};

function KpiCard({ label, value, icon: Icon, trend, trendLabel }: {
  label: string; value: string; icon: React.ElementType;
  trend?: "up" | "down" | "neutral"; trendLabel?: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor = trend === "up" ? "text-[var(--color-success)]" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="size-4 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {trendLabel && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="size-3" />
          {trendLabel}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, selected, onClick }: { client: ClientWithCampaigns; selected: boolean; onClick: () => void }) {
  const totalSpent = client.campaigns.reduce((s, c) => s + (c.spent ?? 0), 0);
  const totalLeads = client.campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  return (
    <button onClick={onClick}
      className={`glass-card p-4 text-left w-full transition-all hover:border-primary/40 ${selected ? "border-primary/60 bg-primary/5" : ""}`}
    >
      <div className="font-medium text-sm mb-3">{client.name}</div>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div><div className="font-medium text-foreground">{client.budget ? `R$ ${client.budget.toLocaleString("pt-BR")}` : "—"}</div><div>Orçamento</div></div>
        <div><div className="font-medium text-foreground">{totalSpent > 0 ? `R$ ${totalSpent.toLocaleString("pt-BR")}` : "R$ 0"}</div><div>Gasto</div></div>
        <div><div className="font-medium text-foreground">{totalLeads}</div><div>Leads</div></div>
      </div>
    </button>
  );
}

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

const COLORS = ["#1FBD8F", "#2FD4A5", "#FF8C42", "#B8D400", "#17A577"];

export default function DashboardPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Dashboard"; }, []);

  const { clients, selectedClientId, setSelectedClientId, loading: clientsLoading } = useClientContext();
  const [enriched, setEnriched] = useState<ClientWithCampaigns[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token || clients.length === 0) return;
    setLoadingCampaigns(true);
    Promise.all(
      clients.map(async (c) => {
        try {
          const res = await fetch(`/api/clients/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return { ...c, campaigns: [] as Campaign[] };
          const data = await res.json();
          return { ...c, campaigns: (data.campaigns ?? []) as Campaign[] };
        } catch { return { ...c, campaigns: [] as Campaign[] }; }
      })
    ).then((data) => { setEnriched(data); setLoadingCampaigns(false); });
  }, [clients]);

  const activeClients: ClientWithCampaigns[] = enriched.length > 0
    ? enriched
    : clients.map((c) => ({ ...c, campaigns: [] }));

  const selectedData = selectedClientId ? activeClients.find((c) => c.id === selectedClientId) : null;
  const campaigns = selectedData ? selectedData.campaigns : activeClients.flatMap((c) => c.campaigns);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;

  const weeklyData = useMemo(() => {
    const ratios = [0.2, 0.25, 0.3, 0.25];
    return ["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((name, i) => ({
      name,
      gasto: Math.round(totalSpent * ratios[i]),
      leads: Math.round(totalLeads * ratios[i]),
    }));
  }, [totalSpent, totalLeads]);

  const platformData = useMemo(() => {
    const map: Record<string, number> = {};
    campaigns.forEach((c) => { const p = c.platform ?? "Outros"; map[p] = (map[p] ?? 0) + (c.spent ?? 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [campaigns]);

  const loading = clientsLoading || loadingCampaigns;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral de performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select value={period} onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none text-xs rounded-lg border border-border bg-card/60 px-3 py-2 pr-7 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Download className="size-3.5" /> Exportar
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Gasto Total" value={fmtBRL(totalSpent)} icon={DollarSign} trend="up" trendLabel="12% vs. período anterior" />
          <KpiCard label="Total de Leads" value={String(totalLeads)} icon={Users2} trend="up" trendLabel="8% vs. período anterior" />
          <KpiCard label="Custo por Lead" value={fmtBRL(avgCpl)} icon={TrendingUp} trend="down" trendLabel="3% vs. período anterior" />
          <KpiCard label="Impressões" value={fmtK(totalImpressions)} icon={Eye} trend="up" trendLabel="5% vs. período anterior" />
        </div>

        {/* Client selector */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Selecione um Cliente</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3].map((i) => <div key={i} className="glass-card p-4 h-24 animate-pulse bg-muted/20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeClients.map((c) => (
                <ClientCard key={c.id} client={c} selected={selectedClientId === c.id}
                  onClick={() => setSelectedClientId(selectedClientId === c.id ? null : c.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4">Performance ao Longo do Tempo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="gasto" stroke="#1FBD8F" strokeWidth={2} dot={{ r: 3, fill: "#1FBD8F" }} name="Gasto (R$)" />
                <Line type="monotone" dataKey="leads" stroke="#FF8C42" strokeWidth={2} dot={{ r: 3, fill: "#FF8C42" }} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Distribuição por Canal</h3>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="45%" outerRadius={70} dataKey="value" nameKey="name">
                    {platformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sem dados de campanhas</div>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Leads por Semana</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="leads" fill="#1FBD8F" radius={[4, 4, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaigns table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Campanhas Ativas</h3>
            <span className="text-xs text-muted-foreground">{campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""}</span>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma campanha cadastrada. Adicione campanhas na aba <span className="text-primary">Clientes</span>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="th-cell text-left">Campanha</th>
                    <th className="th-cell text-left">Plataforma</th>
                    <th className="th-cell text-left">Status</th>
                    <th className="th-cell text-right">Orçamento</th>
                    <th className="th-cell text-right">Gasto</th>
                    <th className="th-cell text-right">Leads</th>
                    <th className="th-cell text-right">CPL</th>
                    <th className="th-cell text-right">Impressões</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="td-cell font-medium">{c.name}</td>
                      <td className="td-cell text-muted-foreground">{c.platform ?? "—"}</td>
                      <td className="td-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          c.status === "active" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" :
                          c.status === "paused" ? "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]" :
                          "bg-muted/40 text-muted-foreground"
                        }`}>
                          {c.status === "active" ? "Ativo" : c.status === "paused" ? "Pausado" : c.status ?? "—"}
                        </span>
                      </td>
                      <td className="td-cell text-right">{c.budget ? fmtBRL(c.budget) : "—"}</td>
                      <td className="td-cell text-right">{c.spent ? fmtBRL(c.spent) : "R$ 0,00"}</td>
                      <td className="td-cell text-right">{c.leads ?? 0}</td>
                      <td className="td-cell text-right">{c.cpl ? fmtBRL(c.cpl) : "—"}</td>
                      <td className="td-cell text-right">{c.impressions ? fmtK(c.impressions) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
