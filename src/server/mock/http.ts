import "server-only";
import { z } from "zod";
import { MockRepositoryError } from "@/server/repositories/mock-repository";

/** JSON error response: `{ error, issues? }`. */
export function jsonError(status: number, error: string, issues?: unknown[]): Response {
  return Response.json(issues ? { error, issues } : { error }, { status });
}

/**
 * Reads + validates a JSON body. Returns the parsed data or a 400/415 Response. The body must be
 * sent as application/json — a missing Content-Type is refused too (a typeless Blob body is a
 * CORS "simple" request other websites could send without a preflight).
 */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.output<T> } | { ok: false; response: Response }> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json" && !type.endsWith("+json")) {
    return { ok: false, response: jsonError(415, "Content-Type must be application/json.") };
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "Request body must be valid JSON.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: jsonError(400, z.prettifyError(result.error), result.error.issues) };
  }
  return { ok: true, data: result.data };
}

/** Maps known errors to HTTP responses; unknown errors become a 500 without leaking internals. */
export function errorResponse(error: unknown): Response {
  if (error instanceof MockRepositoryError) return jsonError(error.status, error.message);
  console.error("[api/mock] unexpected error:", error);
  return jsonError(500, "Something went wrong while processing the mock interview request.");
}
