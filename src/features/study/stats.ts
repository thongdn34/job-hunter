import type { Priority } from "@/domain/common/schema";
import type { CheatConcept, InterviewPackage, StudyPlan } from "@/domain/package/schema";
import type { StudyItem } from "@/domain/package/items";
import type { PackageProgress } from "@/domain/progress/schema";

/** Pure progress/statistics helpers shared by the study plan, cheat sheet and progress panel. */

export interface CompletionStats {
  total: number;
  completed: number;
  /** 0–100, rounded. 0 when total is 0. */
  percent: number;
  minutesTotal: number;
  minutesRemaining: number;
}

export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function toSet(ids: Iterable<string>): Set<string> {
  return ids instanceof Set ? (ids as Set<string>) : new Set(ids);
}

/** Completion of one plan (all days). */
export function planStats(plan: StudyPlan, completedTaskIds: Iterable<string>): CompletionStats {
  const done = toSet(completedTaskIds);
  let total = 0;
  let completed = 0;
  let minutesTotal = 0;
  let minutesRemaining = 0;
  for (const day of plan.days) {
    for (const task of day.tasks) {
      total++;
      minutesTotal += task.durationMinutes;
      if (done.has(task.id)) completed++;
      else minutesRemaining += task.durationMinutes;
    }
  }
  return { total, completed, percent: percentOf(completed, total), minutesTotal, minutesRemaining };
}

/** Completion across all plans; a task id shared by several plans counts once. */
export function overallPlanStats(plans: readonly StudyPlan[], completedTaskIds: Iterable<string>): CompletionStats {
  const done = toSet(completedTaskIds);
  const durations = new Map<string, number>();
  for (const plan of plans)
    for (const day of plan.days) for (const t of day.tasks) durations.set(t.id, t.durationMinutes);
  let completed = 0;
  let minutesTotal = 0;
  let minutesRemaining = 0;
  for (const [id, minutes] of durations) {
    minutesTotal += minutes;
    if (done.has(id)) completed++;
    else minutesRemaining += minutes;
  }
  return {
    total: durations.size,
    completed,
    percent: percentOf(completed, durations.size),
    minutesTotal,
    minutesRemaining,
  };
}

/** "1h 30m", "45m", "2h". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

export const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function isHighPriority(priority: Priority): boolean {
  return priority === "critical" || priority === "high";
}

/** Stable sort: critical → high → medium → low, authored order within a priority. */
export function sortByPriority<T extends { priority: Priority }>(list: readonly T[]): T[] {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => PRIORITY_RANK[a.item.priority] - PRIORITY_RANK[b.item.priority] || a.i - b.i)
    .map((x) => x.item);
}

export function selectConcepts(concepts: readonly CheatConcept[], highOnly: boolean): CheatConcept[] {
  const sorted = sortByPriority(concepts);
  return highOnly ? sorted.filter((c) => isHighPriority(c.priority)) : sorted;
}

/* ------------------------------------------------------------------ */
/* Progress panel summary                                              */
/* ------------------------------------------------------------------ */

export interface TopicProgress {
  id: string;
  /** Short label for the chart axis. */
  label: string;
  title: { en: string; vi: string };
  studied: number;
  total: number;
  percent: number;
}

export interface ProgressSummary {
  studied: number;
  totalItems: number;
  studiedPercent: number;
  favorites: number;
  completedTopics: number;
  totalTopics: number;
  flashcardsReviewed: number;
  flashcardsKnown: number;
  totalFlashcards: number;
  studyPlan: CompletionStats | null;
  topics: TopicProgress[];
}

const KIND_GROUPS = [
  {
    kind: "systemDesign",
    id: "__system-design",
    label: "Sys design",
    title: { en: "System design", vi: "Thiết kế hệ thống" },
  },
  { kind: "coding", id: "__coding", label: "Coding", title: { en: "Coding", vi: "Lập trình" } },
  { kind: "behavioral", id: "__behavioral", label: "STAR", title: { en: "Behavioral (STAR)", vi: "Hành vi (STAR)" } },
] as const;

export type SummaryInput = Pick<
  PackageProgress,
  "studied" | "favorites" | "completedTopics" | "flashcards" | "studyPlanTasks"
>;

export function summarizeProgress(
  pkg: InterviewPackage,
  items: readonly StudyItem[],
  progress: SummaryInput,
): ProgressSummary {
  const studiedSet = new Set(progress.studied);
  const itemIds = new Set(items.map((i) => i.id));
  const studied = progress.studied.filter((id) => itemIds.has(id)).length;

  const topicsDef = pkg.sections.bilingual?.topics ?? [];
  const topicIds = new Set(topicsDef.map((t) => t.id));
  const completedTopics = progress.completedTopics.filter((id) => topicIds.has(id)).length;

  const flashcards = pkg.sections.cheatsheet?.flashcards ?? [];
  const cardIds = new Set(flashcards.map((c) => c.id));
  const flashcardsKnown = progress.flashcards.known.filter((id) => cardIds.has(id)).length;

  const plans = pkg.sections.studyPlan?.plans ?? [];
  const studyPlan = plans.length > 0 ? overallPlanStats(plans, progress.studyPlanTasks) : null;

  const topics: TopicProgress[] = [];
  for (const t of topicsDef) {
    const list = items.filter((i) => i.kind === "question" && i.topicId === t.id);
    if (list.length === 0) continue;
    const done = list.filter((i) => studiedSet.has(i.id)).length;
    topics.push({
      id: t.id,
      label: t.code,
      title: t.title,
      studied: done,
      total: list.length,
      percent: percentOf(done, list.length),
    });
  }
  for (const g of KIND_GROUPS) {
    const list = items.filter((i) => i.kind === g.kind);
    if (list.length === 0) continue;
    const done = list.filter((i) => studiedSet.has(i.id)).length;
    topics.push({
      id: g.id,
      label: g.label,
      title: g.title,
      studied: done,
      total: list.length,
      percent: percentOf(done, list.length),
    });
  }

  return {
    studied,
    totalItems: items.length,
    studiedPercent: percentOf(studied, items.length),
    favorites: progress.favorites.length,
    completedTopics,
    totalTopics: topicsDef.length,
    flashcardsReviewed: progress.flashcards.reviewedCount,
    flashcardsKnown,
    totalFlashcards: flashcards.length,
    studyPlan,
    topics,
  };
}

/* ------------------------------------------------------------------ */
/* Mock interview sessions                                             */
/* ------------------------------------------------------------------ */

export interface MockSessionSummary {
  id: string;
  startedAt: string;
  completedAt: string | null;
  averageScore: number | null;
  answerCount: number;
}

/** Most recent session (by completedAt, else startedAt) that has a score. */
export function latestScoredSession(sessions: readonly MockSessionSummary[]): MockSessionSummary | null {
  let best: MockSessionSummary | null = null;
  let bestTime = -Infinity;
  for (const s of sessions) {
    if (typeof s.averageScore !== "number" || !Number.isFinite(s.averageScore) || s.answerCount <= 0) continue;
    const time = Date.parse(s.completedAt ?? s.startedAt);
    const t = Number.isNaN(time) ? -Infinity : time;
    if (best === null || t > bestTime) {
      best = s;
      bestTime = t;
    }
  }
  return best;
}
