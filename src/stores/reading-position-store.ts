"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Last reading position per package slug (device-local, persisted as `job-hunter:reading-position`).
 *
 * Deliberately separate from `progress-store`: scrolling is not study progress, so saving the
 * position must not bump `progress.updatedAt`, rewrite the whole progress entry, or trigger a
 * server PUT through `useProgressSync` (which would also let a scroll-only tab win the
 * newer-wins merge over real progress from another device).
 *
 * Only read/written imperatively (`getState()`) from effects, never rendered, so it hydrates
 * synchronously from localStorage on the client without SSR mismatch concerns.
 */
export interface ReadingPosition {
  section?: string;
  anchor?: string;
  scrollY?: number;
}

interface ReadingPositionState {
  bySlug: Record<string, ReadingPosition>;
  /** Merges the given fields (undefined keeps the stored value). No-op when nothing changes. */
  setPosition: (slug: string, pos: ReadingPosition) => void;
}

export function mergeReadingPosition(current: ReadingPosition | undefined, pos: ReadingPosition): ReadingPosition {
  return {
    section: pos.section ?? current?.section,
    anchor: pos.anchor ?? current?.anchor,
    scrollY: pos.scrollY ?? current?.scrollY,
  };
}

function samePosition(a: ReadingPosition | undefined, b: ReadingPosition): boolean {
  return a !== undefined && a.section === b.section && a.anchor === b.anchor && a.scrollY === b.scrollY;
}

export const useReadingPositionStore = create<ReadingPositionState>()(
  persist(
    (set, get) => ({
      bySlug: {},
      setPosition: (slug, pos) => {
        const current = get().bySlug[slug];
        const next = mergeReadingPosition(current, pos);
        // Guard before `set`: persist rewrites localStorage on every set call, even a no-op one.
        if (samePosition(current, next)) return;
        set((s) => ({ bySlug: { ...s.bySlug, [slug]: next } }));
      },
    }),
    {
      name: "job-hunter:reading-position",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ bySlug: s.bySlug }),
    },
  ),
);
