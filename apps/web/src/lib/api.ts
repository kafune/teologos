import { buildApiUrl } from "./apiBaseUrl";

export class UnauthorizedError extends Error {
  constructor(message = "Não autorizado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AgentDto {
  id: string;
  name: string;
  tradition?: string | null;
}

export interface AgentDocumentDto {
  id: string;
  title: string;
  sourceUrl?: string | null;
  createdAt: string;
  agentSlug: string;
  passagesCount: number;
}

export interface AskResponseDto {
  answer: string;
  citations: unknown[];
}

export async function fetchAgents(params: {
  token: string;
  signal?: AbortSignal;
}): Promise<AgentDto[]> {
  const response = await fetch(buildApiUrl("/agents"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    signal: params.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    throw new Error(`Falha ao carregar agentes: ${response.status}`);
  }

  const data = (await response.json()) as AgentDto[];
  return data;
}

export type CreateAgentPayload = {
  name: string;
  slug?: string;
};

export async function createAgent(
  payload: CreateAgentPayload,
  options: { token: string; signal?: AbortSignal },
): Promise<AgentDto> {
  const response = await fetch(buildApiUrl("/agents"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    if (response.status === 403) {
      throw new ForbiddenError();
    }
    const errorBody = await response.text();
    throw new Error(errorBody || "Falha ao criar agente.");
  }

  return (await response.json()) as AgentDto;
}

export async function deleteAgent(
  id: string,
  options: { token: string; signal?: AbortSignal },
): Promise<void> {
  const response = await fetch(buildApiUrl(`/agents/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    if (response.status === 403) {
      throw new ForbiddenError();
    }
    if (response.status === 404) {
      throw new Error("Agente não encontrado.");
    }
    const errorBody = await response.text();
    throw new Error(errorBody || "Falha ao remover agente.");
  }
}

export async function fetchAgentDocuments(
  agentId: string,
  options: { token: string; signal?: AbortSignal },
): Promise<AgentDocumentDto[]> {
  const response = await fetch(buildApiUrl(`/agents/${encodeURIComponent(agentId)}/documents`), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    signal: options.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    if (response.status === 403) {
      throw new ForbiddenError();
    }
    throw new Error(`Falha ao carregar documentos (${response.status}).`);
  }

  return (await response.json()) as AgentDocumentDto[];
}

export type UploadDocumentPayload = {
  title: string;
  sourceUrl?: string;
  file: File;
};

export async function uploadAgentDocument(
  agentId: string,
  payload: UploadDocumentPayload,
  options: { token: string; signal?: AbortSignal },
): Promise<AgentDocumentDto> {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.sourceUrl) {
    formData.append("sourceUrl", payload.sourceUrl);
  }
  formData.append("file", payload.file);

  const response = await fetch(buildApiUrl(`/agents/${encodeURIComponent(agentId)}/documents`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/json",
    },
    body: formData,
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    if (response.status === 403) {
      throw new ForbiddenError();
    }
    const errorBody = await response.text();
    throw new Error(errorBody || "Falha ao enviar documento.");
  }

  return (await response.json()) as AgentDocumentDto;
}

export async function postAsk(
  payload: {
    agent: string;
    message: string;
    stream?: boolean;
  },
  options: { token: string; signal?: AbortSignal },
): Promise<AskResponseDto> {
  const response = await fetch(buildApiUrl("/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify({ ...payload, stream: payload.stream ?? false }),
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
    const errorBody = await response.text();
    throw new Error(`Falha ao perguntar: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as AskResponseDto;
}
