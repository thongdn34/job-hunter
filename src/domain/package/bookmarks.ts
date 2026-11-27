import { SECTION_DEFINITIONS, type SectionKey } from "./sections";

/**
 * Bookmark + anchor helpers. Bookmarks are human-visible, searchable markers
 * (BOOKMARK_ISB_JD); anchors are the stable HTML ids derived from them.
 */

/** Normalizes a company name/code into an uppercase bookmark token, e.g. "ISB Vietnam" -> "ISB_VIETNAM". */
export function toCompanyCode(input: string): string {
  const code = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return code || "COMPANY";
}

/** Normalizes an arbitrary suffix (section or topic code) into bookmark form. */
export function toBookmarkToken(input: string): string {
  return toCompanyCode(input);
}

export function sectionBookmark(companyCode: string, section: SectionKey): string {
  return `BOOKMARK_${toCompanyCode(companyCode)}_${SECTION_DEFINITIONS[section].code}`;
}

export function topicBookmark(companyCode: string, topicCode: string): string {
  return `BOOKMARK_${toCompanyCode(companyCode)}_${toBookmarkToken(topicCode)}`;
}

/** BOOKMARK_ISB_SYSTEM_DESIGN -> "bookmark-isb-system-design" (stable, URL-safe). */
export function bookmarkToAnchorId(bookmark: string): string {
  return bookmark.toLowerCase().replace(/_/g, "-");
}

export function sectionAnchorId(companyCode: string, section: SectionKey): string {
  return bookmarkToAnchorId(sectionBookmark(companyCode, section));
}

/** Anchor id for an individual question / exercise / scenario, e.g. "item-isb-q07". */
export function itemAnchorId(itemId: string): string {
  return `item-${itemId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** Parses "bookmark-isb-jd" or "BOOKMARK_ISB_JD" back to a section key for the given company. */
export function sectionFromBookmark(companyCode: string, value: string): SectionKey | null {
  const normalized = value.startsWith("bookmark-") ? value.toUpperCase().replace(/-/g, "_") : value.toUpperCase();
  const prefix = `BOOKMARK_${toCompanyCode(companyCode)}_`;
  if (!normalized.startsWith(prefix)) return null;
  const code = normalized.slice(prefix.length);
  const match = Object.values(SECTION_DEFINITIONS).find((d) => d.code === code);
  return match ? match.key : null;
}
