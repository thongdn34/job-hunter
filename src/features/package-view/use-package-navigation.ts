"use client";

import { useEffect, useRef } from "react";
import { sectionFromBookmark } from "@/domain/package/bookmarks";
import type { StudyItem } from "@/domain/package/items";
import type { PackageProgress } from "@/domain/progress/schema";
import { useProgressHydrated } from "@/hooks/use-hydrated";
import { useProgressStore } from "@/stores/progress-store";
import { useReadingPositionStore, type ReadingPosition } from "@/stores/reading-position-store";
import { useActiveSectionStore } from "./active-section-store";
import { currentHash, focusStudyItem, scrollToAnchor, STICKY_OFFSET_PX } from "./navigation";
import type { TocSection } from "./toc";

/** Fraction of the viewport (from the top) inside which a section counts as "being read". */
const READING_BAND_BOTTOM = 0.45;
const POSITION_SAVE_DELAY_MS = 600;

/**
 * Tracks the active section with an IntersectionObserver (sections overlapping the
 * reading band under the sticky chrome) and the active topic heading of the bilingual
 * section on scroll. Results go to `useActiveSectionStore`.
 */
export function useActiveSectionTracking(toc: TocSection[]): void {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const { setActive } = useActiveSectionStore.getState();
    const sectionIds = toc.map((s) => s.anchorId);
    const topicHost = toc.find((s) => s.topics.length > 0);
    const visible = new Set<string>();
    let frame = 0;

    const atPageBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    const compute = () => {
      frame = 0;
      const previous = useActiveSectionStore.getState().sectionAnchor;
      let section = atPageBottom()
        ? sectionIds[sectionIds.length - 1]
        : (sectionIds.find((id) => visible.has(id)) ?? previous ?? null);
      if (section && !document.getElementById(section)) section = null;
      let topic: string | null = null;
      if (topicHost && section === topicHost.anchorId) {
        for (const t of topicHost.topics) {
          const el = document.getElementById(t.anchorId);
          if (el && el.getBoundingClientRect().top <= STICKY_OFFSET_PX + 48) topic = t.anchorId;
        }
      }
      setActive(section, topic);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(compute);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        schedule();
      },
      { rootMargin: `-${STICKY_OFFSET_PX}px 0px -${Math.round((1 - READING_BAND_BOTTOM) * 100)}% 0px` },
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    // Topic headings + page-bottom detection need scroll position, not just intersection.
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      setActive(null, null);
    };
  }, [toc]);
}

/** Puts the reader back where they were, tolerating layout differences (language, open accordions). */
function restoreReadingPosition({ scrollY, anchor }: ReadingPosition): void {
  const anchorEl = anchor ? document.getElementById(anchor) : null;
  if (typeof scrollY === "number" && scrollY > 0) {
    window.scrollTo({ top: scrollY, behavior: "instant" });
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const outsideBand = rect.top > window.innerHeight * READING_BAND_BOTTOM || rect.bottom < STICKY_OFFSET_PX;
      if (outsideBand) anchorEl.scrollIntoView({ behavior: "instant", block: "start" });
    }
  } else if (anchorEl) {
    anchorEl.scrollIntoView({ behavior: "instant", block: "start" });
  }
}

/** Positions saved before the reading-position store existed lived on the progress document. */
function legacyPosition(progress: PackageProgress | undefined): ReadingPosition | undefined {
  if (!progress || (progress.lastAnchor === undefined && progress.lastScrollY === undefined)) return undefined;
  return { section: progress.lastSection, anchor: progress.lastAnchor, scrollY: progress.lastScrollY };
}

interface PackageNavigationOptions {
  slug: string;
  companyCode: string;
  items: StudyItem[];
}

/**
 * Deep links (#item-…, #bookmark-…), hashchange handling, last-reading-position
 * restore (after progress hydration) and debounced reading-position tracking.
 */
export function usePackageNavigation({ slug, companyCode, items }: PackageNavigationOptions): void {
  const hydrated = useProgressHydrated();
  const itemsRef = useRef(items);
  /** True once the initial deep link / restore decision has been made; gates position writes. */
  const settledRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Deep links: initial fragment + later hashchange events (back/forward, pasted links).
  useEffect(() => {
    const navigate = (): boolean => {
      const hash = currentHash();
      if (!hash) return false;
      const item = itemsRef.current.find((i) => i.anchorId === hash);
      if (item) {
        focusStudyItem(item, { updateHash: false });
        return true;
      }
      return scrollToAnchor(hash, { updateHash: false, focus: false });
    };
    if (navigate()) settledRef.current = true;
    const onHashChange = () => void navigate();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Restore the last reading position once persisted progress is available.
  useEffect(() => {
    if (!hydrated || settledRef.current) return;
    settledRef.current = true;
    if (currentHash() || window.scrollY > 40) return;
    const position =
      useReadingPositionStore.getState().bySlug[slug] ?? legacyPosition(useProgressStore.getState().byPackage[slug]);
    if (!position) return;
    // Next.js applies its own scroll reset on navigation; restore after it. Not cancelled on
    // cleanup on purpose: StrictMode re-runs effects and `settledRef` already guards re-entry.
    window.requestAnimationFrame(() => restoreReadingPosition(position));
  }, [hydrated, slug]);

  // Track reading position (debounced). Kept out of the progress store on purpose: a scroll must
  // not bump `progress.updatedAt` or trigger a progress sync PUT (see reading-position-store).
  useEffect(() => {
    let timer: number | undefined;
    const save = () => {
      if (!settledRef.current) return;
      const anchor = useActiveSectionStore.getState().sectionAnchor;
      const section = anchor ? sectionFromBookmark(companyCode, anchor) : null;
      useReadingPositionStore.getState().setPosition(slug, {
        section: section ?? undefined,
        anchor: anchor ?? undefined,
        scrollY: Math.round(window.scrollY),
      });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, POSITION_SAVE_DELAY_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug, companyCode]);
}
