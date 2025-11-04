import OpenAI from 'openai';
import { APIError } from 'openai/error';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import pRetry, { AbortError } from 'p-retry';
import { cfg } from '../config.js';
import type { LlmCompletionResult } from '../types/index.js';

export class LlmUnavailableError extends Error {
  readonly statusCode?: number;

  constructor(message: string, options?: { cause?: unknown; statusCode?: number }) {
    super(message, { cause: options?.cause });
    this.name = 'LlmUnavailableError';
    this.statusCode = options?.statusCode;
  }
}

export class LlmService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: cfg.openaiApiKey });
  }

  async complete(messages: ChatCompletionMessageParam[]): Promise<LlmCompletionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);

    const operation = async () => {
      try {
        const response = await this.client.chat.completions.create(
          {
            model: cfg.openaiModel,
            messages,
          },
          { signal: controller.signal },
        );

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        return {
          answer: content,
          statusCode: 200,
        };
      } catch (error) {
        if (controller.signal.aborted) {
          const abortError = new AbortError(
            error instanceof Error ? error : new Error('Request aborted by timeout'),
          );
          throw abortError;
        }

        if (error instanceof APIError) {
          // Retry on rate limit or server errors only.
          if (error.status && error.status < 500 && error.status !== 429) {
            throw new AbortError(error);
          }
        }

        throw error;
      }
    };

    try {
      return await pRetry(operation, {
        retries: 2,
        factor: 2,
        minTimeout: 500,
      });
    } catch (error) {
      if (error instanceof AbortError) {
        const originalError = error.originalError;

        if (controller.signal.aborted) {
          throw new LlmUnavailableError('LLM request timed out', {
            cause: originalError ?? error,
            statusCode: 408,
          });
        }

        if (originalError instanceof APIError) {
          throw new LlmUnavailableError('LLM request failed', {
            cause: originalError,
            statusCode: originalError.status,
          });
        }

        throw new LlmUnavailableError('LLM request interrupted', {
          cause: originalError ?? error,
        });
      }

      const maybeError = error instanceof Error ? error : new Error('Unknown LLM failure');

      if (maybeError instanceof APIError) {
        throw new LlmUnavailableError('LLM request failed', {
          cause: maybeError,
          statusCode: maybeError.status,
        });
      }

      throw new LlmUnavailableError('LLM request failed', { cause: maybeError });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const llmService = new LlmService();
