import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button, Field, IconButton, InlineNotice, Input } from "@/components/ds";

export default function Register() {
  const [, navigate] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
      setError("Preencha nome, e-mail, senha e confirmação.");
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
              <h1 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.2]">
                Solicite seu acesso à plataforma.
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Cada cadastro é revisado por um administrador, que libera as unidades que você pode ver.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">1. Envie seus dados</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Nome, e-mail e senha de acesso.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="size-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">2. Um administrador revisa</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">E vincula sua conta às unidades certas.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Register Form Card */}
          <div className="w-full lg:col-span-7 max-w-lg mx-auto">
            <div className="relative rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
              
              {/* Header */}
              <div className="mb-7">
                <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                  {submitted ? "Solicitação enviada" : "Solicitar cadastro"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {submitted
                    ? "Seus dados foram registrados com sucesso."
                    : "Um administrador aprova o acesso antes do primeiro login."}
                </p>
              </div>

              {submitted ? (
                /* Success State */
                <div className="space-y-6 text-center py-4">
                  <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto ">
                    <CheckCircle2 className="size-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-white">Aguardando aprovação</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                      Um administrador vai revisar seus dados e liberar o acesso. Você poderá entrar com o e-mail e a senha que cadastrou.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left text-xs space-y-1.5 text-zinc-400">
                    <div><span className="text-zinc-500">Nome:</span> <span className="text-zinc-200 font-medium">{fullName}</span></div>
                    <div><span className="text-zinc-500">E-mail:</span> <span className="text-zinc-200 font-medium">{email}</span></div>
                  </div>

                  <div className="pt-2">
                    <Button variant="primary" size="lg" className="w-full" onClick={() => navigate("/login")}>
                      Ir para o login <ArrowRight />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {error && (
                    <InlineNotice tone="critical"><span role="alert">{error}</span></InlineNotice>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nome completo" htmlFor="reg-name" required>
                      <Input id="reg-name" size="lg" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex.: João da Silva" />
                    </Field>
                    <Field label="E-mail" htmlFor="reg-email" required>
                      <Input id="reg-email" size="lg" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
                    </Field>
                  </div>

                  <Field label="Cargo ou função" htmlFor="reg-role" optional hint="Ajuda o administrador a liberar as unidades certas.">
                    <Input id="reg-role" size="lg" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Gestor da unidade" />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Senha" htmlFor="reg-password" required hint="Pelo menos 6 caracteres.">
                      <Input
                        id="reg-password"
                        size="lg"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        trailing={<IconButton label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} size="sm" icon={showPassword ? <EyeOff /> : <Eye />} onClick={() => setShowPassword(!showPassword)} />}
                      />
                    </Field>
                    <Field label="Confirmar senha" htmlFor="reg-confirm" required>
                      <Input
                        id="reg-confirm"
                        size="lg"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        trailing={<IconButton label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"} aria-pressed={showConfirmPassword} size="sm" icon={showConfirmPassword ? <EyeOff /> : <Eye />} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />}
                      />
                    </Field>
                  </div>

                  <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                    {loading ? "Enviando…" : "Solicitar acesso"}
                    {!loading && <ArrowRight />}
                  </Button>

                  <p className="pt-1 text-center text-sm text-zinc-400">
                    Já tem conta?{" "}
                    <Link href="/login" className="font-medium text-emerald-300 underline-offset-4 hover:underline">Entrar</Link>
                  </p>
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
