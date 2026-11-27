"use client";

import { memo, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Maximize2, X, Zap } from "lucide-react";
import type { Bilingual } from "@/domain/common/schema";
import type { CheatConcept, InterviewPackage } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { BilingualText, useVisibleLanguages } from "@/components/common/BilingualText";
import { PriorityBadge } from "@/components/common/Badges";
import { FlashcardDeck } from "@/features/flashcards/FlashcardDeck";
import { clampIndex, nextIndex, prevIndex } from "@/features/flashcards/deck";
import { cn } from "@/lib/utils";
import { RelatedItemLinks } from "./RelatedItemLinks";
import { selectConcepts } from "./stats";

/** Section 14 — cheat sheet: prioritized concept cards, rapid review mode and embedded flashcards. */
export function CheatsheetSection({ pkg, data }: SectionProps<"cheatsheet">) {
  const [highOnly, setHighOnly] = useState(false);
  const [rapid, setRapid] = useState(false);
  const switchId = useId();
  const flashHeadingId = useId();
  const startRef = useRef<HTMLButtonElement>(null);

  const concepts = useMemo(() => selectConcepts(data.concepts, highOnly), [data.concepts, highOnly]);
  const topicTitles = useMemo(
    () => new Map((pkg.sections.bilingual?.topics ?? []).map((t) => [t.id, t.title] as const)),
    [pkg.sections.bilingual?.topics],
  );

  const exitRapid = () => {
    setRapid(false);
    requestAnimationFrame(() => startRef.current?.focus());
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={highOnly}
              onCheckedChange={(on) => setHighOnly(on)}
              nativeButton
              render={<button type="button" />}
            />
            <label htmlFor={switchId} className="text-sm select-none">
              High-priority only
            </label>
            <span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
              {concepts.length} {concepts.length === 1 ? "concept" : "concepts"}
            </span>
          </div>
          <Button
            ref={startRef}
            type="button"
            variant={rapid ? "secondary" : "default"}
            onClick={() => (rapid ? exitRapid() : setRapid(true))}
            aria-pressed={rapid}
            disabled={concepts.length === 0}
          >
            {rapid ? <X aria-hidden /> : <Zap aria-hidden />}
            {rapid ? "Exit rapid review" : "Rapid review"}
          </Button>
        </div>

        {concepts.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No concepts match this filter.
          </p>
        ) : rapid ? (
          <RapidReview concepts={concepts} pkg={pkg} topicTitles={topicTitles} onExit={exitRapid} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Cheat sheet concepts">
            {concepts.map((c) => (
              <ConceptCard
                key={c.id}
                concept={c}
                pkg={pkg}
                topicTitle={c.topicId ? topicTitles.get(c.topicId) : undefined}
              />
            ))}
          </ul>
        )}
      </div>

      <section aria-labelledby={flashHeadingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={flashHeadingId} className="text-lg font-semibold">
            Flashcards <span className="text-muted-foreground text-sm font-normal">({data.flashcards.length})</span>
          </h3>
          <Link
            href={`/packages/${pkg.meta.slug}/flashcards`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Maximize2 aria-hidden />
            Full-screen flashcards
          </Link>
        </div>
        <p className="text-muted-foreground text-xs">
          Shortcuts while the deck has focus: ←/→ navigate · Space/Enter flip · S shuffle · K known · R review
        </p>
        <FlashcardDeck packageSlug={pkg.meta.slug} cards={data.flashcards} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LangLine({ value, label, className }: { value: Bilingual; label: string; className?: string }) {
  const visible = useVisibleLanguages();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{label}</span>
      {visible.en && (
        <p lang="en" className="flex gap-2">
          {visible.vi && (
            <span className="text-muted-foreground mt-0.5 shrink-0 font-mono text-[10px]" aria-hidden>
              EN
            </span>
          )}
          <span>{value.en}</span>
        </p>
      )}
      {visible.vi && (
        <p lang="vi" className={cn("flex gap-2", visible.en && "text-muted-foreground")}>
          {visible.en && (
            <span className="mt-0.5 shrink-0 font-mono text-[10px]" aria-hidden>
              VI
            </span>
          )}
          <span>{value.vi}</span>
        </p>
      )}
    </div>
  );
}

interface ConceptCardProps {
  concept: CheatConcept;
  pkg: InterviewPackage;
  topicTitle?: Bilingual;
}

const ConceptCard = memo(function ConceptCard({ concept, pkg, topicTitle }: ConceptCardProps) {
  return (
    <li className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="leading-snug font-semibold">
          <BilingualText value={concept.title} viClassName="text-sm font-normal" />
        </h4>
        <PriorityBadge priority={concept.priority} className="shrink-0" />
      </div>
      {topicTitle && (
        <p className="text-muted-foreground -mt-2 text-xs">
          <BilingualText value={topicTitle} mode="en" />
        </p>
      )}
      <LangLine label="Memory shortcut" value={concept.memoryShortcut} className="bg-muted/60 rounded-lg p-2.5" />
      <LangLine label="Takeaway" value={concept.takeaway} />
      <RelatedItemLinks pkg={pkg} ids={concept.relatedItemIds} label={`Related items for ${concept.title.en}`} />
    </li>
  );
});

/* ------------------------------------------------------------------ */

interface RapidReviewProps {
  concepts: CheatConcept[];
  pkg: InterviewPackage;
  topicTitles: Map<string, Bilingual>;
  onExit: () => void;
}

function RapidReview({ concepts, pkg, topicTitles, onExit }: RapidReviewProps) {
  const [rawIndex, setIndex] = useState(0);
  const regionRef = useRef<HTMLDivElement>(null);
  const n = concepts.length;
  const index = clampIndex(rawIndex, n);
  const concept = concepts[index];
  const visible = useVisibleLanguages();

  const next = () => setIndex((i) => nextIndex(clampIndex(i, n), n, false));
  const prev = () => setIndex((i) => prevIndex(clampIndex(i, n), n, false));

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest("input, textarea, select, [role='tablist'], [role='slider'], [role='radiogroup']"))
    ) {
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onExit();
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  if (!concept) return null;
  const topicTitle = concept.topicId ? topicTitles.get(concept.topicId) : undefined;
  const positionText = `Concept ${index + 1} of ${n}`;

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      role="region"
      aria-roledescription="rapid review"
      aria-label="Rapid review"
      className="bg-card text-card-foreground focus-visible:ring-ring/50 flex flex-col gap-5 rounded-2xl border p-5 outline-none focus-visible:ring-3 sm:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium tabular-nums" aria-live="polite" aria-atomic="true">
            {positionText}
            <span className="sr-only">: {concept.title.en}</span>
          </span>
          <span className="text-muted-foreground hidden text-xs sm:inline">←/→ to navigate · Esc to exit</span>
        </div>
        <Progress
          value={Math.round(((index + 1) / n) * 100)}
          aria-label="Rapid review progress"
          getAriaValueText={() => positionText}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={concept.priority} />
          {topicTitle && <span className="text-muted-foreground text-xs">{topicTitle.en}</span>}
        </div>
        <h4 className="text-2xl leading-tight font-bold text-balance sm:text-3xl">
          <BilingualText value={concept.title} viClassName="mt-1 text-lg font-medium sm:text-xl" />
        </h4>
      </div>

      <div className="bg-muted/60 rounded-xl p-4">
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">Memory shortcut</p>
        {visible.en && (
          <p lang="en" className="text-lg font-medium sm:text-xl">
            {concept.memoryShortcut.en}
          </p>
        )}
        {visible.vi && (
          <p
            lang="vi"
            className={cn("text-lg sm:text-xl", visible.en && "text-muted-foreground mt-1 text-base sm:text-lg")}
          >
            {concept.memoryShortcut.vi}
          </p>
        )}
      </div>

      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">Takeaway</p>
        <p className="text-base sm:text-lg">
          <BilingualText value={concept.takeaway} viClassName="mt-1 text-base" />
        </p>
      </div>

      <RelatedItemLinks pkg={pkg} ids={concept.relatedItemIds} label="Related items" />

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={prev} disabled={index === 0} aria-keyshortcuts="ArrowLeft">
          <ArrowLeft aria-hidden />
          Previous
        </Button>
        <Button type="button" onClick={next} disabled={index >= n - 1} aria-keyshortcuts="ArrowRight">
          Next
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
