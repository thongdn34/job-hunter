// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRateLimiter, createTtlCache } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` requests per window and reports retry-after", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 10_000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 1_000).ok).toBe(true);
    expect(check("a", 2_000)).toEqual({ ok: false, retryAfterSeconds: 8, remaining: 0 });
    expect(check("b", 2_000).ok).toBe(true);
    expect(check("a", 10_001).ok).toBe(true);
  });

  it("bounds the number of tracked keys", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    check("a", 0);
    check("b", 0);
    check("c", 0);
    // "a" was evicted, so it is allowed again.
    expect(check("a", 1).ok).toBe(true);
  });
});

describe("createTtlCache", () => {
  it("expires entries and evicts the oldest beyond capacity", () => {
    const cache = createTtlCache<number>({ ttlMs: 100, maxEntries: 2 });
    cache.set("a", 1, 0);
    expect(cache.get("a", 50)).toBe(1);
    expect(cache.get("a", 100)).toBeUndefined();
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.set("c", 3, 0);
    expect(cache.get("a", 1)).toBeUndefined();
    expect(cache.get("c", 1)).toBe(3);
  });
});
