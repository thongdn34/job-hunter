"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Whether the flashcards page's single-key shortcuts (S / K / R, plus page-wide arrows and
 * Space) are on. WCAG 2.1.4 (Character Key Shortcuts) requires a way to turn them off, e.g. for
 * speech-input users whose dictated words would otherwise shuffle the deck or mark cards.
 * Persisted as `job-hunter:flashcard-shortcuts` (device-local).
 */
interface FlashcardShortcutsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useFlashcardShortcutsStore = create<FlashcardShortcutsState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "job-hunter:flashcard-shortcuts",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled }),
      // Rehydrated after mount (see the hook below) to avoid SSR hydration mismatches.
      skipHydration: true,
    },
  ),
);

/** Current setting; restores the persisted value after mount. */
export function useFlashcardShortcutsEnabled(): boolean {
  useEffect(() => {
    if (!useFlashcardShortcutsStore.persist.hasHydrated()) void useFlashcardShortcutsStore.persist.rehydrate();
  }, []);
  return useFlashcardShortcutsStore((s) => s.enabled);
}
