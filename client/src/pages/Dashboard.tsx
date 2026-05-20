import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth, getToken } from "@/hooks/useAdminAuth";
import { LogOut, Users, BarChart2, ExternalLink, ChevronRight, TrendingUp, DollarSign, Activity } from "lucide-react";

interface Client {
  id: number;
  name: string;
  city: string;
  state: string;
  status: string;
  plan: string;
  startDate: string;
  monthlyBudget: number;
  contact: string;
  phone: string;
  email: string;
  lpUrl: string;
  notes: string;
}

interface Campaign {
  name: string;
  platform: string;
  status: string;
  budget: number;
}

interface ClientDetail extends Client {
  campaigns: Campaign[];
}

export default function Dashboard() {
  const { user, loading, logout } = useAdminAuth();
  const [, navigate] = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<"clients" | "overview">("overview");

  useEffect(() => {
    if (!loading && user) {
      const token = getToken();
      fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setClients(data))
        .finally(() => setClientsLoading(false));
    }
  }, [loading, user]);

  async function loadClient(id: number) {
    const token = getToken();
    const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSelected(data);
    setActiveSection("clients");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const totalBudget = clients.reduce((s, c) => s + c.monthlyBudget, 0);
  const activeClients = clients.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? "240px" : "64px",
          background: "rgba(255,255,255,0.03)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          minHeight: "100vh",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: "64px" }}>
          {sidebarOpen ? (
            <img
              src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp"
              alt="Tráfego Pro"
              style={{ height: "18px", width: "auto" }}
            />
          ) : (
            <span className="text-white text-xs font-bold">TP</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          <button
            onClick={() => { setActiveSection("overview"); setSelected(null); }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
            style={{
              background: activeSection === "overview" ? "rgba(255,255,255,0.08)" : "transparent",
              color: activeSection === "overview" ? "#fff" : "rgba(255,255,255,0.45)",
            }}
          >
            <BarChart2 size={16} />
            {sidebarOpen && <span className="text-sm" style={{ fontWeight: 300 }}>Visão Geral</span>}
          </button>

          <button
            onClick={() => { setActiveSection("clients"); setSelected(null); }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
            style={{
              background: activeSection === "clients" ? "rgba(255,255,255,0.08)" : "transparent",
              color: activeSection === "clients" ? "#fff" : "rgba(255,255,255,0.45)",
            }}
          >
            <Users size={16} />
            {sidebarOpen && <span className="text-sm" style={{ fontWeight: 300 }}>Clientes</span>}
          </button>
        </nav>

        {/* User + Logout */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {sidebarOpen && (
            <p className="text-xs text-gray-600 px-3 mb-2 truncate" style={{ fontWeight: 300 }}>
              {user.email}
            </p>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full text-left transition-all"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#fff")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)")}
          >
            <LogOut size={16} />
            {sidebarOpen && <span className="text-sm" style={{ fontWeight: 300 }}>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-auto">
        {/* Topbar */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: "64px" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-current" />
              <div className="w-4 h-0.5 bg-current" />
              <div className="w-4 h-0.5 bg-current" />
            </div>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm" style={{ fontWeight: 100 }}>
              Olá, {user.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Overview */}
          {activeSection === "overview" && !selected && (
            <div>
              <h1
                className="text-white text-3xl mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
              >
                Visão Geral
              </h1>
              <p className="text-gray-600 text-sm mb-8" style={{ fontWeight: 100 }}>
                Resumo de todos os clientes e campanhas ativas.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Clientes Ativos", value: activeClients, icon: <Users size={18} />, suffix: "" },
                  { label: "Investimento Mensal", value: `R$ ${totalBudget.toLocaleString("pt-BR")}`, icon: <DollarSign size={18} />, suffix: "" },
                  { label: "Campanhas Rodando", value: "8", icon: <Activity size={18} />, suffix: "" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-600 text-xs uppercase tracking-widest" style={{ fontWeight: 300 }}>
                        {stat.label}
                      </span>
                      <span className="text-gray-700">{stat.icon}</span>
                    </div>
                    <p className="text-white text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick access clients */}
              <h2 className="text-white text-lg mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>
                Clientes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadClient(c.id)}
                    className="rounded-xl p-5 text-left transition-all group"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-white text-base"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
                      >
                        {c.name}
                      </span>
                      <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-gray-600 text-xs mb-3" style={{ fontWeight: 100 }}>
                      {c.city}, {c.state} · {c.plan}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: c.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)",
                          color: c.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)",
                          fontWeight: 300,
                        }}
                      >
                        {c.status === "active" ? "Ativo" : "Pausado"}
                      </span>
                      <span className="text-gray-600 text-xs" style={{ fontWeight: 100 }}>
                        R$ {c.monthlyBudget.toLocaleString("pt-BR")}/mês
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clients list */}
          {activeSection === "clients" && !selected && (
            <div>
              <h1
                className="text-white text-3xl mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
              >
                Clientes
              </h1>
              <p className="text-gray-600 text-sm mb-8" style={{ fontWeight: 100 }}>
                Gerencie todos os clientes e suas campanhas.
              </p>

              {clientsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => loadClient(c.id)}
                      className="rounded-xl p-5 text-left transition-all group flex items-center justify-between"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)")}
                    >
                      <div>
                        <p
                          className="text-white text-base mb-1"
                          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
                        >
                          {c.name}
                        </p>
                        <p className="text-gray-600 text-xs" style={{ fontWeight: 100 }}>
                          {c.city}, {c.state} · {c.plan} · R$ {c.monthlyBudget.toLocaleString("pt-BR")}/mês
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: c.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)",
                            color: c.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)",
                            fontWeight: 300,
                          }}
                        >
                          {c.status === "active" ? "Ativo" : "Pausado"}
                        </span>
                        <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Client detail */}
          {selected && (
            <div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-600 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors"
                style={{ fontWeight: 300 }}
              >
                ← Voltar
              </button>

              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1
                    className="text-white text-3xl mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
                  >
                    {selected.name}
                  </h1>
                  <p className="text-gray-600 text-sm" style={{ fontWeight: 100 }}>
                    {selected.city}, {selected.state} · Desde {new Date(selected.startDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <a
                  href={selected.lpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm rounded-lg px-4 py-2 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 300,
                  }}
                >
                  <ExternalLink size={14} />
                  Ver LP
                </a>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Investimento Mensal", value: `R$ ${selected.monthlyBudget.toLocaleString("pt-BR")}` },
                  { label: "Plano", value: selected.plan },
                  { label: "Status", value: selected.status === "active" ? "Ativo" : "Pausado" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-gray-600 text-xs uppercase tracking-widest mb-2" style={{ fontWeight: 300 }}>
                      {item.label}
                    </p>
                    <p className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-gray-600 text-xs uppercase tracking-widest mb-2" style={{ fontWeight: 300 }}>
                  Observações Estratégicas
                </p>
                <p className="text-gray-300 text-sm leading-relaxed" style={{ fontWeight: 100 }}>
                  {selected.notes}
                </p>
              </div>

              {/* Campaigns */}
              <h2
                className="text-white text-lg mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
              >
                Campanhas
              </h2>
              <div className="flex flex-col gap-2">
                {selected.campaigns.map((camp, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div>
                      <p className="text-white text-sm mb-0.5" style={{ fontWeight: 300 }}>
                        {camp.name}
                      </p>
                      <p className="text-gray-600 text-xs" style={{ fontWeight: 100 }}>
                        {camp.platform}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm" style={{ fontWeight: 100 }}>
                        R$ {camp.budget.toLocaleString("pt-BR")}/mês
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: camp.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)",
                          color: camp.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)",
                          fontWeight: 300,
                        }}
                      >
                        {camp.status === "active" ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div
                className="rounded-xl p-5 mt-6"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-gray-600 text-xs uppercase tracking-widest mb-3" style={{ fontWeight: 300 }}>
                  Contato
                </p>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm" style={{ fontWeight: 300 }}>{selected.contact}</p>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 100 }}>{selected.phone}</p>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 100 }}>{selected.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
