"use client";

import Image from "next/image";
import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import axios from "axios";

type ChatResponse = {
  answer: string;
  citations?: string[];
};

type ChatEntry = {
  id: string;
  question: string;
  response: ChatResponse;
};

type ChatBoxProps = {
  agent: string;
};

export function ChatBox({ agent }: ChatBoxProps) {
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

    setIsLoading(true);
    setError(null);

    const newEntry: ChatEntry = {
      id: crypto.randomUUID(),
      question: trimmed,
      response: {
        answer: "",
        citations: [],
      },
    };

    setHistory((prev) => [...prev, newEntry]);
    setMessage("");

    try {
      const { data } = await axios.post<ChatResponse>(
        "http://localhost:4000/chat",
        {
          agent,
          message: trimmed,
        },
        {
          timeout: 45000,
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
      console.error("Erro ao solicitar resposta:", apiError);
      setError(
        "Não foi possível obter uma resposta. Verifique se a API local está ativa.",
      );
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
                  Envie sua pergunta para {agent} e receba uma resposta
                  embasada.
                </p>
              </div>
            </div>
          ) : null}
          {history.map((entry) => (
            <article
              key={entry.id}
              className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/80 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
                  Você
                </div>
                <p className="text-base leading-relaxed text-slate-600">
                  {entry.question}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-[var(--border)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
                  {agent[0]?.toUpperCase() ?? "IA"}
                </div>
                <div className="flex flex-col gap-3">
                  {entry.response.answer ? (
                    <p className="text-base leading-relaxed text-slate-700 dark:text-slate-100">
                      {entry.response.answer}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-300">
                      Elaborando resposta...
                    </p>
                  )}
                  {entry.response.citations &&
                    entry.response.citations.length > 0 && (
                      <ul className="flex flex-col gap-1 rounded-xl bg-[var(--surface-muted)]/70 p-3 text-xs text-slate-500">
                        {entry.response.citations.map((citation) => (
                          <li key={citation} className="font-medium">
                            [[{citation}]]
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </div>
            </article>
          ))}
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
          placeholder={`Digite sua mensagem para ${agent}...`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-3 text-base text-slate-700 shadow-inner focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
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
