import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

/** Errors raised by the generation pipeline, with readable messages for the UI. */

export class GenerationCancelledError extends Error {
  readonly code = "CANCELLED" as const;
  constructor(message = "Generation was cancelled.") {
    super(message);
    this.name = "GenerationCancelledError";
  }
}

export type SectionErrorCode =
  "VALIDATION_FAILED" | "PROVIDER_ERROR" | "DEPENDENCY_FAILED" | "UNSAFE_CONTENT" | "INTERNAL";

export class SectionGenerationError extends Error {
  constructor(
    message: string,
    readonly code: SectionErrorCode,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "SectionGenerationError";
  }
}

export type GenerationRequestErrorCode =
  | "NOT_FOUND"
  | "SAMPLE_READ_ONLY"
  | "AI_NOT_CONFIGURED"
  | "NOT_READY"
  | "JOB_RUNNING"
  | "CONFLICT"
  | "GENERATION_FAILED"
  | "DISPATCH_FAILED";

const STATUS_BY_CODE: Record<GenerationRequestErrorCode, number> = {
  NOT_FOUND: 404,
  SAMPLE_READ_ONLY: 403,
  AI_NOT_CONFIGURED: 503,
  NOT_READY: 409,
  JOB_RUNNING: 409,
  CONFLICT: 409,
  GENERATION_FAILED: 502,
  DISPATCH_FAILED: 503,
};

/** Thrown by generation services; route handlers map it to `{ error, code }` + HTTP status. */
export class GenerationRequestError extends Error {
  readonly status: number;
  constructor(
    readonly code: GenerationRequestErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GenerationRequestError";
    this.status = STATUS_BY_CODE[code];
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof GenerationCancelledError || (error instanceof Error && error.name === "AbortError");
}

function unwrap(error: unknown): unknown {
  if (RetryError.isInstance(error)) return error.lastError;
  return error;
}

/** 408 / 409 / 429 / 5xx and network failures are retryable; validation and 4xx are not. */
export function isRetryableError(error: unknown): boolean {
  const e = unwrap(error);
  if (APICallError.isInstance(e)) {
    const status = e.statusCode;
    if (status === undefined) return e.isRetryable;
    return status === 408 || status === 409 || status === 429 || status >= 500 || e.isRetryable;
  }
  return e instanceof TypeError && /fetch failed|network|ECONNRESET|ETIMEDOUT|socket/i.test(e.message);
}

/** Parses retry-after / retry-after-ms headers (seconds or HTTP date). */
export function retryAfterMs(error: unknown, now: number = Date.now()): number | undefined {
  const e = unwrap(error);
  if (!APICallError.isInstance(e) || !e.responseHeaders) return undefined;
  const headers = Object.fromEntries(Object.entries(e.responseHeaders).map(([k, v]) => [k.toLowerCase(), v]));
  const ms = Number(headers["retry-after-ms"]);
  if (headers["retry-after-ms"] !== undefined && Number.isFinite(ms) && ms >= 0) return ms;
  const raw = headers["retry-after"];
  if (raw === undefined) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/** Human-readable error for job progress / section state (never includes secrets or request bodies). */
export function describeError(error: unknown): string {
  const e = unwrap(error);
  if (
    e instanceof SectionGenerationError ||
    e instanceof GenerationCancelledError ||
    e instanceof GenerationRequestError
  )
    return e.message;
  if (APICallError.isInstance(e)) {
    const status = e.statusCode ? ` (HTTP ${e.statusCode})` : "";
    if (e.statusCode === 401 || e.statusCode === 403)
      return `The AI provider rejected the API key${status}. Check your server configuration.`;
    if (e.statusCode === 429) return `The AI provider rate limit was exceeded${status}. Try again in a minute.`;
    return `AI provider request failed${status}: ${e.message.slice(0, 300)}`;
  }
  if (NoObjectGeneratedError.isInstance(e))
    return "The AI response could not be parsed as the expected JSON structure.";
  if (e instanceof Error) return e.message.slice(0, 500);
  return "Unknown error";
}
