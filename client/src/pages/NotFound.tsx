import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ds";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const hasSession = typeof window !== "undefined" && Boolean(localStorage.getItem("tp_token"));

  useEffect(() => {
    document.title = "Página não encontrada — Tráfego Pro";
  }, []);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#050505] px-6 text-center">
      <p className="font-display text-sm font-semibold tracking-[0.14em] text-white">
        TRÁFEGO<span className="text-zinc-500"> PRO</span>
      </p>
      <p className="mt-10 font-display text-6xl font-semibold tracking-[-0.04em] text-zinc-700">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
        O endereço pode ter mudado ou não existe mais. Confira o link ou volte para o início.
      </p>
      <Button variant="primary" size="lg" className="mt-8" onClick={() => setLocation(hasSession ? "/dashboard" : "/")}>
        <ArrowLeft />
        {hasSession ? "Voltar para a Dashboard" : "Voltar ao início"}
      </Button>
    </div>
  );
}
