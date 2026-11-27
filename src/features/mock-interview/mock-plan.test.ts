import { describe, expect, it } from "vitest";
import { collectStudyItems } from "@/domain/package/items";
import { makeTestPackage } from "@/domain/mock/test-fixtures";
import { buildQuestionPlan, DEFAULT_PLAN_OPTIONS, eligibleItems, resolvePool, shuffle } from "./mock-plan";
import { answeredTurns, initialRunState, mockRunReducer, type MockRunState, type TurnResult } from "./session-reducer";

const pkg = makeTestPackage(6);
const items = collectStudyItems(pkg);
const pool = resolvePool(items, pkg.sections.mock!.questionPool);

/** Deterministic RNG (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("resolvePool", () => {
  it("keeps pool order and skips unknown or duplicate ids", () => {
    const r = resolvePool(items, ["t-q03", "missing", "t-q01", "t-q03"]);
    expect(r.map((i) => i.id)).toEqual(["t-q03", "t-q01"]);
    expect(pool).toHaveLength(8);
  });
});

describe("buildQuestionPlan", () => {
  it("orders by priority, stable within a priority, and respects count", () => {
    const reversed = [...pool].reverse();
    const plan = buildQuestionPlan(reversed, { ...DEFAULT_PLAN_OPTIONS, count: 5 });
    expect(plan).toHaveLength(5);
    expect(plan.slice(0, 2).every((i) => i.priority === "critical")).toBe(true);
    // stable: critical items keep their (reversed) input order
    expect(plan.slice(0, 2).map((i) => i.id)).toEqual(["t-q02", "t-q01"]);
  });

  it("excludes disabled categories but always keeps technical questions", () => {
    const plan = buildQuestionPlan(pool, {
      count: 15,
      mode: "priority",
      include: { systemDesign: false, coding: false, behavioral: false },
    });
    expect(plan.every((i) => i.kind === "question")).toBe(true);
    expect(plan).toHaveLength(6);
    expect(eligibleItems(pool, { systemDesign: true, coding: true, behavioral: true })).toHaveLength(8);
  });

  it("shuffles deterministically with an injected RNG and keeps all items", () => {
    const a = buildQuestionPlan(pool, { ...DEFAULT_PLAN_OPTIONS, count: 15, mode: "shuffled" }, seeded(1));
    const b = buildQuestionPlan(pool, { ...DEFAULT_PLAN_OPTIONS, count: 15, mode: "shuffled" }, seeded(1));
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(new Set(a.map((i) => i.id))).toEqual(new Set(pool.map((i) => i.id)));
    expect(shuffle([], seeded(2))).toEqual([]);
  });
});

describe("mockRunReducer", () => {
  const result = (itemId: string, overall = 7): TurnResult => ({
    answerId: `a-${itemId}`,
    itemId,
    overall,
    revealedBeforeSubmit: false,
    evaluation: {
      scores: { technicalAccuracy: overall, seniorJudgment: overall, communication: overall, completeness: overall },
      overall,
      strengths: [],
      gaps: [],
      improvedAnswer: "x",
      feedbackVi: "y",
      followUpQuestion: { en: "f", vi: "f" },
      evaluator: "heuristic",
    },
  });

  it("walks setup → interview → summary", () => {
    let s: MockRunState = mockRunReducer(initialRunState, { type: "start", sessionId: "s1", itemIds: ["a", "b"] });
    expect(s.phase).toBe("interview");
    // cannot advance before answering
    expect(mockRunReducer(s, { type: "next" })).toBe(s);
    s = mockRunReducer(s, { type: "result", index: 0, result: result("a", 6) });
    s = mockRunReducer(s, { type: "next" });
    expect(s.phase === "interview" && s.index).toBe(1);
    s = mockRunReducer(s, { type: "result", index: 1, result: result("b", 8) });
    // no next past the end
    expect(mockRunReducer(s, { type: "next" })).toBe(s);
    s = mockRunReducer(s, { type: "finish", session: null });
    expect(s.phase).toBe("summary");
    if (s.phase === "summary") expect(answeredTurns(s.turns, s.results).map((t) => t.result.overall)).toEqual([6, 8]);
    expect(mockRunReducer(s, { type: "reset" })).toEqual(initialRunState);
  });

  it("ignores an empty plan", () => {
    expect(mockRunReducer(initialRunState, { type: "start", sessionId: "s", itemIds: [] })).toBe(initialRunState);
  });

  it("inserts a follow-up as the next turn once", () => {
    let s: MockRunState = mockRunReducer(initialRunState, { type: "start", sessionId: "s1", itemIds: ["a", "b"] });
    s = mockRunReducer(s, { type: "result", index: 0, result: result("a") });
    s = mockRunReducer(s, { type: "followUp", followUpId: "a-f1", parentId: "a" });
    expect(s.phase === "interview" && s.turns.map((t) => t.itemId)).toEqual(["a", "a-f1", "b"]);
    expect(s.phase === "interview" && s.index).toBe(1);
    expect(s.phase === "interview" && s.turns[1]?.parentId).toBe("a");
  });
});
