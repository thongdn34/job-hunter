"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCcw, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import type { Flashcard } from "@/domain/package/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BilingualText } from "@/components/common/BilingualText";
import { Markdown } from "@/components/common/Markdown";
import { PriorityBadge } from "@/components/common/Badges";
import { useProgressStore } from "@/stores/progress-store";
import { cn } from "@/lib/utils";
import { buildDeckOrder, deckReducer, initialDeckState, resolveDeck, type DeckFilter } from "./deck";
import { useFlashcardShortcutsEnabled } from "./shortcuts-store";

export interface FlashcardDeckProps {
  packageSlug: string;
  cards: Flashcard[];
  /**
   * Base seed for shuffling. When provided, the n-th shuffle uses `seed + n` (deterministic,
   * used by tests). When omitted, every shuffle picks a random seed.
   */
  seed?: number;
  /**
   * Listen for keyboard shortcuts on the whole window (full-screen page). When false (default),
   * shortcuts only work while focus is inside the deck, so an embedded deck does not hijack
   * the arrow keys of the surrounding page. Page-wide shortcuts respect the user's on/off
   * setting (`shortcuts-store`, WCAG 2.1.4): when off, only ←/→/Space/Enter work, and only
   * while focus is inside the deck.
   */
  globalShortcuts?: boolean;
  className?: string;
}

const EMPTY_LIST: readonly string[] = [];
const FILTER_LABELS: Record<DeckFilter, string> = { all: "All", review: "For review", unknown: "Not known" };

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [role='textbox'], [role='combobox']"),
  );
}

/** Open menus/listboxes/dialogs own their keys (typeahead, focus trap): page-wide shortcuts must not fire. */
const OVERLAY_SELECTOR = "[role='dialog'], [role='alertdialog'], [aria-modal='true'], [role='menu'], [role='listbox']";

function isInOverlay(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest(OVERLAY_SELECTOR)) return true;
  // A modal (e.g. the mobile nav sheet) may be open while the event targets the body.
  return typeof document !== "undefined" && document.querySelector("[aria-modal='true']") !== null;
}

function isActivatableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, a[href], summary, [role='button'], [role='checkbox'], [role='switch']"))
  );
}

/**
 * Interactive bilingual flashcards. Front = question (per language mode); back = English answer,
 * Vietnamese explanation and memory shortcut. Shortcuts: ←/→ navigate, Space/Enter flip,
 * S shuffle, K mark known, R mark for review.
 */
