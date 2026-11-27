"use client";

import type { StudyItem } from "@/domain/package/items";
import { useExpansionStore } from "@/stores/expansion-store";

/** Height covered by the sticky header + package toolbar; content above this line is "hidden". */
export const STICKY_OFFSET_PX = 112;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "instant" : "smooth";
}

/** Updates the URL fragment without adding a history entry or triggering a jump. */
export function replaceHash(anchorId: string | null): void {
  const url = `${window.location.pathname}${window.location.search}${anchorId ? `#${anchorId}` : ""}`;
  window.history.replaceState(window.history.state, "", url);
}

/** Decoded fragment without the leading "#". */
export function currentHash(): string {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** True when the element's top edge is visible below the sticky chrome. */
export function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top >= STICKY_OFFSET_PX - 8 && rect.top < window.innerHeight;
}

/**
 * Smoothly scrolls to an anchor (respecting prefers-reduced-motion) and, when the
 * target contains a heading, moves keyboard focus to it without a second jump.
 *
 * When the anchor is not in the DOM (e.g. a Section 7 topic hidden by the question-bank
 * filters) it files a reveal request: the owning section resets its filters and calls
 * this again once the anchor has mounted. Returns whether it scrolled right away.
 */
export function scrollToAnchor(anchorId: string, options: { updateHash?: boolean; focus?: boolean } = {}): boolean {
  const el = document.getElementById(anchorId);
  if (!el) {
    useExpansionStore.getState().requestReveal(anchorId, options);
    return false;
  }
  el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  if (options.updateHash !== false) replaceHash(anchorId);
  if (options.focus !== false) {
    const target = el.matches("h1,h2,h3,h4,h5,h6") ? el : el.querySelector<HTMLElement>("[data-anchor-heading]");
    if (target instanceof HTMLElement) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }
  return true;
}

const FALLBACK_SCROLL_DELAY_MS = 300;

/**
 * Opens a study item via the expansion store. The item component reacts to the
 * focus request by expanding, scrolling and flashing; we only scroll ourselves as
 * a fallback if, after 300ms, the element exists but is still out of view.
 */
export function focusStudyItem(item: Pick<StudyItem, "id" | "anchorId">, options: { updateHash?: boolean } = {}): void {
  useExpansionStore.getState().focusItem(item.id, item.anchorId);
  if (options.updateHash !== false) replaceHash(item.anchorId);
  window.setTimeout(() => {
    const el = document.getElementById(item.anchorId);
    if (el && !isInViewport(el)) el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, FALLBACK_SCROLL_DELAY_MS);
}
