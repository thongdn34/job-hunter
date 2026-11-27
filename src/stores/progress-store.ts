"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { emptyProgress, type PackageProgress } from "@/domain/progress/schema";

/**
 * Study progress for every package, keyed by package slug.
 * Persisted to localStorage (survives browser sessions). Server sync is handled by
 * `useProgressSync` in src/features/study (debounced PUT /api/progress/[slug]).
 *
 * CONTRACT: other features only use the actions below; never mutate `byPackage` directly.
 * The package page tracks the live reading position in `reading-position-store` (device-local),
 * so scrolling never touches this persisted/synced document.
 */
type ListKey = "studied" | "favorites" | "completedTopics" | "studyPlanTasks" | "projectChecklist";

interface ProgressState {
  byPackage: Record<string, PackageProgress>;
  get: (slug: string) => PackageProgress;
  toggleIn: (slug: string, list: ListKey, id: string) => void;
  setIn: (slug: string, list: ListKey, id: string, on: boolean) => void;
  markFlashcard: (slug: string, cardId: string, result: "known" | "review") => void;
  incrementFlashcardsReviewed: (slug: string) => void;
  /**
   * Remember the reading position. Does NOT bump `updatedAt`: the position is a local convenience,
   * not a progress edit, so scrolling never makes a stale copy "newer" (last-write-wins) and never
   * triggers a sync PUT on its own. It reaches the server with the next real progress change.
   */
  setLastPosition: (slug: string, pos: { section?: string; anchor?: string; scrollY?: number }) => void;
  /** Replace progress (used when hydrating from the server if the server copy is newer). */
  replace: (slug: string, progress: PackageProgress) => void;
  reset: (slug: string) => void;
}

const now = () => new Date().toISOString();

/** localStorage key of the persisted progress store (also used for cross-tab `storage` events). */
export const PROGRESS_STORAGE_KEY = "job-hunter:progress";

function update(
  state: ProgressState,
  slug: string,
  fn: (p: PackageProgress) => PackageProgress,
): Pick<ProgressState, "byPackage"> {
  const current = state.byPackage[slug] ?? emptyProgress();
  return { byPackage: { ...state.byPackage, [slug]: { ...fn(current), updatedAt: now() } } };
}

function toggle(list: string[], id: string, on?: boolean): string[] {
  const has = list.includes(id);
  const want = on ?? !has;
  if (want === has) return list;
  return want ? [...list, id] : list.filter((x) => x !== id);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, getState) => ({
      byPackage: {},
      get: (slug) => getState().byPackage[slug] ?? emptyProgress(),
      toggleIn: (slug, list, id) => set((s) => update(s, slug, (p) => ({ ...p, [list]: toggle(p[list], id) }))),
      setIn: (slug, list, id, on) => set((s) => update(s, slug, (p) => ({ ...p, [list]: toggle(p[list], id, on) }))),
      markFlashcard: (slug, cardId, result) =>
        set((s) =>
          update(s, slug, (p) => ({
            ...p,
            flashcards: {
              ...p.flashcards,
              known: toggle(p.flashcards.known, cardId, result === "known"),
              review: toggle(p.flashcards.review, cardId, result === "review"),
            },
          })),
        ),
      incrementFlashcardsReviewed: (slug) =>
        set((s) =>
          update(s, slug, (p) => ({
            ...p,
            flashcards: { ...p.flashcards, reviewedCount: p.flashcards.reviewedCount + 1 },
          })),
        ),
      // A reading position is not study progress: it never creates an entry and never bumps
      // `updatedAt`, so a scroll can't outrank (and overwrite) real progress in the newer-wins sync.
      setLastPosition: (slug, pos) =>
        set((s) => {
          const p = s.byPackage[slug];
          if (!p) return s;
          const next: PackageProgress = {
            ...p,
            lastSection: pos.section ?? p.lastSection,
            lastAnchor: pos.anchor ?? p.lastAnchor,
            lastScrollY: pos.scrollY ?? p.lastScrollY,
          };
          if (
            next.lastSection === p.lastSection &&
            next.lastAnchor === p.lastAnchor &&
            next.lastScrollY === p.lastScrollY
          )
            return s;
          return { byPackage: { ...s.byPackage, [slug]: next } };
        }),
      replace: (slug, progress) => set((s) => ({ byPackage: { ...s.byPackage, [slug]: progress } })),
      reset: (slug) =>
        set((s) => {
          const next = { ...s.byPackage };
          delete next[slug];
          return { byPackage: next };
        }),
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated on the client in <Providers> to avoid SSR hydration mismatches. <Providers> also
      // rehydrates on `storage` events so a tab never overwrites progress saved by another tab.
      skipHydration: true,
    },
  ),
);

const EMPTY = emptyProgress();

/** Subscribe to one package's progress. Returns a stable empty object when none exists. */
export function usePackageProgress(slug: string): PackageProgress {
  return useProgressStore((s) => s.byPackage[slug] ?? EMPTY);
}

export function useIsStudied(slug: string, id: string): boolean {
  return useProgressStore((s) => Boolean(s.byPackage[slug]?.studied.includes(id)));
}

export function useIsFavorite(slug: string, id: string): boolean {
  return useProgressStore((s) => Boolean(s.byPackage[slug]?.favorites.includes(id)));
}
