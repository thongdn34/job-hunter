import type { Difficulty, Priority } from "@/domain/common/schema";
import type { StudyItem, StudyItemKind } from "./items";
import { searchStudyItems, tokenizeQuery } from "./search";

/**
 * Pure filtering for study items (questions, scenarios, exercises, behavioral questions).
 * Used by the Section 7 toolbar and any other list that needs topic / difficulty /
 * priority / study-status filtering. Every active criterion must match (AND semantics);
 * values inside one criterion are alternatives (OR), e.g. difficulties ["easy","hard"].
 */

export const STUDY_STATUS_FILTERS = ["all", "studied", "not-studied", "favorites"] as const;
export type StudyStatusFilter = (typeof STUDY_STATUS_FILTERS)[number];

type IdCollection = ReadonlySet<string> | readonly string[];

export interface StudyItemFilters {
  /** Free-text query; every term must match the item's full (collapsed) content. */
  query?: string;
  topicIds?: readonly string[];
  difficulties?: readonly Difficulty[];
  priorities?: readonly Priority[];
  kinds?: readonly StudyItemKind[];
  status?: StudyStatusFilter;
  studiedIds?: IdCollection;
  favoriteIds?: IdCollection;
}

/** The criteria a filter UI edits (progress id sets are supplied separately). */
export interface StudyFilterCriteria {
  query: string;
  topicIds: string[];
  difficulties: Difficulty[];
  priorities: Priority[];
  status: StudyStatusFilter;
}

export const EMPTY_FILTER_CRITERIA: StudyFilterCriteria = Object.freeze({
  query: "",
  topicIds: [],
  difficulties: [],
  priorities: [],
  status: "all",
}) as StudyFilterCriteria;

function toSet(ids: IdCollection | undefined): ReadonlySet<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids as readonly string[]);
}

/** Number of active criteria (query counts as one). Useful for "Filters (3)" badges. */
export function countActiveFilters(filters: StudyItemFilters): number {
  let n = 0;
  if (filters.query && tokenizeQuery(filters.query).length > 0) n++;
  if (filters.topicIds?.length) n++;
  if (filters.difficulties?.length) n++;
  if (filters.priorities?.length) n++;
  if (filters.kinds?.length) n++;
  if (filters.status && filters.status !== "all") n++;
  return n;
}

export function hasActiveFilters(filters: StudyItemFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * Returns the items matching every active filter, preserving the input order
 * (section order), so grouped lists stay stable while the user types.
 */
export function filterStudyItems(items: readonly StudyItem[], filters: StudyItemFilters): StudyItem[] {
  const query = filters.query?.trim() ?? "";
  const queryMatches =
    tokenizeQuery(query).length > 0
      ? new Set(searchStudyItems(items as StudyItem[], query, items.length).map((h) => h.item.id))
      : null;

  const topics = filters.topicIds?.length ? new Set(filters.topicIds) : null;
  const difficulties = filters.difficulties?.length ? new Set(filters.difficulties) : null;
  const priorities = filters.priorities?.length ? new Set(filters.priorities) : null;
  const kinds = filters.kinds?.length ? new Set(filters.kinds) : null;
  const status = filters.status ?? "all";
  const studied = status === "studied" || status === "not-studied" ? toSet(filters.studiedIds) : null;
  const favorites = status === "favorites" ? toSet(filters.favoriteIds) : null;

  return items.filter((item) => {
    if (queryMatches && !queryMatches.has(item.id)) return false;
    if (topics && (!item.topicId || !topics.has(item.topicId))) return false;
    if (difficulties && !difficulties.has(item.difficulty)) return false;
    if (priorities && !priorities.has(item.priority)) return false;
    if (kinds && !kinds.has(item.kind)) return false;
    if (status === "studied" && !studied?.has(item.id)) return false;
    if (status === "not-studied" && studied?.has(item.id)) return false;
    if (status === "favorites" && !favorites?.has(item.id)) return false;
    return true;
  });
}
