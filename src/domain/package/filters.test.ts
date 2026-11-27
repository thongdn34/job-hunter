import { describe, expect, it } from "vitest";
import type { Difficulty, Priority } from "@/domain/common/schema";
import type { StudyItem, StudyItemKind } from "./items";
import { EMPTY_FILTER_CRITERIA, countActiveFilters, filterStudyItems, hasActiveFilters } from "./filters";

function item(
  id: string,
  opts: {
    topicId?: string;
    difficulty?: Difficulty;
    priority?: Priority;
    kind?: StudyItemKind;
    text?: string;
    title?: string;
  },
): StudyItem {
  const title = opts.title ?? `Question ${id}`;
  return {
    id,
    number: Number(id.replace(/\D/g, "")) || 1,
    kind: opts.kind ?? "question",
    section: "bilingual",
    topicId: opts.topicId,
    title: { en: title, vi: `Câu hỏi ${id}` },
    difficulty: opts.difficulty ?? "medium",
    priority: opts.priority ?? "high",
    anchorId: `item-${id}`,
    referenceAnswer: "answer",
    searchText: `${title}\n${opts.text ?? ""}`.toLowerCase(),
  };
}

const items: StudyItem[] = [
  item("q1", {
    topicId: "realtime",
    difficulty: "easy",
    priority: "critical",
    text: "WebSocket reconnect with exponential backoff",
  }),
  item("q2", {
    topicId: "realtime",
    difficulty: "hard",
    priority: "high",
    text: "Server-sent events vs websocket heartbeat",
  }),
  item("q3", {
    topicId: "react",
    difficulty: "medium",
    priority: "critical",
    text: "useMemo memoization and re-renders",
  }),
  item("q4", {
    topicId: "react",
    difficulty: "expert",
    priority: "low",
    text: "Concurrent rendering, transitions, websocket buffering",
  }),
  item("sd1", { kind: "systemDesign", difficulty: "hard", priority: "high", text: "Trading dashboard architecture" }),
];

const ids = (list: StudyItem[]) => list.map((i) => i.id);

describe("filterStudyItems", () => {
  it("returns everything when no filter is active", () => {
    expect(ids(filterStudyItems(items, {}))).toEqual(["q1", "q2", "q3", "q4", "sd1"]);
    expect(ids(filterStudyItems(items, EMPTY_FILTER_CRITERIA))).toHaveLength(5);
  });

  it("searches collapsed content with AND semantics and preserves input order", () => {
    expect(ids(filterStudyItems(items, { query: "websocket" }))).toEqual(["q1", "q2", "q4"]);
    expect(ids(filterStudyItems(items, { query: "websocket backoff" }))).toEqual(["q1"]);
    expect(ids(filterStudyItems(items, { query: "websocket nothing-matches" }))).toEqual([]);
    expect(ids(filterStudyItems(items, { query: '"exponential backoff"' }))).toEqual(["q1"]);
  });

  it("is case-insensitive and ignores whitespace-only queries", () => {
    expect(ids(filterStudyItems(items, { query: "USEMEMO" }))).toEqual(["q3"]);
    expect(ids(filterStudyItems(items, { query: "   " }))).toHaveLength(5);
  });

  it("filters by topics (OR within the criterion) and drops items without a topic", () => {
    expect(ids(filterStudyItems(items, { topicIds: ["react"] }))).toEqual(["q3", "q4"]);
    expect(ids(filterStudyItems(items, { topicIds: ["react", "realtime"] }))).toEqual(["q1", "q2", "q3", "q4"]);
  });

  it("filters by difficulty, priority and kind", () => {
    expect(ids(filterStudyItems(items, { difficulties: ["hard", "expert"] }))).toEqual(["q2", "q4", "sd1"]);
    expect(ids(filterStudyItems(items, { priorities: ["critical"] }))).toEqual(["q1", "q3"]);
    expect(ids(filterStudyItems(items, { kinds: ["systemDesign"] }))).toEqual(["sd1"]);
  });

  it("combines criteria with AND semantics", () => {
    expect(
      ids(
        filterStudyItems(items, {
          query: "websocket",
          topicIds: ["realtime"],
          difficulties: ["hard"],
          priorities: ["high"],
        }),
      ),
    ).toEqual(["q2"]);
  });

  it("filters by study status using arrays or sets", () => {
    const studiedIds = ["q1", "q3"];
    expect(ids(filterStudyItems(items, { status: "studied", studiedIds }))).toEqual(["q1", "q3"]);
    expect(ids(filterStudyItems(items, { status: "not-studied", studiedIds: new Set(studiedIds) }))).toEqual([
      "q2",
      "q4",
      "sd1",
    ]);
    expect(ids(filterStudyItems(items, { status: "favorites", favoriteIds: new Set(["q4"]) }))).toEqual(["q4"]);
    expect(ids(filterStudyItems(items, { status: "favorites" }))).toEqual([]);
    expect(ids(filterStudyItems(items, { status: "not-studied" }))).toHaveLength(5);
    expect(ids(filterStudyItems(items, { status: "all", studiedIds }))).toHaveLength(5);
  });
});

describe("countActiveFilters / hasActiveFilters", () => {
  it("counts each active criterion once", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(hasActiveFilters(EMPTY_FILTER_CRITERIA)).toBe(false);
    expect(countActiveFilters({ query: "  " })).toBe(0);
    expect(
      countActiveFilters({
        query: "react",
        topicIds: ["a", "b"],
        difficulties: ["easy"],
        priorities: ["low"],
        status: "favorites",
      }),
    ).toBe(5);
    expect(hasActiveFilters({ status: "studied" })).toBe(true);
  });
});
