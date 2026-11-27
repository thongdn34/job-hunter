"use client";

import { useEffect } from "react";
import { startProgressSync } from "./progress-sync";

/**
 * One sync controller per package slug, shared by every mounted caller (progress panel,
 * flashcards page, package view...), so calling the hook from several components is safe
 * and never doubles the network traffic.
 */
const controllers = new Map<string, { count: number; stop: () => void }>();

/**
 * Syncs the local progress store with /api/progress/[slug]:
 * after hydration pulls the server copy (newer wins), then debounces PUTs (1s) of local
 * changes and flushes on pagehide via navigator.sendBeacon.
 */
export function useProgressSync(slug: string): void {
  useEffect(() => {
    if (!slug) return;
    let entry = controllers.get(slug);
    if (!entry) {
      entry = { count: 0, stop: startProgressSync(slug) };
      controllers.set(slug, entry);
    }
    entry.count += 1;
    const owned = entry;
    return () => {
      owned.count -= 1;
      if (owned.count <= 0) {
        owned.stop();
        if (controllers.get(slug) === owned) controllers.delete(slug);
      }
    };
  }, [slug]);
}
