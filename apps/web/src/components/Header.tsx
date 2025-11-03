import Link from "next/link";

type HeaderProps = {
  agents: string[];
  selectedAgent: string;
  onAgentChange: (agent: string) => void;
};

export function Header({ agents, selectedAgent, onAgentChange }: HeaderProps) {
  return (
    <header className="flex flex-col gap-6 rounded-3xl bg-[var(--surface)]/95 p-6 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Plataforma SaaS
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 md:text-4xl">
            Teologos
          </h1>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link
            href="/about"
            className="transition hover:text-slate-900 hover:underline"
          >
            Sobre
          </Link>
          <span
            className="hidden h-1 w-1 rounded-full bg-slate-300 md:block"
            aria-hidden="true"
          />
          <Link
            href="/login"
            className="transition hover:text-slate-900 hover:underline"
          >
            Login
          </Link>
        </nav>
      </div>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-500">Selecione um teólogo</span>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-3 pr-12 text-base font-medium text-slate-900 dark:text-slate-100 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            value={selectedAgent}
            onChange={(event) => onAgentChange(event.target.value)}
          >
            {agents.map((agent) => (
              <option key={agent}>{agent}</option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400"
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
      </label>
    </header>
  );
}
