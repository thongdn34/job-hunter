import { describe, expect, it } from "vitest";
import { emptyProgress, type PackageProgress } from "@/domain/progress/schema";
import { parseStoredProgress, shouldAcceptProgress } from "./progress-mapper";

const at = (updatedAt: string, studied: string[] = []): PackageProgress => ({ ...emptyProgress(), studied, updatedAt });

describe("shouldAcceptProgress", () => {
  it("accepts the first write", () => {
    expect(shouldAcceptProgress(null, at("2026-11-20T00:00:00.000Z"))).toBe(true);
  });

  it("accepts newer and equal timestamps, rejects older ones", () => {
    const stored = at("2026-11-20T10:00:00.000Z");
    expect(shouldAcceptProgress(stored, at("2026-11-20T10:00:01.000Z"))).toBe(true);
    expect(shouldAcceptProgress(stored, at("2026-11-20T10:00:00.000Z"))).toBe(true);
    expect(shouldAcceptProgress(stored, at("2026-11-20T09:59:59.999Z"))).toBe(false);
  });

  it("compares instants, not strings", () => {
    expect(shouldAcceptProgress(at("2026-11-20T10:00:00.000Z"), at("2026-11-20T12:00:00+03:00"))).toBe(false);
  });

  it("handles unparsable timestamps defensively", () => {
    expect(shouldAcceptProgress(at("2026-11-20T10:00:00.000Z"), at("garbage"))).toBe(false);
    expect(shouldAcceptProgress(at("garbage"), at("2026-11-20T10:00:00.000Z"))).toBe(true);
  });
});

describe("parseStoredProgress", () => {
  it("returns valid progress and null for invalid payloads", () => {
    expect(parseStoredProgress(at("2026-11-20T00:00:00.000Z", ["q1"]))?.studied).toEqual(["q1"]);
    expect(parseStoredProgress({ studied: "nope" })).toBeNull();
    expect(parseStoredProgress(null)).toBeNull();
  });
});
