import type { Bilingual } from "@/domain/common/schema";
import { bookmarkToAnchorId, sectionAnchorId, sectionBookmark, topicBookmark } from "@/domain/package/bookmarks";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTIONS, type SectionKey } from "@/domain/package/sections";
import { tokenizeQuery } from "@/domain/package/search";

export interface TocTopic {
  kind: "topic";
  anchorId: string;
  bookmark: string;
  title: Bilingual;
  /** Display range, e.g. "1–7". */
  range?: string;
  section: SectionKey;
}

export interface TocSection {
  kind: "section";
  key: SectionKey;
  number: number;
  anchorId: string;
  bookmark: string;
  title: Bilingual;
  topics: TocTopic[];
}

export type TocEntry = TocSection | TocTopic;

/** All section bookmarks in canonical order, with topic bookmarks nested under the bilingual section. */
export function buildToc(pkg: InterviewPackage): TocSection[] {
  const code = pkg.meta.companyCode;
  return SECTIONS.map((def) => {
    const topics: TocTopic[] =
      def.key === "bilingual"
        ? (pkg.sections.bilingual?.topics ?? []).map((t) => {
            const bookmark = topicBookmark(code, t.code);
            return {
              kind: "topic",
              anchorId: bookmarkToAnchorId(bookmark),
              bookmark,
              title: t.title,
              range: t.range,
              section: def.key,
            };
          })
        : [];
    return {
      kind: "section",
      key: def.key,
      number: def.number,
      anchorId: sectionAnchorId(code, def.key),
      bookmark: sectionBookmark(code, def.key),
      title: def.title,
      topics,
    };
  });
}

/** Flattens sections + nested topics (document order). */
export function flattenToc(toc: TocSection[]): TocEntry[] {
  return toc.flatMap((s) => [s, ...s.topics]);
}

function entryHaystack(entry: TocEntry): string {
  const number = entry.kind === "section" ? `${entry.number}` : "";
  return `${number} ${entry.bookmark} ${entry.bookmark.replace(/_/g, " ")} ${entry.title.en} ${entry.title.vi}`.toLowerCase();
}

/**
 * Matches section/topic navigation entries. Every term must match (AND), like item search.
 * A bare number ("7") matches the section with that number exactly.
 */
export function searchTocEntries(entries: TocEntry[], query: string, limit = 6): TocEntry[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];
  if (terms.length === 1 && /^\d+$/.test(terms[0])) {
    const n = Number(terms[0]);
    return entries.filter((e) => e.kind === "section" && e.number === n).slice(0, limit);
  }
  const scored: Array<{ entry: TocEntry; score: number; order: number }> = [];
  entries.forEach((entry, order) => {
    const hay = entryHaystack(entry);
    if (!terms.every((t) => hay.includes(t))) return;
    const titleHit = terms.every((t) => `${entry.title.en} ${entry.title.vi}`.toLowerCase().includes(t));
    scored.push({ entry, score: titleHit ? 2 : 1, order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((s) => s.entry);
}
