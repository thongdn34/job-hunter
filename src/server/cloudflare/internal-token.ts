/**
 * Per-isolate secret shared between the custom Cloudflare worker entry (cloudflare/worker.ts) and
 * the Next.js route handlers running in the same isolate. The worker sets it at startup and sends
 * it on in-process calls (Workflow → POST /api/internal/…); those requests never cross the network
 * and the public fetch handler refuses /api/internal/* anyway. Under Node.js it is never set, so
 * internal routes are unreachable there. Dependency-free on purpose (imported by the worker).
 */
export const INTERNAL_TOKEN_HEADER = "x-job-hunter-internal-token";
const TOKEN_KEY = Symbol.for("job-hunter.internal-token");

type TokenGlobal = typeof globalThis & { [TOKEN_KEY]?: string };

/** Returns the isolate's token, creating it on first use (worker side). */
export function ensureInternalToken(): string {
  const scope = globalThis as TokenGlobal;
  scope[TOKEN_KEY] ??= crypto.randomUUID();
  return scope[TOKEN_KEY];
}

/** Constant-time check of a request header against the isolate's token (route side). */
export function isValidInternalToken(candidate: string | null): boolean {
  const expected = (globalThis as TokenGlobal)[TOKEN_KEY];
  if (!expected || !candidate || candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  return diff === 0;
}
