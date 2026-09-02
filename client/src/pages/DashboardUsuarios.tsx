import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import {
  ShieldCheck,
  Plus,
  Trash2,
  X,
  Users2,
  UserCog,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Filter,
  Search,
  KeyRound,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) {
      setLocation("/login");
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      const isAdmin = user.role === "admin" || user.allowedClientIds?.includes("*");
      if (!isAdmin) {
        setLocation("/dashboard");
        return;
      }
    } catch {
      setLocation("/login");
    }
  }, [setLocation]);
}

type ProfileRow = {
  id: string;
  user_email: string;
  full_name: string;
  role: string;
  status: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  client_access: Array<{
    id: string;
    client_id: string;
    client_name: string | null;
    client_group: string | null;
    granted_by: string;
    created_at: string;
  }>;
};

type MetricsClient = { id: string; name: string; client_group?: string };

// Roles do sistema
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  viewer: "Visualizador",
  client_viewer: "Cliente",
  designer: "Designer",
  cs: "CS",
  account_manager: "Gestor de Conta",
  traffic_manager: "Tráfego",
  copywriter: "Copywriter",
  none: "Sem acesso",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-purple-500/20",
  viewer: "bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border-blue-500/20",
  client_viewer: "bg-[rgba(234,179,8,0.15)] text-[#facc15] border-yellow-500/20",
  designer: "bg-[rgba(236,72,153,0.15)] text-[#f472b6] border-pink-500/20",
  cs: "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-emerald-500/20",
  account_manager: "bg-[rgba(251,146,60,0.15)] text-[#fb923c] border-orange-500/20",
  traffic_manager: "bg-[rgba(14,165,233,0.15)] text-[#0ea5e9] border-sky-500/20",
  copywriter: "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-purple-500/20",
  none: "bg-[rgba(100,116,139,0.15)] text-[#94a3b8] border-slate-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse",
  inactive: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  disabled: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  blocked: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  rejected: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  inativo: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  desativado: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente de Aprovação",
  inactive: "Inativo",
  disabled: "Inativo",
  blocked: "Inativo",
  rejected: "Recusado",
  inativo: "Inativo",
  desativado: "Inativo",
};

function token() {
  return localStorage.getItem("tp_token") ?? "";
}

