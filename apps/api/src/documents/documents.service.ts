import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import { createHash, randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

type Chunk = {
  text: string;
  ord: number;
};

type DocumentResponse = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  createdAt: Date;
  agentSlug: string;
  passagesCount: number;
};

@Injectable()
export class DocumentsService {
  private readonly openai: OpenAI;
  private readonly embedModel: string;
  private readonly embedBatchSize: number;
  private readonly qdrantBaseUrl: string;
  private readonly qdrantApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const openAiKey =
      process.env.OPENAI_API_KEY ?? this.configService.get<string>('OPENAI_API_KEY');
    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY não configurada para ingestão.');
    }
    this.openai = new OpenAI({ apiKey: openAiKey });
    this.embedModel =
      process.env.OPENAI_EMBED_MODEL ??
      this.configService.get<string>('OPENAI_EMBED_MODEL') ??
      'text-embedding-3-small';
    this.embedBatchSize = Number(process.env.OPENAI_EMBED_BATCH ?? 32);
    this.qdrantBaseUrl = this.normalizeBaseUrl(
      process.env.QDRANT_URL ?? this.configService.get<string>('QDRANT_URL') ?? 'http://qdrant:6333',
    );
    this.qdrantApiKey = process.env.QDRANT_API_KEY ?? this.configService.get<string>('QDRANT_API_KEY') ?? undefined;
  }

  async list(agentId: string): Promise<DocumentResponse[]> {
    const normalizedAgent = this.normalizeAgent(agentId);
    const documents = await this.prisma.corpusDoc.findMany({
      where: { agentSlug: normalizedAgent },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
        agentSlug: true,
        _count: {
          select: { passages: true },
        },
      },
    });
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      sourceUrl: doc.sourceUrl,
      createdAt: doc.createdAt,
      agentSlug: doc.agentSlug,
      passagesCount: doc._count.passages,
    }));
  }

  async ingest(agentId: string, payload: CreateDocumentDto, file: Express.Multer.File): Promise<DocumentResponse> {
    const normalizedAgent = this.normalizeAgent(agentId);
    const agent = await this.prisma.agent.findUnique({
      where: { id: normalizedAgent },
    });
    if (!agent) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const title = (payload.title?.trim() || file.originalname.replace(/\.pdf$/i, '')).slice(0, 200);
    if (!title) {
      throw new BadRequestException('Informe um título para o documento.');
    }

    const sourceUrl = payload.sourceUrl?.trim() || null;

    const doc = await this.prisma.corpusDoc.create({
      data: {
        agentSlug: normalizedAgent,
        title,
        sourceUrl,
      },
    });

    try {
      const rawText = await this.extractText(file.buffer);
      const chunks = this.chunkText(rawText);
      if (!chunks.length) {
        throw new BadRequestException('Não foi possível extrair trechos aproveitáveis do PDF.');
      }

      const embeddings = await this.embedChunks(chunks);
      if (!embeddings.length) {
        throw new InternalServerErrorException('Falha ao gerar embeddings para o documento.');
      }

      await this.ensureCollection(normalizedAgent, embeddings[0].length);
      await this.upsertChunks(normalizedAgent, doc.id, title, sourceUrl, chunks, embeddings);
      await this.persistPassages(doc.id, normalizedAgent, chunks);

      return {
        id: doc.id,
        title: doc.title,
        sourceUrl: doc.sourceUrl,
        createdAt: doc.createdAt,
        agentSlug: doc.agentSlug,
        passagesCount: chunks.length,
      };
    } catch (error) {
      await this.cleanupFailedDocument(doc.id);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao processar o documento enviado.');
    }
  }

  private normalizeAgent(agentId: string): string {
    const trimmed = agentId?.trim().toLowerCase();
    if (!trimmed) {
      throw new BadRequestException('Identificador de agente inválido.');
    }
    return trimmed;
  }

  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return 'http://qdrant:6333';
    }
    return url.replace(/\/+$/, '');
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    const raw = result?.text ?? '';
    return raw.replace(/\s+/g, ' ').trim();
  }

  private chunkText(text: string, chunkSize = 600, overlap = 100): Chunk[] {
    if (!text) {
      return [];
    }
    if (chunkSize <= overlap) {
      throw new BadRequestException('Configuração de chunk inválida.');
    }

    const words = text.split(' ').filter(Boolean);
    if (!words.length) {
      return [];
    }

    const chunks: Chunk[] = [];
    const step = chunkSize - overlap;
    let index = 0;
    let ord = 0;

    while (index < words.length) {
      const end = Math.min(index + chunkSize, words.length);
      const batch = words.slice(index, end).join(' ').trim();
      if (batch) {
        chunks.push({ text: batch, ord });
        ord += 1;
      }
      if (end === words.length) {
        break;
      }
      index += step;
    }

    return chunks;
  }

  private async embedChunks(chunks: Chunk[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = Number.isFinite(this.embedBatchSize) && this.embedBatchSize > 0 ? this.embedBatchSize : 32;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const response = await this.openai.embeddings.create({
        model: this.embedModel,
        input: slice.map((chunk) => chunk.text),
      });
      response.data.forEach((item) => {
        embeddings.push(item.embedding);
      });
    }

    return embeddings;
  }

  private async ensureCollection(agentSlug: string, vectorSize: number) {
    const collectionName = this.collectionName(agentSlug);
    const endpoint = `/collections/${encodeURIComponent(collectionName)}`;
    const response = await this.qdrantFetch(endpoint);

    if (response.status === 404) {
      await this.createCollection(collectionName, vectorSize);
      return;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(`Falha ao consultar coleção no Qdrant: ${body}`);
    }

    const payload = (await response.json()) as {
      result?: {
        config?: {
          params?: {
            vectors?: { size?: number } | Record<string, { size?: number }>;
          };
        };
      };
    };
    const vectors = payload.result?.config?.params?.vectors;
    let currentSize: number | undefined;
    if (vectors && 'size' in vectors && typeof vectors.size === 'number') {
      currentSize = vectors.size;
    } else if (vectors && typeof vectors === 'object') {
      const first = Object.values(vectors)[0];
      if (first && typeof first === 'object' && typeof first.size === 'number') {
        currentSize = first.size;
      }
    }

    if (currentSize && currentSize !== vectorSize) {
      await this.qdrantFetch(endpoint, { method: 'DELETE' });
      await this.createCollection(collectionName, vectorSize);
    }
  }

  private async createCollection(collectionName: string, vectorSize: number) {
    const response = await this.qdrantFetch(`/collections/${encodeURIComponent(collectionName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(`Falha ao criar coleção no Qdrant: ${body}`);
    }
  }

  private async upsertChunks(
    agentSlug: string,
    docId: string,
    title: string,
    sourceUrl: string | null,
    chunks: Chunk[],
    embeddings: number[][],
  ) {
    if (embeddings.length !== chunks.length) {
      throw new InternalServerErrorException('Número de embeddings divergente do número de trechos.');
    }

    const collectionName = this.collectionName(agentSlug);
    const points = chunks.map((chunk, index) => ({
      id: randomUUID(),
      vector: embeddings[index],
      payload: {
        agentSlug,
        title,
        docId,
        url: sourceUrl,
        ord: chunk.ord,
        text: chunk.text,
      },
    }));

    const batchSize = 200;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const response = await this.qdrantFetch(`/collections/${encodeURIComponent(collectionName)}/points`, {
        method: 'PUT',
        body: JSON.stringify({ points: batch }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new InternalServerErrorException(`Falha ao enviar pontos ao Qdrant: ${body}`);
      }
    }
  }

  private async persistPassages(docId: string, agentSlug: string, chunks: Chunk[]) {
    const data: Prisma.PassageCreateManyInput[] = chunks.map((chunk) => ({
      docId,
      agentSlug,
      ord: chunk.ord,
      section: null,
      page: null,
      textHash: createHash('sha256').update(chunk.text).digest('hex'),
    }));
    await this.prisma.passage.createMany({ data });
  }

  private async cleanupFailedDocument(docId: string) {
    await this.prisma.passage.deleteMany({ where: { docId } }).catch(() => undefined);
    await this.prisma.corpusDoc.delete({ where: { id: docId } }).catch(() => undefined);
  }

  private collectionName(agentSlug: string): string {
    return `passages_${agentSlug}`;
  }

  private async qdrantFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (!headers['Content-Type'] && init?.body) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.qdrantApiKey) {
      headers['api-key'] = this.qdrantApiKey;
    }

    return fetch(`${this.qdrantBaseUrl}${path}`, {
      ...init,
      headers,
    });
  }
}
