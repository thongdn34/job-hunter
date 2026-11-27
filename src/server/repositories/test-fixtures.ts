import type { NormalizedJd } from "@/domain/jd/schema";
import type { InterviewQuestion, InterviewTopic, QuestionBank } from "@/domain/package/schema";

/** Minimal, schema-valid fixtures shared by the mapper unit tests and DB integration tests. */

const bi = (en: string) => ({ en, vi: `${en} (vi)` });

export const fixtureTopics: InterviewTopic[] = [
  { id: "react", code: "REACT", title: bi("React"), priority: "critical", range: "1" },
  { id: "realtime", code: "WEBSOCKET", title: bi("Realtime"), priority: "high", range: "2" },
];

export function makeQuestion(
  number: number,
  topicId: string,
  overrides: Partial<InterviewQuestion> = {},
): InterviewQuestion {
  const id = `fx-q${String(number).padStart(2, "0")}`;
  return {
    id,
    number,
    topicId,
    question: bi(`Question ${number}?`),
    answer: `Answer to question ${number}.`,
    viExplanation: `Giải thích ${number}`,
    technicalExplanation: `**Details** for ${number}`,
    practicalExample: { description: bi(`Example ${number}`), code: { language: "ts", code: `const n = ${number};` } },
    memoryShortcut: bi(`Shortcut ${number}`),
    keyTakeaway: bi(`Takeaway ${number}`),
    followUps: [
      { id: `${id}-f1`, question: bi(`Follow-up ${number}.1?`), answer: bi(`Follow-up answer ${number}.1`) },
      { id: `${id}-f2`, question: bi(`Follow-up ${number}.2?`), answer: bi(`Follow-up answer ${number}.2`) },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "React performance",
    tags: ["react"],
    ...overrides,
  };
}

export const fixtureBank: QuestionBank = {
  topics: fixtureTopics,
  questions: [makeQuestion(1, "react"), makeQuestion(2, "realtime")],
};

export const fixtureJd: NormalizedJd = {
  companyName: "Acme Đà Nẵng",
  jobTitle: "Senior Front-End Engineer",
  location: "Da Nang",
  sourceUrl: "https://jobs.example.com/acme/123",
  origin: "url",
  text: "Build realtime dashboards with React and TypeScript.",
  sections: [{ heading: "Responsibilities", items: ["Build dashboards"] }],
  extractedAt: "2026-11-20T10:00:00.000Z",
  warnings: [],
};
