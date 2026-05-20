import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface AdminUser {
  email: string;
  role: string;
  name: string;
}

export function useAdminAuth() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    const userStr = localStorage.getItem("tp_user");
    if (!token || !userStr) {
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
        const parsed = JSON.parse(userStr) as AdminUser;
        if (parsed.role !== "admin") {
          localStorage.removeItem("tp_token");
          localStorage.removeItem("tp_user");
          navigate("/login");
          return null;
        }
        return parsed;
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
