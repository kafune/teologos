import OpenAI from 'openai';
import type { ContextPassage } from '../types/index.js';

export type Passage = ContextPassage;

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
  private openaiClient: OpenAI | null = null;
  private qdrantClient: QdrantClient | null = null;

  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured.');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }

    return this.openaiClient;
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
    const openai = this.getOpenAIClient();
    const qdrant = this.getQdrantClient();

    const embedModel = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
    let embedding: number[] | undefined;

    try {
      const response = await openai.embeddings.create({
        model: embedModel,
        input: trimmedQuestion,
      });
      embedding = response?.data?.[0]?.embedding;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('OpenAI embeddings failed');
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
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
