import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Settings, User, Lock, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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

export default function DashboardConfiguracoesPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Configurações"; }, []);
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [showPwd, setShowPwd] = useState(false);
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tp_user") ?? "{}"); } catch { return {}; }
  });
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  // O nome é gravado no servidor; e-mail e perfil de acesso só a administração altera.
  async function saveProfile() {
    if ((profile.name ?? "").trim().length < 3) { toast.error("O nome deve ter pelo menos 3 caracteres"); return; }
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
      toast.success("Nome atualizado");
    } catch {
      toast.error("Sem conexão com o servidor");
    } finally {
      setSaving(false);
    }
  }

  async function changePwd() {
    if (!pwdForm.current || !pwdForm.next) { toast.error("Preencha todos os campos"); return; }
    if (pwdForm.next !== pwdForm.confirm) { toast.error("As senhas não coincidem"); return; }
    if (pwdForm.next.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      if (!response.ok) { toast.error(await readError(response, "Não foi possível alterar a senha")); return; }
      toast.success("Senha alterada com sucesso");
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Sem conexão com o servidor");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "profile" as const, label: "Perfil", icon: User },
    { id: "security" as const, label: "Segurança", icon: Lock },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 max-w-[800px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="size-5 text-primary" /> Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-semibold">Informações do Perfil</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input value={profile.name ?? ""} onChange={e => setProfile((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
                <input value={profile.email ?? ""} readOnly disabled type="email" title="Para trocar o e-mail, fale com um administrador"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none opacity-60" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => void saveProfile()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Save className="size-3.5" /> Salvar
              </button>
            </div>
          </div>
        )}

        {tab === "security" && (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-semibold">Alterar Senha</h2>
            <div className="space-y-3 max-w-sm">
              {[
                { label: "Senha atual", key: "current" as const },
                { label: "Nova senha", key: "next" as const },
                { label: "Confirmar nova senha", key: "confirm" as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                  <div className="relative">
                    <input value={pwdForm[f.key]} onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      type={showPwd ? "text" : "password"}
                      className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 pr-9 outline-none focus:ring-1 focus:ring-primary" />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => void changePwd()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Lock className="size-3.5" /> Alterar senha
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
