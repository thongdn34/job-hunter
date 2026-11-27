import type { Difficulty, Priority } from "@/domain/common/schema";
import type {
  BehavioralQuestion,
  CodingExercise,
  InterviewPackage,
  InterviewQuestion,
  InterviewTopic,
  SystemDesignScenario,
} from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";

/** Small fixture package for RTL tests (independent of the curated sample content). */

export const fixtureTopics: InterviewTopic[] = [
  {
    id: "realtime",
    code: "WEBSOCKET",
    range: "1–2",
    priority: "critical",
    title: { en: "Real-time communication", vi: "Giao tiếp thời gian thực" },
  },
  {
    id: "react",
    code: "REACT",
    range: "3–4",
    priority: "high",
    title: { en: "React performance", vi: "Hiệu năng React" },
  },
];

export function makeQuestion(
  n: number,
  topicId: string,
  opts: { difficulty?: Difficulty; priority?: Priority; en?: string; vi?: string; secret?: string } = {},
): InterviewQuestion {
  const id = `q${String(n).padStart(2, "0")}`;
  return {
    id,
    number: n,
    topicId,
    question: { en: opts.en ?? `English question ${n}?`, vi: opts.vi ?? `Câu hỏi tiếng Việt ${n}?` },
    answer: `Recommended answer ${n}. ${opts.secret ?? ""}`.trim(),
    viExplanation: `Giải thích tiếng Việt ${n}`,
    technicalExplanation: `**Technical** explanation ${n}`,
    practicalExample: {
      description: { en: `Example description ${n}`, vi: `Mô tả ví dụ ${n}` },
      code: { language: "ts", code: `const answer${n} = ${n};` },
    },
    memoryShortcut: { en: `Shortcut EN ${n}`, vi: `Mẹo nhớ VI ${n}` },
    keyTakeaway: { en: `Takeaway EN ${n}`, vi: `Điểm chính VI ${n}` },
    followUps: [
      {
        id: `${id}-f1`,
        question: { en: `Follow-up EN ${n}`, vi: `Câu hỏi thêm ${n}` },
        answer: { en: `Follow-up answer EN ${n}`, vi: `Trả lời thêm ${n}` },
      },
    ],
    difficulty: opts.difficulty ?? "medium",
    priority: opts.priority ?? "high",
    jdRequirement: `JD requirement ${n}`,
    candidateExperience: {
      company: "Acme",
      kind: "actual",
      note: { en: `Experience EN ${n}`, vi: `Kinh nghiệm ${n}` },
    },
    tags: ["tag-a", `tag-${n}`],
  };
}

export const fixtureQuestions: InterviewQuestion[] = [
  makeQuestion(1, "realtime", {
    difficulty: "easy",
    priority: "critical",
    en: "How do WebSockets reconnect?",
    secret: "exponential backoff with jitter",
  }),
  makeQuestion(2, "realtime", { difficulty: "hard", priority: "high", en: "SSE vs WebSocket?" }),
  makeQuestion(3, "react", { difficulty: "medium", priority: "critical", en: "When to use useMemo?" }),
  makeQuestion(4, "react", { difficulty: "expert", priority: "low", en: "Explain concurrent rendering" }),
];

const bi = (en: string, vi: string) => ({ en, vi });

