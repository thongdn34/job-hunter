import type { Priority } from "@/domain/common/schema";
import type { StudyItem, StudyItemKind } from "@/domain/package/items";

/** Pure planning helpers for a mock interview session (which questions, in which order). */

export const QUESTION_COUNTS = [5, 10, 15] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

export const PLAN_MODES = ["priority", "shuffled"] as const;
export type PlanMode = (typeof PLAN_MODES)[number];

export interface PlanOptions {
  count: number;
  mode: PlanMode;
  include: { systemDesign: boolean; coding: boolean; behavioral: boolean };
}

export const DEFAULT_PLAN_OPTIONS: PlanOptions = {
  count: 5,
  mode: "priority",
  include: { systemDesign: true, coding: true, behavioral: true },
};

/** The fields planning needs — satisfied by `StudyItem` and the client DTO `MockClientItem`. */
export type PlanItem = Pick<StudyItem, "id" | "kind" | "priority">;

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function kindIncluded(kind: StudyItemKind, include: PlanOptions["include"]): boolean {
  if (kind === "question") return true;
  return include[kind];
}

/** Items of the pool that exist in the package, in pool order (unknown/duplicate ids skipped). */
export function resolvePool<T extends { id: string }>(items: readonly T[], pool: readonly string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of pool) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

/** Fisher–Yates with an injectable RNG (deterministic in tests). */
export function shuffle<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Eligible pool after the category toggles. */
export function eligibleItems<T extends PlanItem>(pool: readonly T[], include: PlanOptions["include"]): T[] {
  return pool.filter((i) => kindIncluded(i.kind, include));
}

/**
 * Builds the ordered list of questions for a session.
 * - priority: stable sort by priority (critical → low), keeping the curated pool order within a priority.
 * - shuffled: random order over the whole eligible pool.
 */
export function buildQuestionPlan<T extends PlanItem>(
  pool: readonly T[],
  options: PlanOptions,
  random: () => number = Math.random,
): T[] {
  const eligible = eligibleItems(pool, options.include);
  const ordered =
    options.mode === "shuffled"
      ? shuffle(eligible, random)
      : eligible
          .map((item, index) => ({ item, index }))
          .sort((a, b) => PRIORITY_RANK[a.item.priority] - PRIORITY_RANK[b.item.priority] || a.index - b.index)
          .map((x) => x.item);
  return ordered.slice(0, Math.max(0, options.count));
}

export const KIND_LABELS: Record<StudyItemKind, { en: string; vi: string }> = {
  question: { en: "Technical", vi: "Kỹ thuật" },
  systemDesign: { en: "System design", vi: "Thiết kế hệ thống" },
  coding: { en: "Coding", vi: "Lập trình" },
  behavioral: { en: "Behavioral", vi: "Hành vi" },
};
