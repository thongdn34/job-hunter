"use client";

import { memo, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronsDownUp, ChevronsUpDown, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIFFICULTIES, PRIORITIES, type Difficulty, type Priority } from "@/domain/common/schema";
import {
  STUDY_STATUS_FILTERS,
  countActiveFilters,
  type StudyFilterCriteria,
  type StudyStatusFilter,
} from "@/domain/package/filters";
import type { InterviewTopic } from "@/domain/package/schema";
import { useLanguage } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<StudyStatusFilter, string> = {
  all: "All",
  studied: "Studied",
  "not-studied": "Not studied",
  favorites: "Favorites",
};

function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const chipClass =
  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60";
const chipOnClass = "border-primary bg-primary text-primary-foreground hover:bg-primary/90";

function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn(chipClass, pressed && chipOnClass)}>
      {children}
    </button>
  );
}

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-1.5">
      <legend className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export interface QuestionToolbarProps {
  criteria: StudyFilterCriteria;
  onChange: (patch: Partial<StudyFilterCriteria>) => void;
  onClear: () => void;
  topics: readonly InterviewTopic[];
  total: number;
  visible: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** Noun used in the result count, e.g. "questions". */
  noun?: string;
  /**
   * Ref attached to the search input, so the parent can move focus there after removing a
   * control that had focus (e.g. the empty-state "Clear filters"). Optional.
   */
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Below the sticky app header (h-14) + package toolbar (≈57px): 113px. Keep in sync with
 * STICKY_OFFSET_PX in package-view/navigation.ts (the toolbar adds its own border line).
 */
const STICKY_TOP_CLASS = "md:top-[calc(7rem+1px)]";

/**
 * Scroll margin for anchors inside the question bank so items focused by search / deep
 * links land below the app header + package toolbar (+ this toolbar on md+, where it sticks).
 */
export const QUESTION_BANK_SCROLL_MARGIN_CLASS = "scroll-mt-32 md:scroll-mt-[14rem]";

/** Search + filters + expand/collapse controls for the question bank (sticky on desktop). */
export const QuestionToolbar = memo(function QuestionToolbar({
  criteria,
  onChange,
  onClear,
  topics,
  total,
  visible,
  onExpandAll,
  onCollapseAll,
  noun = "questions",
  searchInputRef,
}: QuestionToolbarProps) {
  const uid = useId();
  const ownInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? ownInputRef;
  const language = useLanguage();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchId = `${uid}-search`;
  const panelId = `${uid}-filters`;
  const statusName = `${uid}-status`;
  const activeCount = countActiveFilters(criteria);
  const panelCount = activeCount - (criteria.query.trim() ? 1 : 0);

  // "Clear search" / "Clear filters" unmount themselves when activated: move focus to the
  // search input instead of letting it fall back to <body> (WCAG 2.4.3).
  const clearSearch = () => {
    onChange({ query: "" });
    inputRef.current?.focus();
  };
  const clearAll = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/80 z-10 -mx-1 space-y-2 rounded-xl border p-2 shadow-xs backdrop-blur sm:p-3 md:sticky",
        STICKY_TOP_CLASS,
      )}
    >
      <div role="search" aria-label={`Search and filter ${noun}`} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search {noun}
            </label>
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              ref={inputRef}
              id={searchId}
              type="search"
              value={criteria.query}
              onChange={(e) => onChange({ query: e.target.value })}
              placeholder={`Search ${noun}, answers, code…`}
              autoComplete="off"
              className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {criteria.query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearSearch}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded outline-none focus-visible:ring-2"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            aria-expanded={filtersOpen}
            aria-controls={panelId}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <ListFilter aria-hidden />
            Filters
            {panelCount > 0 ? (
              <span className="bg-primary text-primary-foreground ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] tabular-nums">
                <span className="sr-only">(</span>
                {panelCount}
                <span className="sr-only"> active)</span>
              </span>
            ) : null}
          </Button>
        </div>

        {/* Height-capped on md+ (where the toolbar sticks) so an open panel never covers the questions. */}
        <div
          id={panelId}
          hidden={!filtersOpen}
          className="bg-muted/30 grid gap-3 rounded-lg border p-3 md:max-h-[min(40vh,20rem)] md:overflow-y-auto lg:grid-cols-2"
        >
          <FilterGroup legend="Topic">
            {topics.map((t) => (
              <FilterChip
                key={t.id}
                pressed={criteria.topicIds.includes(t.id)}
                onClick={() => onChange({ topicIds: toggleValue(criteria.topicIds, t.id) })}
              >
                {language === "vi" ? <span lang="vi">{t.title.vi}</span> : <span lang="en">{t.title.en}</span>}
                {t.range ? <span className="opacity-70">({t.range})</span> : null}
              </FilterChip>
            ))}
          </FilterGroup>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FilterGroup legend="Difficulty">
              {DIFFICULTIES.map((d) => (
                <FilterChip
                  key={d}
                  pressed={criteria.difficulties.includes(d)}
                  onClick={() => onChange({ difficulties: toggleValue<Difficulty>(criteria.difficulties, d) })}
                >
                  <span className="capitalize">{d}</span>
                </FilterChip>
              ))}
            </FilterGroup>
            <FilterGroup legend="Priority">
              {PRIORITIES.map((p) => (
                <FilterChip
                  key={p}
                  pressed={criteria.priorities.includes(p)}
                  onClick={() => onChange({ priorities: toggleValue<Priority>(criteria.priorities, p) })}
                >
                  <span className="capitalize">{p}</span>
                </FilterChip>
              ))}
            </FilterGroup>
          </div>
          <FilterGroup legend="Study status">
            {STUDY_STATUS_FILTERS.map((s) => (
              <label
                key={s}
                className={cn(
                  chipClass,
                  "has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-ring/60 cursor-pointer has-focus-visible:ring-3",
                )}
              >
                <input
                  type="radio"
                  name={statusName}
                  value={s}
                  checked={criteria.status === s}
                  onChange={() => onChange({ status: s })}
                  className="sr-only"
                />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p role="status" aria-live="polite" className="text-muted-foreground mr-auto text-xs tabular-nums">
          {visible === total ? `${total} ${noun}` : `Showing ${visible} of ${total} ${noun}`}
        </p>
        {activeCount > 0 ? (
          <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
            <X aria-hidden />
            Clear filters
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onExpandAll} disabled={visible === 0}>
          <ChevronsUpDown aria-hidden />
          Expand all
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCollapseAll} disabled={visible === 0}>
          <ChevronsDownUp aria-hidden />
          Collapse all
        </Button>
      </div>
    </div>
  );
});
