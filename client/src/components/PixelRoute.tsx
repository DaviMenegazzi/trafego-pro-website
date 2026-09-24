import { useEffect, useState } from "react";
import { Route, useLocation } from "wouter";
import { toast } from "sonner";
import { canAccessPixel } from "@/lib/pixelAccessPolicy";

interface PixelRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

function PixelAccessGate({ component: Component, params }: { component: React.ComponentType<any>; params: Record<string | number, string | undefined> }) {
  const [, setLocation] = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) {
      setLocation("/login");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then(async (response) => {
        if (response.status === 401) {
          setLocation("/login");
          return null;
        }
        if (!response.ok) throw new Error("Não foi possível validar o acesso ao Pixel.");
        return response.json();
      })
      .then((user) => {
        if (!user) return;
        localStorage.setItem("tp_user", JSON.stringify(user));
        const hasAccess = canAccessPixel(user);
        setAllowed(hasAccess);
        if (!hasAccess) {
          toast.error("O Pixel não está liberado para este usuário.");
          setLocation("/dashboard");
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Falha ao validar o acesso ao Pixel.");
        setLocation("/dashboard");
      });
  }, [setLocation]);

  if (allowed !== true) return null;
  return <Component {...params} />;
}

export function PixelRoute({ path, component }: PixelRouteProps) {
  return (
    <Route path={path}>
      {(params) => <PixelAccessGate component={component} params={params} />}
    </Route>
  );
}
