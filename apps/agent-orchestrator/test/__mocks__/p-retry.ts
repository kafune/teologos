export class AbortError extends Error {
  readonly originalError: Error;

  constructor(message: string | Error) {
    const error = typeof message === 'string' ? new Error(message) : message;
    super(error.message);
    this.name = 'AbortError';
    this.originalError = error;
  }
}

type RetryInput<T> = (attemptCount: number) => PromiseLike<T> | T;

export default async function pRetry<T>(input: RetryInput<T>, _options?: unknown): Promise<T> {
  return input(1);
}
