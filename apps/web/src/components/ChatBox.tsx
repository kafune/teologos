"use client";

import Image from "next/image";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { postAsk, UnauthorizedError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type CitationData = {
  author?: string | null;
  title?: string | null;
  section?: string | null;
  page?: string | number | null;
  url?: string | null;
};

type ChatResponse = {
  answer: string;
  citations?: (string | CitationData | null | undefined)[];
};

type ChatEntry = {
  id: string;
  question: string;
  agentName: string;
  response: ChatResponse;
};

type ChatBoxProps = {
  agentId: string;
  agentName: string;
};

const markdownComponents = {
  p({ ...props }) {
    return <p className="mt-0 mb-3 last:mb-0" {...props} />;
  },
  a({ ...props }) {
    return (
      <a
        className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:text-[var(--accent)]/80"
        {...props}
      />
    );
  },
  ul({ ...props }) {
    return <ul className="mb-3 list-disc space-y-2 pl-5 last:mb-0" {...props} />;
  },
  ol({ ...props }) {
    return <ol className="mb-3 list-decimal space-y-2 pl-5 last:mb-0" {...props} />;
  },
  li({ ...props }) {
    return <li className="text-inherit" {...props} />;
  },
  blockquote({ ...props }) {
    return (
      <blockquote
        className="border-l-4 border-[var(--accent)]/40 pl-4 text-slate-600 dark:text-slate-300"
        {...props}
      />
    );
  },
  code({ inline, children, ...props }) {
    if (inline) {
      return (
        <code
          className="rounded-md border border-slate-300/60 bg-slate-100 px-1.5 py-0.5 text-sm font-medium leading-relaxed dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="overflow-x-auto rounded-xl border border-slate-300/60 bg-slate-950/90 p-4 text-sm leading-relaxed text-slate-100 dark:border-slate-800">
        <code className="block whitespace-pre" {...props}>
          {children}
        </code>
      </pre>
    );
  },
} satisfies Components;

const formatCitation = (citation: unknown): string | null => {
  if (!citation) {
    return null;
  }

  if (typeof citation === "string") {
    const title = citation.trim();
    return title ? `[[Agostinho, ${title}]]` : null;
  }

  if (typeof citation === "object") {
    const { author, title, section, page, url } = citation as CitationData;

    const parts: string[] = [];
    if (typeof author === "string" && author.trim()) {
      parts.push(author.trim());
    } else {
      parts.push("Agostinho");
    }
    if (typeof title === "string" && title.trim()) {
      parts.push(title.trim());
    }
    if (typeof section === "string" && section.trim()) {
      parts.push(section.trim());
    }
    if (
      typeof page === "number" ||
      (typeof page === "string" && page.trim())
    ) {
      parts.push(String(page).trim());
    }
    if (typeof url === "string" && url.trim()) {
      parts.push(url.trim());
    }

    return parts.length > 1 ? `[[${parts.join(", ")}]]` : null;
  }

  return null;
};

const generateEntryId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export function ChatBox({ agentId, agentName }: ChatBoxProps) {
  const { token, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return isLoading || message.trim().length === 0;
  }, [isLoading, message]);

  const scrollToBottom = () => {
    const viewport = chatViewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;

    if (!token) {
      setError("Sua sessão expirou. Faça login novamente para continuar.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const newEntry: ChatEntry = {
      id: generateEntryId(),
      question: trimmed,
      agentName,
      response: {
        answer: "",
        citations: [],
      },
    };

    setHistory((prev) => [...prev, newEntry]);
    setMessage("");

    try {
      const data = await postAsk(
        {
          agent: agentId,
          message: trimmed,
          stream: false,
        },
        {
          token,
          signal: undefined,
        },
      );

      setHistory((prev) =>
        prev.map((entry) =>
          entry.id === newEntry.id
            ? {
                ...entry,
                response: {
                  answer: data.answer ?? "",
                  citations: data.citations ?? [],
                },
              }
            : entry,
        ),
      );
    } catch (apiError) {
      if (apiError instanceof UnauthorizedError) {
        logout();
        setError("Sessão expirada. Você será redirecionado para fazer login.");
      } else {
        console.error("Erro ao solicitar resposta:", apiError);
        setError(
          "Não foi possível obter uma resposta. Verifique se a API local está ativa.",
        );
      }
      setHistory((prev) => prev.filter((entry) => entry.id !== newEntry.id));
    } finally {
      setIsLoading(false);
      requestAnimationFrame(scrollToBottom);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  useEffect(() => {
    setHistory([]);
    setMessage("");
    setError(null);
  }, [agentId]);

  return (
    <section className="flex h-full w-full flex-1 flex-col gap-6">
      <div className="flex-1 overflow-hidden rounded-3xl bg-[var(--surface)]/90 p-6 shadow ring-1 ring-[var(--border)]/80 backdrop-blur">
        <div
          ref={chatViewportRef}
          className="flex h-full flex-col gap-6 overflow-y-auto scroll-smooth pr-2"
        >
          {history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-400">
              <Image
                src="/globe.svg"
                alt="Ícone decorativo de globo"
                width={56}
                height={56}
                className="opacity-80"
                priority
              />
              <div>
                <p className="text-base font-medium text-slate-500">
                  Converse com os maiores teólogos da história.
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-200">
                  Envie sua pergunta para {agentName} e receba uma resposta embasada.
                </p>
              </div>
            </div>
          ) : null}
          {history.map((entry) => {
            const formattedCitations = (entry.response.citations ?? [])
              .map((citation) => formatCitation(citation))
              .filter((value): value is string => Boolean(value));

            return (
              <article
                key={entry.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/80 p-5"
              >
                <div className="flex items-start gap-3 rounded-2xl bg-white/90 p-4 ring-1 ring-[var(--border)] dark:bg-slate-800/85">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
                    Você
                  </div>
                  <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
                    {entry.question}
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-[var(--border)] dark:bg-slate-900/70">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
                    {entry.agentName[0]?.toUpperCase() ?? "IA"}
                  </div>
                  <div className="flex flex-col gap-3">
                    {entry.response.answer ? (
                      <ReactMarkdown
                        className="flex flex-col gap-3 text-base leading-relaxed text-slate-700 dark:text-slate-200"
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {entry.response.answer}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-300">
                        Elaborando resposta...
                      </p>
                    )}
                    {formattedCitations.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm opacity-70">
                        {formattedCitations.map((formatted, index) => (
                          <li
                            key={`${entry.id}-citation-${index}`}
                            className="font-medium"
                          >
                            {formatted}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-3xl bg-[var(--surface)]/95 p-5 shadow-sm ring-1 ring-[var(--border)]/80 backdrop-blur"
      >
        <label className="text-sm font-medium text-slate-500" htmlFor="message">
          Escreva sua pergunta
        </label>
        <textarea
          id="message"
          name="message"
          placeholder={`Digite sua mensagem para ${agentName}...`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-3 text-base text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-300 shadow-inner focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
        {error && (
          <p className="text-sm font-medium text-red-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-400">
            Pressione Enter para enviar ou Shift + Enter para pular linha.
          </p>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent)]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-foreground)] border-t-transparent" />
            )}
            Perguntar
          </button>
        </div>
      </form>
    </section>
  );
}
