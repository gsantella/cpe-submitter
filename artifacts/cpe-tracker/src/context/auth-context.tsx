import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AuthState {
  /** null = still loading */
  enabled: boolean | null;
  /** username when authenticated and auth is enabled */
  username: string | null;
  /** true when auth is disabled OR when enabled and session is valid */
  authenticated: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const check = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        setUsername(data.username ?? null);
      } else {
        // 401 — auth is enabled but not logged in
        setEnabled(true);
        setUsername(null);
      }
    } catch {
      setEnabled(true);
      setUsername(null);
    }
  };

  const logout = async () => {
    await fetch(`${import.meta.env.BASE_URL}api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUsername(null);
    // keep enabled=true so the login page shows
  };

  useEffect(() => { check(); }, []);

  const authenticated = enabled === false || (enabled === true && username !== null);

  return (
    <AuthContext.Provider value={{ enabled, username, authenticated, refetch: check, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
