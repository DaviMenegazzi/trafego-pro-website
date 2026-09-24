import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button, Field, IconButton, Input, Page, PageHeader, Surface, SurfaceHeader, TabBar } from "@/components/ds";

// Mesmo mínimo do servidor (server/accountSettings.ts).
const MIN_PASSWORD_LENGTH = 6;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("tp_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return typeof data?.error === "string" ? data.error : fallback;
}

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

/** Campo de senha com o próprio botão de mostrar (revelar um não revela os outros). */
function PasswordField({ id, label, value, onChange, error, hint, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
        trailing={
          <IconButton
            label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            size="sm"
            icon={visible ? <EyeOff /> : <Eye />}
            onClick={() => setVisible((v) => !v)}
          />
        }
      />
    </Field>
  );
}

export default function DashboardConfiguracoesPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro — Configurações"; }, []);
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tp_user") ?? "{}"); } catch { return {}; }
  });
  const [savedName, setSavedName] = useState<string>(() => profile.name ?? "");
  const [nameError, setNameError] = useState("");
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [pwdErrors, setPwdErrors] = useState<Partial<Record<"current" | "next" | "confirm", string>>>({});
  const [saving, setSaving] = useState(false);

  // O nome é gravado no servidor; e-mail e perfil de acesso só a administração altera.
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if ((profile.name ?? "").trim().length < 3) { setNameError("Use pelo menos 3 caracteres"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH", headers: authHeaders(), credentials: "include", body: JSON.stringify({ name: profile.name }),
      });
      if (!response.ok) { toast.error(await readError(response, "Não foi possível salvar o nome")); return; }
      const data = await response.json();
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      setProfile(data.user);
      setSavedName(data.user?.name ?? "");
      toast.success("Nome atualizado");
    } catch {
      toast.error("Sem conexão com o servidor");
    } finally {
      setSaving(false);
    }
  }

  async function changePwd(event: React.FormEvent) {
    event.preventDefault();
    const next = {
      current: pwdForm.current ? undefined : "Informe a senha atual",
      next: !pwdForm.next ? "Informe a nova senha" : pwdForm.next.length < MIN_PASSWORD_LENGTH ? `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres` : pwdForm.next === pwdForm.current ? "A nova senha precisa ser diferente da atual" : undefined,
      confirm: pwdForm.confirm === pwdForm.next ? undefined : "As senhas não coincidem",
    };
    setPwdErrors(next);
    const first = (Object.keys(next) as (keyof typeof next)[]).find((k) => next[k]);
    if (first) { document.getElementById(`pwd-${first}`)?.focus(); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      if (!response.ok) { toast.error(await readError(response, "Não foi possível alterar a senha")); return; }
      toast.success("Senha alterada");
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Sem conexão com o servidor");
    } finally {
      setSaving(false);
    }
  }

  const setPwd = (key: "current" | "next" | "confirm", value: string) => {
    setPwdForm((p) => ({ ...p, [key]: value }));
    setPwdErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <AppLayout>
      <Page width="narrow">
        <PageHeader title="Configurações" subtitle="Sua conta e sua senha.">
          <TabBar
            aria-label="Seções"
            value={tab}
            onValueChange={setTab}
            tabs={[{ value: "profile", label: "Perfil" }, { value: "security", label: "Segurança" }]}
          />
        </PageHeader>

        {tab === "profile" && (
          <Surface>
            <SurfaceHeader title="Perfil" />
            <form onSubmit={saveProfile} noValidate className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome" htmlFor="profile-name" error={nameError}>
                  <Input id="profile-name" autoComplete="name" value={profile.name ?? ""} aria-invalid={Boolean(nameError) || undefined} onChange={(e) => { setProfile((p: any) => ({ ...p, name: e.target.value })); setNameError(""); }} />
                </Field>
                <Field label="E-mail" htmlFor="profile-email" hint="Para trocar o e-mail, fale com um administrador.">
                  <Input id="profile-email" type="email" value={profile.email ?? ""} readOnly disabled />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={saving} disabled={(profile.name ?? "") === savedName}>Salvar</Button>
              </div>
            </form>
          </Surface>
        )}

        {tab === "security" && (
          <Surface>
            <SurfaceHeader title="Alterar senha" />
            <form onSubmit={changePwd} noValidate className="space-y-4 p-5">
              <div className="max-w-sm space-y-4">
                <PasswordField id="pwd-current" label="Senha atual" autoComplete="current-password" value={pwdForm.current} onChange={(v) => setPwd("current", v)} error={pwdErrors.current} />
                <PasswordField id="pwd-next" label="Nova senha" autoComplete="new-password" value={pwdForm.next} onChange={(v) => setPwd("next", v)} error={pwdErrors.next} hint={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres, diferente da atual.`} />
                <PasswordField id="pwd-confirm" label="Confirmar nova senha" autoComplete="new-password" value={pwdForm.confirm} onChange={(v) => setPwd("confirm", v)} error={pwdErrors.confirm} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={saving}>Alterar senha</Button>
              </div>
            </form>
          </Surface>
        )}
      </Page>
    </AppLayout>
  );
}
