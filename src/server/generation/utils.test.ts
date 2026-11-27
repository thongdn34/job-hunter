import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/content/profile/default-profile";
import type { NormalizedJd } from "@/domain/jd/schema";
import { GENERATION_COUNTS, type QuestionDraft, type TopicPlan } from "@/server/ai/schemas";
import { describeError, isRetryableError, retryAfterMs } from "./errors";
import { computeSectionInputHash, stableStringify } from "./hash";
import { itemIdPrefix, mergeQuestionBatches, normalizeSectionContent, normalizeTopicPlan } from "./normalize";
import { createLimiter } from "./registry";
import { backoffDelay, withRetry } from "./retry";
import { sanitizeGeneratedContent, sanitizeGeneratedText } from "./sanitize";

const apiError = (statusCode: number, headers: Record<string, string> = {}) =>
  new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://api.example.test",
    requestBodyValues: {},
    statusCode,
    responseHeaders: headers,
  });

describe("errors + retry", () => {
  it("classifies retryable errors", () => {
    expect(isRetryableError(apiError(429))).toBe(true);
    expect(isRetryableError(apiError(503))).toBe(true);
    expect(isRetryableError(apiError(400))).toBe(false);
    expect(isRetryableError(new Error("nope"))).toBe(false);
  });

  it("parses retry-after headers", () => {
    expect(retryAfterMs(apiError(429, { "Retry-After": "3" }))).toBe(3000);
    expect(retryAfterMs(apiError(429, { "retry-after-ms": "150" }))).toBe(150);
    const now = Date.parse("2026-11-01T00:00:00Z");
    expect(retryAfterMs(apiError(429, { "retry-after": "Sun, 01 Nov 2026 00:00:05 GMT" }), now)).toBe(5000);
    expect(retryAfterMs(apiError(429))).toBeUndefined();
  });

  it("uses exponential backoff capped by maxDelay, preferring retry-after", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(backoffDelay(1, apiError(500), { baseDelayMs: 100 })).toBe(100);
    expect(backoffDelay(3, apiError(500), { baseDelayMs: 100 })).toBe(400);
    expect(backoffDelay(10, apiError(500), { baseDelayMs: 100, maxDelayMs: 1000 })).toBe(1000);
    expect(backoffDelay(1, apiError(429, { "retry-after": "2" }), { baseDelayMs: 100 })).toBe(2000);
    vi.restoreAllMocks();
  });

  it("retries 429 and gives up on 400", async () => {
    const sleep = vi.fn(async () => {});
    const flaky = vi
      .fn()
      .mockRejectedValueOnce(apiError(429, { "retry-after": "1" }))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(flaky, { sleep })).resolves.toBe("ok");
    expect(sleep).toHaveBeenCalledWith(1000, undefined);

    const bad = vi.fn().mockRejectedValue(apiError(400));
    await expect(withRetry(bad, { sleep })).rejects.toThrow("HTTP 400");
    expect(bad).toHaveBeenCalledTimes(1);

    const down = vi.fn().mockRejectedValue(apiError(502));
    await expect(withRetry(down, { sleep, maxAttempts: 3 })).rejects.toThrow("HTTP 502");
    expect(down).toHaveBeenCalledTimes(3);
  });

  it("describes errors without leaking request details", () => {
    expect(describeError(apiError(401))).toMatch(/rejected the API key/);
    expect(describeError(apiError(429))).toMatch(/rate limit/);
  });
});

describe("limiter", () => {
  it("bounds concurrency", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
      });
    await Promise.all(Array.from({ length: 6 }, task));
    expect(peak).toBe(2);
  });
});

describe("hashing", () => {
  const jd: NormalizedJd = {
    companyName: "A",
    jobTitle: "B",
    origin: "manual",
    text: "React",
    sections: [],
    extractedAt: "x",
    warnings: [],
  };
  const meta = { companyName: "A", companyCode: "A", jobTitle: "B" };

  it("stableStringify ignores key order", () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe(stableStringify({ a: [1, { c: 3, d: 2 }], b: 1 }));
  });

  it("changes with JD, profile and dependencies, not with extraction time", () => {
    const base = computeSectionInputHash({ key: "cv", jd, profile: defaultProfile, dependencies: {}, meta });
    expect(
      computeSectionInputHash({
        key: "cv",
        jd: { ...jd, extractedAt: "y" },
        profile: defaultProfile,
        dependencies: {},
        meta,
      }),
    ).toBe(base);
    expect(
      computeSectionInputHash({
        key: "cv",
        jd: { ...jd, text: "Vue" },
        profile: defaultProfile,
        dependencies: {},
        meta,
      }),
    ).not.toBe(base);
    expect(
      computeSectionInputHash({
        key: "cv",
        jd,
        profile: { ...defaultProfile, headline: "Staff" },
        dependencies: {},
        meta,
      }),
    ).not.toBe(base);
    const withMatch = computeSectionInputHash({
      key: "cv",
      jd,
      profile: defaultProfile,
      dependencies: {
        match: { requirements: [], scoringNotes: { en: "a", vi: "a" }, summary: { en: "a", vi: "a" } } as never,
      },
      meta,
    });
    expect(withMatch).not.toBe(base);
    // Non-dependencies do not affect the hash.
    expect(
      computeSectionInputHash({
        key: "cv",
        jd,
        profile: defaultProfile,
        dependencies: { coding: { exercises: [] } as never },
        meta,
      }),
    ).toBe(base);
  });
});

