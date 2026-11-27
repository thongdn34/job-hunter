import type { CheatConcept, Flashcard, InterviewPackage, InterviewQuestion, StudyPlan } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";

/** Small, self-contained package used by the study/flashcards unit tests. Not imported by app code. */

export const FIXTURE_SLUG = "fixture-co-frontend";

function question(n: number, topicId: string): InterviewQuestion {
  return {
    id: `fx-q${n}`,
    number: n,
    topicId,
    question: { en: `Fixture question ${n}?`, vi: `Câu hỏi mẫu ${n}?` },
    answer: `Answer ${n}`,
    viExplanation: `Giải thích ${n}`,
    technicalExplanation: `Details ${n}`,
    practicalExample: { description: { en: "Example", vi: "Ví dụ" } },
    memoryShortcut: { en: "Shortcut", vi: "Mẹo" },
    keyTakeaway: { en: "Takeaway", vi: "Ý chính" },
    followUps: [{ id: `fx-q${n}-f1`, question: { en: "Why?", vi: "Tại sao?" }, answer: { en: "Because.", vi: "Vì." } }],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "React",
    tags: [],
  };
}

const plan = (id: StudyPlan["id"], title: string, taskIds: Array<[string, number, string[]]>): StudyPlan => ({
  id,
  title: { en: title, vi: `${title} (VI)` },
  days: [
    {
      day: 1,
      focus: { en: "Core topics", vi: "Chủ đề chính" },
      tasks: taskIds.map(([tid, minutes, related]) => ({
        id: tid,
        title: { en: `Task ${tid}`, vi: `Việc ${tid}` },
        durationMinutes: minutes,
        priority: "high",
        relatedItemIds: related,
      })),
    },
  ],
});

export const fixturePlans: StudyPlan[] = [
  plan("1d", "1-day plan", [
    ["t1", 30, ["fx-q1"]],
    ["t2", 60, ["fx-q2", "missing-item"]],
  ]),
  plan("3d", "3-day plan", [
    ["t3", 45, []],
    ["t4", 15, ["fx-q3"]],
  ]),
  plan("7d", "7-day plan", [["t5", 90, []]]),
];

export const fixtureConcepts: CheatConcept[] = [
  {
    id: "c-low",
    title: { en: "Low concept", vi: "Khái niệm thấp" },
    memoryShortcut: { en: "Low EN", vi: "Low VI" },
    takeaway: { en: "Low takeaway", vi: "Ý chính thấp" },
    priority: "low",
    relatedItemIds: [],
  },
  {
    id: "c-crit",
    title: { en: "Critical concept", vi: "Khái niệm quan trọng" },
    memoryShortcut: { en: "Crit EN", vi: "Crit VI" },
    takeaway: { en: "Crit takeaway", vi: "Ý chính quan trọng" },
    priority: "critical",
    relatedItemIds: ["fx-q1"],
  },
  {
    id: "c-med",
    title: { en: "Medium concept", vi: "Khái niệm trung bình" },
    memoryShortcut: { en: "Med EN", vi: "Med VI" },
    takeaway: { en: "Med takeaway", vi: "Ý chính TB" },
    priority: "medium",
    relatedItemIds: [],
  },
];

export const fixtureFlashcards: Flashcard[] = [1, 2, 3].map((i) => ({
  id: `fx-fc${i}`,
  front: { en: `Card ${i}?`, vi: `Thẻ ${i}?` },
  back: { answer: `Card answer ${i}`, viExplanation: `Thẻ giải thích ${i}`, memoryShortcut: { en: "M", vi: "M" } },
  priority: "high",
}));

export function makeFixturePackage(): InterviewPackage {
  const sections: InterviewPackage["sections"] = {
    bilingual: {
      topics: [
        { id: "react", code: "REACT", title: { en: "React", vi: "React" }, priority: "critical" },
        { id: "ts", code: "TS", title: { en: "TypeScript", vi: "TypeScript" }, priority: "high" },
      ],
      questions: [question(1, "react"), question(2, "react"), question(3, "ts")],
    },
    studyPlan: { plans: fixturePlans },
    cheatsheet: { concepts: fixtureConcepts, flashcards: fixtureFlashcards },
  };
  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, { status: sections[k] ? "ready" : "pending" }]),
  ) as InterviewPackage["sectionStates"];
  return {
    meta: {
      id: "fixture",
      slug: FIXTURE_SLUG,
      run: "RUN_10",
      companyName: "Fixture Co",
      companyCode: "FIX",
      jobTitle: "Frontend Engineer",
      isSample: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    sections,
    sectionStates,
  };
}
