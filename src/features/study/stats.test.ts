import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/domain/progress/schema";
import { collectStudyItems } from "@/domain/package/items";
import {
  formatMinutes,
  latestScoredSession,
  overallPlanStats,
  planStats,
  selectConcepts,
  sortByPriority,
  summarizeProgress,
} from "./stats";
import { itemShortLabel } from "./study-items";
import { fixtureConcepts, fixturePlans, makeFixturePackage } from "./test-fixtures";

describe("plan stats", () => {
  it("computes completion and remaining minutes", () => {
    expect(planStats(fixturePlans[0], ["t1"])).toEqual({
      total: 2,
      completed: 1,
      percent: 50,
      minutesTotal: 90,
      minutesRemaining: 60,
    });
  });

  it("overall stats count unique tasks", () => {
    const plans = [...fixturePlans, fixturePlans[0]];
    expect(overallPlanStats(plans, new Set(["t1", "t5"]))).toMatchObject({
      total: 5,
      completed: 2,
      percent: 40,
      minutesRemaining: 120,
    });
    expect(overallPlanStats([], [])).toMatchObject({ total: 0, percent: 0 });
  });

  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(150)).toBe("2h 30m");
  });
});

describe("concept ordering", () => {
  it("sorts by priority, stable within a priority", () => {
    const list = [
      { id: "a", priority: "low" as const },
      { id: "b", priority: "high" as const },
      { id: "c", priority: "low" as const },
      { id: "d", priority: "critical" as const },
    ];
    expect(sortByPriority(list).map((x) => x.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("filters high-priority concepts", () => {
    expect(selectConcepts(fixtureConcepts, true).map((c) => c.id)).toEqual(["c-crit"]);
    expect(selectConcepts(fixtureConcepts, false).map((c) => c.id)).toEqual(["c-crit", "c-med", "c-low"]);
  });
});

describe("summarizeProgress", () => {
  it("ignores ids that are not part of the package", () => {
    const pkg = makeFixturePackage();
    const items = collectStudyItems(pkg);
    const s = summarizeProgress(pkg, items, {
      ...emptyProgress(),
      studied: ["fx-q1", "fx-q3", "stale-id"],
      completedTopics: ["react", "gone"],
      flashcards: { known: ["fx-fc1", "other"], review: [], reviewedCount: 5 },
    });
    expect(s).toMatchObject({
      studied: 2,
      totalItems: 3,
      studiedPercent: 67,
      completedTopics: 1,
      totalTopics: 2,
      flashcardsKnown: 1,
      flashcardsReviewed: 5,
      totalFlashcards: 3,
    });
    expect(s.topics.map((t) => [t.label, t.percent])).toEqual([
      ["REACT", 50],
      ["TS", 100],
    ]);
  });
});

describe("latestScoredSession", () => {
  it("picks the most recent scored session", () => {
    const latest = latestScoredSession([
      { id: "a", startedAt: "2026-01-01", completedAt: "2026-01-02", averageScore: 5, answerCount: 2 },
      { id: "b", startedAt: "2026-03-01", completedAt: null, averageScore: 8, answerCount: 1 },
      { id: "c", startedAt: "2026-04-01", completedAt: null, averageScore: null, answerCount: 0 },
    ]);
    expect(latest?.id).toBe("b");
    expect(latestScoredSession([])).toBeNull();
  });
});

describe("itemShortLabel", () => {
  it("labels items by kind", () => {
    expect(itemShortLabel({ kind: "question", number: 7 })).toBe("Q7");
    expect(itemShortLabel({ kind: "systemDesign", number: 2 })).toBe("SD 2");
  });
});
