import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  MessageSquare,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
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
      {/* Background Ambient Glows & Subtle Grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Radial Glow Top Left */}
        <div
          className="absolute -top-40 -left-40 size-[650px] rounded-full opacity-20 blur-[130px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(5, 150, 105, 0.1) 60%, transparent 80%)",
          }}
        />
        {/* Radial Glow Bottom Right */}
        <div
          className="absolute -bottom-40 -right-40 size-[650px] rounded-full opacity-15 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(16, 185, 129, 0.1) 60%, transparent 80%)",
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

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-all duration-300 shadow-lg shadow-black/40">
            <span className="font-display font-black text-base text-emerald-400">TP</span>
          </div>
          <div>
            <div className="font-display text-base font-bold tracking-[0.18em] text-white">
              TRÁFEGO <span className="text-zinc-400 font-light">PRO</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
              Performance & Gestão
            </div>
          </div>
        </a>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span className="text-xs text-zinc-400">Conexão Criptografada SSL 256-bit</span>
        </div>
      </header>

      {/* Main Content: Split Grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-5xl">
          
          {/* Left Column: Platform Highlights & Value Props (Hidden on mobile, rich on desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>Central Integrada de Resultados</span>
              </div>
              <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.15]">
                Potencialize a gestão de anúncios e contratações.
              </h1>
              <p className="text-sm xl:text-base text-zinc-400 leading-relaxed font-light">
                Acesse métricas em tempo real de tráfego pago, feedback comercial de leads e o novo banco de talentos unificado para todas as unidades.
              </p>
            </div>

            {/* Feature Cards Showcase */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.025] p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.04]">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Painel de Performance Meta Ads</h4>
                  <p className="text-[11px] text-zinc-400">Investimento, custo por lead e acompanhamento diário por unidade.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.025] p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.04]">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                  <UsersRound className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Banco de Talentos Inteligente</h4>
                  <p className="text-[11px] text-zinc-400">Formulários sob medida, funil de candidatos e download de currículos.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.025] p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.04]">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Qualificação & Feedback de Vendas</h4>
                  <p className="text-[11px] text-zinc-400">Alinhamento direto entre time comercial e inteligência de tráfego.</p>
                </div>
              </div>
            </div>

            {/* Bottom Proof Quote */}
            <div className="flex items-center gap-3 pt-2 text-xs text-zinc-500 border-t border-white/5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Ambiente corporativo seguro para administradores e gestores da rede Vida Card.</span>
            </div>
          </div>

          {/* Right Column: Modern Glassmorphic Login Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 p-7 sm:p-9 backdrop-blur-2xl shadow-2xl shadow-black/80 relative">
              
              {/* Card Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                    Acesso Restrito
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Acesse sua conta
                </h2>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Entre com suas credenciais de gestor para acessar o painel.
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
                      placeholder="ex: seu.nome ou seu@email.com"
                      required
                      autoFocus={!identifier}
                      autoComplete="username"
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/80 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Senha de Acesso
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
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 pl-10 pr-11 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/80 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
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
                    Acesso corporativo
                  </span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 p-3.5 text-sm font-bold text-zinc-950 hover:from-emerald-400 hover:to-emerald-300 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar no Painel</span>
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Security Notice */}
              <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-center text-[11px] text-zinc-500">
                <ShieldCheck className="size-3.5 text-zinc-500" />
                <span>Painel protegido por autenticação e isolamento de dados.</span>
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
          <span>Vida Card Gestão</span>
          <span>•</span>
          <a href="/" className="hover:text-zinc-300 transition">Voltar ao site</a>
        </div>
      </footer>
    </div>
  );
}
