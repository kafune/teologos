"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { AgentDto } from "@/lib/api";
import {
  UnauthorizedError,
  ForbiddenError,
  createAgent,
  deleteAgent,
  fetchAgents,
} from "@/lib/api";

type AgentFormState = {
  name: string;
  slug: string;
};

const emptyAgentForm: AgentFormState = {
  name: "",
  slug: "",
};

export default function ManageAgentsPage() {
  const { user, token, isReady, logout } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState<AgentFormState>(emptyAgentForm);
  const [agentFormError, setAgentFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);
  const [listActionError, setListActionError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isReady, token, isAdmin, router]);

  useEffect(() => {
    if (!isReady || !token || !isAdmin) {
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchAgents({ token, signal: controller.signal });
        setAgents(data);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          logout();
          router.replace("/login");
          return;
        }
        if (error instanceof ForbiddenError) {
          router.replace("/");
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Falha ao carregar agentes:", error);
        setLoadError(
          "Não foi possível carregar os agentes. Tente novamente mais tarde."
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [isReady, token, isAdmin, logout, router]);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const handleAgentInputChange = useCallback(
    (field: keyof AgentFormState, value: string) => {
      setAgentForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) {
        router.replace("/login");
        return;
      }

      setIsSubmitting(true);
      setAgentFormError(null);

      try {
        const payload = {
          name: agentForm.name,
          slug: agentForm.slug.trim() || undefined,
        };

        const created = await createAgent(payload, { token });
        setAgents((prev) => {
          const existing = prev.some((agent) => agent.id === created.id);
          if (existing) {
            return prev.map((agent) =>
              agent.id === created.id ? created : agent
            );
          }
          return [...prev, created];
        });
        setAgentForm(emptyAgentForm);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          logout();
          router.replace("/login");
          return;
        }
        if (error instanceof ForbiddenError) {
          router.replace("/");
          return;
        }
        if (error instanceof Error) {
          setAgentFormError(error.message);
        } else {
          setAgentFormError("Falha desconhecida ao criar o agente.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, agentForm, logout, router]
  );

  const handleDelete = useCallback(
    async (agentId: string) => {
      if (!token) {
        router.replace("/login");
        return;
      }

      setPendingDeletion(agentId);
      setListActionError(null);

      try {
        await deleteAgent(agentId, { token });
        setAgents((prev) => prev.filter((agent) => agent.id !== agentId));
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          logout();
          router.replace("/login");
          return;
        }
        if (error instanceof ForbiddenError) {
          router.replace("/");
          return;
        }
        if (error instanceof Error) {
          setListActionError(error.message);
        } else {
          setListActionError("Falha desconhecida ao remover o agente.");
        }
      } finally {
        setPendingDeletion(null);
      }
    },
    [token, logout, router]
  );

  if (!isReady || !token || !isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--muted)]">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 text-center text-sm">
          Carregando painel administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl bg-[var(--surface)]/95 p-6 shadow-sm ring-1 ring-[var(--border)]/80 sm:p-8">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Administração
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Gerenciamento de agentes
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Crie ou remova agentes do TeologOS. Use o botão “Documentos” em cada
            linha para abrir o painel de ingestão específico daquele agente e
            enviar novos PDFs.
          </p>
        </header>

        <section className="rounded-2xl border border-blue-500 bg-blue-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Novo agente
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Informe apenas o nome e, opcionalmente, um identificador
            personalizado. Caso o campo identificador seja deixado vazio, ele
            será gerado automaticamente com base no nome.
          </p>

          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)] sm:col-span-2">
              Nome do agente
              <input
                type="text"
                value={agentForm.name}
                onChange={(event) =>
                  handleAgentInputChange("name", event.target.value)
                }
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-black focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Ex.: Prof. João Pereira"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)] sm:col-span-2">
              Identificador (slug)
              <input
                type="text"
                value={agentForm.slug}
                onChange={(event) =>
                  handleAgentInputChange("slug", event.target.value)
                }
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-black focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Ex.: prof-joao-pereira"
                pattern="[a-z0-9-]*"
                title="Use apenas letras minúsculas, números e hífens."
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? "Criando agente..." : "Criar agente"}
              </button>
            </div>
          </form>

          {agentFormError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {agentFormError}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border bg-blue-900 border-blue-500 p-5 shadow-sm">
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Agentes cadastrados
            </h2>
            {isLoading ? (
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Atualizando...
              </span>
            ) : null}
          </header>

          {loadError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          {sortedAgents.length === 0 && !isLoading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Nenhum agente cadastrado no momento. Utilize o formulário acima
              para criar o primeiro.
            </p>
          ) : null}

          <ul className="mt-4 space-y-3 ">
            {sortedAgents.map((agent) => {
              const isDeleting = pendingDeletion === agent.id;
              return (
                <li
                  key={agent.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)] shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-black">
                      {agent.name}
                    </p>
                    <p className="text-xs text-black">Slug: {agent.id}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                    <Link
                      href={`/admin/agents/${agent.id}/documents`}
                      className="w-full rounded-full border border-transparent bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:w-auto"
                    >
                      Documentos
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(agent.id)}
                      disabled={isDeleting}
                      className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                    >
                      {isDeleting ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {listActionError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {listActionError}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
