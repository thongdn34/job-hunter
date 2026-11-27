import type { StudyItem, StudyItemKind } from "@/domain/package/items";
import { searchStudyItems, tokenizeQuery, type SearchHit } from "@/domain/package/search";
import { searchTocEntries, type TocEntry } from "./toc";

export type SearchOption = { type: "entry"; entry: TocEntry } | { type: "item"; hit: SearchHit };

export interface SearchResults {
  terms: string[];
  entries: TocEntry[];
  hits: SearchHit[];
  /** Flat option list in display order (sections first, then items) for keyboard navigation. */
  options: SearchOption[];
}

export const EMPTY_RESULTS: SearchResults = { terms: [], entries: [], hits: [], options: [] };

/** Combined section/topic + study item search used by the package toolbar. */
export function buildSearchResults(
  items: StudyItem[],
  entries: TocEntry[],
  query: string,
  limits: { entries?: number; items?: number } = {},
): SearchResults {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return EMPTY_RESULTS;
  const matchedEntries = searchTocEntries(entries, query, limits.entries ?? 6);
  const hits = searchStudyItems(items, query, limits.items ?? 30);
  return {
    terms,
    entries: matchedEntries,
    hits,
    options: [
      ...matchedEntries.map((entry): SearchOption => ({ type: "entry", entry })),
      ...hits.map((hit): SearchOption => ({ type: "item", hit })),
    ],
  };
}

export const ITEM_KIND_LABELS: Record<StudyItemKind, { label: string; prefix: string }> = {
  question: { label: "Question", prefix: "Q" },
  systemDesign: { label: "System design", prefix: "SD" },
  coding: { label: "Coding", prefix: "C" },
  behavioral: { label: "Behavioral", prefix: "B" },
};

export interface TextPart {
  text: string;
  match: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits text into highlighted / plain parts for the given (lower-case) terms, case-insensitively. */
export function splitHighlights(text: string, terms: string[]): TextPart[] {
  const usable = terms.filter((t) => t.length > 0).sort((a, b) => b.length - a.length);
  if (usable.length === 0 || !text) return [{ text, match: false }];
  const re = new RegExp(`(${usable.map(escapeRegExp).join("|")})`, "gi");
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const index = m.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), match: false });
    parts.push({ text: m[0], match: true });
    last = index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}
