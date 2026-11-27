import "server-only";
import { z } from "zod";
import {
  PackageNotFoundError,
  QuestionNotFoundError,
  SamplePackageError,
} from "@/server/repositories/repository-errors";
import { GenerationRequestError } from "./errors";

/** Shared JSON helpers for the generation route handlers. */

export function jsonError(status: number, error: string, code: string, extra: Record<string, unknown> = {}): Response {
  return Response.json({ error, code, ...extra }, { status });
}

function isJsonContentType(value: string | null): boolean {
  const type = value?.split(";")[0].trim().toLowerCase();
  return type === "application/json" || Boolean(type?.endsWith("+json"));
}

/**
 * Parses a JSON body with a Zod schema; empty bodies parse as `{}`. A non-empty body must be
 * sent as application/json (415 otherwise): text/plain is a CORS "simple" request that other
 * websites could send without a preflight.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: Response }> {
  let raw: unknown = {};
  try {
    const text = await request.text();
    if (text.trim() && !isJsonContentType(request.headers.get("content-type"))) {
      return { response: jsonError(415, "Content-Type must be application/json.", "UNSUPPORTED_MEDIA_TYPE") };
    }
    raw = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { response: jsonError(400, "Request body must be valid JSON.", "INVALID_JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      response: jsonError(400, "Invalid request.", "VALIDATION_ERROR", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
      }),
    };
  }
  return { data: parsed.data };
}

/** Maps known errors to HTTP responses; unknown errors become a generic 500 (logged). */
export function errorToResponse(error: unknown, context: string): Response {
  if (error instanceof GenerationRequestError) return jsonError(error.status, error.message, error.code, error.details);
  if (error instanceof PackageNotFoundError) return jsonError(404, error.message, "NOT_FOUND");
  if (error instanceof QuestionNotFoundError) return jsonError(404, error.message, "NOT_FOUND");
  if (error instanceof SamplePackageError) return jsonError(403, error.message, "SAMPLE_READ_ONLY");
  if (error instanceof z.ZodError) return jsonError(400, "Invalid data.", "VALIDATION_ERROR");
  console.error(`[api] ${context} failed`, error);
  return jsonError(500, "Something went wrong. Please try again.", "INTERNAL_ERROR");
}
