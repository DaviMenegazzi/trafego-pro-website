import { useEffect } from "react";
import { Route, useLocation } from "wouter";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

interface AdminRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function checkAdminAuth(): { isAuthenticated: boolean; isAdmin: boolean } {
  if (typeof window === "undefined") return { isAuthenticated: false, isAdmin: false };
  const token = localStorage.getItem("tp_token");
  if (!token) return { isAuthenticated: false, isAdmin: false };

  try {
    const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    const isAdmin = user?.role === "admin" || user?.allowedClientIds?.includes("*") === true;
    return { isAuthenticated: true, isAdmin: Boolean(isAdmin) };
  } catch {
    return { isAuthenticated: false, isAdmin: false };
  }
}

function RedirectToLogin({ setLocation }: { setLocation: (to: string) => void }) {
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);

  return null;
}

function AccessDeniedRedirect({ setLocation }: { setLocation: (to: string) => void }) {
  useEffect(() => {
    // Purge any cached financial DB data if present in unauthorized session
    try {
      localStorage.removeItem("tp_db");
    } catch {
      // ignore
    }
    toast.error("Acesso negado: área restrita a administradores.");
    setLocation("/dashboard");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="text-xl font-bold">Acesso Restrito</h1>
      <p className="text-sm text-zinc-400 mt-1 max-w-sm">
        Você não possui permissão de administrador para acessar este módulo. Redirecionando para a Dashboard...
      </p>
    </div>
  );
}

export function AdminRoute({ path, component: Component }: AdminRouteProps) {
  const [, setLocation] = useLocation();

  return (
    <Route path={path}>
      {(params) => {
        const { isAuthenticated, isAdmin } = checkAdminAuth();
        if (!isAuthenticated) {
          return <RedirectToLogin setLocation={setLocation} />;
        }
        if (!isAdmin) {
          return <AccessDeniedRedirect setLocation={setLocation} />;
        }
        return <Component {...params} />;
      }}
    </Route>
  );
}
