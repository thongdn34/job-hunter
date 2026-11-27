import { afterEach, describe, expect, it } from "vitest";
import { ensureInternalToken, isValidInternalToken } from "./internal-token";

const KEY = Symbol.for("job-hunter.internal-token");

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

describe("internal token", () => {
  it("rejects everything while no token exists (Node.js runtime)", () => {
    expect(isValidInternalToken(null)).toBe(false);
    expect(isValidInternalToken("")).toBe(false);
    expect(isValidInternalToken("anything")).toBe(false);
  });

  it("accepts only the isolate's token", () => {
    const token = ensureInternalToken();
    expect(ensureInternalToken()).toBe(token);
    expect(isValidInternalToken(token)).toBe(true);
    expect(isValidInternalToken(`${token.slice(0, -1)}x`)).toBe(false);
    expect(isValidInternalToken(token.slice(1))).toBe(false);
  });
});