export const fixtureScenario: SystemDesignScenario = {
  id: "sd1",
  number: 1,
  title: bi("Design a trading dashboard", "Thiết kế bảng giao dịch"),
  prompt: bi("Design it", "Thiết kế nó"),
  functionalRequirements: [bi("Live prices", "Giá trực tiếp")],
  nonFunctionalRequirements: [bi("Low latency", "Độ trễ thấp")],
  clarifyingQuestions: [bi("How many users?", "Bao nhiêu người dùng?")],
  highLevelArchitecture: "Client -> BFF -> feeds",
  componentResponsibilities: [{ name: "PriceStore", responsibility: bi("Holds prices", "Giữ giá") }],
  dataFlow: "Feed to store",
  apiDesign: "`GET /prices`",
  stateManagement: "Zustand store",
  scalability: "Shard feeds",
  performance: "Batch renders",
  security: "Auth tokens",
  reliability: "Retries",
  errorRecovery: "Resync snapshot",
  monitoring: "Web vitals",
  tradeOffs: [{ decision: "WebSocket", pros: "Low latency", cons: "Stateful" }],
  recommendedAnswer: "SD recommended answer",
  viExplanation: "Giải thích SD",
  architectureDiagram: { kind: "architecture", code: "flowchart LR\nA-->B" },
  sequenceDiagram: { kind: "sequence", code: "sequenceDiagram\nA->>B: hi" },
  memoryShortcut: bi("SD shortcut", "Mẹo SD"),
  followUps: [{ id: "sd1-f1", question: bi("Scale?", "Mở rộng?"), answer: bi("Shard", "Phân mảnh") }],
  difficulty: "hard",
  priority: "high",
  relatedQuestionIds: [],
};

export const fixtureExercise: CodingExercise = {
  id: "c51",
  number: 51,
  title: bi("Throttle a price stream", "Điều tiết luồng giá"),
  statement: bi("Implement throttle", "Cài đặt throttle"),
  examples: [{ input: "[1,2,3]", output: "[1,3]" }],
  constraints: ["n <= 10^5"],
  approach: bi("Use timestamps", "Dùng mốc thời gian"),
  functionName: "throttle",
  solution: { language: "ts", code: "export function throttle() {}" },
  steps: [bi("Step one", "Bước một")],
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
  edgeCases: [bi("Empty input", "Đầu vào rỗng")],
  walkthrough: { steps: ["t=0 emit"] },
  memoryShortcut: bi("Coding shortcut", "Mẹo code"),
  followUp: { id: "c51-f", question: bi("Debounce?", "Debounce?"), answer: bi("Different", "Khác") },
  testCases: [{ name: "basic", args: [[1, 2, 3], 10], expected: [1, 3] }],
  difficulty: "medium",
  priority: "high",
  jdRequirement: "Real-time data",
};

export const fixtureBehavioral: BehavioralQuestion = {
  id: "b56",
  number: 56,
  question: bi("Tell me about a production incident", "Kể về một sự cố production"),
  competency: "Ownership",
  star: {
    situation: bi("Situation EN", "Tình huống VI"),
    task: bi("Task EN", "Nhiệm vụ VI"),
    action: bi("Action EN", "Hành động VI"),
    result: bi("Result EN", "Kết quả VI"),
  },
  source: { company: "Acme", kind: "theoretical", note: bi("Template", "Mẫu") },
  memoryShortcut: bi("STAR shortcut", "Mẹo STAR"),
  followUp: { id: "b56-f", question: bi("What next?", "Tiếp theo?"), answer: bi("Postmortem", "Hậu kiểm") },
  cautions: [bi("Do not invent metrics", "Không bịa số liệu")],
  difficulty: "medium",
  priority: "high",
};

export function makeFixturePackage(
  overrides: { isSample?: boolean; questions?: InterviewQuestion[] } = {},
): InterviewPackage {
  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, { status: "ready" as const }]),
  ) as InterviewPackage["sectionStates"];
  return {
    meta: {
      id: "pkg-test",
      slug: "test-pkg",
      run: "RUN_10",
      companyName: "Test Co",
      companyCode: "TST",
      jobTitle: "Frontend Engineer",
      isSample: overrides.isSample ?? true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    sections: {
      bilingual: { topics: fixtureTopics, questions: overrides.questions ?? fixtureQuestions },
      systemDesign: { scenarios: [fixtureScenario] },
      coding: { exercises: [fixtureExercise] },
      star: { questions: [fixtureBehavioral] },
    },
    sectionStates,
  };
}
