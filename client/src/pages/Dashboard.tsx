import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAdminAuth, getToken } from "@/hooks/useAdminAuth";
import {
  LogOut, Users, BarChart2, ExternalLink, ChevronRight,
  DollarSign, Activity, Plus, Pencil, Trash2, Download,
  Upload, X, Check, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: number;
  clientId: number;
  name: string;
  platform: string;
  status: string;
  budget: number;
}

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

interface ClientDetail extends Client {
  campaigns: Campaign[];
}

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyClient = (): Omit<Client, "id"> => ({
  name: "", city: "", state: "", status: "active", plan: "",
  startDate: "", monthlyBudget: 0, contact: "", phone: "",
  email: "", lpUrl: "", notes: "",
});

const emptyCampaign = (): Omit<Campaign, "id" | "clientId"> => ({
  name: "", platform: "", status: "active", budget: 0,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.1)",
          maxHeight: "90vh",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Client Form ──────────────────────────────────────────────────────────────
function ClientForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<Client, "id">;
  onSave: (data: Omit<Client, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "monthlyBudget" ? Number(e.target.value) : e.target.value }));

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: 300,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.45)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 300,
    marginBottom: "6px",
    display: "block",
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      className="flex flex-col gap-4"
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Nome *</label>
          <input style={inputStyle} value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Cidade</label>
          <input style={inputStyle} value={form.city} onChange={set("city")} />
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <input style={inputStyle} value={form.state} onChange={set("state")} maxLength={2} placeholder="RS" />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Plano</label>
          <input style={inputStyle} value={form.plan} onChange={set("plan")} placeholder="Meta Ads + Google Ads" />
        </div>
        <div>
          <label style={labelStyle}>Data de Início</label>
          <input style={inputStyle} type="date" value={form.startDate} onChange={set("startDate")} />
        </div>
      </div>

      {/* Row 4 */}
      <div>
        <label style={labelStyle}>Orçamento Mensal (R$)</label>
        <input style={inputStyle} type="number" min={0} step={100} value={form.monthlyBudget} onChange={set("monthlyBudget")} />
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Contato</label>
          <input style={inputStyle} value={form.contact} onChange={set("contact")} />
        </div>
        <div>
          <label style={labelStyle}>Telefone</label>
          <input style={inputStyle} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} />
        </div>
      </div>

      {/* Row 6 */}
      <div>
        <label style={labelStyle}>URL da Landing Page</label>
        <input style={inputStyle} value={form.lpUrl} onChange={set("lpUrl")} placeholder="/tupancireta" />
      </div>

      {/* Row 7 */}
      <div>
        <label style={labelStyle}>Observações</label>
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
          value={form.notes}
          onChange={set("notes")}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontWeight: 300, border: "1px solid rgba(255,255,255,0.1)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all"
          style={{ background: "#fff", color: "#000", fontWeight: 400 }}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={14} />
          )}
          Salvar
        </button>
      </div>
    </form>
  );
}

