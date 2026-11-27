import { describe, expect, it } from "vitest";
import {
  buildDeckOrder,
  clampIndex,
  deckReducer,
  filterCards,
  initialDeckState,
  nextIndex,
  prevIndex,
  resolveDeck,
  seededRandom,
  shuffle,
} from "./deck";

const cards = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));

describe("navigation", () => {
  it("wraps by default", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(2, 3)).toBe(1);
  });

  it("clamps when wrap is disabled", () => {
    expect(nextIndex(2, 3, false)).toBe(2);
    expect(prevIndex(0, 3, false)).toBe(0);
  });

  it("handles empty and out-of-range indices", () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
    expect(clampIndex(10, 3)).toBe(2);
    expect(clampIndex(-4, 3)).toBe(0);
    expect(clampIndex(5, 0)).toBe(0);
    expect(nextIndex(99, 3)).toBe(0); // clamped to 2, then wraps
  });
});

describe("shuffle", () => {
  it("is deterministic for a seed and does not mutate the input", () => {
    const input = cards.map((c) => c.id);
    const copy = input.slice();
    const a = shuffle(input, 42);
    const b = shuffle(input, 42);
    expect(a).toEqual(b);
    expect(input).toEqual(copy);
    expect(a.slice().sort()).toEqual(copy);
  });

  it("produces different orders for different seeds", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(input, 1)).not.toEqual(shuffle(input, 2));
  });

  it("seededRandom yields floats in [0, 1)", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("handles empty and single-element lists", () => {
    expect(shuffle([], 3)).toEqual([]);
    expect(shuffle(["x"], 3)).toEqual(["x"]);
  });
});

describe("filters", () => {
  const marks = { known: ["a", "b"], review: ["c", "a-missing"] };

  it("all keeps every card in order", () => {
    expect(filterCards(cards, "all", marks).map((c) => c.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("review keeps only cards marked for review", () => {
    expect(filterCards(cards, "review", marks).map((c) => c.id)).toEqual(["c"]);
  });

  it("unknown drops known cards", () => {
    expect(filterCards(cards, "unknown", marks).map((c) => c.id)).toEqual(["c", "d", "e", "f"]);
  });

  it("buildDeckOrder filters then shuffles deterministically", () => {
    const order = buildDeckOrder(cards, "unknown", marks, 5);
    expect(order.slice().sort()).toEqual(["c", "d", "e", "f"]);
    expect(buildDeckOrder(cards, "unknown", marks, 5)).toEqual(order);
    expect(buildDeckOrder(cards, "unknown", marks, null)).toEqual(["c", "d", "e", "f"]);
  });
});

describe("deckReducer", () => {
  it("navigates with wrap-around and resets flip", () => {
    let s = initialDeckState(cards.slice(0, 3));
    s = deckReducer(s, { type: "flip" });
    expect(s.flipped).toBe(true);
    s = deckReducer(s, { type: "next" });
    expect(s).toMatchObject({ index: 1, flipped: false });
    s = deckReducer(s, { type: "next" });
    s = deckReducer(s, { type: "next" });
    expect(s.index).toBe(0);
    s = deckReducer(s, { type: "prev" });
    expect(s.index).toBe(2);
  });

  it("goTo clamps", () => {
    const s = deckReducer(initialDeckState(cards), { type: "goTo", index: 100 });
    expect(s.index).toBe(5);
  });

  it("rebuild resets position", () => {
    let s = deckReducer(initialDeckState(cards), { type: "goTo", index: 3 });
    s = deckReducer(s, { type: "rebuild", order: ["d", "c"], filter: "review", seed: 9 });
    expect(s).toEqual({ order: ["d", "c"], index: 0, flipped: false, filter: "review", seed: 9 });
  });

  it("flip is a no-op on an empty deck", () => {
    const s = initialDeckState([]);
    expect(deckReducer(s, { type: "flip" })).toBe(s);
  });
});

describe("resolveDeck", () => {
  it("maps ids to cards and skips unknown ids", () => {
    expect(resolveDeck(["c", "zzz", "a"], cards)).toEqual([{ id: "c" }, { id: "a" }]);
  });
});
