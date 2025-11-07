"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { AgentDocumentDto, AgentDto } from "@/lib/api";
import {
  UnauthorizedError,
  ForbiddenError,
  fetchAgentDocuments,
  fetchAgents,
  uploadAgentDocument,
} from "@/lib/api";

type DocumentFormState = {
  title: string;
  sourceUrl: string;
};

const emptyDocumentForm: DocumentFormState = {
  title: "",
  sourceUrl: "",
};

export default function AgentDocumentsPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const slug = agentId?.toLowerCase() ?? "";

  const { user, token, isReady, logout } = useAuth();
  const router = useRouter();

  const [agent, setAgent] = useState<AgentDto | null>(null);
  const [agentsLoading, setAgentsLoading] = useState<boolean>(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<AgentDocumentDto[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);

  const [documentForm, setDocumentForm] =
    useState<DocumentFormState>(emptyDocumentForm);
  const [documentFormError, setDocumentFormError] = useState<string | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] =
    useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!isReady || !token || !isAdmin || !slug) {
      return;
    }

    const controller = new AbortController();
    const loadAgent = async () => {
      setAgentsLoading(true);
      setAgentsError(null);
      try {
        const data = await fetchAgents({ token, signal: controller.signal });
        const found = data.find((item) => item.id === slug) ?? null;
        if (!found) {
          setAgentsError("Agente não encontrado.");
        }
        setAgent(found);
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
        console.error("Falha ao carregar agente:", error);
        setAgentsError("Não foi possível carregar os dados do agente.");
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgent();
    return () => controller.abort();
  }, [isReady, token, isAdmin, slug, logout, router]);

  useEffect(() => {
    if (!isReady || !token || !isAdmin || !slug) {
      return;
    }

    const controller = new AbortController();
    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      setDocumentsError(null);
      try {
        const data = await fetchAgentDocuments(slug, {
          token,
          signal: controller.signal,
        });
        setDocuments(data);
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
        console.error("Falha ao carregar documentos:", error);
        setDocumentsError(
          "Não foi possível carregar os documentos deste agente."
        );
      } finally {
        setIsLoadingDocuments(false);
      }
    };

    loadDocuments();
    return () => controller.abort();
  }, [isReady, token, isAdmin, slug, logout, router]);

  const handleDocumentInputChange = useCallback(
    (field: keyof DocumentFormState, value: string) => {
      setDocumentForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setSelectedFile(file);
    },
    []
  );

  const handleDocumentSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) {
        router.replace("/login");
        return;
      }
      if (!slug) {
        setDocumentFormError("Agente inválido.");
        return;
      }
      if (!documentForm.title.trim()) {
        setDocumentFormError("Informe um título para o documento.");
        return;
      }
      if (!selectedFile) {
        setDocumentFormError("Selecione um arquivo PDF.");
        return;
      }

      setIsUploadingDocument(true);
      setDocumentFormError(null);

      try {
        const created = await uploadAgentDocument(
          slug,
          {
            title: documentForm.title,
            sourceUrl: documentForm.sourceUrl.trim() || undefined,
            file: selectedFile,
          },
          { token }
        );

        if (created.agentSlug === slug) {
          setDocuments((prev) => [created, ...prev]);
        }

        setDocumentForm(emptyDocumentForm);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
          setDocumentFormError(error.message);
        } else {
          setDocumentFormError("Falha ao enviar o documento.");
        }
      } finally {
        setIsUploadingDocument(false);
      }
    },
    [token, slug, documentForm, selectedFile, logout, router]
  );

  const agentLabel = useMemo(() => {
    if (agent?.name) {
      return agent.name;
    }
    if (slug) {
      return slug;
    }
    return "Agente";
  }, [agent, slug]);

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
            Documentos do agente
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {agentsLoading
              ? "Carregando dados do agente..."
              : `Gerencie os PDFs ingeridos para ${agentLabel}.`}
          </p>
          <div className="mt-2">
            <Link
              href="/admin/agents"
              className="inline-flex items-center rounded-full border border-[var(--border)] px-4 py-1 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              ← Voltar para agentes
            </Link>
          </div>
        </header>

        {agentsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            {agentsError}
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--border)] bg-blue-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Enviar novo documento
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Envie arquivos PDF para alimentar o contexto deste agente. Os
            trechos são embutidos automaticamente e disponibilizados para o RAG.
          </p>

          <form
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={handleDocumentSubmit}
          >
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)] sm:col-span-2">
              Título do documento
              <input
                type="text"
                value={documentForm.title}
                onChange={(event) =>
                  handleDocumentInputChange("title", event.target.value)
                }
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-black focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Ex.: Notas de aula sobre Cristologia"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
              Fonte (opcional)
              <input
                type="url"
                value={documentForm.sourceUrl}
                onChange={(event) =>
                  handleDocumentInputChange("sourceUrl", event.target.value)
                }
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-black focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="https://example.com/material.pdf"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
              Arquivo PDF
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="rounded-xl border border-dashed border-[var(--border)] bg-white px-3 py-2 text-sm text-black file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
              <span className="text-xs font-normal text-[var(--muted)]">
                Limite de 25&nbsp;MB. Apenas PDFs são aceitos.
              </span>
              {selectedFile ? (
                <span className="text-xs font-normal text-[var(--muted)]">
                  Arquivo selecionado: {selectedFile.name}
                </span>
              ) : null}
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isUploadingDocument}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isUploadingDocument
                  ? "Processando PDF..."
                  : "Enviar documento"}
              </button>
            </div>
          </form>

          {documentFormError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {documentFormError}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-blue-900 p-5 shadow-sm">
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Documentos ingeridos
            </h2>
            {isLoadingDocuments ? (
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Atualizando...
              </span>
            ) : null}
          </header>

          {documentsError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {documentsError}
            </div>
          ) : null}

          {!documentsError && documents.length === 0 && !isLoadingDocuments ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Nenhum documento foi ingerido para este agente ainda.
            </p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-black shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-blacks">
                      {doc.title}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      {new Date(doc.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {doc.passagesCount} trechos indexados
                    </p>
                    {doc.sourceUrl ? (
                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[var(--accent)] underline"
                      >
                        Fonte original
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
