import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { ShieldCheck, Plus, Trash2, X, Users2, UserCog, Link2, Building2 } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) { setLocation("/login"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      const isAdmin = user.role === "admin" || user.allowedClientIds?.includes("*");
      if (!isAdmin) { setLocation("/dashboard"); return; }
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

// Roles reais do sistema
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  viewer: "Visualizador",
  client_viewer: "Cliente",
  designer: "Designer",
  cs: "CS",
  account_manager: "Gestor de Conta",
  traffic_manager: "Trafego",
  copywriter: "Copywriter",
  none: "Sem acesso",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]",
  viewer: "bg-[rgba(59,130,246,0.15)] text-[#60a5fa]",
  client_viewer: "bg-[rgba(234,179,8,0.15)] text-[#facc15]",
  designer: "bg-[rgba(236,72,153,0.15)] text-[#f472b6]",
  cs: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  account_manager: "bg-[rgba(251,146,60,0.15)] text-[#fb923c]",
  traffic_manager: "bg-[rgba(14,165,233,0.15)] text-[#0ea5e9]",
  copywriter: "bg-[rgba(168,85,247,0.15)] text-[#a855f7]",
  none: "bg-[rgba(100,116,139,0.15)] text-[#94a3b8]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  inactive: "text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
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
  useEffect(() => { document.title = "Trafego Pro — Usuarios e Permissoes"; }, []);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [clients, setClients] = useState<MetricsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState("viewer");
  const [saving, setSaving] = useState(false);

  // Grant access state
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [grantClientId, setGrantClientId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accessRes, clientsRes] = await Promise.all([
        fetch("/api/user-access", { headers: authHeaders() }),
        fetch("/api/metrics/clients", { headers: authHeaders() }),
      ]);
      if (accessRes.ok) setProfiles(await accessRes.json());
      if (clientsRes.ok) {
        const d = await clientsRes.json();
        setClients(d.clients ?? []);
      }
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function clientName(access: ProfileRow["client_access"][number]): string {
    return access.client_name ?? clients.find((client) => client.id === access.client_id)?.name ?? access.client_id.slice(0, 8);
  }

  function unitsSummary(profile: ProfileRow): string {
    if (profile.role === "admin") return "Todas as unidades";
    if (profile.client_access.length === 0) return "Sem unidades individuais";
    return profile.client_access.map(clientName).join(", ");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail.trim()) { toast.error("Preencha o email"); return; }
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
        toast.error(err.error || "Erro ao criar profile");
        return;
      }
      toast.success("Usuario criado");
      setShowModal(false);
      setFormEmail("");
      setFormFullName("");
      setFormRole("viewer");
      fetchData();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/user-access/${confirmDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) { toast.error("Erro ao desativar"); return; }
      toast.success("Usuario desativado");
      setConfirmDelete(null);
      fetchData();
    } catch {
      toast.error("Erro de conexao");
    }
  }

  async function handleRoleChange(profile: ProfileRow, newRole: string) {
    try {
      const res = await fetch(`/api/user-access/${profile.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { toast.error("Erro ao alterar cargo"); return; }
      toast.success("Cargo atualizado");
      fetchData();
    } catch {
      toast.error("Erro de conexao");
    }
  }

  async function handleGrantAccess(userId: string, clientId: string) {
    if (!clientId) { toast.error("Selecione um cliente"); return; }
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
      toast.error("Erro de conexao");
    }
  }

  async function handleRevokeAccess(accessId: string) {
    try {
      const res = await fetch(`/api/client-access/${accessId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) { toast.error("Erro ao revogar acesso"); return; }
      toast.success("Acesso revogado");
      fetchData();
    } catch {
      toast.error("Erro de conexao");
    }
  }

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1100px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Usuarios e Permissoes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie profiles e acessos por cliente.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" /> Novo usuario
          </button>
        </header>

        {loading && (
          <div className="glass-card p-6 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <Users2 className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado.</p>
          </div>
        )}

        {!loading && profiles.length > 0 && (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const isExpanded = expandedId === profile.id;
              const isInactive = profile.status !== "active";
              return (
                <div key={profile.id} className={`glass-card overflow-hidden transition-opacity ${isInactive ? "opacity-50" : ""}`}>
                  {/* Linha principal */}
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/5"
                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                  >
                    {/* Avatar */}
                    <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-primary">
                          {(profile.full_name || profile.user_email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {profile.full_name || profile.user_email.split("@")[0]}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{profile.user_email}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground" title={unitsSummary(profile)}>
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{unitsSummary(profile)}</span>
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[profile.role] ?? ROLE_COLORS.none}`}>
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </span>

                    {/* Status */}
                    <span className={`text-[11px] ${STATUS_COLORS[profile.status] ?? STATUS_COLORS.active}`}>
                      {STATUS_LABELS[profile.status] ?? profile.status}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Role selector inline */}
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile, e.target.value)}
                        className="bg-transparent text-[10px] text-muted-foreground outline-none cursor-pointer hover:text-foreground border rounded px-1 py-0.5 border-border/50"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Visualizador</option>
                        <option value="client_viewer">Cliente</option>
                        <option value="designer">Designer</option>
                        <option value="cs">CS</option>
                        <option value="account_manager">Gestor de Conta</option>
                        <option value="traffic_manager">Trafego</option>
                        <option value="copywriter">Copywriter</option>
                        <option value="none">Sem acesso</option>
                      </select>

                      <button
                        onClick={() => setConfirmDelete(profile)}
                        className="size-6 flex items-center justify-center rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Desativar"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: client access */}
                  {isExpanded && (
                    <div className="border-t border-border/50 px-5 py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Acessos a clientes ({profile.client_access.length})
                        </div>
                        <button
                          onClick={() => { setGrantingUserId(profile.id); }}
                          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
                        >
                          <Plus className="size-3" /> Conceder acesso
                        </button>
                      </div>

                      {/* Grant access form */}
                      {grantingUserId === profile.id && (
                        <div className="flex items-center gap-2">
                          <select
                            value={grantClientId}
                            onChange={(e) => setGrantClientId(e.target.value)}
                            className="flex-1 text-xs rounded-lg border border-border bg-muted/20 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Selecione...</option>
                            {clients
                              .filter((c) => !profile.client_access.some((a) => a.client_id === c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => handleGrantAccess(profile.id, grantClientId)}
                            className="px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90"
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => { setGrantingUserId(null); setGrantClientId(""); }}
                            className="px-2 py-1.5 rounded-lg border border-border text-[10px] hover:bg-muted/20"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {/* Access list */}
                      {profile.client_access.length === 0 ? (
                        <p className="text-xs text-muted-foreground/70">
                          {profile.role === "admin"
                            ? "Admin tem acesso a todos os clientes."
                            : profile.role === "none"
                            ? "Sem acesso."
                            : "Nenhum acesso individual. Se for equipe, ve todos os marketing_pro por RLS."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {profile.client_access.map((access, i) => (
                            <div
                              key={`${access.client_id}-${i}`}
                              className="group flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1 text-xs"
                            >
                              <Building2 className="size-3 text-muted-foreground" />
                              <span>{clientName(access)}</span>
                              {access.client_group && (
                                <span className="rounded bg-background/60 px-1 py-0.5 text-[10px] text-muted-foreground">
                                  {access.client_group}
                                </span>
                              )}
                              <button
                                onClick={() => handleRevokeAccess(access.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                title="Revogar acesso"
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

      {/* Modal: Novo usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <UserCog className="size-4 text-primary" /> Novo usuario
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  placeholder="usuario@empresa.com.br"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Deve ser o mesmo email do Supabase Auth.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome completo</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Joao Silva (opcional)"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cargo</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="designer">Designer</option>
                  <option value="cs">CS</option>
                  <option value="account_manager">Gestor de Conta</option>
                  <option value="traffic_manager">Trafego</option>
                  <option value="copywriter">Copywriter</option>
                  <option value="client_viewer">Cliente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Criar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar desativacao */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold">Desativar usuario</h2>
            <p className="text-sm text-muted-foreground">
              Desativar <strong>{confirmDelete.full_name || confirmDelete.user_email}</strong>?
            </p>
            <p className="text-xs text-muted-foreground/70">
              O perfil nao sera excluido, apenas marcado como inativo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors"
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
