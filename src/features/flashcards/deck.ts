import type { Flashcard } from "@/domain/package/schema";

/**
 * Pure flashcard-deck logic (no React). The deck UI keeps a *session order* of card ids:
 * filtering and shuffling rebuild it, but marking a card known/review does not, so cards
 * never jump around while the user is studying.
 */

export const DECK_FILTERS = ["all", "review", "unknown"] as const;
export type DeckFilter = (typeof DECK_FILTERS)[number];

export interface FlashcardMarks {
  known: readonly string[];
  review: readonly string[];
}

/** mulberry32 — tiny, fast, deterministic PRNG returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seed. Same seed + same input => same output. Never mutates. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Keeps the cards matching the filter, preserving input order. */
export function filterCards<T extends Pick<Flashcard, "id">>(
  cards: readonly T[],
  filter: DeckFilter,
  marks: FlashcardMarks,
): T[] {
  if (filter === "all") return cards.slice();
  if (filter === "review") {
    const review = new Set(marks.review);
    return cards.filter((c) => review.has(c.id));
  }
  const known = new Set(marks.known);
  return cards.filter((c) => !known.has(c.id));
}

/** Builds the ordered id list for a deck session. `seed === null` keeps the authored order. */
export function buildDeckOrder(
  cards: readonly Pick<Flashcard, "id">[],
  filter: DeckFilter,
  marks: FlashcardMarks,
  seed: number | null,
): string[] {
  const ids = filterCards(cards, filter, marks).map((c) => c.id);
  return seed === null ? ids : shuffle(ids, seed);
}

/** Clamps an index into [0, length - 1]; returns 0 for an empty deck. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), length - 1);
}

export function nextIndex(index: number, length: number, wrap = true): number {
  if (length <= 0) return 0;
  const i = clampIndex(index, length);
  if (i < length - 1) return i + 1;
  return wrap ? 0 : i;
}

export function prevIndex(index: number, length: number, wrap = true): number {
  if (length <= 0) return 0;
  const i = clampIndex(index, length);
  if (i > 0) return i - 1;
  return wrap ? length - 1 : i;
}

/* ------------------------------------------------------------------ */
/* Session reducer                                                     */
/* ------------------------------------------------------------------ */

export interface DeckState {
  /** Card ids in session order. */
  order: string[];
  index: number;
  flipped: boolean;
  filter: DeckFilter;
  /** Seed of the current shuffle; null = authored order. */
  seed: number | null;
}

export type DeckAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "goTo"; index: number }
  | { type: "flip" }
  | { type: "setFlipped"; flipped: boolean }
  /** Rebuild the session (filter change, shuffle, restore order). */
  | { type: "rebuild"; order: string[]; filter: DeckFilter; seed: number | null };

export function initialDeckState(cards: readonly Pick<Flashcard, "id">[]): DeckState {
  return { order: cards.map((c) => c.id), index: 0, flipped: false, filter: "all", seed: null };
}

export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  const n = state.order.length;
  switch (action.type) {
    case "next": {
      if (n <= 1) return state.flipped ? { ...state, flipped: false } : state;
      return { ...state, index: nextIndex(state.index, n), flipped: false };
    }
    case "prev": {
      if (n <= 1) return state.flipped ? { ...state, flipped: false } : state;
      return { ...state, index: prevIndex(state.index, n), flipped: false };
    }
    case "goTo": {
      const index = clampIndex(action.index, n);
      return index === state.index ? state : { ...state, index, flipped: false };
    }
    case "flip":
      return n === 0 ? state : { ...state, flipped: !state.flipped };
    case "setFlipped":
      return state.flipped === action.flipped ? state : { ...state, flipped: action.flipped };
    case "rebuild":
      return { order: action.order, index: 0, flipped: false, filter: action.filter, seed: action.seed };
    default:
      return state;
  }
}

/** Resolves the session order into cards, dropping ids that no longer exist. */
export function resolveDeck<T extends Pick<Flashcard, "id">>(order: readonly string[], cards: readonly T[]): T[] {
  const byId = new Map(cards.map((c) => [c.id, c] as const));
  const out: T[] = [];
  for (const id of order) {
    const card = byId.get(id);
    if (card) out.push(card);
  }
  return out;
}
