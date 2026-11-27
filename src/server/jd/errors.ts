export const JD_EXTRACTION_ERROR_CODES = [
  "INVALID_URL",
  "BLOCKED_HOST",
  "FETCH_FAILED",
  "TIMEOUT",
  "TOO_LARGE",
  "NO_CONTENT",
  "LOGIN_REQUIRED",
] as const;
export type JdExtractionErrorCode = (typeof JD_EXTRACTION_ERROR_CODES)[number];

/** Expected, user-facing extraction failure. `message` is safe to show in the UI. */
export class JdExtractionError extends Error {
  readonly code: JdExtractionErrorCode;

  constructor(code: JdExtractionErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "JdExtractionError";
    this.code = code;
  }
}

export function isJdExtractionError(error: unknown): error is JdExtractionError {
  return error instanceof JdExtractionError;
}
