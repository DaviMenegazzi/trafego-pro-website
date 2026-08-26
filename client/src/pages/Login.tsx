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
  BarChart3,
  UsersRound,
  Inbox,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { markDashboardPostLoginRefresh } from "@/lib/dashboardAuthSignal";

const ROTATING_WORDS = [
  "performance",
  "crescimento",
  "recrutamento",
  "decisões ágeis",
  "resultados",
];

export default function Login() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  // Rotating title animation
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setFadeState("in");
      }, 300);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

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
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between selection:bg-white/20 selection:text-white relative overflow-hidden font-sans">
      {/* Background Ambient Neutral Glows & Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Subtle top ambient glow */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 size-[800px] rounded-full opacity-20 blur-[150px]"
          style={{
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(161, 161, 170, 0.05) 50%, transparent 80%)",
          }}
        />
        {/* Geometric subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* Main Content: Clean Centered Split Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center w-full max-w-5xl">
          
          {/* Left Column: Clean Animated Headline & Universal Overview */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-2">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-zinc-400 animate-pulse" />
                <span>Central de Gestão & Performance</span>
              </div>

              {/* Animated Headline */}
              <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-zinc-100 leading-[1.2]">
                Sua plataforma para impulsionar{" "}
                <span
                  className={`inline-block text-white transition-all duration-300 font-extrabold border-b-2 border-zinc-500 pb-0.5 ${
                    fadeState === "in"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1"
                  }`}
                >
                  {ROTATING_WORDS[currentWordIndex]}
                </span>
                .
              </h1>

              <p className="text-sm xl:text-base text-zinc-400 leading-relaxed font-light max-w-lg">
                Um ambiente unificado e intuitivo para acompanhar métricas, gerenciar processos e tomar decisões com agilidade.
              </p>
            </div>

            {/* Clean Feature List (Neutral & Generic) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/30 p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-zinc-900/50">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300 shrink-0">
                  <BarChart3 className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Painéis de Indicadores & Métricas</h4>
                  <p className="text-[11px] text-zinc-500">Acompanhamento consolidado e filtros inteligentes.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/30 p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-zinc-900/50">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300 shrink-0">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Banco de Talentos & Vagas</h4>
                  <p className="text-[11px] text-zinc-500">Gestão de formulários e funil de seleção de candidatos.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-900/30 p-3.5 backdrop-blur-sm transition hover:border-white/10 hover:bg-zinc-900/50">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300 shrink-0">
                  <Inbox className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Retorno Comercial & Qualificação</h4>
                  <p className="text-[11px] text-zinc-500">Acompanhamento de atendimentos e feedbacks operacionais.</p>
                </div>
              </div>
            </div>

            {/* Bottom Proof Note */}
            <div className="flex items-center gap-2.5 pt-2 text-xs text-zinc-500 border-t border-white/5">
              <ShieldCheck className="size-4 text-zinc-400 shrink-0" />
              <span>Acesso seguro com permissões personalizadas para o seu perfil.</span>
            </div>
          </div>

          {/* Right Column: Clean Neutral Glass Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black/80 relative">
              
              {/* Card Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-zinc-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    Acesso à Plataforma
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
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-focus-within:text-zinc-200 transition-colors">
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
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/90 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-400 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all duration-200"
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
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-focus-within:text-zinc-200 transition-colors">
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
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/90 pl-10 pr-11 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-400 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all duration-200"
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
                      className="size-4 rounded-md border-zinc-700 bg-zinc-950 text-white accent-white focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-xs text-zinc-400 hover:text-zinc-300 transition">
                      Lembrar meu usuário
                    </span>
                  </label>

                  <span className="text-[11px] text-zinc-500">
                    Acesso protegido
                  </span>
                </div>

                {/* Submit Button (Neutral White/Zinc Theme) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-white p-3.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-white/5 transition-all duration-200"
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

      {/* Footer (Neutral, No Unit/Specific Brand) */}
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
