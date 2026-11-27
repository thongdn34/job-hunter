import type { BehavioralQuestion, InterviewPackage, InterviewQuestion, MockConfig } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";

/** Small, schema-valid package used by mock-interview unit tests (independent of sample content). */

const bi = (en: string, vi = `${en} (vi)`) => ({ en, vi });

export function makeQuestion(n: number, overrides: Partial<InterviewQuestion> = {}): InterviewQuestion {
  const id = `t-q${String(n).padStart(2, "0")}`;
  return {
    id,
    number: n,
    topicId: "realtime",
    question: bi(
      `Question ${n}: How do you handle WebSocket reconnection?`,
      `Câu ${n}: Xử lý kết nối lại WebSocket thế nào?`,
    ),
    answer:
      "I would use exponential backoff with jitter for WebSocket reconnection, resubscribe to channels after reconnecting, and request a snapshot so the client state is consistent. The trade-off is latency versus server load: aggressive retries recover faster but can cause a thundering herd. I also buffer outgoing messages while offline and show a connection status indicator to the user.",
    viExplanation: "Giải thích tiếng Việt về backoff và jitter khi kết nối lại WebSocket.",
    technicalExplanation: "Use exponential backoff with jitter, heartbeat ping/pong, snapshot + delta resync.",
    practicalExample: { description: bi("Reconnect loop") },
    memoryShortcut: bi(
      "Backoff + jitter, resubscribe, snapshot resync",
      "Backoff + jitter, đăng ký lại, đồng bộ snapshot",
    ),
    keyTakeaway: bi(
      "Reconnection must restore state consistency, not just the socket",
      "Kết nối lại phải khôi phục trạng thái nhất quán",
    ),
    followUps: [
      {
        id: `${id}-f1`,
        question: bi(
          "How do you avoid a thundering herd after a server restart?",
          "Làm sao tránh thundering herd khi server khởi động lại?",
        ),
        answer: bi(
          "Add random jitter to the backoff delay and cap the maximum delay so clients spread their reconnects over time.",
          "Thêm jitter ngẫu nhiên vào thời gian chờ và giới hạn thời gian tối đa.",
        ),
      },
    ],
    difficulty: "medium",
    priority: n <= 2 ? "critical" : n <= 4 ? "high" : "medium",
    jdRequirement: "Real-time data streaming",
    tags: ["websocket"],
    ...overrides,
  };
}

export function makeBehavioral(n: number): BehavioralQuestion {
  return {
    id: `t-b${n}`,
    number: n,
    question: bi(`Tell me about a technical disagreement (${n}).`),
    competency: "conflict",
    star: {
      situation: bi("We disagreed on state management."),
      task: bi("I had to align the team."),
      action: bi("I wrote an RFC comparing options."),
      result: bi("The team agreed on Zustand."),
    },
    source: { kind: "theoretical", note: bi("Template") },
    memoryShortcut: bi("RFC, data, decide"),
    followUp: {
      id: `t-b${n}-f1`,
      question: bi("What would you do differently?"),
      answer: bi("Involve stakeholders earlier."),
    },
    cautions: [],
    difficulty: "medium",
    priority: "high",
  };
}

export function makeMockConfig(pool: string[]): MockConfig {
  return {
    intro: bi("Mock interview intro.", "Giới thiệu phỏng vấn thử."),
    questionPool: pool,
    rubric: [
      { criterion: "technicalAccuracy", description: bi("Correct concepts.") },
      { criterion: "seniorJudgment", description: bi("Trade-offs.") },
      { criterion: "communication", description: bi("Structured.") },
      { criterion: "completeness", description: bi("Key points.") },
    ],
  };
}

export function makeTestPackage(questionCount = 6): InterviewPackage {
  const questions = Array.from({ length: questionCount }, (_, i) => makeQuestion(i + 1));
  const behavioral = [makeBehavioral(1), makeBehavioral(2)];
  const pool = [...questions.map((q) => q.id), ...behavioral.map((b) => b.id), "missing-id"];
  const sections: InterviewPackage["sections"] = {
    bilingual: {
      topics: [{ id: "realtime", code: "REALTIME", title: bi("Real-time"), priority: "critical" }],
      questions,
    },
    star: { questions: behavioral },
    mock: makeMockConfig(pool),
  };
  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, { status: sections[k] ? "ready" : "pending" }]),
  ) as InterviewPackage["sectionStates"];
  return {
    meta: {
      id: "test-pkg",
      slug: "test-co-senior-fe",
      run: "RUN_10",
      companyName: "Test Co",
      companyCode: "TEST",
      jobTitle: "Senior Frontend Engineer",
      isSample: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    sections,
    sectionStates,
  };
}