export function FlashcardDeck({ packageSlug, cards, seed, globalShortcuts = false, className }: FlashcardDeckProps) {
  const [state, dispatch] = useReducer(deckReducer, cards, initialDeckState);
  const [announcement, setAnnouncement] = useState("");
  const shuffleCount = useRef(0);
  /** Cards already flipped to the back during this session (for the "reviewed" counter). */
  const seenBacks = useRef<Set<string>>(new Set());
  /** Focus targets for controls that unmount when activated ("Original order", "Show all cards"). */
  const shuffleButtonRef = useRef<HTMLButtonElement>(null);
  const allFilterButtonRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const shortcutsEnabled = useFlashcardShortcutsEnabled();
  const pageWide = globalShortcuts && shortcutsEnabled;

  const marks = useProgressStore((s) => s.byPackage[packageSlug]?.flashcards);
  const known = marks?.known ?? EMPTY_LIST;
  const review = marks?.review ?? EMPTY_LIST;

  const deck = useMemo(() => resolveDeck(state.order, cards), [state.order, cards]);
  const n = deck.length;
  const index = Math.min(state.index, Math.max(0, n - 1));
  const card: Flashcard | undefined = deck[index];

  const counts = useMemo(() => {
    const knownSet = new Set(known);
    const reviewSet = new Set(review);
    let k = 0;
    let r = 0;
    for (const c of cards) {
      if (knownSet.has(c.id)) k++;
      if (reviewSet.has(c.id)) r++;
    }
    return { known: k, review: r, unknown: cards.length - k };
  }, [cards, known, review]);

  const cardStatus: "known" | "review" | null = card
    ? known.includes(card.id)
      ? "known"
      : review.includes(card.id)
        ? "review"
        : null
    : null;

  /* ---------------------------- actions ---------------------------- */

  const currentMarks = () => useProgressStore.getState().get(packageSlug).flashcards;

  const flip = () => {
    if (!card) return;
    if (!state.flipped && !seenBacks.current.has(card.id)) {
      seenBacks.current.add(card.id);
      useProgressStore.getState().incrementFlashcardsReviewed(packageSlug);
    }
    dispatch({ type: "flip" });
    setAnnouncement(state.flipped ? "Showing question" : "Showing answer");
  };

  const goNext = () => {
    dispatch({ type: "next" });
    setAnnouncement("");
  };
  const goPrev = () => {
    dispatch({ type: "prev" });
    setAnnouncement("");
  };

  const setFilter = (filter: DeckFilter) => {
    if (filter === state.filter) return;
    const order = buildDeckOrder(cards, filter, currentMarks(), state.seed);
    dispatch({ type: "rebuild", order, filter, seed: state.seed });
    setAnnouncement(`${FILTER_LABELS[filter]} cards: ${order.length}`);
  };

  const doShuffle = () => {
    if (cards.length === 0) return;
    shuffleCount.current += 1;
    const nextSeed = seed !== undefined ? seed + shuffleCount.current : Math.floor(Math.random() * 2 ** 31);
    const order = buildDeckOrder(cards, state.filter, currentMarks(), nextSeed);
    dispatch({ type: "rebuild", order, filter: state.filter, seed: nextSeed });
    setAnnouncement("Deck shuffled");
  };

  const restoreOrder = () => {
    const order = buildDeckOrder(cards, state.filter, currentMarks(), null);
    dispatch({ type: "rebuild", order, filter: state.filter, seed: null });
    setAnnouncement("Original order restored");
    // The "Original order" button disappears with the seed: keep focus next to it.
    shuffleButtonRef.current?.focus();
  };

  const showAllCards = () => {
    setFilter("all");
    // The empty-state button is replaced by the card: move focus to the now-pressed "All" filter.
    allFilterButtonRef.current?.focus();
  };

  const mark = (result: "known" | "review") => {
    if (!card) return;
    useProgressStore.getState().markFlashcard(packageSlug, card.id, result);
    const advance = index < n - 1;
    if (advance) dispatch({ type: "next" });
    setAnnouncement(`${result === "known" ? "Marked known" : "Marked for review"}${advance ? ". Next card" : ""}`);
  };

  /* --------------------------- keyboard ---------------------------- */

  const handleKey = (e: KeyboardEvent | ReactKeyboardEvent, letters: boolean) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditableTarget(e.target)) return;
    if (!letters && e.key.length === 1 && e.key !== " ") return;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        goNext();
        break;
      case "ArrowLeft":
        e.preventDefault();
        goPrev();
        break;
      case " ":
      case "Enter":
        // Let focused buttons/links activate natively.
        if (isActivatableTarget(e.target)) return;
        e.preventDefault();
        flip();
        break;
      case "s":
      case "S":
        e.preventDefault();
        doShuffle();
        break;
      case "k":
      case "K":
        e.preventDefault();
        mark("known");
        break;
      case "r":
      case "R":
        e.preventDefault();
        mark("review");
        break;
    }
  };

  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    if (isInOverlay(e.target)) return;
    handleKey(e, true);
  });
  useEffect(() => {
    if (!pageWide) return;
    const listener = (e: KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [pageWide]);

  // Deck-scoped handler: embedded decks (letters on, focus is already in the deck), and the
  // full-screen page with shortcuts turned off (no single-character shortcuts, WCAG 2.1.4).
  const onDeckKey = pageWide ? undefined : (e: ReactKeyboardEvent) => handleKey(e, !globalShortcuts);

  const onCardClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isActivatableTarget(e.target)) return;
    // Don't flip while the user is selecting answer text.
    if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
    flip();
  };

  /* ---------------------------- render ----------------------------- */

  if (cards.length === 0) {
    return (
      <div className={cn("text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm", className)}>
        No flashcards in this package yet.
      </div>
    );
  }

  const position = n === 0 ? 0 : index + 1;
  const positionText = n === 0 ? "No cards" : `Card ${position} of ${n}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-4", className)}
      onKeyDown={onDeckKey}
      data-testid="flashcard-deck"
    >
      <h3 id={headingId} className="sr-only">
        Flashcards
      </h3>

      {/* Toolbar: filter + shuffle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter cards" className="bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1">
          {(["all", "review", "unknown"] as const).map((f) => {
            const count = f === "all" ? cards.length : f === "review" ? counts.review : counts.unknown;
            return (
              <button
                key={f}
                ref={f === "all" ? allFilterButtonRef : undefined}
                type="button"
                aria-pressed={state.filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
                  state.filter === f && "bg-background text-foreground shadow-sm",
                )}
              >
                {FILTER_LABELS[f]} <span className="tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          {state.seed !== null && (
            <Button type="button" variant="ghost" size="sm" onClick={restoreOrder}>
              <Undo2 aria-hidden />
              Original order
            </Button>
          )}
          <Button
            ref={shuffleButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={doShuffle}
            aria-keyshortcuts="S"
          >
            <Shuffle aria-hidden />
            Shuffle
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium tabular-nums" data-testid="deck-position">
            {positionText}
          </span>
          <span className="text-muted-foreground flex gap-3 text-xs tabular-nums">
            <span>
              Known <span className="text-foreground font-semibold">{counts.known}</span>/{cards.length}
            </span>
            <span>
              Review <span className="text-foreground font-semibold">{counts.review}</span>
            </span>
          </span>
        </div>
        <Progress
          value={n === 0 ? 0 : Math.round((position / n) * 100)}
          aria-label="Deck position"
          getAriaValueText={() => positionText}
        />
      </div>

      {/* Card */}
      {card ? (
        <>
          <FlashcardFace card={card} flipped={state.flipped} status={cardStatus} onSurfaceClick={onCardClick} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="sm:order-2"
              onClick={flip}
              aria-pressed={state.flipped}
              aria-keyshortcuts="Space Enter"
            >
              <RotateCcw aria-hidden />
              {state.flipped ? "Show question" : "Show answer"}
            </Button>
            <div className="flex items-center justify-between gap-2 sm:order-1 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goPrev}
                aria-label="Previous card"
                aria-keyshortcuts="ArrowLeft"
                disabled={n <= 1}
              >
                <ArrowLeft aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goNext}
                aria-label="Next card"
                aria-keyshortcuts="ArrowRight"
                disabled={n <= 1}
              >
                <ArrowRight aria-hidden />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:order-3 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={() => mark("review")}
                aria-pressed={cardStatus === "review"}
                aria-keyshortcuts="R"
                className="aria-pressed:border-amber-500/50 aria-pressed:bg-amber-500/10"
              >
                <RefreshCcw aria-hidden />
                Review
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => mark("known")}
                aria-pressed={cardStatus === "known"}
                aria-keyshortcuts="K"
                className="aria-pressed:border-emerald-500/50 aria-pressed:bg-emerald-500/10"
              >
                <Check aria-hidden />
                Known
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center text-sm">
          <p>
            {state.filter === "review"
              ? "No cards are marked for review."
              : "You know every card in this deck. Nice work!"}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={showAllCards}>
            Show all cards
          </Button>
        </div>
      )}

      {/* Screen-reader announcements */}
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="deck-live">
        {card ? `${positionText}: ${card.front.en}` : positionText}
      </p>
      <p className="sr-only" role="status" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}

interface FlashcardFaceProps {
  card: Flashcard;
  flipped: boolean;
  status: "known" | "review" | null;
  onSurfaceClick: (e: ReactMouseEvent<HTMLDivElement>) => void;
}

function FlashcardFace({ card, flipped, status, onSurfaceClick }: FlashcardFaceProps) {
  return (
    // Mouse convenience only: keyboard users flip with the "Show answer" button or Space/Enter.
    <div
      onClick={onSurfaceClick}
      data-side={flipped ? "back" : "front"}
      className={cn(
        "bg-card text-card-foreground relative flex min-h-64 cursor-pointer flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-colors select-text sm:p-8",
        flipped ? "border-primary/30" : "hover:border-foreground/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium tracking-wide uppercase">
          {flipped ? "Answer" : "Question"}
        </span>
        <PriorityBadge priority={card.priority} />
        {status === "known" && (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          >
            Known
          </Badge>
        )}
        {status === "review" && (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
            For review
          </Badge>
        )}
      </div>

      {!flipped ? (
        <div className="flex flex-1 items-center justify-center py-4 text-center">
          <p className="text-xl leading-snug font-semibold text-balance sm:text-2xl" data-testid="flashcard-front">
            <BilingualText value={card.front} viClassName="mt-2 text-base font-normal sm:text-lg" />
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm leading-relaxed sm:text-base" data-testid="flashcard-back">
          <div>
            <h4 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">English answer</h4>
            <div lang="en">
              <Markdown source={card.back.answer} />
            </div>
          </div>
          <div>
            <h4 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
              <span lang="vi">Giải thích</span> <span className="sr-only">(Vietnamese explanation)</span>
            </h4>
            <div lang="vi">
              <Markdown source={card.back.viExplanation} />
            </div>
          </div>
          <div className="bg-muted/60 rounded-lg p-3">
            <h4 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
              Memory shortcut
            </h4>
            <p>
              <BilingualText value={card.back.memoryShortcut} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
