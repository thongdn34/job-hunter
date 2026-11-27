import { describe, expect, it } from "vitest";
import { buildMockClientItems, toMockClientItem } from "./client-items";
import { buildMockItemIndex } from "./item-context";
import { makeTestPackage } from "./test-fixtures";

const ALLOWED_KEYS = new Set([
  "id",
  "number",
  "kind",
  "priority",
  "difficulty",
  "title",
  "prompt",
  "referenceAnswer",
  "parentId",
  "followUp",
]);

describe("buildMockClientItems", () => {
  const pkg = makeTestPackage(6);
  const items = buildMockClientItems(pkg);
  const index = buildMockItemIndex(pkg);

  it("returns one DTO per askable item (primary + follow-ups), in index order", () => {
    expect(items.map((i) => i.id)).toEqual([...index.keys()]);
    expect(items.some((i) => i.parentId === "t-q01")).toBe(true);
  });

  it("drops AI-only context and search text", () => {
    for (const item of items) {
      for (const key of Object.keys(item)) expect(ALLOWED_KEYS).toContain(key);
      if (item.followUp) expect(Object.keys(item.followUp).sort()).toEqual(["id", "question"]);
    }
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain("searchText");
    expect(serialized).not.toContain("supportingNotes");
    expect(serialized).not.toContain("heartbeat ping/pong"); // technicalExplanation → supportingNotes
  });

  it("keeps what the mock UI renders", () => {
    const full = index.get("t-q01")!;
    expect(toMockClientItem(full)).toEqual({
      id: full.id,
      number: full.number,
      kind: full.kind,
      priority: full.priority,
      difficulty: full.difficulty,
      title: full.title,
      prompt: full.prompt,
      referenceAnswer: full.referenceAnswer,
      followUp: { id: "t-q01-f1", question: full.followUp!.question },
    });
    const follow = items.find((i) => i.id === "t-q01-f1")!;
    expect(follow.parentId).toBe("t-q01");
    expect("followUp" in follow).toBe(false);
  });

  it("is much smaller than the full package", () => {
    expect(JSON.stringify(items).length).toBeLessThan(JSON.stringify(pkg).length);
  });
});
