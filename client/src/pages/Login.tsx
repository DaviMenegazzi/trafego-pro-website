import { Button, CheckboxField, Field, IconButton, InlineNotice, Input } from "@/components/ds";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { saveConsent } from "@/lib/consent";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  UsersRound,
  BarChart3,
} from "lucide-react";
import { markDashboardPostLoginRefresh } from "@/lib/dashboardAuthSignal";

export default function Login() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (token) navigate("/dashboard");

    const savedIdentifier = localStorage.getItem("tp_remember_identifier");
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Preencha o usuário e a senha.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const isEmail = identifier.includes("@");
      const body = isEmail
        ? { email: identifier.trim(), password }
        : { name: identifier.trim(), password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Usuário ou senha incorretos. Verifique suas credenciais.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("tp_remember_identifier", identifier.trim());
      } else {
        localStorage.removeItem("tp_remember_identifier");
      }

      localStorage.setItem("tp_token", data.token);
      saveConsent("granted");
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      sessionStorage.removeItem("tp_cached_clients");
      localStorage.removeItem("tp_db");
      markDashboardPostLoginRefresh();
      navigate("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Ambient Top Emerald Glow */}
        <div
          className="absolute -top-40 -left-40 size-[700px] rounded-full opacity-20 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(5, 150, 105, 0.1) 60%, transparent 80%)",
          }}
        />
        {/* Ambient Bottom Slate Glow */}
        <div
          className="absolute -bottom-40 -right-40 size-[650px] rounded-full opacity-15 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(30, 41, 59, 0.4) 60%, transparent 80%)",
          }}
        />
        {/* Subtle geometric dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Main Content: Clean Centered Split Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 md:py-16 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full max-w-5xl">
          
          {/* Left Column: Minimalist Executive Headline & Platform Highlights */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-7 pr-2">
            <div className="space-y-4">
              {/* Minimalist Headline with Subtle Shimmer */}
              <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.18]">
                Gestão inteligente.<br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-zinc-400 bg-clip-text text-transparent">
                  A rede inteira num só lugar.
                </span>
              </h1>

              <p className="text-sm xl:text-base text-zinc-400 leading-relaxed font-light max-w-lg">
                Um ambiente integrado para acompanhar métricas de tráfego, gerenciar processos e potencializar suas operações com agilidade.
              </p>
            </div>

            {/* Feature Highlights with Slate & Emerald Accents */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition hover:border-emerald-500/30 hover:bg-zinc-900/70">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Indicadores e métricas</h4>
                  <p className="text-[11px] text-zinc-400">Acompanhamento consolidado de dados e performance.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition hover:border-emerald-500/30 hover:bg-zinc-900/70">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 shrink-0">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Banco de talentos e recrutamento</h4>
                  <p className="text-[11px] text-zinc-400">Formulários sob medida e funil de seleção de candidatos.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition hover:border-emerald-500/30 hover:bg-zinc-900/70">
                <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Retorno comercial dos leads</h4>
                  <p className="text-[11px] text-zinc-400">Feedbacks estruturados e acompanhamento de leads.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Modern Glass Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black/80 relative">
              
              <div className="mb-7">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Entrar</h2>
                <p className="mt-1.5 text-sm text-zinc-400">Use o usuário ou o e-mail cadastrado.</p>
              </div>

              {error && (
                <InlineNotice tone="critical" className="mb-5">
                  <span role="alert">{error}</span>
                </InlineNotice>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Field label="Usuário ou e-mail" htmlFor="login-identifier">
                  <Input
                    id="login-identifier"
                    size="lg"
                    leading={<User />}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="seu.usuario ou seu@email.com"
                    autoFocus={!identifier}
                    autoComplete="username"
                    disabled={loading}
                  />
                </Field>

                <Field label="Senha" htmlFor="login-password">
                  <Input
                    id="login-password"
                    size="lg"
                    leading={<Lock />}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    trailing={
                      <IconButton
                        label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        size="sm"
                        icon={showPassword ? <EyeOff /> : <Eye />}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    }
                  />
                </Field>

                <CheckboxField id="login-remember" label="Lembrar meu usuário" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />

                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {loading ? "Entrando…" : "Entrar"}
                  {!loading && <ArrowRight />}
                </Button>

                <p className="pt-1 text-center text-sm text-zinc-400">
                  Não tem conta?{" "}
                  <Link href="/cadastro" className="font-medium text-emerald-300 underline-offset-4 hover:underline">
                    Solicitar cadastro
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5 text-xs text-zinc-500">
        <div>
          © {new Date().getFullYear()} Tráfego Pro · Todos os direitos reservados.
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="hover:text-zinc-300 transition">Voltar ao site</a>
        </div>
      </footer>
    </div>
  );
}
