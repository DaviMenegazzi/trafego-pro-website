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
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente de Aprovação",
  inactive: "Inativo",
};

function token() {
  return localStorage.getItem("tp_token") ?? "";
}

function authHeaders() {
  return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
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

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [approvingProfile, setApprovingProfile] = useState<ProfileRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form novo usuário manual
  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState("viewer");
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
        fetch("/api/user-access", { headers: authHeaders() }),
        fetch("/api/metrics/clients", { headers: authHeaders() }),
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
  const inactiveCount = profiles.filter((p) => p.status === "inactive").length;

  const filteredProfiles = profiles.filter((profile) => {
    if (statusFilter === "all") return true;
    return profile.status === statusFilter;
  });

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
        body: JSON.stringify({
          user_email: formEmail.trim(),
          full_name: formFullName.trim() || undefined,
          role: formRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar usuário");
        return;
      }
      toast.success("Usuário cadastrado com sucesso");
      setShowModal(false);
      setFormEmail("");
      setFormFullName("");
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
      });

      if (!res.ok) {
        toast.error("Erro ao recusar cadastro");
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
      const res = await fetch(`/api/user-access/${confirmDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error("Erro ao desativar");
        return;
      }
      toast.success("Usuário desativado");
      setConfirmDelete(null);
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
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        toast.error("Erro ao alterar cargo");
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
        body: JSON.stringify({ user_id: userId, client_id: clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
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
      });
      if (!res.ok) {
        toast.error("Erro ao revogar acesso");
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
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1100px] mx-auto">
        
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" /> Usuários e Permissões
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Gerencie cadastros, perfis de acesso e autorizações por unidade.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <Plus className="size-3.5" /> Convidar Usuário
          </button>
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            Todos ({profiles.length})
          </button>

          <button
            onClick={() => setStatusFilter("pending")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "pending"
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Clock className="size-3.5 text-amber-400" />
            Pendentes de Aprovação
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold ml-1">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "active"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            Ativos ({activeCount})
          </button>

          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "inactive"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            Inativos ({inactiveCount})
          </button>
        </div>

        {loading && (
          <div className="glass-card p-8 text-center text-xs text-muted-foreground">
            Carregando lista de usuários...
          </div>
        )}

        {!loading && filteredProfiles.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <Users2 className="size-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Nenhum usuário encontrado nesta categoria.
            </p>
          </div>
        )}

        {!loading && filteredProfiles.length > 0 && (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const isExpanded = expandedId === profile.id;
              const isPending = profile.status === "pending";
              const isInactive = profile.status === "inactive";

              return (
                <div
                  key={profile.id}
                  className={`glass-card overflow-hidden transition-all ${
                    isPending
                      ? "border-amber-500/40 bg-amber-500/[0.02]"
                      : isInactive
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  {/* Linha principal */}
                  <div
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/5"
                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                  >
                    {/* Avatar */}
                    <div className="size-9 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400">
                          {(profile.full_name || profile.user_email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        {profile.full_name || profile.user_email.split("@")[0]}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Aguardando Aprovação
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">{profile.user_email}</div>
                      {profile.bio && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 italic">
                          {profile.bio}
                        </div>
                      )}
                      <div
                        className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400"
                        title={unitsSummary(profile)}
                      >
                        <Building2 className="size-3 shrink-0 text-emerald-400/70" />
                        <span className="truncate">{unitsSummary(profile)}</span>
                      </div>
                    </div>

                    {/* Role badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        ROLE_COLORS[profile.role] ?? ROLE_COLORS.none
                      }`}
                    >
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${
                        STATUS_COLORS[profile.status] ?? STATUS_COLORS.active
                      }`}
                    >
                      {STATUS_LABELS[profile.status] ?? profile.status}
                    </span>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-2 ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPending ? (
                        /* Botões de Ação para Pendentes */
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openApproveModal(profile)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-colors"
                          >
                            <CheckCircle2 className="size-3.5" /> Aprovar
                          </button>
                          <button
                            onClick={() => handleReject(profile)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-zinc-400 text-xs transition-colors"
                            title="Recusar solicitação"
                          >
                            <XCircle className="size-3.5" /> Recusar
                          </button>
                        </div>
                      ) : (
                        /* Controles padrão para usuários ativos/inativos */
                        <div className="flex items-center gap-1">
                          <select
                            value={profile.role}
                            onChange={(e) => handleRoleChange(profile, e.target.value)}
                            className="bg-zinc-900 text-[11px] text-zinc-300 outline-none cursor-pointer hover:text-white border rounded px-2 py-1 border-zinc-800"
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

                          <button
                            onClick={() => setConfirmDelete(profile)}
                            className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title={isInactive ? "Excluir/Inativado" : "Desativar"}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded: client access */}
                  {isExpanded && (
                    <div className="border-t border-border/50 px-5 py-3 space-y-3 bg-zinc-950/40">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                          Acessos a Franquias/Unidades ({profile.client_access.length})
                        </div>
                        <button
                          onClick={() => setGrantingUserId(profile.id)}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          <Plus className="size-3" /> Vincular unidade
                        </button>
                      </div>

                      {/* Grant access form */}
                      {grantingUserId === profile.id && (
                        <div className="flex items-center gap-2 max-w-md">
                          <select
                            value={grantClientId}
                            onChange={(e) => setGrantClientId(e.target.value)}
                            className="flex-1 text-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                          >
                            <option value="">Selecione a franquia...</option>
                            {clients
                              .filter((c) => !profile.client_access.some((a) => a.client_id === c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleGrantAccess(profile.id, grantClientId)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400"
                          >
                            Vincular
                          </button>
                          <button
                            onClick={() => {
                              setGrantingUserId(null);
                              setGrantClientId("");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {/* Access list */}
                      {profile.client_access.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">
                          {profile.role === "admin"
                            ? "Administrador possui acesso irrestrito a todas as unidades."
                            : "Nenhuma unidade vinculada individualmente."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {profile.client_access.map((access, i) => (
                            <div
                              key={`${access.client_id}-${i}`}
                              className="group flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-200"
                            >
                              <Building2 className="size-3 text-emerald-400" />
                              <span>{clientName(access)}</span>
                              {access.client_group && (
                                <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">
                                  {access.client_group}
                                </span>
                              )}
                              <button
                                onClick={() => handleRevokeAccess(access.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300 ml-1"
                                title="Desvincular"
                              >
                                <X className="size-3" />
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
      </div>

      {/* Modal: Aprovar Cadastro Pendente */}
      {approvingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-lg p-6 sm:p-7 space-y-5 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-400" /> Aprovar Cadastro de Usuário
              </h2>
              <button
                onClick={() => setApprovingProfile(null)}
                className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Informações da Solicitação */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5 text-xs">
              <div>
                <span className="text-zinc-500">Nome:</span>{" "}
                <span className="text-zinc-200 font-semibold">
                  {approvingProfile.full_name || "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">E-mail:</span>{" "}
                <span className="text-zinc-200">{approvingProfile.user_email}</span>
              </div>
              {approvingProfile.bio && (
                <div>
                  <span className="text-zinc-500">Solicitação / Justificativa:</span>{" "}
                  <span className="text-emerald-300 font-medium">{approvingProfile.bio}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Seleção do Cargo / Role */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Cargo / Nível de Acesso *
                </label>
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="viewer">Visualizador (Somente Leitura)</option>
                  <option value="client_viewer">Cliente / Franqueado</option>
                  <option value="account_manager">Gestor de Conta</option>
                  <option value="traffic_manager">Gestor de Tráfego</option>
                  <option value="cs">Sucesso do Cliente (CS)</option>
                  <option value="designer">Designer</option>
                  <option value="copywriter">Copywriter</option>
                  <option value="admin">Administrador Geral (Acesso Total)</option>
                </select>
              </div>

              {/* Seleção de Franquias / Unidades Autorizadas */}
              {approveRole !== "admin" && (
                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                    Vincular Unidades / Franquias
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 space-y-1.5">
                    {clients.length === 0 ? (
                      <p className="text-xs text-zinc-500 p-2">Nenhuma unidade disponível</p>
                    ) : (
                      clients.map((client) => {
                        const isSelected = approveClientIds.includes(client.id);
                        return (
                          <label
                            key={client.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-emerald-500/15 text-emerald-300 font-medium"
                                : "hover:bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setApproveClientIds([...approveClientIds, client.id]);
                                } else {
                                  setApproveClientIds(
                                    approveClientIds.filter((id) => id !== client.id)
                                  );
                                }
                              }}
                              className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="truncate">{client.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <UserCog className="size-4 text-emerald-400" /> Cadastrar Usuário
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="size-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">E-mail *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  placeholder="usuario@empresa.com.br"
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nome completo</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Cargo</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Desativação */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Desativar Usuário</h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Deseja desativar o acesso de{" "}
              <strong>{confirmDelete.full_name || confirmDelete.user_email}</strong>?
            </p>
            <p className="text-[11px] text-zinc-500">
              O perfil não será excluído permanentemente, apenas marcado como inativo.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600"
              >
                Confirmar Desativação
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
