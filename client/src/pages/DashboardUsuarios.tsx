import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { ShieldCheck, Plus, Trash2, X, Users2, UserCog } from "lucide-react";
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
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  socio: "Sócio",
  gerente: "Gerente",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]",
  socio: "bg-[rgba(59,130,246,0.15)] text-[#60a5fa]",
  gerente: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  inactive: "text-red-400",
  blocked: "text-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

function token() {
  return localStorage.getItem("tp_token") ?? "";
}

function authHeaders() {
  return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
}

export default function DashboardUsuariosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Usuários e Permissões"; }, []);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState("gerente");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user-access", { headers: authHeaders() });
      if (res.ok) setProfiles(await res.json());
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail.trim()) {
      toast.error("Preencha o email");
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
        toast.error(err.error || "Erro ao criar profile");
        return;
      }
      toast.success("Usuário criado");
      setShowModal(false);
      setFormEmail("");
      setFormFullName("");
      setFormRole("gerente");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
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
      if (!res.ok) {
        toast.error("Erro ao desativar usuário");
        return;
      }
      toast.success("Usuário desativado");
      setConfirmDelete(null);
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleRoleChange(row: ProfileRow, newRole: string) {
    try {
      const res = await fetch(`/api/user-access/${row.id}`, {
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

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1100px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Usuários e Permissões
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os perfis de acesso ao dashboard via Supabase.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" /> Novo usuário
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
            <p className="text-xs text-muted-foreground/70">
              Adicione usuários para controlar quem acessa o dashboard.
            </p>
          </div>
        )}

        {!loading && profiles.length > 0 && (
          <div className="glass-card overflow-hidden">
            {/* Header da tabela */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              <div className="w-8"></div>
              <div>Usuário</div>
              <div className="text-center">Cargo</div>
              <div className="text-center">Status</div>
              <div className="w-8"></div>
            </div>

            {profiles.map((profile) => {
              const isInactive = profile.status === "inactive" || profile.status === "blocked";
              return (
                <div
                  key={profile.id}
                  className={`group grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-border/30 last:border-b-0 transition-colors hover:bg-muted/10 ${isInactive ? "opacity-50" : ""}`}
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
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {profile.full_name || profile.user_email.split("@")[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{profile.user_email}</div>
                  </div>

                  {/* Role selector */}
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[profile.role] ?? ROLE_COLORS.gerente}`}>
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile, e.target.value)}
                        className="bg-transparent text-inherit text-[10px] outline-none cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="admin">Admin</option>
                        <option value="socio">Sócio</option>
                        <option value="gerente">Gerente</option>
                      </select>
                    </span>
                  </div>

                  {/* Status */}
                  <div className={`text-center text-[11px] ${STATUS_COLORS[profile.status] ?? STATUS_COLORS.active}`}>
                    {STATUS_LABELS[profile.status] ?? profile.status}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(profile)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                    title={isInactive ? "Já está inativo" : "Desativar usuário"}
                    disabled={isInactive}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Novo usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <UserCog className="size-4 text-primary" /> Novo usuário
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
                <label className="text-xs text-muted-foreground mb-1 block">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  placeholder="usuario@empresa.com.br"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Deve ser o mesmo email cadastrado no Supabase Auth.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="João Silva (opcional)"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Cargo
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="gerente">Gerente</option>
                  <option value="socio">Sócio</option>
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
                  {saving ? "Salvando..." : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar desativação */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold">Desativar usuário</h2>
            <p className="text-sm text-muted-foreground">
              Desativar o acesso de <strong>{confirmDelete.full_name || confirmDelete.user_email}</strong> ({confirmDelete.user_email})?
            </p>
            <p className="text-xs text-muted-foreground/70">
              O perfil não será excluído, apenas marcado como inativo.
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
