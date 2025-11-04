const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export class UnauthorizedError extends Error {
  constructor(message = "Não autorizado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface AgentDto {
  id: string;
  name: string;
  tradition: string;
}

export interface AskResponseDto {
  answer: string;
  citations: unknown[];
}

export async function fetchAgents(params: {
  token: string;
  signal?: AbortSignal;
}): Promise<AgentDto[]> {
  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/agents`, {
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

export async function postAsk(
  payload: {
    agent: string;
    message: string;
    stream?: boolean;
  },
  options: { token: string; signal?: AbortSignal },
): Promise<AskResponseDto> {
  const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/chat`, {
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
