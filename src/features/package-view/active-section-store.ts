"use client";

import { create } from "zustand";

/**
 * Which section / topic of the open package is currently being read.
 * Written by `useActiveSectionTracking` (IntersectionObserver), read by the
 * table of contents and the left sidebar. Not persisted (see progress-store for that).
 */
interface ActiveSectionState {
  /** Anchor id of the section in view, e.g. "bookmark-isb-jd". */
  sectionAnchor: string | null;
  /** Anchor id of the topic heading in view (bilingual section only). */
  topicAnchor: string | null;
  setActive: (sectionAnchor: string | null, topicAnchor: string | null) => void;
}

export const useActiveSectionStore = create<ActiveSectionState>()((set) => ({
  sectionAnchor: null,
  topicAnchor: null,
  setActive: (sectionAnchor, topicAnchor) =>
    set((s) =>
      s.sectionAnchor === sectionAnchor && s.topicAnchor === topicAnchor ? s : { sectionAnchor, topicAnchor },
    ),
}));

/** Narrow subscription: true only for the entry that is active (re-renders just two rows on change). */
export function useIsActiveAnchor(anchorId: string): boolean {
  return useActiveSectionStore((s) => s.sectionAnchor === anchorId || s.topicAnchor === anchorId);
}
