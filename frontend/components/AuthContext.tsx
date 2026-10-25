import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, apiFetch, jsonBody, setCsrfToken } from "../lib/api";
import type { SessionUser } from "../types";

type Session = { user: SessionUser; csrf_token: string };
type AuthValue = {
  user: SessionUser | null;
  loading: boolean;
  establish: (session: Session) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  function establish(session: Session) {
    revision.current += 1;
    setCsrfToken(session.csrf_token);
    setUser(session.user);
    setLoading(false);
  }
  useEffect(() => {
    let cancelled = false;
    const started = revision.current;
    api<Session>("/auth/me").then((session) => {
      if (!cancelled && revision.current === started) establish(session);
    }).catch(() => {
      if (!cancelled && revision.current === started) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  async function logout() {
    const response = await apiFetch("/auth/logout", jsonBody({}));
    if (!response.ok && response.status !== 401) throw new Error("Sign out could not be confirmed.");
    revision.current += 1;
    setCsrfToken("");
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, loading, establish, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Authentication provider missing.");
  return value;
}
