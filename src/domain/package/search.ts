import type { StudyItem } from "./items";

export interface SearchHit {
  item: StudyItem;
  score: number;
  /** Short excerpt around the first match (lower-cased source text). */
  snippet: string;
}

/** Splits a query into lower-case terms; quoted phrases are kept together. */
export function tokenizeQuery(query: string): string[] {
  const terms: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query.toLowerCase())) !== null) {
    const term = (m[1] ?? m[2] ?? "").trim();
    if (term) terms.push(term);
  }
  return terms;
}

function makeSnippet(text: string, index: number, length: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

/**
 * Application-level search across ALL item content, including text hidden in
 * collapsed accordions. Every term must match (AND). Title matches rank higher.
 */
export function searchStudyItems(items: StudyItem[], query: string, limit = 50): SearchHit[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const item of items) {
    const title = `${item.title.en}\n${item.title.vi}`.toLowerCase();
    let score = 0;
    let firstIndex = -1;
    let firstLen = 0;
    let all = true;
    for (const term of terms) {
      const idx = item.searchText.indexOf(term);
      if (idx === -1) {
        all = false;
        break;
      }
      if (firstIndex === -1 || idx < firstIndex) {
        firstIndex = idx;
        firstLen = term.length;
      }
      score += title.includes(term) ? 10 : 1;
      score += Math.min(5, item.searchText.split(term).length - 1) * 0.2;
    }
    if (!all) continue;
    hits.push({ item, score, snippet: makeSnippet(item.searchText, firstIndex, firstLen) });
  }
  return hits.sort((a, b) => b.score - a.score || a.item.number - b.item.number).slice(0, limit);
}
