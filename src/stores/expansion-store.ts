"use client";

import { create } from "zustand";

/**
 * Which accordion items (questions, scenarios, exercises, behavioral questions)
 * are expanded. Kept in a global store so app-level search, deep links and
 * "expand all" can open items that live in different sections.
 *
 * Components should subscribe per item: `useIsExpanded(id)` re-renders only that item.
 */

/** Options forwarded to `scrollToAnchor` once a hidden anchor has been revealed. */
export interface RevealAnchorOptions {
  updateHash?: boolean;
  focus?: boolean;
}

export interface RevealRequest {
  anchorId: string;
  options: RevealAnchorOptions;
  nonce: number;
}

interface ExpansionState {
  expanded: Record<string, true>;
  /** Item to scroll to + flash after it expands (set by search / deep links). */
  focusRequest: { id: string; anchorId: string; nonce: number } | null;
  /**
   * Anchor that navigation could not find in the DOM (e.g. a topic heading hidden by a
   * section's local filters). The section that owns it clears its filters and scrolls.
   */
  revealRequest: RevealRequest | null;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  toggle: (id: string) => void;
  setExpanded: (id: string, open: boolean) => void;
  expandMany: (ids: string[]) => void;
  collapseMany: (ids: string[]) => void;
  collapseAll: () => void;
  /** Expand the item and ask the item to scroll itself into view. */
  focusItem: (id: string, anchorId: string) => void;
  clearFocusRequest: () => void;
  /** Ask whichever section owns `anchorId` to make it visible, then scroll to it. */
  requestReveal: (anchorId: string, options?: RevealAnchorOptions) => void;
  clearRevealRequest: () => void;
}

let nonce = 0;

export const useExpansionStore = create<ExpansionState>()((set) => ({
  expanded: {},
  focusRequest: null,
  revealRequest: null,
  expand: (id) => set((s) => (s.expanded[id] ? s : { expanded: { ...s.expanded, [id]: true } })),
  collapse: (id) =>
    set((s) => {
      if (!s.expanded[id]) return s;
      const next = { ...s.expanded };
      delete next[id];
      return { expanded: next };
    }),
  toggle: (id) =>
    set((s) => {
      const next = { ...s.expanded };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { expanded: next };
    }),
  setExpanded: (id, open) =>
    set((s) => {
      if (Boolean(s.expanded[id]) === open) return s;
      const next = { ...s.expanded };
      if (open) next[id] = true;
      else delete next[id];
      return { expanded: next };
    }),
  expandMany: (ids) =>
    set((s) => {
      const next = { ...s.expanded };
      for (const id of ids) next[id] = true;
      return { expanded: next };
    }),
  collapseMany: (ids) =>
    set((s) => {
      const next = { ...s.expanded };
      for (const id of ids) delete next[id];
      return { expanded: next };
    }),
  collapseAll: () => set({ expanded: {} }),
  focusItem: (id, anchorId) =>
    set((s) => ({ expanded: { ...s.expanded, [id]: true }, focusRequest: { id, anchorId, nonce: ++nonce } })),
  clearFocusRequest: () => set({ focusRequest: null }),
  requestReveal: (anchorId, options = {}) => set({ revealRequest: { anchorId, options, nonce: ++nonce } }),
  clearRevealRequest: () => set({ revealRequest: null }),
}));

export function useIsExpanded(id: string): boolean {
  return useExpansionStore((s) => Boolean(s.expanded[id]));
}
