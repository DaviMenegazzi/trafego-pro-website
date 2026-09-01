import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { shouldRedirectToLogin } from "./adminAuthPolicy";

export interface AdminUser {
  email: string;
  role: string;
  name: string;
  allowedClientIds?: string[];
}

export function useAdminAuth() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    const userStr = localStorage.getItem("tp_user");

    // Validação de sessão no servidor via cookies HttpOnly + fallback token
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch("/api/auth/me", {
      headers,
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("tp_token");
          localStorage.removeItem("tp_user");
          navigate("/login");
          return null;
        }
        return res.json();
      })
      .then((serverClaims) => {
        if (serverClaims && serverClaims.email) {
          const verifiedUser: AdminUser = {
            email: serverClaims.email,
            name: serverClaims.name,
            role: serverClaims.role,
            allowedClientIds: serverClaims.allowedClientIds,
          };

          if (shouldRedirectToLogin(token || "cookie-authenticated", JSON.stringify(verifiedUser), true)) {
            localStorage.removeItem("tp_token");
            localStorage.removeItem("tp_user");
            navigate("/login");
            return;
          }

          localStorage.setItem("tp_user", JSON.stringify(verifiedUser));
          setUser(verifiedUser);
        } else if (userStr) {
          try {
            setUser(JSON.parse(userStr));
          } catch {
            navigate("/login");
          }
        }
      })
      .catch(() => {
        if (!userStr) {
          navigate("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function logout() {
    try {
      const token = localStorage.getItem("tp_token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
    } catch (err) {
      console.warn("Aviso ao encerrar sessão:", err);
    } finally {
      localStorage.removeItem("tp_token");
      localStorage.removeItem("tp_user");
      navigate("/login");
    }
  }

  return { user, loading, logout };
}

export function getToken(): string | null {
  return localStorage.getItem("tp_token");
}
