import { isbSamplePackage } from "@/content/samples/isb";
import type { InterviewPackage, InterviewQuestion } from "@/domain/package/schema";

/** Test-only helpers: a deterministic package independent of the (still evolving) sample content. */
export function makeQuestion(
  id: string,
  number: number,
  topicId: string,
  en: string,
  hidden: string,
): InterviewQuestion {
  return {
    id,
    number,
    topicId,
    question: { en, vi: `${en} (VI)` },
    answer: `Recommended answer. ${hidden}`,
    viExplanation: "Giải thích.",
    technicalExplanation: "Technical explanation.",
    practicalExample: { description: { en: "Example", vi: "Ví dụ" } },
    memoryShortcut: { en: "Shortcut", vi: "Mẹo nhớ" },
    keyTakeaway: { en: "Takeaway", vi: "Điểm chính" },
    followUps: [
      { id: `${id}-f1`, question: { en: "Follow-up?", vi: "Câu hỏi phụ?" }, answer: { en: "Answer.", vi: "Trả lời." } },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "React",
    tags: [],
  };
}

export function makeTestPackage(): InterviewPackage {
  return {
    ...isbSamplePackage,
    sections: {
      ...isbSamplePackage.sections,
      bilingual: {
        topics: [
          {
            id: "realtime",
            code: "WEBSOCKET",
            range: "1",
            priority: "critical",
            title: { en: "Real-time", vi: "Thời gian thực" },
          },
          { id: "react", code: "REACT", range: "2", priority: "high", title: { en: "React", vi: "React" } },
        ],
        questions: [
          makeQuestion("isb-q01", 1, "realtime", "How do you reconnect a WebSocket?", "Use jittered backoff."),
          makeQuestion("isb-q02", 2, "react", "How does React reconcile?", "The zebracorn scheduler yields."),
        ],
      },
    },
    sectionStates: {
      ...isbSamplePackage.sectionStates,
      bilingual: { status: "ready" },
      jd: { status: "stale" },
      company: { status: "failed", error: "boom" },
    },
  };
}
