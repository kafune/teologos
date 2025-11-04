"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl bg-[var(--surface)]/95 p-8 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            sobre o projeto
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            TeologOS
          </h1>
          <p className="text-sm text-slate-500">
            Plataforma SaaS que conecta você a agentes virtuais inspirados em grandes teólogos
            cristãos. A proposta é oferecer um ambiente seguro e contextualizado para consultas
            rápidas, estudos e aprofundamento teológico.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Como funciona
          </h2>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Agentes especializados:
              </span>{" "}
              cada agente responde com base na tradição do teólogo representado.
            </li>
            <li>
              <span className="font-medium text-slate-700 dark:text-slate-200">RAG + LLM:</span>{" "}
              utilizamos um orquestrador com recuperação de contexto para respostas fiéis e
              referenciadas.
            </li>
            <li>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Interface moderna:
              </span>{" "}
              experiência web em Next.js com modo seguro e autenticação por JWT.
            </li>
            <li>
              <span className="font-medium text-slate-700 dark:text-slate-200">
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
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Autenticação e gerenciamento de sessões para acesso seguro.</li>
            <li>Curadoria de fontes e citações para cada agente teológico.</li>
            <li>Dashboard administrativo para acompanhar uso da plataforma.</li>
            <li>Integração com pagamentos e planos de assinatura.</li>
          </ol>
        </section>

        <section className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
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

        <footer className="flex items-center justify-between text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} TeologOS. Todos os direitos reservados.</span>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Voltar
          </Link>
        </footer>
      </main>
    </div>
  );
}
