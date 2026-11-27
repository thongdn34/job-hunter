import { z } from "zod";
import type { NormalizedJd } from "@/domain/jd/schema";
import { extractJobFromUrl, isJdExtractionError } from "@/server/jd";
import { createRateLimiter, createTtlCache } from "@/server/jd/rate-limit";
import { getCloudflareEnv, isCloudflareRuntime } from "@/server/cloudflare/env";
import { clientKey } from "@/server/jd/client-key";

// Fetches a remote page on every call; never cache at the framework level.
export const dynamic = "force-dynamic";

const ExtractRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a job URL").max(2048, "The URL is too long"),
});

/** 10 extractions per minute per client keeps us polite towards LinkedIn/ITviec. */
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
/** Re-previewing the same URL within 10 minutes is served from memory. */
const cache = createTtlCache<NormalizedJd>({ ttlMs: 10 * 60_000, maxEntries: 50 });

const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Workers Rate Limiting binding when deployed on Cloudflare (shared across isolates), else in-memory. */
async function checkRateLimit(request: Request): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const key = clientKey(request);
  if (isCloudflareRuntime()) {
    const binding = getCloudflareEnv().JD_RATE_LIMITER;
    if (binding) {
      const { success } = await binding.limit({ key });
      return { ok: success, retryAfterSeconds: success ? 0 : RATE_LIMIT_WINDOW_SECONDS };
    }
  }
  return limiter(key);
}

function errorResponse(status: number, code: string, error: string, headers?: HeadersInit): Response {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * POST /api/jd/extract { url } -> 200 { jd } | 422 { error, code }
 * 400 for a malformed body, 429 when rate-limited. All failures carry a user-facing
 * message so the UI can fall back to manual paste.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "BAD_REQUEST", 'Request body must be JSON: { "url": "https://…" }.');
  }

  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, "INVALID_URL", parsed.error.issues[0]?.message ?? "Enter a valid job URL.");
  }
  const { url } = parsed.data;

  const cached = cache.get(url);
  if (cached) return Response.json({ jd: cached }, { headers: { "Cache-Control": "no-store" } });

  const limit = await checkRateLimit(request);
  if (!limit.ok) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      `Too many extraction requests. Try again in ${limit.retryAfterSeconds} s.`,
      {
        "Retry-After": String(limit.retryAfterSeconds),
      },
    );
  }

  try {
    const jd = await extractJobFromUrl(url, { signal: request.signal });
    cache.set(url, jd);
    return Response.json({ jd }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isJdExtractionError(error)) return errorResponse(422, error.code, error.message);
    console.error("[jd/extract] unexpected extraction failure", error);
    return errorResponse(
      422,
      "FETCH_FAILED",
      "Something went wrong while reading that page. Paste the job description instead.",
    );
  }
}