describe("normalization", () => {
  const topic = (id: string, priority: "critical" | "high" | "medium" | "low", questionCount: number) => ({
    id,
    code: id.toUpperCase(),
    title: { en: id, vi: id },
    description: { en: id, vi: id },
    priority,
    questionCount,
    focusAreas: [id],
    jdRequirements: [id],
  });

  it("scales topic plans into the 40–60 question range and de-duplicates ids", () => {
    const small = normalizeTopicPlan({
      rationale: "r",
      topics: [topic("a", "critical", 3), topic("b", "low", 3), topic("a", "high", 3), topic("c", "medium", 3)],
    });
    const total = small.topics.reduce((s, t) => s + t.questionCount, 0);
    expect(total).toBe(GENERATION_COUNTS.questionsTotal.min);
    expect(new Set(small.topics.map((t) => t.id)).size).toBe(4);
    expect(small.topics[2].id).toBe("a-2");
    expect(small.topics[2].code).toBe("A_2");

    const big = normalizeTopicPlan({
      rationale: "r",
      topics: Array.from({ length: 10 }, (_, i) => topic(`t${i}`, i < 2 ? "critical" : "low", 12)),
    });
    expect(big.topics.reduce((s, t) => s + t.questionCount, 0)).toBe(GENERATION_COUNTS.questionsTotal.max);
    expect(big.topics[0].questionCount).toBeGreaterThanOrEqual(big.topics[9].questionCount);
  });

  it("merges batches in plan order with stable ids and ranges", () => {
    const draft = (label: string): QuestionDraft => ({
      question: { en: label, vi: label },
      answer: "a",
      viExplanation: "v",
      technicalExplanation: "t",
      practicalExample: { description: { en: "d", vi: "d" } },
      memoryShortcut: { en: "m", vi: "m" },
      keyTakeaway: { en: "k", vi: "k" },
      followUps: [{ question: { en: "f", vi: "f" }, answer: { en: "a", vi: "a" } }],
      difficulty: "medium",
      priority: "high",
      jdRequirement: "r",
      tags: [],
    });
    const plan: TopicPlan = { rationale: "r", topics: [topic("react", "critical", 2), topic("ts", "high", 1)] };
    const bank = mergeQuestionBatches(
      plan,
      [
        { topicId: "ts", questions: [draft("ts1")] },
        { topicId: "react", questions: [draft("r1"), draft("r2")] },
      ],
      itemIdPrefix("ISB_VN"),
    );
    expect(bank.questions.map((q) => [q.id, q.number, q.topicId, q.question.en])).toEqual([
      ["isb-vn-q01", 1, "react", "r1"],
      ["isb-vn-q02", 2, "react", "r2"],
      ["isb-vn-q03", 3, "ts", "ts1"],
    ]);
    expect(bank.questions[0].followUps[0].id).toBe("isb-vn-q01-f1");
    expect(bank.topics.map((t) => t.range)).toEqual(["1–2", "3"]);
  });

  it("drops hallucinated ids from downstream references", () => {
    const content = normalizeSectionContent(
      "mock",
      { intro: { en: "i", vi: "i" }, questionPool: ["acme-q01", "made-up"], rubric: [] as never },
      { prefix: "acme", knownItemIds: ["acme-q01"], knownTopicIds: [] },
    );
    expect(content.questionPool).toEqual(["acme-q01"]);
  });
});

describe("sanitization", () => {
  it("strips scripts, event handlers and javascript: URLs from Markdown", () => {
    const dirty =
      'Hi <script>alert(1)</script><img src=x onerror="alert(1)"> [click](javascript:alert(1)) <a href="javascript:evil()">x</a>';
    const clean = sanitizeGeneratedText(dirty);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toContain("[click](#)");
  });

  it("leaves fenced and inline code and plain prose untouched", () => {
    const input =
      'Core languages — JavaScript: ES2022.\n```tsx\n<button onClick={() => setOpen(true)}>Open</button>\n<script>x()</script>\n```\nNever render `<script>alert(1)</script>` or ``<a href="javascript:x">``.\n~~~html\n<img src=x onerror="alert(1)">\n~~~';
    expect(sanitizeGeneratedText(input)).toBe(input);
  });

  it("still sanitizes prose around code and unclosed backticks", () => {
    const clean = sanitizeGeneratedText(
      'Use `x` then <script>alert(1)</script> and <b onclick="x()">b</b> ` not code <iframe src=x></iframe>\n```js\nconst ok = 1;\n```\nAfter <SCRIPT>bad()</SCRIPT> [x](javascript:alert(1)) <javascript:alert(2)>\n[ref]: javascript:alert(3)',
    );
    expect(clean).toContain("Use `x` then  and <b>b</b> ` not code \n");
    expect(clean).toContain("```js\nconst ok = 1;\n```\n");
    expect(clean).not.toMatch(/<script|<iframe|onclick|javascript:/i);
    expect(clean).toContain("[x](#)");
    expect(clean).not.toMatch(/\]\(#\)\)/);
    expect(clean).toContain("[ref]: #");
  });

  it("treats an unclosed fence as code until the end", () => {
    const input = "Intro <script>a()</script>\n```html\n<script>b()</script>";
    expect(sanitizeGeneratedText(input)).toBe("Intro \n```html\n<script>b()</script>");
  });

  it("sanitizes Mermaid diagrams but leaves code blocks untouched", () => {
    const content = sanitizeGeneratedContent({
      diagram: {
        kind: "flowchart",
        code: '%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\n  A-->B\n  click A "javascript:alert(1)"',
      },
      example: { language: "html", code: '<a href="javascript:void(0)">x</a>' },
      text: "Use <iframe src=x></iframe> safely",
    });
    expect(content.diagram.code).toBe("flowchart LR\n  A-->B");
    expect(content.example.code).toBe('<a href="javascript:void(0)">x</a>');
    expect(content.text).toBe("Use  safely");
  });
});
