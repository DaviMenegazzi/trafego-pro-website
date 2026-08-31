import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  BarChart3,
  Loader2,
  AlertCircle,
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
      setError("Por favor, preencha todos os campos.");
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
      localStorage.setItem("tp_user", JSON.stringify(data.user));
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
                  Performance em tempo real.
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
                  <h4 className="text-xs font-semibold text-zinc-200">Painéis de Indicadores & Métricas</h4>
                  <p className="text-[11px] text-zinc-400">Acompanhamento consolidado de dados e performance.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition hover:border-emerald-500/30 hover:bg-zinc-900/70">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 shrink-0">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Banco de Talentos & Recrutamento</h4>
                  <p className="text-[11px] text-zinc-400">Formulários sob medida e funil de seleção de candidatos.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition hover:border-emerald-500/30 hover:bg-zinc-900/70">
                <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Retorno Comercial & Qualificação</h4>
                  <p className="text-[11px] text-zinc-400">Feedbacks estruturados e acompanhamento de leads.</p>
                </div>
              </div>
            </div>

            {/* Bottom Proof Note */}
            <div className="flex items-center gap-2.5 pt-2 text-xs text-zinc-500 border-t border-white/5">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              <span>Acesso seguro com permissões personalizadas para o seu perfil.</span>
            </div>
          </div>

          {/* Right Column: Modern Glass Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black/80 relative">
              
              {/* Card Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400 font-mono">
                    Acesso Seguro
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Entrar na conta
                </h2>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Informe suas credenciais para acessar o painel.
                </p>
              </div>

              {/* Error Alert Card */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-in fade-in duration-200">
                  <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="leading-relaxed flex-1">{error}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Usuário ou E-mail
                  </label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                      <User className="size-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="seu.usuario ou seu@email.com"
                      required
                      autoFocus={!identifier}
                      autoComplete="username"
                      disabled={loading}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Senha
                    </label>
                  </div>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                      <Lock className="size-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-11 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Options: Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded-md border-zinc-700 bg-zinc-950 text-emerald-500 accent-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-xs text-zinc-400 hover:text-zinc-300 transition">
                      Lembrar meu usuário
                    </span>
                  </label>

                  <span className="text-[11px] text-zinc-500">
                    Acesso protegido
                  </span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-3.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <span>Acessar Painel</span>
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>

                {/* Cadastro Link */}
                <div className="pt-2 text-center">
                  <Link
                    href="/cadastro"
                    className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    Não possui uma conta? <span className="font-medium text-emerald-400 underline underline-offset-4">Solicitar cadastro</span>
                  </Link>
                </div>
              </form>

              {/* Bottom Security Badge */}
              <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-center text-[11px] text-zinc-500">
                <ShieldCheck className="size-3.5 text-zinc-500" />
                <span>Ambiente seguro com criptografia e controle de acesso.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5 text-[11px] text-zinc-500">
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
