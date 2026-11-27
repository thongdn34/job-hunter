"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { BookMarked, Hash, Search, X } from "lucide-react";
import { BilingualText } from "@/components/common/BilingualText";
import type { StudyItem } from "@/domain/package/items";
import { cn } from "@/lib/utils";
import { focusStudyItem, scrollToAnchor } from "./navigation";
import { buildSearchResults, ITEM_KIND_LABELS, splitHighlights, type SearchOption } from "./search-results";
import type { TocEntry } from "./toc";

export interface GlobalSearchProps {
  items: StudyItem[];
  /** Section + topic navigation entries (see buildToc / flattenToc). */
  entries: TocEntry[];
  className?: string;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Application-level search across every study item, including text hidden in
 * collapsed accordions, plus section titles and bookmarks. WAI-ARIA 1.2 combobox
 * with a listbox popup. Shortcuts: "/" or Ctrl/Cmd+K.
 */
export function GlobalSearch({ items, entries, className }: GlobalSearchProps) {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => buildSearchResults(items, entries, deferredQuery), [items, entries, deferredQuery]);
  const { options } = results;
  const hasQuery = query.trim().length > 0;
  const expanded = open && hasQuery;
  const active = options.length === 0 ? -1 : Math.min(activeIndex, options.length - 1);
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  // Global shortcuts: "/" (outside text fields) and Ctrl/Cmd+K.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const isSlash =
        event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget(event.target);
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isSlash && !isCmdK) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep the active option visible while navigating with the keyboard.
  useEffect(() => {
    if (!expanded || active < 0) return;
    document.getElementById(`${baseId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [expanded, active, baseId]);

  const select = useCallback((option: SearchOption) => {
    setOpen(false);
    if (option.type === "item") focusStudyItem(option.hit.item);
    else scrollToAnchor(option.entry.anchorId);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!hasQuery) return;
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(event.key === "ArrowDown" ? 0 : Math.max(0, options.length - 1));
          return;
        }
        if (options.length === 0) return;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((active + delta + options.length) % options.length);
        return;
      }
      case "Enter": {
        if (!expanded || active < 0) return;
        event.preventDefault();
        select(options[active]);
        return;
      }
      case "Escape": {
        if (expanded) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          event.preventDefault();
          setQuery("");
        }
        return;
      }
      case "Tab":
        setOpen(false);
        return;
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  const entryCount = results.entries.length;
  const statusText = !hasQuery
    ? ""
    : deferredQuery !== query
      ? "Searching…"
      : options.length === 0
        ? "No results"
        : `${options.length} result${options.length === 1 ? "" : "s"}`;

  return (
    <div className={cn("relative", className)} onBlur={onBlur}>
      <label htmlFor={`${baseId}-input`} className="sr-only">
        Search questions, answers and sections
      </label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="search"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listboxId : undefined}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={`${baseId}-hint`}
          placeholder="Search answers, topics, bookmarks…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full min-w-0 rounded-lg border pr-16 pl-8 text-base outline-none focus-visible:ring-3 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded p-1 outline-none focus-visible:ring-2"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
          <kbd
            className="bg-muted text-muted-foreground hidden rounded border px-1.5 font-mono text-[10px] sm:inline-block"
            aria-hidden
          >
            /
          </kbd>
        </div>
      </div>
      <p id={`${baseId}-hint`} className="sr-only">
        Searches all content, including collapsed answers. Use arrow keys to choose a result and Enter to open it. Press
        slash or Control K to focus search.
      </p>
      <div role="status" aria-live="polite" className="sr-only">
        {statusText}
      </div>

      {expanded && (
        <div className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-1 max-h-[min(70vh,30rem)] overflow-y-auto rounded-lg border p-1 shadow-lg">
          {options.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {deferredQuery !== query ? "Searching…" : <>No results for “{query.trim()}”.</>}
            </p>
          ) : (
            <div role="listbox" id={listboxId} aria-label="Search results">
              {entryCount > 0 && (
                <div role="group" aria-labelledby={`${baseId}-g-sections`}>
                  <div
                    id={`${baseId}-g-sections`}
                    role="presentation"
                    className="text-muted-foreground px-2 pt-1.5 pb-1 text-xs font-medium"
                  >
                    Sections
                  </div>
                  {options.slice(0, entryCount).map((option, i) => (
                    <SearchOptionRow
                      key={optionKey(option)}
                      id={optionId(i)}
                      index={i}
                      option={option}
                      terms={results.terms}
                      active={i === active}
                      onSelect={select}
                      onHover={setActiveIndex}
                    />
                  ))}
                </div>
              )}
              {results.hits.length > 0 && (
                <div role="group" aria-labelledby={`${baseId}-g-items`}>
                  <div
                    id={`${baseId}-g-items`}
                    role="presentation"
                    className="text-muted-foreground px-2 pt-1.5 pb-1 text-xs font-medium"
                  >
                    Questions & exercises
                  </div>
                  {options.slice(entryCount).map((option, j) => {
                    const i = entryCount + j;
                    return (
                      <SearchOptionRow
                        key={optionKey(option)}
                        id={optionId(i)}
                        index={i}
                        option={option}
                        terms={results.terms}
                        active={i === active}
                        onSelect={select}
                        onHover={setActiveIndex}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function optionKey(option: SearchOption): string {
  return option.type === "item" ? `item:${option.hit.item.id}` : `entry:${option.entry.anchorId}`;
}

const SearchOptionRow = memo(function SearchOptionRow({
  id,
  index,
  option,
  terms,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  index: number;
  option: SearchOption;
  terms: string[];
  active: boolean;
  onSelect: (option: SearchOption) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // Keep focus in the input so the combobox stays operable.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option)}
      onMouseMove={() => {
        if (!active) onHover(index);
      }}
      className={cn(
        "flex cursor-pointer gap-2 rounded-md px-2 py-2 text-sm",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {option.type === "entry" ? <EntryContent entry={option.entry} /> : <ItemContent option={option} terms={terms} />}
    </div>
  );
});

function EntryContent({ entry }: { entry: TocEntry }) {
  const Icon = entry.kind === "section" ? Hash : BookMarked;
  return (
    <>
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {entry.kind === "section" && <span className="tabular-nums">{entry.number}. </span>}
          <BilingualText value={entry.title} viClassName="text-xs font-normal" />
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate font-mono text-[11px]">{entry.bookmark}</span>
      </span>
      <span className="text-muted-foreground shrink-0 self-start text-[11px]">
        {entry.kind === "section" ? "Section" : "Topic"}
      </span>
    </>
  );
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {splitHighlights(text, terms).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-yellow-300/50 px-0.5 text-inherit dark:bg-yellow-500/30">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function ItemContent({ option, terms }: { option: Extract<SearchOption, { type: "item" }>; terms: string[] }) {
  const { item, snippet } = option.hit;
  const kind = ITEM_KIND_LABELS[item.kind];
  return (
    <>
      <span className="text-muted-foreground mt-0.5 w-9 shrink-0 font-mono text-xs tabular-nums">
        {kind.prefix}
        {item.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          <BilingualText value={item.title} viClassName="text-xs font-normal" />
        </span>
        <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
          <Highlighted text={snippet} terms={terms} />
        </span>
      </span>
      <span className="text-muted-foreground shrink-0 self-start text-[11px]">{kind.label}</span>
    </>
  );
}
