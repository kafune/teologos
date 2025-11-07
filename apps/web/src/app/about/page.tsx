"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-8 text-[var(--foreground)] sm:px-4 sm:py-10">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl bg-[var(--surface)]/95 p-6 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur sm:gap-8 sm:p-8">
        <header className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted)] sm:text-xs">
            sobre o projeto
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] dark:text-slate-100 sm:text-3xl">
            TeologOS
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Plataforma SaaS que conecta você a agentes virtuais inspirados em grandes teólogos
            cristãos. A proposta é oferecer um ambiente seguro e contextualizado para consultas
            rápidas, estudos e aprofundamento teológico.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Como funciona
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed text-[var(--muted)] dark:text-slate-300">
            <li>
              <span className="font-medium text-[var(--foreground)] dark:text-slate-200">
                Agentes especializados:
              </span>{" "}
              cada agente responde com base na tradição do teólogo representado.
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)] dark:text-slate-200">RAG + LLM:</span>{" "}
              utilizamos um orquestrador com recuperação de contexto para respostas fiéis e
              referenciadas.
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)] dark:text-slate-200">
                Interface moderna:
              </span>{" "}
              experiência web em Next.js com modo seguro e autenticação por JWT.
            </li>
            <li>
              <span className="font-medium text-[var(--foreground)] dark:text-slate-200">
                Infra pronta para produção:
              </span>{" "}
              NestJS no backend, Postgres, Qdrant e MinIO orquestrados via Docker Compose.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Roadmap do MVP
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)] dark:text-slate-300">
            <li>Autenticação e gerenciamento de sessões para acesso seguro.</li>
            <li>Curadoria de fontes e citações para cada agente teológico.</li>
            <li>Dashboard administrativo para acompanhar uso da plataforma.</li>
            <li>Integração com pagamentos e planos de assinatura.</li>
          </ol>
        </section>

        <section className="space-y-2 text-sm text-[var(--muted)] dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Equipe & contato
          </h2>
          <p>
            Projeto desenvolvido por entusiastas de tecnologia e teologia. Para sugestões ou
            parcerias, fale com{" "}
            <a
              href="mailto:contato@TeologOS.app"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              contato@TeologOS.app
            </a>
            .
          </p>
        </section>

        <footer className="flex flex-col items-start gap-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} TeologOS. Todos os direitos reservados.</span>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Voltar
          </Link>
        </footer>
      </main>
    </div>
  );
}
