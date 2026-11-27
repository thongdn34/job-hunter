"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { LanguageMode } from "@/domain/common/schema";
import {
  PREFERENCES_STORAGE_KEY,
  ServerLanguageContext,
  seedLanguage,
  usePreferencesStore,
} from "@/stores/preferences-store";
import { PROGRESS_STORAGE_KEY, useProgressStore } from "@/stores/progress-store";

/**
 * Another tab wrote a persisted store: reload it from localStorage so this tab never writes its
 * stale in-memory copy back over the newer one (locally and, through progress sync, on the server).
 */
export function onPersistedStorageChange(event: Pick<StorageEvent, "key" | "storageArea">): void {
  if (typeof localStorage !== "undefined" && event.storageArea !== null && event.storageArea !== localStorage) return;
  // key === null: storage was cleared in another tab.
  if (event.key === PROGRESS_STORAGE_KEY || event.key === null) void useProgressStore.persist.rehydrate();
  if (event.key === PREFERENCES_STORAGE_KEY || event.key === null) void usePreferencesStore.persist.rehydrate();
}

export function Providers({
  children,
  initialLanguage = null,
}: {
  children: ReactNode;
  /** Language from the `jh-lang` cookie (root layout), so SSR renders the user's mode. */
  initialLanguage?: LanguageMode | null;
}) {
  // Runs once, before any consumer renders (client only): see `seedLanguage`.
  useState(() => seedLanguage(initialLanguage));
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );

  useEffect(() => {
    // Persisted stores use skipHydration to keep SSR markup stable; hydrate after mount.
    void usePreferencesStore.persist.rehydrate();
    void useProgressStore.persist.rehydrate();
    window.addEventListener("storage", onPersistedStorageChange);
    return () => window.removeEventListener("storage", onPersistedStorageChange);
  }, []);

  return (
    <ServerLanguageContext.Provider value={initialLanguage}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ServerLanguageContext.Provider>
  );
}
