"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "./auth";

export function useCurrentUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setError(response.status === 503 ? "Autentikasi belum dikonfigurasi." : "");
        return null;
      }
      const data = (await response.json()) as { user: SessionUser };
      setUser(data.user);
      setError("");
      return data.user;
    } catch {
      setUser(null);
      setError("Tidak dapat terhubung ke server.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { user, loading, error, refresh };
}
