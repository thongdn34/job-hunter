import { describe, expect, it } from "vitest";
import {
  applyRevealPenalty,
  averageScore,
  clampScore,
  countWords,
  CRITERION_WEIGHTS,
  extractKeyTerms,
  normalizeScores,
  REVEAL_PENALTY,
  roundOneDecimal,
  scoreBand,
  stem,
  termCoverage,
  tokenize,
  weightedOverall,
} from "./scoring";
import { InterviewPackageSchema } from "@/domain/package/schema";
import { buildMockItemIndex, resolveMockItem } from "./item-context";
import { makeTestPackage } from "./test-fixtures";

describe("clampScore / roundOneDecimal", () => {
  it("clamps into [0, 10] and maps non-finite to 0", () => {
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(12.5)).toBe(10);
    expect(clampScore(7.25)).toBe(7.25);
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(Number.POSITIVE_INFINITY)).toBe(0);
  });
  it("rounds to one decimal without float noise", () => {
    expect(roundOneDecimal(7.25)).toBe(7.3);
    expect(roundOneDecimal(7.24)).toBe(7.2);
    expect(roundOneDecimal(0.1 + 0.2)).toBe(0.3);
    expect(roundOneDecimal(Number.NaN)).toBe(0);
  });
  it("normalizes every criterion", () => {
    expect(
      normalizeScores({ technicalAccuracy: 11, seniorJudgment: -1, communication: 5.55, completeness: 3.14159 }),
    ).toEqual({
      technicalAccuracy: 10,
      seniorJudgment: 0,
      communication: 5.6,
      completeness: 3.1,
    });
  });
});

describe("weightedOverall", () => {
  it("uses the documented weights that sum to 1", () => {
    const sum = Object.values(CRITERION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(CRITERION_WEIGHTS).toEqual({
      technicalAccuracy: 0.35,
      seniorJudgment: 0.25,
      communication: 0.2,
      completeness: 0.2,
    });
  });
  it("computes a weighted average with one decimal", () => {
    // 8*0.35 + 6*0.25 + 7*0.2 + 5*0.2 = 2.8 + 1.5 + 1.4 + 1.0 = 6.7
    expect(weightedOverall({ technicalAccuracy: 8, seniorJudgment: 6, communication: 7, completeness: 5 })).toBe(6.7);
    expect(weightedOverall({ technicalAccuracy: 10, seniorJudgment: 10, communication: 10, completeness: 10 })).toBe(
      10,
    );
    expect(weightedOverall({ technicalAccuracy: 0, seniorJudgment: 0, communication: 0, completeness: 0 })).toBe(0);
  });
  it("clamps out-of-range criterion values before weighting", () => {
    expect(weightedOverall({ technicalAccuracy: 50, seniorJudgment: -5, communication: 10, completeness: 10 })).toBe(
      7.5,
    );
  });
});

describe("applyRevealPenalty / averageScore / scoreBand", () => {
  it("subtracts the reveal penalty but never goes below 0", () => {
    expect(applyRevealPenalty(7.5, true)).toBe(7.5 - REVEAL_PENALTY);
    expect(applyRevealPenalty(1.2, true)).toBe(0);
    expect(applyRevealPenalty(7.5, false)).toBe(7.5);
  });
  it("averages with one decimal and returns null for no answers", () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([7, 8, 8])).toBe(7.7);
    expect(averageScore([5, Number.NaN])).toBe(5);
  });
  it("maps scores to bands", () => {
    expect(scoreBand(9)).toBe("strong");
    expect(scoreBand(6)).toBe("solid");
    expect(scoreBand(4.5)).toBe("developing");
    expect(scoreBand(1)).toBe("weak");
  });
});

describe("tokenize / stem", () => {
  it("keeps technical shapes and flags them", () => {
    const toks = tokenize("Use useMemo in Next.js with HTTP/2 and SSE, e.g. for C++ tooling.");
    const terms = toks.map((t) => t.term);
    expect(terms).toContain("usememo");
    expect(terms).toContain("next.js");
    expect(terms).toContain("http/2");
    expect(terms).toContain("sse");
    expect(toks.find((t) => t.term === "usememo")?.technical).toBe(true);
    expect(toks.find((t) => t.term === "next.js")?.technical).toBe(true);
    expect(toks.find((t) => t.term === "tooling")?.technical).toBe(false);
  });
  it("normalizes simple inflections to the same stem", () => {
    expect(stem("caching")).toBe(stem("cache"));
    expect(stem("caches")).toBe(stem("cached"));
    expect(stem("queries")).toBe("query");
    expect(stem("renders")).toBe(stem("rendering"));
    expect(stem("next.js")).toBe("next.js");
  });
  it("counts words", () => {
    expect(countWords("  ")).toBe(0);
    expect(countWords("one two\nthree")).toBe(3);
  });
});

describe("extractKeyTerms / termCoverage", () => {
  const reference =
    "Virtualization renders only visible rows. With react-window the DOM stays small; memoize row components with React.memo and keep row heights fixed. The trade-off is scroll jank when heights vary.";

  it("filters stopwords and ranks technical terms first", () => {
    const terms = extractKeyTerms(reference, 8);
    const words = terms.map((t) => t.term);
    expect(words).not.toContain("the");
    expect(words).not.toContain("with");
    expect(words).toContain("react-window");
    expect(words).toContain("react.memo");
    expect(terms.length).toBeLessThanOrEqual(8);
    // technical terms carry double weight
    expect(terms[0]!.technical).toBe(true);
  });

  it("respects the limit and handles empty text", () => {
    expect(extractKeyTerms("", 5)).toEqual([]);
    expect(extractKeyTerms(reference, 0)).toEqual([]);
  });

  it("measures weighted coverage with stem matching", () => {
    const terms = extractKeyTerms(reference, 10);
    const good = termCoverage(
      terms,
      "I virtualize the list with react-window, render visible rows, memoize rows via React.memo, fixed heights keep DOM small.",
    );
    const bad = termCoverage(terms, "I would make it faster.");
    expect(good.ratio).toBeGreaterThan(bad.ratio);
    expect(good.matched.length).toBeGreaterThan(3);
    expect(bad.missing.length).toBe(terms.length);
    expect(termCoverage([], "anything").ratio).toBe(1);
  });
});

describe("item context", () => {
  const pkg = makeTestPackage(3);

  it("fixture validates against InterviewPackageSchema", () => {
    expect(InterviewPackageSchema.safeParse(pkg).success).toBe(true);
  });

  it("resolves primary items with full content", () => {
    const item = resolveMockItem(pkg, "t-q01");
    expect(item?.kind).toBe("question");
    expect(item?.memoryShortcut?.en).toMatch(/Backoff/);
    expect(item?.followUp?.id).toBe("t-q01-f1");
    expect(item?.prompt.en).toMatch(/WebSocket/);
  });

  it("resolves stored follow-ups as askable items", () => {
    const follow = resolveMockItem(pkg, "t-q01-f1");
    expect(follow?.parentId).toBe("t-q01");
    expect(follow?.referenceAnswer).toMatch(/jitter/);
    expect(follow?.followUp).toBeUndefined();
    expect(resolveMockItem(pkg, "t-b1-f1")?.kind).toBe("behavioral");
  });

  it("returns null for unknown ids", () => {
    expect(resolveMockItem(pkg, "nope")).toBeNull();
    expect(buildMockItemIndex(pkg).size).toBe(3 * 2 + 2 * 2);
  });
});
