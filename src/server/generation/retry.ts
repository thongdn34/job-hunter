import { GenerationCancelledError, isRetryableError, retryAfterMs } from "./errors";

export interface RetryOptions {
  /** Total attempts including the first one. */
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

export const DEFAULT_RETRY: Required<Pick<RetryOptions, "maxAttempts" | "baseDelayMs" | "maxDelayMs">> = {
  maxAttempts: 4,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
};

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new GenerationCancelledError());
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GenerationCancelledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Exponential backoff delay with a little jitter; `retry-after` wins when the provider sends it. */
export function backoffDelay(attempt: number, error: unknown, options: RetryOptions = {}): number {
  const base = options.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs;
  const max = options.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs;
  const hinted = retryAfterMs(error);
  if (hinted !== undefined) return Math.min(hinted, max);
  const exponential = base * 2 ** (attempt - 1);
  const jitter = base > 0 ? Math.floor(Math.random() * Math.min(250, base)) : 0;
  return Math.min(exponential + jitter, max);
}

/** Retries `fn` on rate limits (429), timeouts and 5xx with exponential backoff. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_RETRY.maxAttempts);
  const sleep = options.sleep ?? abortableSleep;
  for (let attempt = 1; ; attempt += 1) {
    if (options.signal?.aborted) throw new GenerationCancelledError();
    try {
      return await fn(attempt);
    } catch (error) {
      if (options.signal?.aborted) throw new GenerationCancelledError();
      if (attempt >= maxAttempts || !isRetryableError(error)) throw error;
      const delayMs = backoffDelay(attempt, error, options);
      options.onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs, options.signal);
    }
  }
}
