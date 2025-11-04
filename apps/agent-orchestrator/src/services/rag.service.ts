import type { ContextPassage } from '../types/index.js';

export type Passage = ContextPassage;

type CohereEmbedParams = {
  texts: string[];
  model?: string;
  inputType?: string;
};

type CohereEmbedResponse = {
  embeddings?: number[][];
};

type CohereClientOptions = {
  token: string;
};

class CohereClient {
  private readonly token: string;

  constructor(options: CohereClientOptions) {
    if (!options?.token) {
      throw new Error('CohereClient requires a token.');
    }

    this.token = options.token;

    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available in this runtime.');
    }
  }

  async embed(params: CohereEmbedParams): Promise<CohereEmbedResponse> {
    const { texts, model, inputType } = params;

    if (!Array.isArray(texts) || texts.length === 0) {
      return { embeddings: [] };
    }

    const response = await fetch('https://api.cohere.com/v1/embed', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Cohere-Version': '2022-12-06',
      },
      body: JSON.stringify({
        texts,
        model,
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Cohere embed failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as CohereEmbedResponse;
    return {
      embeddings: Array.isArray(data.embeddings) ? data.embeddings : [],
    };
  }
}

type QdrantPayload = Record<string, unknown> & {
  text?: string;
  content?: string;
  title?: string;
  section?: string;
  page?: number | string;
  url?: string;
  ord?: number;
};

type QdrantSearchPoint = {
  payload?: QdrantPayload | null;
};

type QdrantClientOptions = {
  url: string;
  apiKey?: string;
};

type QdrantSearchPayload = {
  vector: number[];
  limit: number;
  with_payload?: boolean | Record<string, unknown>;
  with_vector?: boolean;
  filter?: unknown;
};

type QdrantSearchResponse = {
  result?: QdrantSearchPoint[];
};

class QdrantClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: QdrantClientOptions) {
    if (!options?.url) {
      throw new Error('QdrantClient requires a URL.');
    }

    this.baseUrl = options.url.replace(/\/+$/, '');
    this.apiKey = options.apiKey;

    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available in this runtime.');
    }
  }

  async search(collectionName: string, payload: QdrantSearchPayload): Promise<QdrantSearchResponse> {
    const endpoint = `${this.baseUrl}/collections/${encodeURIComponent(collectionName)}/points/search`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'api-key': this.apiKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      if (response.status === 404) {
        return { result: [] };
      }

      throw new Error(`Qdrant search failed (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as QdrantSearchResponse;
  }
}

export class RagService {
  private cohereClient: CohereClient | null = null;
  private qdrantClient: QdrantClient | null = null;

  private getCohereClient(): CohereClient {
    if (!this.cohereClient) {
      const token = process.env.COHERE_API_KEY;
      if (!token) {
        throw new Error('COHERE_API_KEY is not configured.');
      }
      this.cohereClient = new CohereClient({ token });
    }

    return this.cohereClient;
  }

  private getQdrantClient(): QdrantClient {
    if (!this.qdrantClient) {
      const url = process.env.QDRANT_URL || 'http://qdrant:6333';
      const apiKey = process.env.QDRANT_API_KEY || undefined;
      this.qdrantClient = new QdrantClient({ url, apiKey });
    }

    return this.qdrantClient;
  }

  async retrieve(agentSlug: string, question: string, topK = 8): Promise<ContextPassage[]> {
    const trimmedAgent = agentSlug?.trim();
    const trimmedQuestion = question?.trim();

    if (!trimmedAgent || !trimmedQuestion) {
      return [];
    }

    const limit = Number.isFinite(topK) && topK > 0 ? Math.floor(topK) : 8;
    const cohere = this.getCohereClient();
    const qdrant = this.getQdrantClient();

    const embeddingResponse = await cohere.embed({
      texts: [trimmedQuestion],
      model: 'embed-multilingual-v3.0',
      inputType: 'search_query',
    });

    const embedding = embeddingResponse.embeddings?.[0];
    if (!embedding || !Array.isArray(embedding) || !embedding.length) {
      return [];
    }

    const collectionName = `passages_${trimmedAgent}`;
    const searchResponse = await qdrant.search(collectionName, {
      vector: embedding,
      limit,
      with_payload: true,
      with_vector: false,
    });

    const points: QdrantSearchPoint[] = Array.isArray(searchResponse)
      ? searchResponse
      : Array.isArray((searchResponse as { result?: QdrantSearchPoint[] }).result)
        ? (searchResponse as { result: QdrantSearchPoint[] }).result
        : [];

    const contexts: ContextPassage[] = [];

    for (let index = 0; index < points.length; index += 1) {
      const payload = points[index]?.payload ?? {};
      if (!payload) {
        continue;
      }

      const textCandidate = typeof payload.text === 'string' ? payload.text : typeof payload.content === 'string' ? payload.content : '';
      const text = textCandidate.trim();
      if (!text) {
        continue;
      }

      const rawTitle = typeof payload.title === 'string' ? payload.title : '';
      const title = rawTitle.trim() || `Trecho ${index + 1}`;

      const section = typeof payload.section === 'string' && payload.section.trim() ? payload.section : undefined;

      let page: number | string | undefined;
      if (typeof payload.page === 'number') {
        page = payload.page;
      } else if (typeof payload.page === 'string' && payload.page.trim()) {
        page = payload.page;
      }

      const url = typeof payload.url === 'string' && payload.url.trim() ? payload.url : undefined;

      const ordValue = typeof payload.ord === 'number' && Number.isFinite(payload.ord)
        ? payload.ord
        : index + 1;

      contexts.push({
        text,
        title,
        section,
        page,
        url,
        ord: ordValue,
      });
    }

    return contexts;
  }
}

export const ragService = new RagService();
