"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatBox } from "@/components/ChatBox";
import { Header } from "@/components/Header";
import type { AgentDto } from "@/lib/api";
import { fetchAgents, UnauthorizedError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type AgentOption = {
  id: string;
  label: string;
  tradition?: string | null;
};

export default function Home() {
  const { token, isReady, logout } = useAuth();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.replace("/login");
    }
  }, [isReady, token, router]);

  useEffect(() => {
    if (!isReady || !token) {
      return;
    }

    const controller = new AbortController();

    const loadAgents = async () => {
      setIsLoadingAgents(true);
      setAgentsError(null);
      try {
        const data = await fetchAgents({
          token,
          signal: controller.signal,
        });
        const normalized = data.map((agent: AgentDto) => ({
          id: agent.id,
          label: agent.name,
          tradition: agent.tradition,
        }));

        setAgents(normalized);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          logout();
          router.replace("/login");
          return;
        }

        const isAbortError =
          error instanceof DOMException
            ? error.name === "AbortError"
            : (error as { name?: string }).name === "AbortError";

        if (isAbortError) {
          return;
        }

        console.error("Falha ao carregar agentes:", error);
        setAgentsError(
          "Não foi possível carregar a lista de teólogos. Tente novamente mais tarde.",
        );
      } finally {
        setIsLoadingAgents(false);
      }
    };

    loadAgents();

    return () => {
      controller.abort();
    };
  }, [isReady, token, logout, router]);

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    } else if (
      selectedAgentId &&
      agents.length > 0 &&
      !agents.some((agent) => agent.id === selectedAgentId)
    ) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agents.find((agent) => agent.id === selectedAgentId) ?? null;
  }, [agents, selectedAgentId]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-8 font-sans text-[var(--foreground)] sm:px-4 sm:py-10">
      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl flex-col gap-8 px-0 pb-12 sm:min-h-[calc(100vh-5rem)] sm:gap-10 sm:px-4 sm:pb-16 md:px-6 lg:px-8">
        <Header
          agents={agents}
          selectedAgentId={selectedAgentId ?? ""}
          onAgentChange={(agentId) => setSelectedAgentId(agentId)}
          loading={isLoadingAgents}
        />

        {agentsError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-600">
            {agentsError}
          </div>
        ) : null}

        {selectedAgent ? (
          <ChatBox
            agentId={selectedAgent.id}
            agentName={selectedAgent.label}
          />
        ) : isLoadingAgents ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 text-center text-sm text-[var(--muted)]">
            Carregando agentes...
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-6 text-center text-sm text-[var(--muted)]">
            Selecione um teólogo para iniciar a conversa.
          </div>
        )}
      </main>
    </div>
  );
}
