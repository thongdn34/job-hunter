"use client";

import { useProgressStore } from "@/stores/progress-store";

const EMPTY: readonly string[] = Object.freeze([]);

/** True when every id is in `studied` (an empty topic is never "complete"). */
export function isTopicComplete(questionIds: readonly string[], studied: readonly string[]): boolean {
  if (questionIds.length === 0) return false;
  const set = new Set(studied);
  return questionIds.every((id) => set.has(id));
}

/**
 * Event-handler path for toggling a question's studied flag. Also keeps
 * `completedTopics` in sync with the topic's questions (no effect loops).
 */
export function toggleStudiedAndSyncTopic(
  slug: string,
  questionId: string,
  topic: { id: string; questionIds: readonly string[] } | undefined,
): void {
  const store = useProgressStore.getState();
  store.toggleIn(slug, "studied", questionId);
  if (!topic) return;
  const { studied, completedTopics } = useProgressStore.getState().get(slug);
  const complete = isTopicComplete(topic.questionIds, studied);
  if (completedTopics.includes(topic.id) !== complete) store.setIn(slug, "completedTopics", topic.id, complete);
}

/** Number of the given ids that are studied. Re-renders only when the count changes. */
export function useStudiedCount(slug: string, ids: readonly string[]): number {
  return useProgressStore((s) => {
    const studied = s.byPackage[slug]?.studied;
    if (!studied || studied.length === 0) return 0;
    const set = new Set(studied);
    let n = 0;
    for (const id of ids) if (set.has(id)) n++;
    return n;
  });
}

/** Studied ids of a package, or a stable empty array when `enabled` is false (avoids re-renders). */
export function useStudiedIds(slug: string, enabled: boolean): readonly string[] {
  return useProgressStore((s) => (enabled ? (s.byPackage[slug]?.studied ?? EMPTY) : EMPTY));
}

/** Favorite ids of a package, or a stable empty array when `enabled` is false. */
export function useFavoriteIds(slug: string, enabled: boolean): readonly string[] {
  return useProgressStore((s) => (enabled ? (s.byPackage[slug]?.favorites ?? EMPTY) : EMPTY));
}
