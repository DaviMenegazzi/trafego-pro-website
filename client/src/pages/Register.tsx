import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedUnit, setRequestedUnit] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          requested_unit: requestedUnit.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível concluir seu cadastro. Verifique os dados.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Erro de comunicação com o servidor. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 -left-40 size-[700px] rounded-full opacity-20 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(5, 150, 105, 0.1) 60%, transparent 80%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 size-[650px] rounded-full opacity-15 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(30, 41, 59, 0.4) 60%, transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 md:py-16 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full max-w-5xl">
          
          {/* Left Column: Context & Information */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium tracking-wide">
                <ShieldCheck className="size-3.5" /> Acesso Seguro & Aprovado
              </div>
              <h1 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.2]">
                Solicite seu acesso à plataforma.<br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-zinc-400 bg-clip-text text-transparent">
                  Central de Performance
                </span>
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Por motivos de segurança e governança de dados, novos cadastros passam por triagem e validação dos administradores antes da liberação.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">1. Envio dos Dados</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Preencha suas informações corporativas e unidade de atuação.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="size-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">2. Revisão por Administrador</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Sua conta será analisada e vinculada às franquias autorizadas.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Register Form Card */}
          <div className="w-full lg:col-span-7 max-w-lg mx-auto">
            <div className="relative rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
              
              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90 font-mono">
                    Tráfego Pro
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                  {submitted ? "Solicitação Enviada" : "Novo Cadastro"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {submitted
                    ? "Seus dados foram registrados com sucesso."
                    : "Preencha as informações para solicitar liberação da sua conta."}
                </p>
              </div>

              {submitted ? (
                /* Success State */
                <div className="space-y-6 text-center py-4">
                  <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="size-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-white">Aguardando Aprovação</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                      Sua solicitação de cadastro foi registrada com sucesso no sistema. Um administrador revisará seus dados e liberará o seu acesso em breve.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left text-xs space-y-1.5 text-zinc-400">
                    <div><span className="text-zinc-500">Nome:</span> <span className="text-zinc-200 font-medium">{fullName}</span></div>
                    <div><span className="text-zinc-500">E-mail:</span> <span className="text-zinc-200 font-medium">{email}</span></div>
                    {requestedUnit && <div><span className="text-zinc-500">Unidade:</span> <span className="text-zinc-200 font-medium">{requestedUnit}</span></div>}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Ir para a tela de Login <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-200">
                      <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <User className="size-3.5 text-emerald-400/80" /> Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>

                    {/* E-mail Corporativo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Mail className="size-3.5 text-emerald-400/80" /> E-mail *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@empresa.com.br"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Unidade / Franquia de Interesse */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-emerald-400/80" /> Franquia / Unidade
                      </label>
                      <input
                        type="text"
                        value={requestedUnit}
                        onChange={(e) => setRequestedUnit(e.target.value)}
                        placeholder="Ex: Vida Card Passo Fundo"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>

                    {/* Cargo / Justificativa */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-emerald-400/80" /> Cargo / Função
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex: Gestor de Unidade / Sócio"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Senha */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Lock className="size-3.5 text-emerald-400/80" /> Senha *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                          className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmação de Senha */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Lock className="size-3.5 text-emerald-400/80" /> Confirmar Senha *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          required
                          className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Enviando Solicitação...
                        </>
                      ) : (
                        <>
                          Solicitar Acesso <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      Já possui uma conta? <span className="font-medium text-emerald-400 underline underline-offset-4">Fazer login</span>
                    </Link>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 text-center text-xs text-zinc-500 border-t border-zinc-900/60">
        © {new Date().getFullYear()} Tráfego Pro. Todos os direitos reservados.
      </footer>
    </div>
  );
}
