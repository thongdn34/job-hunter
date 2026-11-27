import type { Bilingual, Fact, FollowUp } from "@/domain/common/schema";
import type { InterviewPackage, InterviewQuestion, SectionState } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";

/** Small but complete package (all 16 sections) used by export tests. */

const b = (en: string, vi: string): Bilingual => ({ en, vi });
const fact = (en: string, vi: string, status: Fact["status"] = "verified"): Fact => ({ text: b(en, vi), status });
const fu = (id: string, n: number): FollowUp => ({
  id,
  question: b(`Follow-up question ${id} #${n}?`, `Câu hỏi phụ ${id} #${n}?`),
  answer: b(`Follow-up answer EN ${id}-${n}.`, `Trả lời phụ VI ${id}-${n}.`),
});

function question(n: number, topicId: string, extra: Partial<InterviewQuestion> = {}): InterviewQuestion {
  const id = `isb-q${String(n).padStart(2, "0")}`;
  return {
    id,
    number: n,
    topicId,
    question: b(`English question ${n}?`, `Câu hỏi tiếng Việt ${n}?`),
    answer: `Recommended answer for question ${n}: use a WebSocket with backoff.`,
    viExplanation: `Giải thích tiếng Việt cho câu ${n}.`,
    technicalExplanation: `Technical explanation ${n} with **bold** and \`code\`.\n\n- trade-off A\n- trade-off B`,
    practicalExample: {
      description: b(`Practical example ${n}`, `Ví dụ thực tế ${n}`),
      code: { language: "ts", code: `export const value${n} = ${n};` },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR\n  A${n}[Client] --> B${n}[Server]`,
      caption: b("Flow", "Luồng"),
    },
    memoryShortcut: b(`Shortcut ${n}`, `Mẹo nhớ ${n}`),
    keyTakeaway: b(`Takeaway ${n}`, `Điểm chính ${n}`),
    followUps: [fu(`${id}-f1`, 1), fu(`${id}-f2`, 2)],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Real-time dashboards",
    candidateExperience: {
      company: "Ninja Van",
      kind: "actual",
      note: b("Socket.IO tracking", "Theo dõi bằng Socket.IO"),
    },
    tags: ["websocket", "react"],
    ...extra,
  };
}

const sections: InterviewPackage["sections"] = {
  jd: {
    jobTitle: fact("Senior Front-End Developer", "Lập trình viên Front-End cao cấp"),
    company: fact("ISB Vietnam", "ISB Việt Nam"),
    location: fact("Ho Chi Minh City", "TP. Hồ Chí Minh"),
    workingArrangement: fact("Hybrid", "Kết hợp", "unverified"),
    seniority: fact("Senior", "Cao cấp"),
    responsibilities: [fact("Build trading dashboards", "Xây dựng dashboard giao dịch")],
    requiredSkills: [fact("React", "React"), fact("TypeScript", "TypeScript")],
    preferredSkills: [fact("Python", "Python", "assumption")],
    benefits: [],
    compensation: { text: b("Negotiable", "Thỏa thuận"), status: "unverified", note: "Not stated in JD" },
    keyExpectations: [fact("Own front-end architecture", "Làm chủ kiến trúc front-end")],
    inferredArchitecture: {
      summary: b("SPA consuming streaming APIs", "SPA dùng API streaming"),
      components: [fact("WebSocket gateway", "Cổng WebSocket", "assumption")],
      diagram: { kind: "architecture", code: "flowchart TD\n  UI --> WS" },
    },
    sourceUrls: ["https://example.com/jobs/1"],
    verification: {
      overallStatus: "unverified",
      notes: [b("Salary unknown", "Chưa rõ lương")],
      checkedAt: "2026-11-27",
    },
  },
  company: {
    overview: fact("Software outsourcing company", "Công ty gia công phần mềm"),
    businessModel: fact("Services", "Dịch vụ"),
    productsAndServices: [fact("Custom software", "Phần mềm theo yêu cầu")],
    industry: fact("IT services", "Dịch vụ CNTT"),
    engineeringCulture: [fact("Code review", "Review code", "assumption")],
    companySize: fact("500+", "500+", "unverified"),
    potentialProjects: [fact("Finance dashboards", "Dashboard tài chính", "assumption")],
    applicationRisks: [fact("Japanese clients", "Khách hàng Nhật", "assumption")],
    recruiterQuestions: [b("Which team?", "Nhóm nào?")],
    sources: [{ title: "Company site", url: "https://example.com" }],
  },
  match: {
    requirements: [
      {
        id: "req-react",
        requirement: b("React expertise", "Thành thạo React"),
        category: "required",
        weight: 5,
        candidateExperience: b("6 years of React", "6 năm React"),
        matchLevel: "strong",
        evidence: [{ company: "NAB", kind: "actual", note: b("AEM + React", "AEM + React") }],
        knowledgeGap: b("None", "Không"),
      },
    ],
    scoringNotes: b("Weighted sum", "Tổng có trọng số"),
    summary: b("Strong match", "Phù hợp cao"),
  },
  cv: {
    professionalTitle: "Senior Front-End Engineer",
    summary: b("CV summary", "Tóm tắt CV"),
    experienceHighlights: [
      {
        company: "Ninja Van",
        role: "Front-End Engineer",
        period: "2020–2023",
        bullets: [b("Built tracking UI", "Xây UI theo dõi")],
      },
    ],
    achievementBullets: [b("Shipped label printing", "Ra mắt in nhãn")],
    technicalSkills: [{ category: "Frontend", skills: ["React", "Next.js"] }],
    atsKeywords: ["React", "TypeScript"],
    missingSkillsToStudy: [{ skill: "D3", reason: b("Charts", "Biểu đồ"), priority: "medium" }],
    claimNotes: [b("No invented metrics", "Không bịa số liệu")],
  },
  intro: {
    variants: ([30, 60, 90] as const).map((s) => ({
      durationSeconds: s,
      script: b(`Intro script ${s}s`, `Kịch bản ${s}s`),
      memoryShortcut: b(`Intro shortcut ${s}`, `Mẹo ${s}`),
      keyPoints: [b(`Point ${s}`, `Ý ${s}`)],
    })),
    deliveryTips: [b("Smile", "Mỉm cười")],
  },
  email: {
    applicationEmail: { subject: "Application", body: b("Email body", "Nội dung email") },
    linkedinMessage: { body: b("LinkedIn body", "Nội dung LinkedIn") },
    coverLetter: { body: b("Cover letter body", "Nội dung thư"), notes: b("Keep short", "Ngắn gọn") },
    followUpEmail: { subject: "Follow-up", body: b("Follow-up body", "Nội dung theo dõi") },
  },
  bilingual: {
    topics: [
      { id: "realtime", code: "REALTIME", title: b("Real-time", "Thời gian thực"), priority: "critical", range: "1–2" },
      {
        id: "react",
        code: "REACT",
        title: b("React", "React"),
        priority: "high",
        description: b("React topics", "Chủ đề React"),
      },
    ],
    questions: [
      question(1, "realtime", { question: b("What does <script>alert(1)</script> do?", "Thẻ <script> làm gì?") }),
      question(2, "realtime", { diagram: undefined, candidateExperience: undefined }),
      question(3, "react", {
        technicalExplanation: "Danger: <script>alert('x')</script> <img src=x onerror=alert(1)>",
      }),
    ],
  },
  systemDesign: {
    scenarios: [
      {
        id: "isb-sd01",
        number: 1,
        title: b("Design a trading dashboard", "Thiết kế dashboard giao dịch"),
        prompt: b("Design it", "Hãy thiết kế"),
        functionalRequirements: [b("Live prices", "Giá trực tiếp")],
        nonFunctionalRequirements: [b("Low latency", "Độ trễ thấp")],
        clarifyingQuestions: [b("How many users?", "Bao nhiêu người dùng?")],
        highLevelArchitecture: "SPA + WS gateway",
        componentResponsibilities: [{ name: "Gateway", responsibility: b("Fan-out", "Phân phối") }],
        dataFlow: "Server -> client",
        apiDesign: "```ts\ntype Tick = { p: number }\n```",
        stateManagement: "Zustand",
        scalability: "Shard",
        performance: "Virtualize",
        security: "Auth tokens",
        reliability: "Reconnect",
        errorRecovery: "Backoff",
        monitoring: "RUM",
        tradeOffs: [{ decision: "WebSocket | SSE", pros: "Bi-directional", cons: "Stateful" }],
        recommendedAnswer: "SD recommended answer text",
        viExplanation: "Giải thích thiết kế hệ thống",
        architectureDiagram: { kind: "architecture", code: "flowchart LR\n  C --> G" },
        sequenceDiagram: { kind: "sequence", code: "sequenceDiagram\n  C->>G: subscribe" },
        memoryShortcut: b("SD shortcut", "Mẹo SD"),
        followUps: [fu("isb-sd01-f1", 1)],
        difficulty: "hard",
        priority: "critical",
        relatedQuestionIds: ["isb-q01", "unknown-id"],
      },
    ],
  },
  coding: {
    exercises: [
      {
        id: "isb-c01",
        number: 1,
        title: b("Debounce", "Debounce"),
        statement: b("Implement debounce", "Cài đặt debounce"),
        examples: [{ input: "fn, 100", output: "debounced fn", explanation: b("Waits", "Chờ") }],
        constraints: ["wait >= 0"],
        approach: b("Use a timer", "Dùng bộ hẹn giờ"),
        functionName: "debounce",
        solution: { language: "ts", code: "export function debounce() {\n  // ```\n}" },
        steps: [b("Clear timer", "Xóa timer")],
        timeComplexity: "O(1)",
        spaceComplexity: "O(1)",
        edgeCases: [b("wait = 0", "wait = 0")],
        walkthrough: { steps: ["call", "wait"] },
        memoryShortcut: b("Coding shortcut", "Mẹo code"),
        followUp: fu("isb-c01-f1", 1),
        alternative: { description: b("Throttle", "Throttle"), complexity: "O(1)" },
        testCases: [{ name: "basic", args: [1, 2], expected: 3 }],
        difficulty: "easy",
        priority: "medium",
        jdRequirement: "JavaScript",
      },
    ],
  },
  star: {
    questions: [
      {
        id: "isb-b01",
        number: 1,
        question: b("Tell me about a conflict", "Kể về một xung đột"),
        competency: "collaboration",
        star: {
          situation: b("STAR situation", "Tình huống"),
          task: b("STAR task", "Nhiệm vụ"),
          action: b("STAR action", "Hành động"),
          result: b("STAR result", "Kết quả"),
        },
        source: { company: "NAB", kind: "actual", note: b("Real story", "Chuyện thật") },
        memoryShortcut: b("STAR shortcut", "Mẹo STAR"),
        followUp: fu("isb-b01-f1", 1),
        cautions: [b("No invented numbers", "Không bịa số")],
        difficulty: "medium",
        priority: "high",
      },
    ],
  },
  hr: {
    groups: [
      {
        category: "team-structure",
        title: b("Team", "Nhóm"),
        questions: [
          { id: "hr-1", text: b("How big is the team?", "Nhóm bao nhiêu người?"), why: b("Scope", "Phạm vi") },
        ],
      },
    ],
  },
  project: {
    name: "Mini trading board",
    objective: b("Practice streaming UI", "Luyện UI streaming"),
    targetGaps: ["D3"],
    techStack: [{ name: "Next.js", reason: b("Matches JD", "Khớp JD") }],
    architectureDiagram: { kind: "architecture", code: "flowchart LR\n  A --> B" },
    features: [{ id: "f1", title: b("Live ticker", "Bảng giá"), priority: "high" }],
    implementationChecklist: [{ id: "c1", text: b("Set up repo", "Tạo repo") }],
    testingRequirements: [b("Unit tests", "Kiểm thử đơn vị")],
    performanceRequirements: [b("60fps", "60fps")],
    learningOutcomes: [b("Streaming", "Streaming")],
  },
  studyPlan: {
    plans: (["1d", "3d", "7d"] as const).map((id) => ({
      id,
      title: b(`Plan ${id}`, `Kế hoạch ${id}`),
      days: [
        {
          day: 1,
          focus: b("Real-time", "Thời gian thực"),
          tasks: [
            {
              id: `${id}-t1`,
              title: b("Review Q1", "Ôn Q1"),
              durationMinutes: 30,
              priority: "high" as const,
              relatedItemIds: ["isb-q01"],
            },
          ],
        },
      ],
    })),
  },
  cheatsheet: {
    concepts: [
      {
        id: "cc1",
        title: b("Backoff", "Backoff"),
        memoryShortcut: b("Double it", "Nhân đôi"),
        takeaway: b("Jitter", "Jitter"),
        priority: "high",
        relatedItemIds: ["isb-q01"],
      },
    ],
    flashcards: [
      {
        id: "fc1",
        front: b("Flashcard front?", "Mặt trước?"),
        back: {
          answer: "Flashcard answer",
          viExplanation: "Giải thích flashcard",
          memoryShortcut: b("FC shortcut", "Mẹo thẻ"),
        },
        priority: "medium",
        relatedItemId: "isb-q02",
      },
    ],
  },
  mock: {
    intro: b("Mock intro", "Giới thiệu phỏng vấn thử"),
    questionPool: ["isb-q01", "isb-sd01", "isb-b01"],
    rubric: (["technicalAccuracy", "seniorJudgment", "communication", "completeness"] as const).map((criterion) => ({
      criterion,
      description: b(`${criterion} description`, `Mô tả ${criterion}`),
    })),
  },
  assessment: {
    overallMatch: b("Good fit", "Phù hợp"),
    sellingPoints: [b("Real-time experience", "Kinh nghiệm real-time")],
    knowledgeGaps: [{ gap: b("D3", "D3"), priority: "medium" }],
    interviewPriorities: [b("Practice SD", "Luyện SD")],
    recommendation: { decision: "apply-after-prep", rationale: b("Prep D3", "Chuẩn bị D3") },
    verificationNotes: [b("Check salary", "Kiểm tra lương")],
    unsupportedClaims: [b("No Python production", "Không có Python production")],
  },
};

const sectionStates = Object.fromEntries(
  SECTION_KEYS.map((key: SectionKey): [SectionKey, SectionState] => [key, { status: "ready", model: "fixture" }]),
) as InterviewPackage["sectionStates"];

export const exportFixture: InterviewPackage = {
  meta: {
    id: "fixture-isb",
    slug: "isb-vietnam-senior-frontend-developer",
    run: "RUN_10",
    companyName: "ISB Vietnam",
    companyCode: "ISB",
    jobTitle: "Senior Front-End Developer",
    sourceUrl: "https://example.com/jobs/1",
    isSample: true,
    createdAt: "2026-11-27T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z",
  },
  sections,
  sectionStates,
};
