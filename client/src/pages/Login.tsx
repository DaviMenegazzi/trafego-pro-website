import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { markDashboardPostLoginRefresh } from "@/lib/dashboardAuthSignal";

export default function Login() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Detecta se o identificador é email ou nome de usuário
      const isEmail = identifier.includes("@");
      const body = isEmail
        ? { email: identifier, password }
        : { name: identifier, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Credenciais inválidas");
        return;
      }
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      markDashboardPostLoginRefresh();
      navigate("/dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#0a0a0a", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.4 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <a href="/" className="mb-10 z-10">
        <img
          src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp"
          alt="Tráfego Pro"
          style={{ height: "22px", width: "auto" }}
        />
      </a>

      {/* Card */}
      <div
        className="z-10 w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h1
          className="text-white text-2xl mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300 }}
        >
          Acesso restrito
        </h1>
        <p className="text-gray-500 text-sm mb-8" style={{ fontWeight: 300 }}>
          Entre com suas credenciais para acessar o dashboard.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs uppercase tracking-widest" style={{ fontWeight: 300 }}>
              Usuário ou E-mail
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="nome ou email"
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.35)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs uppercase tracking-widest" style={{ fontWeight: 300 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.35)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center" style={{ fontWeight: 300 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 text-sm font-medium transition-all mt-2"
            style={{
              background: loading ? "rgba(255,255,255,0.1)" : "#ffffff",
              color: loading ? "#666" : "#0a0a0a",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transform: "scale(1)",
              transition: "all 0.16s cubic-bezier(0.23, 1, 0.32, 1)",
            }}
            onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)")}
            onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <p className="z-10 mt-8 text-gray-700 text-xs" style={{ fontWeight: 300 }}>
        © 2024 Tráfego Pro. Acesso restrito.
      </p>
    </div>
  );
}
