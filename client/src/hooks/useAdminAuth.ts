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
    if (shouldRedirectToLogin(token, userStr, true)) {
      navigate("/login");
      setLoading(false);
      return;
    }
    // Verify token with server
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("tp_token");
          localStorage.removeItem("tp_user");
          navigate("/login");
          return null;
        }
        if (shouldRedirectToLogin(token, userStr, res.ok)) {
          localStorage.removeItem("tp_token");
          localStorage.removeItem("tp_user");
          navigate("/login");
          return null;
        }
        return JSON.parse(userStr!) as AdminUser;
      })
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => {
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function logout() {
    localStorage.removeItem("tp_token");
    localStorage.removeItem("tp_user");
    navigate("/login");
  }

  return { user, loading, logout };
}

export function getToken(): string | null {
  return localStorage.getItem("tp_token");
}
