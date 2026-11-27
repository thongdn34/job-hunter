import { describe, expect, it } from "vitest";
import { SECTION_KEYS } from "@/domain/package/sections";
import { buildSearchResults, splitHighlights } from "./search-results";
import { makeTestPackage } from "./test-fixtures";
import { buildToc, flattenToc, searchTocEntries } from "./toc";
import { collectStudyItems } from "@/domain/package/items";

describe("buildToc", () => {
  const toc = buildToc(makeTestPackage());

  it("lists all 16 sections in canonical order with bookmarks and anchors", () => {
    expect(toc.map((s) => s.key)).toEqual([...SECTION_KEYS]);
    expect(toc.map((s) => s.number)).toEqual(SECTION_KEYS.map((_, i) => i + 1));
    expect(toc[0]).toMatchObject({ bookmark: "BOOKMARK_ISB_JD", anchorId: "bookmark-isb-jd" });
  });

  it("nests topic bookmarks under the bilingual section only", () => {
    const bilingual = toc.find((s) => s.key === "bilingual")!;
    expect(bilingual.topics.map((t) => t.bookmark)).toEqual(["BOOKMARK_ISB_WEBSOCKET", "BOOKMARK_ISB_REACT"]);
    expect(bilingual.topics[1].anchorId).toBe("bookmark-isb-react");
    expect(toc.filter((s) => s.key !== "bilingual").every((s) => s.topics.length === 0)).toBe(true);
    expect(flattenToc(toc)).toHaveLength(18);
  });
});

describe("searchTocEntries", () => {
  const entries = flattenToc(buildToc(makeTestPackage()));

  it("matches English and Vietnamese titles with AND semantics", () => {
    expect(searchTocEntries(entries, "system design").map((e) => e.anchorId)).toContain("bookmark-isb-system-design");
    expect(searchTocEntries(entries, "kế hoạch").map((e) => e.anchorId)).toEqual(["bookmark-isb-study-plan"]);
    expect(searchTocEntries(entries, "system cheat")).toEqual([]);
  });

  it("matches bookmark codes (with or without underscores)", () => {
    expect(searchTocEntries(entries, "BOOKMARK_ISB_REACT").map((e) => e.anchorId)).toEqual(["bookmark-isb-react"]);
    expect(searchTocEntries(entries, "isb star").map((e) => e.anchorId)).toEqual(["bookmark-isb-star"]);
  });

  it("treats a bare number as a section number", () => {
    expect(searchTocEntries(entries, "7").map((e) => e.anchorId)).toEqual(["bookmark-isb-bilingual"]);
    expect(searchTocEntries(entries, "99")).toEqual([]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchTocEntries(entries, "   ")).toEqual([]);
    expect(searchTocEntries(entries, "bookmark", 3)).toHaveLength(3);
  });
});

describe("buildSearchResults", () => {
  const pkg = makeTestPackage();
  const entries = flattenToc(buildToc(pkg));
  const items = collectStudyItems(pkg);

  it("puts section matches before item matches in the flat option list", () => {
    const results = buildSearchResults(items, entries, "react");
    expect(results.entries.length).toBeGreaterThan(0);
    expect(results.options[0].type).toBe("entry");
    expect(results.options.at(-1)?.type).toBe("item");
    expect(results.options).toHaveLength(results.entries.length + results.hits.length);
  });

  it("finds items by hidden answer text", () => {
    const results = buildSearchResults(items, entries, "zebracorn");
    expect(results.entries).toEqual([]);
    expect(results.hits.map((h) => h.item.id)).toEqual(["isb-q02"]);
  });
});

describe("splitHighlights", () => {
  it("marks every case-insensitive occurrence, preferring longer terms", () => {
    expect(splitHighlights("React reacts", ["react"])).toEqual([
      { text: "React", match: true },
      { text: " ", match: false },
      { text: "react", match: true },
      { text: "s", match: false },
    ]);
    expect(splitHighlights("use memo", ["use memo", "use"])).toEqual([{ text: "use memo", match: true }]);
  });

  it("escapes regex characters and handles no terms", () => {
    expect(splitHighlights("a.b (c)", ["(c)"])).toEqual([
      { text: "a.b ", match: false },
      { text: "(c)", match: true },
    ]);
    expect(splitHighlights("plain", [])).toEqual([{ text: "plain", match: false }]);
  });
});
