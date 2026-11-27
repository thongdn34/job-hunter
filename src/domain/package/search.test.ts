import { describe, expect, it } from "vitest";
import { isbSamplePackage } from "@/content/samples/isb";
import { collectStudyItems, type StudyItem } from "./items";
import type { InterviewPackage, InterviewQuestion } from "./schema";
import { searchStudyItems, tokenizeQuery } from "./search";

function item(id: string, number: number, title: string, body: string): StudyItem {
  return {
    id,
    number,
    kind: "question",
    section: "bilingual",
    title: { en: title, vi: `${title} (vi)` },
    difficulty: "medium",
    priority: "high",
    anchorId: `item-${id}`,
    referenceAnswer: body,
    searchText: `${title}\n${title} (vi)\n${body}`.toLowerCase(),
  };
}

const ITEMS: StudyItem[] = [
  item(
    "q1",
    1,
    "What is a WebSocket?",
    "A persistent full-duplex connection. Use heartbeats and backoff when reconnecting.",
  ),
  item(
    "q2",
    2,
    "Server-Sent Events vs polling",
    "SSE is one-way; it reconnects automatically. Compare with WebSocket for bidirectional data.",
  ),
  item(
    "q3",
    3,
    "React memoization",
    "useMemo and React.memo avoid wasted renders; virtualized tables keep the DOM small.",
  ),
  item(
    "q4",
    4,
    "Virtualized tables",
    "Render only visible rows with windowing. Combine with memoization for real-time order books.",
  ),
];

describe("tokenizeQuery", () => {
  it("lower-cases and splits on whitespace", () => {
    expect(tokenizeQuery("  React   MEMO ")).toEqual(["react", "memo"]);
  });

  it("keeps quoted phrases together", () => {
    expect(tokenizeQuery('"full-duplex connection" heartbeat')).toEqual(["full-duplex connection", "heartbeat"]);
  });

  it("returns no terms for an empty query", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
    expect(searchStudyItems(ITEMS, "  ")).toEqual([]);
  });
});

describe("searchStudyItems", () => {
  it("requires every term to match (AND semantics)", () => {
    const ids = searchStudyItems(ITEMS, "websocket reconnect").map((h) => h.item.id);
    expect(ids.sort()).toEqual(["q1", "q2"]);
    expect(searchStudyItems(ITEMS, "websocket virtualized")).toEqual([]);
  });

  it("matches quoted phrases exactly, not as separate words", () => {
    expect(searchStudyItems(ITEMS, '"full-duplex connection"').map((h) => h.item.id)).toEqual(["q1"]);
    expect(searchStudyItems(ITEMS, '"connection full-duplex"')).toEqual([]);
  });

  it("finds text that only exists in hidden (collapsed) answer content", () => {
    const hits = searchStudyItems(ITEMS, "heartbeats");
    expect(hits.map((h) => h.item.id)).toEqual(["q1"]);
    expect(hits[0].snippet).toContain("heartbeats");
  });

  it("ranks title matches above body-only matches", () => {
    const ids = searchStudyItems(ITEMS, "virtualized").map((h) => h.item.id);
    expect(ids).toEqual(["q4", "q3"]);
    const memo = searchStudyItems(ITEMS, "memoization").map((h) => h.item.id);
    expect(memo[0]).toBe("q3");
  });

  it("breaks score ties by item number and honours the limit", () => {
    const tie = [item("b", 2, "Alpha", "shared term"), item("a", 1, "Beta", "shared term")];
    expect(searchStudyItems(tie, "shared").map((h) => h.item.id)).toEqual(["a", "b"]);
    expect(searchStudyItems(ITEMS, "e", 2)).toHaveLength(2);
  });

  it("builds an ellipsized snippet around the first match", () => {
    const long = item("x", 9, "Long", `${"lorem ipsum ".repeat(20)}needle${" dolor sit".repeat(20)}`);
    const [hit] = searchStudyItems([long], "needle");
    expect(hit.snippet.startsWith("…")).toBe(true);
    expect(hit.snippet.endsWith("…")).toBe(true);
    expect(hit.snippet).toContain("needle");
  });

  it("searches collapsed content collected from a package (follow-ups, code, explanations)", () => {
    const question: InterviewQuestion = {
      id: "t-q01",
      number: 1,
      topicId: "realtime",
      question: { en: "How do you keep a WebSocket alive?", vi: "Làm sao giữ kết nối WebSocket?" },
      answer: "Send periodic pings.",
      viExplanation: "Giải thích tiếng Việt.",
      technicalExplanation: "Detect half-open sockets with application heartbeats.",
      practicalExample: {
        description: { en: "Example", vi: "Ví dụ" },
        code: { language: "ts", code: "const reconnectDelayMs = jitteredBackoff(attempt);" },
      },
      memoryShortcut: { en: "Ping, pong, reconnect", vi: "Ping, pong, kết nối lại" },
      keyTakeaway: { en: "Heartbeats detect dead peers", vi: "Heartbeat phát hiện kết nối chết" },
      followUps: [
        {
          id: "f1",
          question: { en: "What about proxies?", vi: "Còn proxy?" },
          answer: { en: "Idle load balancers drop quiet connections.", vi: "Bộ cân bằng tải ngắt kết nối im lặng." },
        },
      ],
      difficulty: "medium",
      priority: "critical",
      jdRequirement: "Real-time data",
      tags: ["websocket"],
    };
    const pkg: InterviewPackage = {
      ...isbSamplePackage,
      sections: {
        ...isbSamplePackage.sections,
        bilingual: {
          topics: [
            { id: "realtime", code: "WEBSOCKET", title: { en: "Realtime", vi: "Thời gian thực" }, priority: "high" },
          ],
          questions: [question],
        },
        // Only the fixture question should be searchable here (real sample content may also match).
        systemDesign: undefined,
        coding: undefined,
        star: undefined,
      },
    };
    const items = collectStudyItems(pkg);
    expect(searchStudyItems(items, "jitteredbackoff").map((h) => h.item.id)).toEqual(["t-q01"]);
    expect(searchStudyItems(items, '"idle load balancers"').map((h) => h.item.id)).toEqual(["t-q01"]);
    expect(searchStudyItems(items, "bộ cân bằng").map((h) => h.item.id)).toEqual(["t-q01"]);
    expect(searchStudyItems(items, "half-open heartbeats").map((h) => h.item.id)).toEqual(["t-q01"]);
  });
});
