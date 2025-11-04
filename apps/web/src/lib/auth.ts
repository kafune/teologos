"use client";

const SESSION_STORAGE_KEY = "TeologOS.auth.session";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function requestLogin(email: string, password: string) {
  const response = await fetch(
    `${normalizeBaseUrl(API_BASE_URL)}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      errorBody || "Não foi possível realizar o login. Verifique suas credenciais.",
    );
  }

  const data = (await response.json()) as LoginResponse;

  return {
    token: data.accessToken,
    user: data.user,
  } satisfies AuthSession;
}

export function loadStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.user?.id) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("Falha ao ler sessão armazenada:", error);
    return null;
  }
}

export function persistSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
