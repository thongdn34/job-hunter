import { describe, expect, it } from "vitest";
import type { MatchLevel } from "@/domain/package/schema";
import { MATCH_LEVEL_POINTS, computeMatchScore, scoreBand, type ScorableRequirement } from "./score";

const req = (
  matchLevel: MatchLevel,
  weight = 1,
  category: ScorableRequirement["category"] = "required",
): ScorableRequirement => ({
  matchLevel,
  weight,
  category,
});

describe("MATCH_LEVEL_POINTS", () => {
  it("exposes the transparent per-level table", () => {
    expect(MATCH_LEVEL_POINTS).toEqual({ strong: 1, relevant: 0.75, partial: 0.4, gap: 0, unverified: 0.2 });
  });

  it("is frozen", () => {
    expect(Object.isFrozen(MATCH_LEVEL_POINTS)).toBe(true);
  });
});

describe("computeMatchScore", () => {
  it("returns 0 with empty counts for no requirements", () => {
    const r = computeMatchScore([]);
    expect(r.score).toBe(0);
    expect(r.maxPoints).toBe(0);
    expect(r.earnedPoints).toBe(0);
    expect(r.byLevel).toEqual({ strong: 0, relevant: 0, partial: 0, gap: 0, unverified: 0 });
    expect(r.byCategory.required).toEqual({ count: 0, maxPoints: 0, earnedPoints: 0, score: 0 });
  });

  it("scores 100 when everything is strong and 0 when everything is a gap", () => {
    expect(computeMatchScore([req("strong", 3), req("strong", 5)]).score).toBe(100);
    expect(computeMatchScore([req("gap", 3), req("gap", 5)]).score).toBe(0);
  });

  it.each(Object.entries(MATCH_LEVEL_POINTS) as [MatchLevel, number][])(
    "a single %s requirement scores its level points",
    (level, pts) => {
      expect(computeMatchScore([req(level, 4)]).score).toBe(Math.round(pts * 100));
    },
  );

  it("weights requirements by their weight", () => {
    // strong w5 = 5, gap w1 = 0 -> 5/6 = 83.3%
    const r = computeMatchScore([req("strong", 5), req("gap", 1)]);
    expect(r.maxPoints).toBe(6);
    expect(r.earnedPoints).toBe(5);
    expect(r.score).toBe(83);
    // reversed weights -> 1/6 = 16.7%
    expect(computeMatchScore([req("strong", 1), req("gap", 5)]).score).toBe(17);
  });

  it("counts by level and breaks down by category", () => {
    const r = computeMatchScore([
      req("strong", 5, "required"),
      req("partial", 5, "required"),
      req("relevant", 2, "preferred"),
      req("unverified", 3, "domain"),
      req("gap", 1, "soft-skill"),
    ]);
    expect(r.byLevel).toEqual({ strong: 1, relevant: 1, partial: 1, gap: 1, unverified: 1 });
    expect(r.byCategory.required).toEqual({ count: 2, maxPoints: 10, earnedPoints: 7, score: 70 });
    expect(r.byCategory.preferred).toEqual({ count: 1, maxPoints: 2, earnedPoints: 1.5, score: 75 });
    expect(r.byCategory.domain).toEqual({ count: 1, maxPoints: 3, earnedPoints: 0.6, score: 20 });
    expect(r.byCategory["soft-skill"]).toEqual({ count: 1, maxPoints: 1, earnedPoints: 0, score: 0 });
    // (5 + 2 + 1.5 + 0.6 + 0) / 16 = 56.875%
    expect(r.maxPoints).toBe(16);
    expect(r.earnedPoints).toBe(9.1);
    expect(r.score).toBe(57);
  });

  it("avoids floating point noise in point totals", () => {
    const r = computeMatchScore([req("unverified", 1), req("unverified", 1), req("unverified", 1)]);
    expect(r.earnedPoints).toBe(0.6);
    expect(r.score).toBe(20);
  });

  it("clamps out-of-range weights to the 1..5 schema range", () => {
    const r = computeMatchScore([req("strong", 50), req("gap", 0)]);
    expect(r.maxPoints).toBe(6);
    expect(r.score).toBe(83);
  });

  it("always stays within 0..100", () => {
    const levels: MatchLevel[] = ["strong", "relevant", "partial", "gap", "unverified"];
    for (let i = 0; i < 50; i++) {
      const list = Array.from({ length: (i % 7) + 1 }, (_, j) => req(levels[(i + j) % 5]!, ((i * j) % 5) + 1));
      const { score } = computeMatchScore(list);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    }
  });
});

describe("scoreBand", () => {
  it("maps scores to bands", () => {
    expect(scoreBand(90)).toBe("strong");
    expect(scoreBand(70)).toBe("good");
    expect(scoreBand(50)).toBe("moderate");
    expect(scoreBand(10)).toBe("low");
  });
});
