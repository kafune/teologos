"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type HeaderProps = {
  agents: Array<{ id: string; label: string; tradition?: string | null }>;
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  loading?: boolean;
};

export function Header({
  agents,
  selectedAgentId,
  onAgentChange,
  loading = false,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  const userLabel = user?.name?.trim() ? user.name : user?.email;
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="flex flex-col gap-5 rounded-3xl bg-[var(--surface)]/95 p-4 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur sm:gap-6 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted)] sm:text-xs">
            Plataforma SaaS
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] dark:text-slate-100 sm:text-3xl md:text-4xl">
            TeologOS
          </h1>
        </div>
        <nav className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted)] sm:w-auto sm:justify-end">
          <Link
            href="/about"
            className="rounded-full px-3 py-1 text-[var(--muted)] transition hover:bg-[var(--surface-muted)]/70 hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
          >
            Sobre
          </Link>
          <span
            className="hidden h-1 w-1 rounded-full bg-slate-300 md:block"
            aria-hidden="true"
          />
          {isAdmin ? (
            <>
              <Link
                href="/admin/agents"
                className="rounded-full border border-transparent bg-slate-900 px-4 py-1.5 text-blue-900 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:bg-slate-200 dark:text-blue-900 dark:hover:bg-white/90"
              >
                Gerenciar agentes
              </Link>
              <span
                className="hidden h-1 w-1 rounded-full bg-slate-300 md:block"
                aria-hidden="true"
              />
            </>
          ) : null}
          {user ? (
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:flex-nowrap">
              <span className="text-sm text-[var(--muted)]">
                {userLabel ? `Olá, ${userLabel}` : "Usuário autenticado"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full cursor-pointer rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent)]/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 sm:w-auto sm:py-1.5"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="transition hover:text-[var(--foreground)] hover:underline"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
      <label className="flex flex-col gap-2 text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--muted)]">
          Selecione um teólogo
        </span>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-3 py-2.5 pr-10 text-sm font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:text-slate-100 sm:px-4 sm:py-3 sm:pr-12 sm:text-base"
            value={selectedAgentId}
            onChange={(event) => onAgentChange(event.target.value)}
            disabled={loading || agents.length === 0}
          >
            {agents.length === 0 ? (
              <option value="" disabled>
                {loading ? "Carregando opções..." : "Nenhum agente disponível"}
              </option>
            ) : null}
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
                {agent.tradition ? ` • ${agent.tradition}` : ""}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)] sm:pr-4"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
        {loading ? (
          <span className="text-xs font-medium text-[var(--muted)]">
            Carregando teólogos disponíveis...
          </span>
        ) : null}
      </label>
    </header>
  );
}
