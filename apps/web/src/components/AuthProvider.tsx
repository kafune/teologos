"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthSession,
  AuthUser,
  clearStoredSession,
  loadStoredSession,
  persistSession,
  requestLogin,
} from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  isAuthenticating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (session: AuthSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored) {
      setSessionState(stored);
    }
    setIsReady(true);
  }, []);

  const setSession = useCallback((newSession: AuthSession | null) => {
    setSessionState(newSession);
    if (newSession) {
      persistSession(newSession);
    } else {
      clearStoredSession();
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const newSession = await requestLogin(email, password);
      setSession(newSession);
    } finally {
      setIsAuthenticating(false);
    }
  }, [setSession]);

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isReady,
      isAuthenticating,
      login,
      logout,
      setSession,
    }),
    [session, isReady, isAuthenticating, login, logout, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado junto ao AuthProvider.");
  }
  return context;
}
