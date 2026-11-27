/**
 * Small in-process helpers that keep /api/jd/extract polite towards job sites:
 * a sliding-window limiter per client and a short-lived result cache per URL.
 * Single-instance (local-first app); swap for a shared store when scaling out.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the next request is allowed (0 when ok). */
  retryAfterSeconds: number;
  remaining: number;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 1000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= limit) {
      hits.set(key, recent);
      const oldest = recent[0] ?? now;
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)), remaining: 0 };
    }
    recent.push(now);
    hits.delete(key);
    hits.set(key, recent);
    // Evict least-recently-used keys to bound memory.
    while (hits.size > maxKeys) {
      const oldestKey = hits.keys().next().value;
      if (oldestKey === undefined) break;
      hits.delete(oldestKey);
    }
    return { ok: true, retryAfterSeconds: 0, remaining: limit - recent.length };
  };
}

export function createTtlCache<T>({ ttlMs, maxEntries = 100 }: { ttlMs: number; maxEntries?: number }) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string, now: number = Date.now()): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T, now: number = Date.now()): void {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now + ttlMs });
      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    },
    clear(): void {
      entries.clear();
    },
  };
}
