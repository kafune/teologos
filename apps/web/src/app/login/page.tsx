"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, token, isReady, isAuthenticating } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (token) {
      router.replace("/");
    }
  }, [isReady, token, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      router.replace("/");
    } catch (authError) {
      const message =
        authError instanceof Error
          ? authError.message
          : "Não foi possível realizar o login. Tente novamente.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-8 text-[var(--foreground)] sm:px-4 sm:py-10">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl bg-[var(--surface)]/95 p-6 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur sm:gap-8 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] dark:text-slate-100 sm:text-3xl">
            Acesse sua conta
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Entre com suas credenciais para conversar com os teólogos digitais.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-2.5 text-base text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:text-slate-100"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--muted)]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-2.5 text-base text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:text-slate-100"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isAuthenticating}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-white transition hover:bg-[var(--accent)]/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAuthenticating ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)]">
          Esqueceu sua senha? Entre em contato com o administrador.
        </p>

        <p className="text-center text-xs text-[var(--muted)]">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Voltar para a página inicial
          </Link>
        </p>
      </main>
    </div>
  );
}
