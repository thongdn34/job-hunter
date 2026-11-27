"use client";

import { createContext, memo, useContext, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { itemAnchorId } from "@/domain/package/bookmarks";
import { useExpansionStore, useIsExpanded } from "@/stores/expansion-store";
import { cn } from "@/lib/utils";

/**
 * Accessible, lazily rendered disclosure item (WAI-ARIA accordion pattern).
 *
 * - Header: <button aria-expanded aria-controls> inside a heading.
 * - Body: role="group" labelled by the header — deliberately NOT role="region": "Expand all"
 *   can open 60+ panels and each region would be a landmark, burying the page's real
 *   landmarks (the APG accordion pattern warns about this). Its content is rendered ONLY
 *   while expanded so long lists (60+ items with code + diagrams) stay cheap.
 * - Keyboard: Enter/Space toggle (native button). ArrowUp/ArrowDown/Home/End move focus
 *   between headers inside the closest `[data-accordion-list]` container.
 * - Open state lives in the global expansion store (search, deep links, expand-all).
 * - Responds to `focusItem()` requests: scrolls into view, flashes, focuses the header.
 */

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/** Heading level for headings rendered inside an item body (one below the item header). */
const BodyHeadingLevelContext = createContext<HeadingLevel>(4);

export function useBodyHeadingLevel(): HeadingLevel {
  return useContext(BodyHeadingLevelContext);
}

export const ACCORDION_LIST_ATTR = "data-accordion-list";
const HEADER_SELECTOR = "[data-accordion-header]";
const FLASH_CLASS = "jh-flash";
const FLASH_MS = 1600;

/** Moves focus between accordion headers of the same list (ArrowUp/Down, Home/End). */
export function handleAccordionHeaderKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
  const { key } = event;
  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") return;
  const current = event.currentTarget;
  const list = current.closest(`[${ACCORDION_LIST_ATTR}]`) ?? current.ownerDocument.body;
  const headers = Array.from(list.querySelectorAll<HTMLButtonElement>(HEADER_SELECTOR)).filter((el) => !el.disabled);
  if (headers.length === 0) return;
  const index = headers.indexOf(current);
  let next: HTMLButtonElement | undefined;
  if (key === "Home") next = headers[0];
  else if (key === "End") next = headers[headers.length - 1];
  else if (key === "ArrowDown") next = headers[(index + 1) % headers.length];
  else next = headers[(index - 1 + headers.length) % headers.length];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

export interface ItemAccordionProps {
  /** Study item id (also the expansion-store key). */
  id: string;
  /** Visible content of the header button (number, question, badges, status). */
  header: ReactNode;
  /** Renders the body. Called only while expanded (lazy). */
  renderBody: () => ReactNode;
  /** Level of the heading that wraps the header button. Default 3. */
  headingLevel?: HeadingLevel;
  className?: string;
}

export const ItemAccordion = memo(function ItemAccordion({
  id,
  header,
  renderBody,
  headingLevel = 3,
  className,
}: ItemAccordionProps) {
  const expanded = useIsExpanded(id);
  const toggle = useExpansionStore((s) => s.toggle);
  const focusNonce = useExpansionStore((s) => (s.focusRequest?.id === id ? s.focusRequest.nonce : null));

  const wrapperRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const anchorId = itemAnchorId(id);
  const headerId = `${anchorId}-header`;
  const panelId = `${anchorId}-panel`;

  // Search / deep-link navigation: the store already expanded us; wait one frame so the
  // body is laid out, then scroll, flash and move keyboard focus to the header.
  useEffect(() => {
    if (focusNonce === null) return;
    const frame = window.requestAnimationFrame(() => {
      const el = wrapperRef.current;
      if (el) {
        el.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
        el.classList.remove(FLASH_CLASS);
        // Force a reflow so the animation restarts when the same item is targeted twice.
        void el.offsetWidth;
        el.classList.add(FLASH_CLASS);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS);
        headerRef.current?.focus({ preventScroll: true });
      }
      const { focusRequest, clearFocusRequest } = useExpansionStore.getState();
      if (focusRequest?.nonce === focusNonce) clearFocusRequest();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusNonce]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const Heading = `h${headingLevel}` as const;
  const bodyLevel = Math.min(6, headingLevel + 1) as HeadingLevel;

  return (
    <div
      ref={wrapperRef}
      id={anchorId}
      data-item-id={id}
      data-state={expanded ? "open" : "closed"}
      className={cn(
        "bg-card text-card-foreground rounded-xl border shadow-xs transition-colors",
        expanded && "border-ring/40",
        className,
      )}
    >
      <Heading className="m-0 text-base font-normal">
        <button
          ref={headerRef}
          type="button"
          id={headerId}
          aria-expanded={expanded}
          aria-controls={panelId}
          data-accordion-header=""
          onClick={() => toggle(id)}
          onKeyDown={handleAccordionHeaderKeyDown}
          className="group hover:bg-muted/50 focus-visible:ring-ring/60 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-3 sm:px-4"
        >
          <span className="min-w-0 flex-1">{header}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </button>
      </Heading>
      <div
        id={panelId}
        role="group"
        aria-labelledby={headerId}
        hidden={!expanded}
        className="border-t px-3 pt-3 pb-4 sm:px-4"
      >
        {expanded ? (
          <BodyHeadingLevelContext.Provider value={bodyLevel}>{renderBody()}</BodyHeadingLevelContext.Provider>
        ) : null}
      </div>
    </div>
  );
});
