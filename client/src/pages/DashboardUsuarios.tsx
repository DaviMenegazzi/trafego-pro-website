import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Copy, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  ActionsMenu,
  Avatar,
  Button,
  CheckboxField,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Page,
  PageHeader,
  Popover,
  RadioGroup,
  RadioOption,
  SegmentedControl,
  Select,
  StatusBadge,
  Surface,
  useConfirm,
  type BadgeTone,
} from "@/components/ds";
import { cn } from "@/lib/utils";
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

const ROLE_ORDER = ["viewer", "client_viewer", "designer", "cs", "account_manager", "traffic_manager", "copywriter", "admin"];
const ROLE_OPTIONS = ROLE_ORDER.map((value) => ({ value, label: ROLE_LABELS[value] }));

// Só o status tem cor; o cargo fica em texto neutro.
const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Ativo", tone: "good" },
  pending: { label: "Pendente", tone: "warning" },
  rejected: { label: "Recusado", tone: "critical" },
};
const statusMeta = (status: string) => STATUS_META[status] ?? { label: "Inativo", tone: "neutral" as BadgeTone };

/** Senha aleatória gerada no navegador (sem senha padrão conhecida pela equipe). */
function generateStrongPassword(length = 16) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const random = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const chars = sets.map((set) => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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
    document.title = "Tráfego Pro — Usuários";
  }, []);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [clients, setClients] = useState<MetricsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [deletePermanent, setDeletePermanent] = useState(false);
  const [approvingProfile, setApprovingProfile] = useState<ProfileRow | null>(null);
  const [resetPasswordProfile, setResetPasswordProfile] = useState<ProfileRow | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const { confirm } = useConfirm();

  // Form novo usuário manual
  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState("viewer");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formEmailError, setFormEmailError] = useState("");

  // Modal de Aprovação state
  const [approveRole, setApproveRole] = useState("viewer");
  const [approveClientIds, setApproveClientIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);


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

  async function copyToClipboard(text: string, what = "E-mail") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPasswordProfile) return;
    if (newPasswordInput.trim().length < 8) {
      setPasswordError("Use ao menos 8 caracteres, ou gere uma senha forte");
      document.getElementById("reset-password")?.focus();
      return;
    }
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
      toast.success(data.message || "Senha redefinida");
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
      setFormEmailError("Informe o e-mail");
      document.getElementById("novo-usuario-email")?.focus();
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
        toast.success(`Usuário cadastrado. Senha inicial: ${data.temporaryPassword}`, { duration: 15000, action: { label: "Copiar", onClick: () => void copyToClipboard(data.temporaryPassword, "Senha") } });
      } else {
        toast.success("Usuário cadastrado");
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

      toast.success(`${approvingProfile.full_name || approvingProfile.user_email} aprovado`);
      setApprovingProfile(null);
      fetchData();
    } catch {
      toast.error("Erro ao processar aprovação");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(profile: ProfileRow) {
    const ok = await confirm({
      title: `Recusar o cadastro de ${profile.full_name || profile.user_email}?`,
      description: "A pessoa não consegue entrar. O cadastro fica como inativo e pode ser reativado depois.",
      confirmLabel: "Recusar cadastro",
      tone: "danger",
    });
    if (!ok) return;
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

      toast.success("Cadastro recusado");
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
      toast.success(deletePermanent ? "Usuário excluído" : "Usuário desativado");
      setConfirmDelete(null);
      setDeletePermanent(false);
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  async function handleRoleChange(profile: ProfileRow, newRole: string) {
    if (newRole === profile.role) return;
    // Admin tem acesso a tudo: dar ou tirar esse cargo pede confirmação.
    if (newRole === "admin" || profile.role === "admin") {
      const name = profile.full_name || profile.user_email;
      const ok = await confirm(
        newRole === "admin"
          ? { title: `Tornar ${name} administrador?`, description: "Admin vê todas as unidades, o Financeiro e pode gerenciar usuários.", confirmLabel: "Tornar admin", tone: "danger" }
          : { title: `Tirar o acesso de admin de ${name}?`, description: `Passa a ver só as unidades vinculadas, como ${ROLE_LABELS[newRole] ?? newRole}.`, confirmLabel: "Alterar cargo", tone: "danger" },
      );
      if (!ok) return;
    }
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
      toast.success("Unidade vinculada");
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
      toast.success("Unidade desvinculada");
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
  }

  const unitsLabel = (profile: ProfileRow) =>
    profile.role === "admin"
      ? "Todas as unidades"
      : profile.client_access.length === 0
      ? "Sem unidades"
      : profile.client_access.length === 1
      ? clientName(profile.client_access[0])
      : `${profile.client_access.length} unidades`;

  return (
    <AppLayout>
      <Page width="medium">
        <PageHeader
          title="Usuários"
          subtitle="Contas, cargos e unidades que cada pessoa pode ver."
          actions={
            <>
              <IconButton label="Atualizar" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={() => void fetchData()} disabled={loading} />
              <Button variant="primary" onClick={() => setShowModal(true)}><Plus />Novo usuário</Button>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-72">
            <Input
              leading={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, e-mail ou unidade"
              aria-label="Buscar usuários"
              trailing={searchQuery ? <IconButton label="Limpar busca" size="sm" icon={<X />} onClick={() => setSearchQuery("")} /> : undefined}
            />
          </div>
          <SegmentedControl
            aria-label="Situação"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: "all", label: "Todos", count: profiles.length },
              { value: "pending", label: "Pendentes", count: pendingCount, tone: pendingCount > 0 ? "warning" : undefined },
              { value: "active", label: "Ativos", count: activeCount },
              { value: "inactive", label: "Inativos", count: inactiveCount },
            ]}
          />
          <Select
            aria-label="Cargo"
            value={roleFilter}
            onValueChange={setRoleFilter}
            className="w-full sm:ml-auto sm:w-48"
            options={[{ value: "all", label: "Todos os cargos" }, ...ROLE_OPTIONS]}
          />
        </div>

        <Surface className="overflow-hidden">
          {loading && profiles.length === 0 ? (
            <EmptyState title="Carregando usuários…" />
          ) : filteredProfiles.length === 0 ? (
            <EmptyState
              title="Nenhum usuário encontrado"
              description={searchQuery ? `Nada corresponde a "${searchQuery}".` : "Não há contas com estes filtros."}
            />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filteredProfiles.map((profile) => {
                const isPending = profile.status === "pending";
                const isInactive = !isPending && profile.status !== "active";
                const status = statusMeta(profile.status);
                const name = profile.full_name || profile.user_email.split("@")[0];
                const available = clients.filter((c) => !profile.client_access.some((a) => a.client_id === c.id));
                return (
                  <li key={profile.id} className={cn("group relative flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center", isInactive && "opacity-70", isPending && "bg-amber-500/[0.04] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-amber-400 before:content-['']")}>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar name={name} src={profile.avatar_url} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-medium text-zinc-100">{name}</span>
                          <span className="text-sm text-zinc-500">· {ROLE_LABELS[profile.role] ?? profile.role}</span>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <span className="truncate">{profile.user_email}</span>
                          <IconButton
                            label="Copiar e-mail"
                            size="sm"
                            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                            icon={<Copy />}
                            onClick={() => void copyToClipboard(profile.user_email)}
                          />
                        </div>
                        {profile.bio && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{profile.bio}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-[52px] lg:pl-0">
                      <Popover
                        align="end"
                        className="w-72"
                        trigger={
                          <Button variant="secondary" size="sm" className="max-w-[12rem]">
                            <span className="truncate">{unitsLabel(profile)}</span>
                          </Button>
                        }
                      >
                        <div className="space-y-3 p-3">
                          <p className="text-xs text-zinc-400">
                            {profile.role === "admin" ? "Administradores veem todas as unidades." : "Unidades que esta pessoa pode ver."}
                          </p>
                          {profile.client_access.length > 0 && (
                            <ul className="space-y-1">
                              {profile.client_access.map((access, i) => (
                                <li key={`${access.client_id}-${i}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-white/[0.04]">
                                  <span className="truncate">{clientName(access)}</span>
                                  <IconButton label={`Desvincular ${clientName(access)}`} size="sm" icon={<X />} onClick={() => void handleRevokeAccess(access.id)} />
                                </li>
                              ))}
                            </ul>
                          )}
                          {profile.role !== "admin" && available.length > 0 && (
                            <Select
                              aria-label="Vincular unidade"
                              value=""
                              placeholder="Vincular unidade…"
                              size="sm"
                              onValueChange={(cid) => { if (cid) void handleGrantAccess(profile.id, cid); }}
                              options={available.map((c) => ({ value: c.id, label: c.name, description: c.client_group }))}
                            />
                          )}
                        </div>
                      </Popover>

                      {isPending ? (
                        <>
                          <Button variant="primary" size="sm" onClick={() => void openApproveModal(profile)}>Aprovar</Button>
                          <Button variant="ghost" size="sm" onClick={() => void handleReject(profile)}>Recusar</Button>
                        </>
                      ) : (
                        <>
                          <Select
                            aria-label={`Cargo de ${name}`}
                            value={profile.role}
                            size="sm"
                            className="w-40"
                            onValueChange={(v) => void handleRoleChange(profile, v)}
                            options={[...ROLE_OPTIONS, { value: "none", label: "Sem acesso" }]}
                          />
                          <ActionsMenu
                            label={`Mais ações para ${name}`}
                            size="sm"
                            items={[
                              { label: "Redefinir senha", onSelect: () => { setResetPasswordProfile(profile); setNewPasswordInput(""); setPasswordError(""); } },
                              { label: "Desativar ou excluir", tone: "danger", onSelect: () => { setConfirmDelete(profile); setDeletePermanent(false); } },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>
      </Page>

      {/* Redefinir senha */}
      <Dialog
        open={Boolean(resetPasswordProfile)}
        onOpenChange={(open) => { if (!open) setResetPasswordProfile(null); }}
        size="sm"
        title="Redefinir senha"
        description={resetPasswordProfile ? `${resetPasswordProfile.full_name || resetPasswordProfile.user_email} · ${resetPasswordProfile.user_email}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetPasswordProfile(null)}>Cancelar</Button>
            <Button type="submit" form="reset-password-form" variant="primary" loading={resettingPassword}>Redefinir senha</Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={handleResetPassword} noValidate className="space-y-3">
          <Field label="Nova senha" htmlFor="reset-password" error={passwordError} hint="Envie a senha à pessoa por um canal seguro; ela pode trocá-la em Configurações.">
            <Input
              id="reset-password"
              autoComplete="new-password"
              value={newPasswordInput}
              aria-invalid={Boolean(passwordError) || undefined}
              onChange={(e) => { setNewPasswordInput(e.target.value); setPasswordError(""); }}
              className="font-mono"
              trailing={newPasswordInput ? <IconButton label="Copiar senha" size="sm" icon={<Copy />} onClick={() => void copyToClipboard(newPasswordInput, "Senha")} /> : undefined}
            />
          </Field>
          <Button variant="secondary" size="sm" onClick={() => { setNewPasswordInput(generateStrongPassword()); setPasswordError(""); }}>
            <Sparkles />Gerar senha forte
          </Button>
        </form>
      </Dialog>

      {/* Aprovar cadastro */}
      <Dialog
        open={Boolean(approvingProfile)}
        onOpenChange={(open) => { if (!open) setApprovingProfile(null); }}
        size="md"
        title="Aprovar cadastro"
        description={approvingProfile ? `${approvingProfile.full_name || approvingProfile.user_email} · ${approvingProfile.user_email}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApprovingProfile(null)}>Cancelar</Button>
            <Button variant="primary" loading={approving} onClick={() => void handleConfirmApprove()}>Aprovar e liberar acesso</Button>
          </>
        }
      >
        <div className="space-y-4">
          {approvingProfile?.bio && <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">{approvingProfile.bio}</p>}
          <Field label="Cargo">
            <Select aria-label="Cargo" value={approveRole} onValueChange={setApproveRole} options={ROLE_OPTIONS.map((o) => (o.value === "admin" ? { ...o, label: "Admin (acesso total)" } : o))} />
          </Field>
          {approveRole !== "admin" && (
            <Field label={`Unidades (${approveClientIds.length} selecionadas)`}>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
                {clients.map((c) => (
                  <CheckboxField
                    key={c.id}
                    id={`approve-${c.id}`}
                    className="rounded-md px-1.5 py-1 hover:bg-white/[0.03]"
                    label={c.name}
                    description={c.client_group}
                    checked={approveClientIds.includes(c.id)}
                    onCheckedChange={(checked) =>
                      setApproveClientIds((prev) => (checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                    }
                  />
                ))}
              </div>
            </Field>
          )}
        </div>
      </Dialog>

      {/* Novo usuário */}
      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        size="sm"
        title="Novo usuário"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" form="novo-usuario-form" variant="primary" loading={saving}>Cadastrar</Button>
          </>
        }
      >
        <form id="novo-usuario-form" onSubmit={handleCreate} noValidate className="space-y-4">
          <Field label="E-mail" htmlFor="novo-usuario-email" required error={formEmailError}>
            <Input id="novo-usuario-email" type="email" value={formEmail} aria-invalid={Boolean(formEmailError) || undefined} onChange={(e) => { setFormEmail(e.target.value); setFormEmailError(""); }} placeholder="pessoa@vidacard.com.br" />
          </Field>
          <Field label="Nome completo" htmlFor="novo-usuario-nome" optional>
            <Input id="novo-usuario-nome" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} />
          </Field>
          <Field label="Cargo">
            <Select aria-label="Cargo" value={formRole} onValueChange={setFormRole} options={ROLE_OPTIONS} />
          </Field>
          <Field label="Senha inicial" htmlFor="novo-usuario-senha" optional hint="Deixe vazio para gerar uma senha temporária.">
            <Input id="novo-usuario-senha" autoComplete="new-password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="font-mono" />
          </Field>
        </form>
      </Dialog>

      {/* Desativar ou excluir */}
      <Dialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => { if (!open) { setConfirmDelete(null); setDeletePermanent(false); } }}
        size="sm"
        title="Desativar ou excluir"
        description={confirmDelete ? confirmDelete.full_name || confirmDelete.user_email : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeletePermanent(false); }}>Cancelar</Button>
            <Button variant="danger" onClick={() => void handleDelete()}>{deletePermanent ? "Excluir definitivamente" : "Desativar"}</Button>
          </>
        }
      >
        <RadioGroup value={deletePermanent ? "delete" : "disable"} onValueChange={(v) => setDeletePermanent(v === "delete")} aria-label="O que fazer">
          <RadioOption id="del-disable" value="disable" label="Desativar (recomendado)" description="A pessoa não consegue mais entrar; o histórico fica preservado e dá para reativar." />
          <RadioOption id="del-delete" value="delete" tone="danger" label="Excluir definitivamente" description="Remove o perfil e todos os vínculos com unidades. Não dá para desfazer." />
        </RadioGroup>
      </Dialog>
    </AppLayout>
  );
}