function authHeaders(): HeadersInit {
  const t = token();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export default function DashboardUsuariosPage() {
  useAuthGuard();
  useEffect(() => {
    document.title = "Tráfego Pro — Usuários e Permissões";
  }, []);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [clients, setClients] = useState<MetricsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [deletePermanent, setDeletePermanent] = useState(false);
  const [approvingProfile, setApprovingProfile] = useState<ProfileRow | null>(null);
  const [resetPasswordProfile, setResetPasswordProfile] = useState<ProfileRow | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("Trafego@2026");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form novo usuário manual
  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState("viewer");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal de Aprovação state
  const [approveRole, setApproveRole] = useState("viewer");
  const [approveClientIds, setApproveClientIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  // Grant access inline state
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [grantClientId, setGrantClientId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accessRes, clientsRes] = await Promise.all([
        fetch("/api/user-access", { headers: authHeaders(), credentials: "include" }),
        fetch("/api/metrics/clients", { headers: authHeaders(), credentials: "include" }),
      ]);
      if (accessRes.ok) {
        setProfiles(await accessRes.json());
      } else {
        const body = await accessRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível carregar os usuários");
      }
      if (clientsRes.ok) {
        const d = await clientsRes.json();
        setClients(d.clients ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar dados de usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function clientName(access: ProfileRow["client_access"][number]): string {
    return (
      access.client_name ??
      clients.find((client) => client.id === access.client_id)?.name ??
      access.client_id.slice(0, 8)
    );
  }

  function unitsSummary(profile: ProfileRow): string {
    if (profile.role === "admin") return "Todas as unidades (Admin)";
    if (profile.client_access.length === 0) return "Sem unidades vinculadas";
    return profile.client_access.map(clientName).join(", ");
  }

  const pendingCount = profiles.filter((p) => p.status === "pending").length;
  const activeCount = profiles.filter((p) => p.status === "active").length;
  const inactiveCount = profiles.filter((p) => p.status !== "active" && p.status !== "pending").length;

  const filteredProfiles = profiles.filter((profile) => {
    // 1. Filtro por status
    if (statusFilter === "pending" && profile.status !== "pending") return false;
    if (statusFilter === "active" && profile.status !== "active") return false;
    if (statusFilter === "inactive" && (profile.status === "active" || profile.status === "pending")) return false;

    // 2. Filtro por cargo
    if (roleFilter !== "all" && profile.role !== roleFilter) return false;

    // 3. Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = profile.full_name?.toLowerCase().includes(q);
      const matchEmail = profile.user_email?.toLowerCase().includes(q);
      const matchRole = (ROLE_LABELS[profile.role] || profile.role).toLowerCase().includes(q);
      const matchUnits = profile.client_access.some((a) => clientName(a).toLowerCase().includes(q));
      const matchBio = profile.bio?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole && !matchUnits && !matchBio) {
        return false;
      }
    }

    return true;
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    toast.success("E-mail copiado para a área de transferência!");
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPasswordProfile) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/user-access/${resetPasswordProfile.id}/reset-password`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ new_password: newPasswordInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erro ao redefinir senha");
        return;
      }
      toast.success(data.message || "Senha atualizada com sucesso!");
      setResetPasswordProfile(null);
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail.trim()) {
      toast.error("Preencha o e-mail");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user-access", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          user_email: formEmail.trim(),
          full_name: formFullName.trim() || undefined,
          role: formRole,
          password: formPassword.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar usuário");
        return;
      }
      if (data.temporaryPassword) {
        toast.success(`Usuário cadastrado! Senha inicial: ${data.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success("Usuário cadastrado com sucesso!");
      }
      setShowModal(false);
      setFormEmail("");
      setFormFullName("");
      setFormPassword("");
      setFormRole("viewer");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function openApproveModal(profile: ProfileRow) {
    setApprovingProfile(profile);
    setApproveRole(profile.role !== "none" ? profile.role : "viewer");

    const initialClientIds = profile.client_access.map((a) => a.client_id);

    // Se ainda não tem unidades vinculadas, tenta pré-selecionar a unidade solicitada no cadastro
    if (initialClientIds.length === 0 && profile.bio) {
      // 1. Tenta extrair ID estruturado: [Unit ID: act_12345]
      const unitIdMatch = profile.bio.match(/\[Unit ID:\s*([^\]]+)\]/i);
      if (unitIdMatch && unitIdMatch[1]) {
        const matchedId = unitIdMatch[1].trim();
        if (clients.some((c) => c.id === matchedId)) {
          initialClientIds.push(matchedId);
        }
      }

      // 2. Fallback: tenta casar pelo nome da unidade mencionado na bio
      if (initialClientIds.length === 0) {
        const unitNameMatch = profile.bio.match(/Unidade:\s*([^|]+)/i);
        if (unitNameMatch && unitNameMatch[1]) {
          const requestedName = unitNameMatch[1].trim().toLowerCase();
          const foundClient = clients.find(
            (c) =>
              c.name.toLowerCase() === requestedName ||
              c.name.toLowerCase().includes(requestedName) ||
              requestedName.includes(c.name.toLowerCase())
          );
          if (foundClient) {
            initialClientIds.push(foundClient.id);
          }
        }
      }
    }

    setApproveClientIds(initialClientIds);
  }

  async function handleConfirmApprove() {
    if (!approvingProfile) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/user-access/${approvingProfile.id}/approve`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          role: approveRole,
          client_ids: approveClientIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao aprovar usuário");
        return;
      }

      toast.success(`Usuário ${approvingProfile.full_name || approvingProfile.user_email} aprovado com sucesso!`);
      setApprovingProfile(null);
      fetchData();
    } catch {
      toast.error("Erro ao processar aprovação");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(profile: ProfileRow) {
    try {
      const res = await fetch(`/api/user-access/${profile.id}/reject`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao recusar cadastro");
        return;
      }

      toast.success("Cadastro recusado/inativado.");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      const endpoint = deletePermanent
        ? `/api/user-access/${confirmDelete.id}/permanent`
        : `/api/user-access/${confirmDelete.id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (deletePermanent ? "Erro ao excluir usuário" : "Erro ao desativar"));
        return;
      }
      toast.success(deletePermanent ? "Usuário excluído definitivamente com sucesso" : "Usuário desativado com sucesso");
      setConfirmDelete(null);
      setDeletePermanent(false);
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleRoleChange(profile: ProfileRow, newRole: string) {
    try {
      const res = await fetch(`/api/user-access/${profile.id}`, {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao alterar cargo");
        return;
      }
      toast.success("Cargo atualizado");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleGrantAccess(userId: string, clientId: string) {
    if (!clientId) {
      toast.error("Selecione uma unidade");
      return;
    }
    try {
      const res = await fetch("/api/client-access", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ user_id: userId, client_id: clientId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao conceder acesso");
        return;
      }
      toast.success("Acesso concedido");
      setGrantingUserId(null);
      setGrantClientId("");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleRevokeAccess(accessId: string) {
    try {
      const res = await fetch(`/api/client-access/${accessId}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao revogar acesso");
        return;
      }
      toast.success("Acesso revogado");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1200px] mx-auto">
        
        {/* Header com Ação Principal */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="size-6 text-emerald-400" /> Usuários e Permissões
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Controle de contas, redefinição de senhas, permissões por cargo e vinculação de franquias.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
          >
            <Plus className="size-4" /> Cadastrar Usuário
          </button>
        </header>

        {/* Cards de Métricas e Visão Geral */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => { setStatusFilter("all"); setRoleFilter("all"); }}
            className={`glass-card p-4 cursor-pointer transition-all rounded-2xl border ${
              statusFilter === "all" ? "border-emerald-500/50 bg-emerald-500/[0.04]" : "border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Total de Contas</span>
              <Users2 className="size-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-white">{profiles.length}</div>
          </div>

          <div
            onClick={() => setStatusFilter("active")}
            className={`glass-card p-4 cursor-pointer transition-all rounded-2xl border ${
              statusFilter === "active" ? "border-emerald-500/50 bg-emerald-500/[0.04]" : "border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">Ativos</span>
              <UserCheck className="size-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter("pending")}
            className={`glass-card p-4 cursor-pointer transition-all rounded-2xl border ${
              statusFilter === "pending"
                ? "border-amber-500/60 bg-amber-500/[0.08]"
                : pendingCount > 0
                ? "border-amber-500/40 bg-amber-500/[0.03] hover:border-amber-500/60"
                : "border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">Pendentes</span>
              <Clock className={`size-4 text-amber-400 ${pendingCount > 0 ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-400">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Requer Aprovação
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("inactive")}
            className={`glass-card p-4 cursor-pointer transition-all rounded-2xl border ${
              statusFilter === "inactive" ? "border-rose-500/50 bg-rose-500/[0.04]" : "border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Inativos</span>
              <Trash2 className="size-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-400">{inactiveCount}</div>
          </div>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/90 shadow-sm">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail, cargo ou franquia..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Cargo */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-400">
              <Filter className="size-3.5 text-zinc-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900">Todos os cargos</option>
                <option value="admin" className="bg-zinc-900">Admin</option>
                <option value="account_manager" className="bg-zinc-900">Gestor de Conta</option>
                <option value="traffic_manager" className="bg-zinc-900">Tráfego</option>
                <option value="designer" className="bg-zinc-900">Designer</option>
                <option value="cs" className="bg-zinc-900">CS</option>
                <option value="copywriter" className="bg-zinc-900">Copywriter</option>
                <option value="viewer" className="bg-zinc-900">Visualizador</option>
                <option value="client_viewer" className="bg-zinc-900">Cliente</option>
              </select>
            </div>

            {/* Abas de Status */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === "all" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === "pending"
                    ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Pendentes {pendingCount > 0 && `(${pendingCount})`}
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === "active" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === "inactive" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Inativos
              </button>
            </div>
          </div>
        </div>

        {/* Estado de Carregamento */}
        {loading && (
          <div className="glass-card p-12 text-center text-xs text-zinc-400 rounded-2xl flex flex-col items-center gap-3">
            <div className="size-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            Carregando usuários e permissões...
          </div>
        )}

        {/* Nenhum Resultado */}
        {!loading && filteredProfiles.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-zinc-800">
            <Users2 className="size-12 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">Nenhum usuário encontrado</p>
            <p className="text-xs text-zinc-500 max-w-sm text-center">
              {searchQuery
                ? `Nenhum resultado corresponde à busca "${searchQuery}". Tente outros termos.`
                : "Não há contas cadastradas com os filtros selecionados."}
            </p>
          </div>
        )}

        {/* Lista de Cards de Usuários */}
        {!loading && filteredProfiles.length > 0 && (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const isExpanded = expandedId === profile.id;
              const isPending = profile.status === "pending";
              const isInactive = profile.status !== "active" && profile.status !== "pending";

              return (
                <div
                  key={profile.id}
                  className={`glass-card rounded-2xl overflow-hidden transition-all border ${
                    isPending
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : isInactive
                      ? "border-zinc-800/60 opacity-60 hover:opacity-100"
                      : "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40"
                  }`}
                >
                  {/* Linha Principal do Usuário */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bloco de Informações Pessoais */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Avatar com Iniciais */}
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0 shadow-inner">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="size-11 rounded-2xl object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-emerald-400">
                            {(profile.full_name || profile.user_email).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Nome, Email e Detalhes */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {profile.full_name || profile.user_email.split("@")[0]}
                          </h3>

                          {/* Cargo Badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              ROLE_COLORS[profile.role] ?? ROLE_COLORS.none
                            }`}
                          >
                            {ROLE_LABELS[profile.role] ?? profile.role}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                              STATUS_COLORS[profile.status] ?? STATUS_COLORS.active
                            }`}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {STATUS_LABELS[profile.status] ?? profile.status}
                          </span>
                        </div>

                        {/* E-mail com Ação de Copiar */}
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="truncate">{profile.user_email}</span>
                          <button
                            onClick={() => copyToClipboard(profile.user_email)}
                            className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                            title="Copiar e-mail"
                          >
                            {copiedEmail === profile.user_email ? (
                              <Check className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>

                        {/* Justificativa / Unidade Solicitada (se houver) */}
                        {profile.bio && (
                          <div className="text-[11px] text-amber-300/80 bg-amber-500/[0.08] border border-amber-500/20 px-2.5 py-1 rounded-lg inline-block max-w-full truncate mt-1">
                            {profile.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bloco de Unidades e Ações Rápidas */}
                    <div className="flex flex-wrap items-center gap-2.5 lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800/80">
                      {/* Botão de Expansão de Unidades */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          profile.client_access.length > 0
                            ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            : "bg-zinc-950/60 border-zinc-850 text-zinc-500 hover:text-zinc-300"
                        }`}
                        title="Ver unidades vinculadas"
                      >
                        <Building2 className="size-3.5 text-emerald-400" />
                        <span>
                          {profile.role === "admin"
                            ? "Todas (Admin)"
                            : profile.client_access.length === 0
                            ? "Sem unidades"
                            : `${profile.client_access.length} ${profile.client_access.length === 1 ? "unidade" : "unidades"}`}
                        </span>
                        {isExpanded ? <ChevronUp className="size-3 text-zinc-400" /> : <ChevronDown className="size-3 text-zinc-400" />}
                      </button>

                      {isPending ? (
                        /* Ações de Aprovação para Usuários Pendentes */
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openApproveModal(profile)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
                          >
                            <CheckCircle2 className="size-4" /> Aprovar
                          </button>
                          <button
                            onClick={() => handleReject(profile)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-zinc-400 text-xs transition-colors"
                          >
                            <XCircle className="size-4" /> Recusar
                          </button>
                        </div>
                      ) : (
                        /* Ações para Usuários Ativos / Inativos */
                        <div className="flex items-center gap-1.5">
                          {/* Seletor de Cargo Inline */}
                          <select
                            value={profile.role}
                            onChange={(e) => handleRoleChange(profile, e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 outline-none hover:border-zinc-700 cursor-pointer"
                          >
                            <option value="viewer">Visualizador</option>
                            <option value="client_viewer">Cliente</option>
                            <option value="designer">Designer</option>
                            <option value="cs">CS</option>
                            <option value="account_manager">Gestor de Conta</option>
                            <option value="traffic_manager">Tráfego</option>
                            <option value="copywriter">Copywriter</option>
                            <option value="admin">Admin</option>
                            <option value="none">Sem acesso</option>
                          </select>

                          {/* Botão Redefinir Senha */}
                          <button
                            onClick={() => {
                              setResetPasswordProfile(profile);
                              setNewPasswordInput("Trafego@2026");
                            }}
                            className="size-8 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-amber-500/10 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300 transition-colors"
                            title="Redefinir Senha"
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          {/* Botão Desativar / Excluir */}
                          <button
                            onClick={() => {
                              setConfirmDelete(profile);
                              setDeletePermanent(false);
                            }}
                            className="size-8 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-rose-500/10 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Desativar ou Excluir Usuário"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Painel Retrátil: Gestão de Franquias/Unidades Vinculadas */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800/80 p-4 sm:p-5 bg-zinc-950/70 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                            <Building2 className="size-4 text-emerald-400" /> Franquias Vinculadas a este Usuário
                          </h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            O usuário terá acesso às métricas e dados das unidades autorizadas abaixo.
                          </p>
                        </div>

                        <button
                          onClick={() => setGrantingUserId(profile.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors"
                        >
                          <Plus className="size-3.5" /> Vincular nova franquia
                        </button>
                      </div>

                      {/* Formulário Inline para Vincular Unidade */}
                      {grantingUserId === profile.id && (
                        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] max-w-xl">
                          <select
                            value={grantClientId}
                            onChange={(e) => setGrantClientId(e.target.value)}
                            className="flex-1 min-w-[200px] text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                          >
                            <option value="">Selecione uma franquia...</option>
                            {clients
                              .filter((c) => !profile.client_access.some((a) => a.client_id === c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} {c.client_group ? `(${c.client_group})` : ""}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleGrantAccess(profile.id, grantClientId)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-colors"
                          >
                            Confirmar Vínculo
                          </button>
                          <button
                            onClick={() => {
                              setGrantingUserId(null);
                              setGrantClientId("");
                            }}
                            className="px-3 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {/* Lista de Unidades Vinculadas */}
                      {profile.client_access.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                          {profile.role === "admin"
                            ? "Usuários administradores possuem acesso irrestrito a todas as franquias da rede."
                            : "Nenhuma franquia vinculada individualmente a este usuário."}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {profile.client_access.map((access, i) => (
                            <div
                              key={`${access.client_id}-${i}`}
                              className="group flex items-center gap-2 rounded-xl border border-zinc-800/90 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700 transition-all shadow-sm"
                            >
                              <Building2 className="size-3.5 text-emerald-400" />
                              <span className="font-medium">{clientName(access)}</span>
                              {access.client_group && (
                                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                  {access.client_group}
                                </span>
                              )}
                              <button
                                onClick={() => handleRevokeAccess(access.id)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
                                title="Desvincular acesso"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Redefinir Senha */}
        {resetPasswordProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="glass-card w-full max-w-md p-6 space-y-4 rounded-2xl border border-zinc-800 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <KeyRound className="size-5 text-amber-400" /> Redefinir Senha de Usuário
                </h2>
                <button
                  onClick={() => setResetPasswordProfile(null)}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                Usuário: <strong className="text-white">{resetPasswordProfile.full_name || resetPasswordProfile.user_email}</strong>
                <br />
                <span className="text-zinc-400">{resetPasswordProfile.user_email}</span>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1.5 block">
                    Nova Senha
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    required
                    placeholder="Ex: Trafego@2026"
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Defina a senha desejada ou envie o link de redefinição para o e-mail do usuário.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordProfile(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {resettingPassword ? "Atualizando..." : "Confirmar Nova Senha"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Aprovar Cadastro com Seleção de Franquias */}
        {approvingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="glass-card w-full max-w-lg p-6 space-y-4 rounded-2xl border border-zinc-800 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-400" /> Aprovar Cadastro de Usuário
                </h2>
                <button
                  onClick={() => setApprovingProfile(null)}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1 text-xs">
                <div className="text-zinc-200 font-medium">
                  {approvingProfile.full_name || approvingProfile.user_email}
                </div>
                <div className="text-zinc-400">{approvingProfile.user_email}</div>
                {approvingProfile.bio && (
                  <div className="text-amber-300/90 text-[11px] pt-1">
                    {approvingProfile.bio}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1.5 block">Cargo a Atribuir</label>
                  <select
                    value={approveRole}
                    onChange={(e) => setApproveRole(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="client_viewer">Cliente</option>
                    <option value="designer">Designer</option>
                    <option value="cs">CS</option>
                    <option value="account_manager">Gestor de Conta</option>
                    <option value="traffic_manager">Tráfego</option>
                    <option value="copywriter">Copywriter</option>
                    <option value="admin">Admin (Acesso Total)</option>
                  </select>
                </div>

                {approveRole !== "admin" && (
                  <div>
                    <label className="text-xs text-zinc-300 font-medium mb-1.5 block">
                      Franquias / Unidades Autorizadas ({approveClientIds.length} selecionadas)
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs">
                      {clients.map((c) => {
                        const checked = approveClientIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-zinc-200"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setApproveClientIds((prev) => [...prev, c.id]);
                                } else {
                                  setApproveClientIds((prev) => prev.filter((id) => id !== c.id));
                                }
                              }}
                              className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="truncate">{c.name}</span>
                            {c.client_group && (
                              <span className="text-[10px] text-zinc-500 ml-auto">{c.client_group}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={approving}
                  onClick={handleConfirmApprove}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-50"
                >
                  {approving ? "Liberando Acesso..." : "Confirmar e Liberar Acesso"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Convidar/Criar Usuário Manualmente */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="glass-card w-full max-w-md p-6 space-y-4 rounded-2xl border border-zinc-800 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <UserCog className="size-5 text-emerald-400" /> Cadastrar Novo Usuário
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1 block">E-mail *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="usuario@vidacard.com.br"
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1 block">Nome Completo</label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Ex: Leonardo da Silva"
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1 block">Cargo</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="client_viewer">Cliente</option>
                    <option value="designer">Designer</option>
                    <option value="cs">CS</option>
                    <option value="account_manager">Gestor de Conta</option>
                    <option value="traffic_manager">Tráfego</option>
                    <option value="copywriter">Copywriter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-medium mb-1 block">
                    Senha Inicial <span className="text-zinc-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Ex: Trafego@2026 (ou deixe vazio para gerar automática)"
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Cadastrando..." : "Cadastrar Usuário"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmar Desativação ou Exclusão */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="glass-card w-full max-w-md p-6 space-y-4 rounded-2xl border border-zinc-800 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle className="size-6 shrink-0" />
                <h2 className="text-base font-semibold text-white">
                  {deletePermanent ? "Excluir Usuário Definitivamente" : "Desativar Acesso do Usuário"}
                </h2>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Tem certeza que deseja gerenciar o acesso de{" "}
                <strong className="text-white">{confirmDelete.full_name || confirmDelete.user_email}</strong>?
              </p>

              {/* Opção Alternar entre Desativar e Excluir */}
              <div className="space-y-2 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs">
                <label className="flex items-start gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={!deletePermanent}
                    onChange={() => setDeletePermanent(false)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-white">Apenas Desativar (Recomendado)</span>
                    <p className="text-[11px] text-zinc-500">
                      O usuário é bloqueado e não conseguirá mais fazer login, mas o histórico é preservado.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-zinc-300 pt-1">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deletePermanent}
                    onChange={() => setDeletePermanent(true)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-rose-400">Excluir Definitivamente</span>
                    <p className="text-[11px] text-zinc-500">
                      Remove o perfil e desvincula todas as franquias da base de dados.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setConfirmDelete(null);
                    setDeletePermanent(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    deletePermanent
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                  }`}
                >
                  {deletePermanent ? "Excluir Definitivamente" : "Confirmar Desativação"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