// ─── Campaign Form ─────────────────────────────────────────────────────────────
function CampaignForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<Campaign, "id" | "clientId">;
  onSave: (data: Omit<Campaign, "id" | "clientId">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "budget" ? Number(e.target.value) : e.target.value }));

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: 300,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.45)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 300,
    marginBottom: "6px",
    display: "block",
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Nome da Campanha *</label>
          <input style={inputStyle} value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label style={labelStyle}>Plataforma</label>
          <select style={inputStyle} value={form.platform} onChange={set("platform")}>
            <option value="">Selecione</option>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="TikTok Ads">TikTok Ads</option>
            <option value="LinkedIn Ads">LinkedIn Ads</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            <option value="active">Ativa</option>
            <option value="paused">Pausada</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Orçamento (R$)</label>
          <input style={inputStyle} type="number" min={0} step={50} value={form.budget} onChange={set("budget")} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontWeight: 300, border: "1px solid rgba(255,255,255,0.1)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "#fff", color: "#000", fontWeight: 400 }}>
          {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
          Salvar
        </button>
      </div>
    </form>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title="Confirmar" onClose={onCancel}>
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-gray-300 text-sm" style={{ fontWeight: 300 }}>{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontWeight: 300, border: "1px solid rgba(255,255,255,0.1)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,60,60,0.8)", color: "#fff", fontWeight: 400 }}>
            Excluir
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
      style={{
        background: type === "success" ? "rgba(30,200,100,0.15)" : "rgba(255,60,60,0.15)",
        border: `1px solid ${type === "success" ? "rgba(30,200,100,0.3)" : "rgba(255,60,60,0.3)"}`,
        color: type === "success" ? "rgba(100,255,150,0.9)" : "rgba(255,130,130,0.9)",
        fontWeight: 300,
        backdropFilter: "blur(8px)",
      }}
    >
      {type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
      {message}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading, logout } = useAdminAuth();
  const [, navigate] = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<"clients" | "overview">("overview");

  // Modals
  const [showNewClient, setShowNewClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);

  // Saving states
  const [savingClient, setSavingClient] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  // ─── Load clients ────────────────────────────────────────────────────────
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await authFetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) loadClients();
  }, [loading, user]);

  async function loadClient(id: number) {
    const res = await authFetch(`/api/clients/${id}`);
    const data = await res.json();
    setSelected(data);
    setActiveSection("clients");
  }

  // ─── Client CRUD ─────────────────────────────────────────────────────────
  async function handleCreateClient(data: Omit<Client, "id">) {
    setSavingClient(true);
    try {
      const res = await authFetch("/api/clients", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadClients();
      setShowNewClient(false);
      showToast("Cliente criado com sucesso!");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSavingClient(false);
    }
  }

  async function handleUpdateClient(data: Omit<Client, "id">) {
    if (!editingClient) return;
    setSavingClient(true);
    try {
      const res = await authFetch(`/api/clients/${editingClient.id}`, { method: "PUT", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadClients();
      // Refresh detail if viewing this client
      if (selected?.id === editingClient.id) await loadClient(editingClient.id);
      setEditingClient(null);
      showToast("Cliente atualizado com sucesso!");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSavingClient(false);
    }
  }

  async function handleDeleteClient(id: number) {
    try {
      const res = await authFetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast((data as { error?: string }).error || "Erro ao excluir cliente.", "error");
        return;
      }
      await loadClients();
      if (selected?.id === id) setSelected(null);
      setDeletingClientId(null);
      showToast("Cliente excluído.");
    } catch {
      showToast("Erro ao excluir cliente.", "error");
    }
  }

  // ─── Campaign CRUD ────────────────────────────────────────────────────────
  async function handleCreateCampaign(data: Omit<Campaign, "id" | "clientId">) {
    if (!selected) return;
    setSavingCampaign(true);
    try {
      const res = await authFetch(`/api/clients/${selected.id}/campaigns`, { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadClient(selected.id);
      setShowNewCampaign(false);
      showToast("Campanha criada com sucesso!");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleUpdateCampaign(data: Omit<Campaign, "id" | "clientId">) {
    if (!editingCampaign || !selected) return;
    setSavingCampaign(true);
    try {
      const res = await authFetch(`/api/campaigns/${editingCampaign.id}`, { method: "PUT", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadClient(selected.id);
      setEditingCampaign(null);
      showToast("Campanha atualizada!");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDeleteCampaign(id: number) {
    if (!selected) return;
    try {
      const res = await authFetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast((data as { error?: string }).error || "Erro ao excluir campanha.", "error");
        return;
      }
      await loadClient(selected.id);
      setDeletingCampaignId(null);
      showToast("Campanha excluída.");
    } catch {
      showToast("Erro ao excluir campanha.", "error");
    }
  }

  // ─── Excel Export ─────────────────────────────────────────────────────────
  async function handleExport() {
    const token = getToken();
    const res = await fetch("/api/clients/export/excel", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast("Erro ao exportar.", "error"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes-trafego-pro.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Planilha exportada!");
  }

  // ─── Excel Import ─────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/clients/import/excel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) { showToast(result.error || "Erro ao importar.", "error"); return; }
      setImportResult(result);
      await loadClients();
      showToast(`${result.imported} cliente(s) importado(s)!`);
    } catch {
      showToast("Erro ao importar planilha.", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
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
  const totalCampaigns = selected?.campaigns?.length ?? 0;

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col transition-all duration-300 shrink-0"
        style={{
          width: sidebarOpen ? "240px" : "64px",
          background: "rgba(255,255,255,0.03)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          minHeight: "100vh",
        }}
      >
        <div className="flex items-center px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: "64px" }}>
          {sidebarOpen ? (
            <img src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" alt="Tráfego Pro" style={{ height: "18px", width: "auto" }} />
          ) : (
            <span className="text-white text-xs font-bold">TP</span>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {[
            { key: "overview", label: "Visão Geral", icon: <BarChart2 size={16} /> },
            { key: "clients", label: "Clientes", icon: <Users size={16} /> },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveSection(item.key as "overview" | "clients"); setSelected(null); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
              style={{
                background: activeSection === item.key ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeSection === item.key ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            >
              {item.icon}
              {sidebarOpen && <span className="text-sm" style={{ fontWeight: 300 }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {sidebarOpen && (
            <p className="text-xs text-gray-600 px-3 mb-2 truncate" style={{ fontWeight: 300 }}>{user.email}</p>
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

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-auto">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: "64px" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-white transition-colors">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-current" />
              <div className="w-4 h-0.5 bg-current" />
              <div className="w-4 h-0.5 bg-current" />
            </div>
          </button>
          <span className="text-gray-600 text-sm" style={{ fontWeight: 300 }}>Olá, {user.name}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">

          {/* ── Overview ── */}
          {activeSection === "overview" && !selected && (
            <div>
              <h1 className="text-white text-3xl mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>Visão Geral</h1>
              <p className="text-gray-600 text-sm mb-8" style={{ fontWeight: 300 }}>Resumo de todos os clientes e campanhas ativas.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Clientes Ativos", value: activeClients, icon: <Users size={18} /> },
                  { label: "Investimento Mensal", value: `R$ ${totalBudget.toLocaleString("pt-BR")}`, icon: <DollarSign size={18} /> },
                  { label: "Total de Clientes", value: clients.length, icon: <Activity size={18} /> },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-600 text-xs uppercase tracking-widest" style={{ fontWeight: 300 }}>{stat.label}</span>
                      <span className="text-gray-700">{stat.icon}</span>
                    </div>
                    <p className="text-white text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-white text-lg mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>Clientes</h2>
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
                      <span className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>{c.name}</span>
                      <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-gray-600 text-xs mb-3" style={{ fontWeight: 300 }}>{c.city}, {c.state} · {c.plan}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)", color: c.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)", fontWeight: 300 }}>
                        {c.status === "active" ? "Ativo" : "Pausado"}
                      </span>
                      <span className="text-gray-600 text-xs" style={{ fontWeight: 300 }}>R$ {c.monthlyBudget.toLocaleString("pt-BR")}/mês</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Clients List ── */}
          {activeSection === "clients" && !selected && (
            <div>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-white text-3xl mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>Clientes</h1>
                  <p className="text-gray-600 text-sm" style={{ fontWeight: 300 }}>Gerencie todos os clientes e suas campanhas.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Import */}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}
                  >
                    {importing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                    Importar Excel
                  </button>
                  {/* Export */}
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}
                  >
                    <Download size={14} />
                    Exportar Excel
                  </button>
                  {/* New */}
                  <button
                    onClick={() => setShowNewClient(true)}
                    className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-all"
                    style={{ background: "#fff", color: "#000", fontWeight: 400 }}
                  >
                    <Plus size={14} />
                    Novo Cliente
                  </button>
                </div>
              </div>

              {/* Import result */}
              {importResult && (
                <div className="mb-6 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm" style={{ fontWeight: 300 }}>
                      Importação concluída: <strong>{importResult.imported}</strong> cliente(s) adicionado(s)
                    </p>
                    <button onClick={() => setImportResult(null)} className="text-gray-600 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                  {importResult.errors.length > 0 && (
                    <ul className="text-xs text-red-400 mt-2 flex flex-col gap-1" style={{ fontWeight: 300 }}>
                      {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {clientsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Users size={40} className="text-gray-700" />
                  <p className="text-gray-600 text-sm" style={{ fontWeight: 300 }}>Nenhum cliente cadastrado ainda.</p>
                  <button onClick={() => setShowNewClient(true)} className="flex items-center gap-2 text-sm rounded-lg px-4 py-2" style={{ background: "#fff", color: "#000", fontWeight: 400 }}>
                    <Plus size={14} /> Adicionar primeiro cliente
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl p-5 flex items-center justify-between group transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                    >
                      <button className="flex-1 text-left" onClick={() => loadClient(c.id)}>
                        <p className="text-white text-base mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>{c.name}</p>
                        <p className="text-gray-600 text-xs" style={{ fontWeight: 300 }}>
                          {c.city}{c.state ? `, ${c.state}` : ""} · {c.plan} · R$ {c.monthlyBudget.toLocaleString("pt-BR")}/mês
                        </p>
                      </button>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)", color: c.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)", fontWeight: 300 }}>
                          {c.status === "active" ? "Ativo" : "Pausado"}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingClient(c); }}
                          className="text-gray-600 hover:text-white transition-colors p-1"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingClientId(c.id); }}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors cursor-pointer" onClick={() => loadClient(c.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Client Detail ── */}
          {selected && (
            <div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors" style={{ fontWeight: 300 }}>
                ← Voltar
              </button>

              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-white text-3xl mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>{selected.name}</h1>
                  <p className="text-gray-600 text-sm" style={{ fontWeight: 300 }}>
                    {selected.city}{selected.state ? `, ${selected.state}` : ""} · Desde {selected.startDate ? new Date(selected.startDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.lpUrl && (
                    <a
                      href={selected.lpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm rounded-lg px-4 py-2 transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}
                    >
                      <ExternalLink size={14} /> Ver LP
                    </a>
                  )}
                  <button
                    onClick={() => setEditingClient(selected)}
                    className="flex items-center gap-2 text-sm rounded-lg px-4 py-2 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => setDeletingClientId(selected.id)}
                    className="flex items-center gap-2 text-sm rounded-lg px-4 py-2 transition-all"
                    style={{ background: "rgba(255,40,40,0.08)", border: "1px solid rgba(255,40,40,0.2)", color: "rgba(255,120,120,0.8)", fontWeight: 300 }}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Investimento Mensal", value: `R$ ${selected.monthlyBudget.toLocaleString("pt-BR")}` },
                  { label: "Plano", value: selected.plan || "—" },
                  { label: "Status", value: selected.status === "active" ? "Ativo" : "Pausado" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-gray-600 text-xs uppercase tracking-widest mb-2" style={{ fontWeight: 300 }}>{item.label}</p>
                    <p className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-2" style={{ fontWeight: 300 }}>Observações Estratégicas</p>
                  <p className="text-gray-300 text-sm leading-relaxed" style={{ fontWeight: 300 }}>{selected.notes}</p>
                </div>
              )}

              {/* Contact */}
              {(selected.contact || selected.phone || selected.email) && (
                <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-3" style={{ fontWeight: 300 }}>Contato</p>
                  <div className="flex flex-col gap-1">
                    {selected.contact && <p className="text-white text-sm" style={{ fontWeight: 300 }}>{selected.contact}</p>}
                    {selected.phone && <p className="text-gray-500 text-sm" style={{ fontWeight: 300 }}>{selected.phone}</p>}
                    {selected.email && <p className="text-gray-500 text-sm" style={{ fontWeight: 300 }}>{selected.email}</p>}
                  </div>
                </div>
              )}

              {/* Campaigns */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}>Campanhas</h2>
                <button
                  onClick={() => setShowNewCampaign(true)}
                  className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}
                >
                  <Plus size={13} /> Nova Campanha
                </button>
              </div>

              {selected.campaigns.length === 0 ? (
                <p className="text-gray-600 text-sm" style={{ fontWeight: 300 }}>Nenhuma campanha cadastrada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div>
                        <p className="text-white text-sm mb-0.5" style={{ fontWeight: 300 }}>{camp.name}</p>
                        <p className="text-gray-600 text-xs" style={{ fontWeight: 300 }}>{camp.platform}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm" style={{ fontWeight: 300 }}>R$ {camp.budget.toLocaleString("pt-BR")}/mês</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: camp.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,0,0,0.08)", color: camp.status === "active" ? "rgba(255,255,255,0.6)" : "rgba(255,100,100,0.8)", fontWeight: 300 }}>
                          {camp.status === "active" ? "Ativa" : "Pausada"}
                        </span>
                        <button onClick={() => setEditingCampaign(camp)} className="text-gray-600 hover:text-white transition-colors p-1" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeletingCampaignId(camp.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1" title="Excluir">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}

      {showNewClient && (
        <Modal title="Novo Cliente" onClose={() => setShowNewClient(false)}>
          <ClientForm initial={emptyClient()} onSave={handleCreateClient} onCancel={() => setShowNewClient(false)} saving={savingClient} />
        </Modal>
      )}

      {editingClient && (
        <Modal title="Editar Cliente" onClose={() => setEditingClient(null)}>
          <ClientForm
            initial={{ name: editingClient.name, city: editingClient.city, state: editingClient.state, status: editingClient.status, plan: editingClient.plan, startDate: editingClient.startDate, monthlyBudget: editingClient.monthlyBudget, contact: editingClient.contact, phone: editingClient.phone, email: editingClient.email, lpUrl: editingClient.lpUrl, notes: editingClient.notes }}
            onSave={handleUpdateClient}
            onCancel={() => setEditingClient(null)}
            saving={savingClient}
          />
        </Modal>
      )}

      {deletingClientId !== null && (
        <ConfirmDialog
          message="Tem certeza que deseja excluir este cliente? Todas as campanhas vinculadas também serão removidas."
          onConfirm={() => handleDeleteClient(deletingClientId)}
          onCancel={() => setDeletingClientId(null)}
        />
      )}

      {showNewCampaign && (
        <Modal title="Nova Campanha" onClose={() => setShowNewCampaign(false)}>
          <CampaignForm initial={emptyCampaign()} onSave={handleCreateCampaign} onCancel={() => setShowNewCampaign(false)} saving={savingCampaign} />
        </Modal>
      )}

      {editingCampaign && (
        <Modal title="Editar Campanha" onClose={() => setEditingCampaign(null)}>
          <CampaignForm
            initial={{ name: editingCampaign.name, platform: editingCampaign.platform, status: editingCampaign.status, budget: editingCampaign.budget }}
            onSave={handleUpdateCampaign}
            onCancel={() => setEditingCampaign(null)}
            saving={savingCampaign}
          />
        </Modal>
      )}

      {deletingCampaignId !== null && (
        <ConfirmDialog
          message="Tem certeza que deseja excluir esta campanha?"
          onConfirm={() => handleDeleteCampaign(deletingCampaignId)}
          onCancel={() => setDeletingCampaignId(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
