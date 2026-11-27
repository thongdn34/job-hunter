"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageMode } from "@/domain/common/schema";
import { LANGUAGE_COOKIE } from "@/domain/common/language-cookie";

/**
 * Global UI preferences (persisted in localStorage).
 * Theme is handled separately by next-themes.
 *
 * The language is also mirrored to the `jh-lang` cookie so the server can render the user's mode
 * (root layout -> <Providers initialLanguage>): SSR, hydration and the persisted value then agree,
 * and a full page load never paints both languages first and collapses them after mount.
 */
interface PreferencesState {
  language: LanguageMode;
  setLanguage: (language: LanguageMode) => void;
}

export const PREFERENCES_STORAGE_KEY = "job-hunter:preferences";
const DEFAULT_LANGUAGE: LanguageMode = "bilingual";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Mirrors the language to the cookie read by the root layout (client only, never throws). */
export function writeLanguageCookie(language: LanguageMode): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  } catch {
    /* cookies disabled: localStorage still holds the preference */
  }
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => {
        writeLanguageCookie(language);
        set({ language });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated on the client in <Providers> to avoid SSR hydration mismatches.
      skipHydration: true,
      // Keep the cookie in sync with the stored value (also migrates users who predate the cookie).
      onRehydrateStorage: () => (state) => {
        if (state) writeLanguageCookie(state.language);
      },
    },
  ),
);

/**
 * Language mode the server rendered with (from the cookie). Used as the server snapshot of
 * `useLanguage`, so SSR and the hydration pass render the user's mode instead of the default.
 */
export const ServerLanguageContext = createContext<LanguageMode | null>(null);

/**
 * Client only: puts the server-rendered language into the store before the first (hydration)
 * render, so the post-hydration snapshot equals the server snapshot and nothing re-renders.
 */
export function seedLanguage(language: LanguageMode | null): void {
  if (typeof window === "undefined" || !language) return;
  if (usePreferencesStore.persist.hasHydrated()) return;
  if (usePreferencesStore.getState().language !== language) usePreferencesStore.setState({ language });
}

const subscribe = (cb: () => void) => usePreferencesStore.subscribe(cb);
const getLanguage = () => usePreferencesStore.getState().language;

/** Selector hook: avoids re-rendering consumers on unrelated preference changes. */
export function useLanguage(): LanguageMode {
  const serverLanguage = useContext(ServerLanguageContext) ?? DEFAULT_LANGUAGE;
  return useSyncExternalStore(subscribe, getLanguage, () => serverLanguage);
}
