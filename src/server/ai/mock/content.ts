import type { Bilingual, Diagram, ExperienceRef, Fact, Priority } from "@/domain/common/schema";
import type { InterviewQuestion, SectionContentMap } from "@/domain/package/schema";
import { generationExperiences, type WorkExperience } from "@/domain/profile/schema";
import type { PromptContext } from "../prompts/context";
import { knownItemIds } from "../prompts/context";
import { GENERATION_COUNTS, type QuestionDraft, type TopicPlan, type TopicPlanEntry } from "../schemas";
import { detectSkills, pickTopics } from "./keywords";

/**
 * Deterministic, offline content for every Run #10 section. Built programmatically from the
 * normalized JD + candidate profile (+ already generated dependencies). Every piece of top-level
 * text is labelled "[MOCK]" — this content is for tests, e2e and demos only.
 */

export const MOCK_LABEL = "[MOCK]";

export interface MockGenerationContext extends PromptContext {
  topicPlan?: TopicPlan;
}

const bi = (en: string, vi: string): Bilingual => ({ en, vi });
const mock = (en: string, vi: string): Bilingual => ({ en: `${MOCK_LABEL} ${en}`, vi: `${MOCK_LABEL} ${vi}` });
const fact = (en: string, vi: string, status: Fact["status"], note?: string): Fact => ({
  text: bi(en, vi),
  status,
  ...(note ? { note } : {}),
});
const pad = (n: number) => String(n).padStart(2, "0");
const priorities: Priority[] = ["critical", "high", "medium", "low"];

function experiences(ctx: MockGenerationContext): WorkExperience[] {
  return generationExperiences(ctx.profile);
}

function experienceFor(ctx: MockGenerationContext, keywords: string[]): WorkExperience | undefined {
  const lower = keywords.map((k) => k.toLowerCase());
  return experiences(ctx).find((e) =>
    [...e.technologies, ...e.highlights, e.summary].some((t) => lower.some((k) => t.toLowerCase().includes(k))),
  );
}

function experienceRef(ctx: MockGenerationContext, keywords: string[]): ExperienceRef {
  const exp = experienceFor(ctx, keywords);
  if (exp) {
    return {
      company: exp.company,
      kind: "actual",
      note: bi(
        `Profile experience at ${exp.company}: ${exp.highlights[0] ?? exp.summary}`,
        `Kinh nghiệm thực tế tại ${exp.company} theo hồ sơ.`,
      ),
    };
  }
  return {
    kind: "theoretical",
    note: bi(
      "No production evidence in the profile — answer from theoretical knowledge.",
      "Hồ sơ chưa có bằng chứng production — trả lời dựa trên kiến thức lý thuyết.",
    ),
  };
}

function profileHas(ctx: MockGenerationContext, skill: string): "production" | "familiar" | null {
  const s = ctx.profile.skills.find((k) => k.name.toLowerCase() === skill.toLowerCase());
  return s ? (s.proficiency === "familiar" ? "familiar" : "production") : null;
}

function skills(ctx: MockGenerationContext): string[] {
  const found = detectSkills(ctx.jd);
  return found.length > 0 ? found : ["Software engineering fundamentals"];
}

const simpleFlow = (a: string, b: string, c: string): Diagram => ({
  kind: "flowchart",
  code: `flowchart LR\n  A["${a}"] --> B["${b}"]\n  B --> C["${c}"]`,
  caption: bi(`${MOCK_LABEL} ${a} → ${b} → ${c}`, `${MOCK_LABEL} ${a} → ${b} → ${c}`),
});

/* ------------------------------------------------------------------ */
/* Topic plan + questions                                               */
/* ------------------------------------------------------------------ */

export function mockTopicPlan(ctx: MockGenerationContext): TopicPlan {
  const topics = pickTopics(ctx.jd, 8);
  const perTopic = Math.ceil(GENERATION_COUNTS.questionsTotal.min / topics.length);
  return {
    rationale: `${MOCK_LABEL} Topics ranked by keyword frequency in the job description, padded with a senior frontend baseline.`,
    topics: topics.map((t): TopicPlanEntry => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: mock(
        `Questions about ${t.title.en} for ${ctx.meta.jobTitle}.`,
        `Câu hỏi về ${t.title.vi} cho vị trí ${ctx.meta.jobTitle}.`,
      ),
      priority: t.priority,
      questionCount: perTopic,
      focusAreas: t.focus,
      jdRequirements: [
        t.hits > 0 ? `${t.title.en} (mentioned in the JD)` : `${t.title.en} (baseline for a senior role)`,
      ],
    })),
  };
}

export function mockQuestionDraft(
  ctx: MockGenerationContext,
  topic: Pick<TopicPlanEntry, "id" | "title" | "focusAreas" | "priority">,
  index: number,
  variant = 0,
): QuestionDraft {
  const focus = topic.focusAreas[index % topic.focusAreas.length] ?? topic.title.en;
  const n = index + 1;
  const suffix = variant > 0 ? ` (v${variant + 1})` : "";
  return {
    question: mock(
      `${topic.title.en} #${n}: How would you apply ${focus} in a production ${ctx.meta.jobTitle} role?${suffix}`,
      `${topic.title.vi} #${n}: Bạn áp dụng ${focus} thế nào trong vai trò ${ctx.meta.jobTitle}?${suffix}`,
    ),
    answer: `${MOCK_LABEL} I would start by clarifying the constraints around ${focus}, then explain how it works, the trade-offs I would weigh for ${ctx.meta.companyName}, and a concrete example. This is placeholder content generated offline for testing.`,
    viExplanation: `${MOCK_LABEL} Giải thích tiếng Việt về ${focus} (giữ nguyên thuật ngữ kỹ thuật tiếng Anh).`,
    technicalExplanation: `${MOCK_LABEL} **${focus}** — key points:\n\n- How it works\n- Trade-offs (performance vs. maintainability)\n- Failure scenarios and monitoring`,
    practicalExample: {
      description: mock(`A small example applying ${focus}.`, `Ví dụ nhỏ áp dụng ${focus}.`),
      ...(index % 2 === 0
        ? {
            code: {
              language: "ts",
              code: `// ${MOCK_LABEL} ${focus}\nexport function example(input: number[]): number {\n  return input.reduce((sum, n) => sum + n, 0);\n}`,
            },
          }
        : {}),
    },
    ...(index === 0 ? { diagram: simpleFlow("Requirement", focus, "Validation") } : {}),
    memoryShortcut: mock(`${focus}: define → trade-offs → example`, `${focus}: định nghĩa → trade-off → ví dụ`),
    keyTakeaway: mock(
      `Tie ${focus} to user impact and measurable quality.`,
      `Gắn ${focus} với tác động tới người dùng và chất lượng đo được.`,
    ),
    followUps: [
      {
        question: mock(`What can go wrong with ${focus}?`, `Điều gì có thể sai với ${focus}?`),
        answer: mock(
          "Discuss failure modes, detection and mitigation.",
          "Trình bày lỗi có thể xảy ra, cách phát hiện và khắc phục.",
        ),
      },
    ],
    difficulty: index % 3 === 0 ? "medium" : index % 3 === 1 ? "hard" : "expert",
    priority: topic.priority,
    jdRequirement: `${topic.title.en} — ${focus}`,
    candidateExperience: experienceRef(ctx, [focus, topic.title.en]),
    tags: [topic.id, "mock"],
  };
}

export function mockQuestionBatch(
  ctx: MockGenerationContext,
  topicId: string,
  count: number,
): { questions: QuestionDraft[] } {
  const topic = ctx.topicPlan?.topics.find((t) => t.id === topicId) ?? {
    id: topicId,
    title: bi(topicId, topicId),
    focusAreas: [topicId],
    priority: "medium" as const,
  };
  return { questions: Array.from({ length: count }, (_, i) => mockQuestionDraft(ctx, topic, i)) };
}

export function mockSingleQuestion(
  ctx: MockGenerationContext,
  questionId: string,
  topicId: string,
): { question: QuestionDraft } {
  const bank = ctx.dependencies.bilingual;
  const existing: InterviewQuestion | undefined = bank?.questions.find((q) => q.id === questionId);
  const topic = bank?.topics.find((t) => t.id === topicId);
  const draft = mockQuestionDraft(
    ctx,
    {
      id: topicId,
      title: topic?.title ?? bi(topicId, topicId),
      focusAreas: [existing?.jdRequirement ?? topicId],
      priority: existing?.priority ?? "medium",
    },
    Math.max(0, (existing?.number ?? 1) - 1),
    1,
  );
  return {
    question: existing ? { ...draft, question: existing.question, answer: `${draft.answer} (regenerated)` } : draft,
  };
}

/* ------------------------------------------------------------------ */
/* Sections                                                             */
/* ------------------------------------------------------------------ */

function jdSection(ctx: MockGenerationContext): SectionContentMap["jd"] {
  const { jd } = ctx;
  const found = skills(ctx);
  const respItems = jd.sections.find((s) => /respons|what you|duties|role/i.test(s.heading))?.items ?? [];
  return {
    jobTitle: fact(
      jd.jobTitle || ctx.meta.jobTitle,
      jd.jobTitle || ctx.meta.jobTitle,
      jd.jobTitle ? "verified" : "assumption",
    ),
    company: fact(jd.companyName || ctx.meta.companyName, jd.companyName || ctx.meta.companyName, "verified"),
    location: jd.location
      ? fact(jd.location, jd.location, "verified")
      : fact("Location not stated", "Chưa nêu địa điểm", "unverified", "Confirm with the recruiter."),
    workingArrangement: fact(
      "Working arrangement not stated",
      "Chưa nêu hình thức làm việc",
      "unverified",
      "Confirm with the recruiter.",
    ),
    seniority: fact(
      /senior|lead|principal/i.test(jd.jobTitle) ? "Senior" : "Mid/Senior (inferred)",
      "Senior / Mid",
      /senior|lead|principal/i.test(jd.jobTitle) ? "verified" : "assumption",
    ),
    responsibilities:
      respItems.length > 0
        ? respItems.slice(0, 8).map((r) => fact(r, r, "verified"))
        : [
            fact(
              `${MOCK_LABEL} Build and maintain features as a ${ctx.meta.jobTitle}`,
              `${MOCK_LABEL} Xây dựng và bảo trì tính năng`,
              "assumption",
            ),
          ],
    requiredSkills: found.map((s) => fact(s, s, "verified")),
    preferredSkills: [],
    benefits: [],
    keyExpectations: [
      fact(
        `${MOCK_LABEL} Deliver production-quality work with ${found.slice(0, 3).join(", ")}`,
        `${MOCK_LABEL} Giao sản phẩm chất lượng production`,
        "assumption",
      ),
    ],
    inferredArchitecture: {
      summary: mock(
        "Inferred: a web frontend talking to backend APIs.",
        "Suy luận: frontend web giao tiếp với backend API.",
      ),
      components: [
        fact("Web frontend", "Frontend web", "assumption"),
        fact("Backend APIs", "Backend API", "assumption"),
      ],
      diagram: {
        kind: "architecture",
        code: 'flowchart LR\n  U["User"] --> FE["Web app"]\n  FE --> API["Backend APIs"]',
      },
    },
    sourceUrls: jd.sourceUrl ? [jd.sourceUrl] : [],
    verification: {
      overallStatus: "unverified",
      notes: [
        mock(
          "Generated offline by the mock provider; verify every fact.",
          "Tạo offline bởi mock provider; cần kiểm chứng mọi thông tin.",
        ),
      ],
      checkedAt: jd.extractedAt,
    },
  };
}

function companySection(ctx: MockGenerationContext): SectionContentMap["company"] {
  const name = ctx.meta.companyName;
  return {
    overview: fact(
      `${MOCK_LABEL} ${name} is hiring a ${ctx.meta.jobTitle}.`,
      `${MOCK_LABEL} ${name} đang tuyển ${ctx.meta.jobTitle}.`,
      "verified",
    ),
    businessModel: fact(
      "Business model not verified",
      "Chưa xác minh mô hình kinh doanh",
      "unverified",
      "No external research available.",
    ),
    productsAndServices: [],
    industry: fact("Industry not verified", "Chưa xác minh lĩnh vực", "unverified"),
    engineeringCulture: [],
    companySize: fact("Company size not verified", "Chưa xác minh quy mô", "unverified"),
    potentialProjects: [
      fact(
        `${MOCK_LABEL} Projects related to ${ctx.meta.jobTitle}`,
        `${MOCK_LABEL} Dự án liên quan tới vị trí`,
        "assumption",
      ),
    ],
    applicationRisks: [
      fact(
        `${MOCK_LABEL} Company details are unverified`,
        `${MOCK_LABEL} Thông tin công ty chưa được xác minh`,
        "assumption",
      ),
    ],
    recruiterQuestions: [
      mock("What products would this role work on?", "Vị trí này sẽ làm sản phẩm nào?"),
      mock("How is the engineering team structured?", "Đội kỹ thuật được tổ chức thế nào?"),
      mock("What does the working arrangement look like?", "Hình thức làm việc như thế nào?"),
      mock("What does the interview process include?", "Quy trình phỏng vấn gồm những gì?"),
    ],
    sources: ctx.jd.sourceUrl ? [{ title: "Job description", url: ctx.jd.sourceUrl }] : [],
  };
}

function matchSection(ctx: MockGenerationContext): SectionContentMap["match"] {
  const requirements = skills(ctx)
    .slice(0, 12)
    .map((skill, i): SectionContentMap["match"]["requirements"][number] => {
      const level = profileHas(ctx, skill);
      const exp = experienceFor(ctx, [skill]);
      const matchLevel =
        level === "production" ? (exp ? "strong" : "relevant") : level === "familiar" ? "partial" : "gap";
      return {
        id: `req-${pad(i + 1)}`,
        requirement: bi(skill, skill),
        category: "required",
        weight: i < 3 ? 5 : i < 6 ? 4 : 3,
        candidateExperience: level
          ? mock(`${skill} is listed in the profile (${level}).`, `${skill} có trong hồ sơ (${level}).`)
          : mock(`${skill} is not in the profile.`, `${skill} chưa có trong hồ sơ.`),
        matchLevel,
        evidence: [experienceRef(ctx, [skill])],
        ...(matchLevel === "strong" || matchLevel === "relevant"
          ? {}
          : {
              knowledgeGap: mock(`Limited evidence for ${skill}.`, `Ít bằng chứng về ${skill}.`),
              recommendedImprovement: mock(`Build a small project using ${skill}.`, `Làm một dự án nhỏ với ${skill}.`),
            }),
      };
    });
  return {
    requirements,
    scoringNotes: mock(
      "Internal estimate, not an official employer/ATS evaluation: strong=100%, relevant=75%, partial=50%, gap/unverified=0% of each requirement's weight.",
      "Ước tính nội bộ, không phải đánh giá chính thức của nhà tuyển dụng/ATS.",
    ),
    summary: mock(
      `Matched ${requirements.length} JD requirements against the profile.`,
      `Đã đối chiếu ${requirements.length} yêu cầu với hồ sơ.`,
    ),
  };
}

function cvSection(ctx: MockGenerationContext): SectionContentMap["cv"] {
  const found = skills(ctx);
  return {
    professionalTitle: ctx.profile.headline,
    summary: mock(
      `${ctx.profile.headline} targeting ${ctx.meta.jobTitle}.`,
      `${ctx.profile.headline} ứng tuyển ${ctx.meta.jobTitle}.`,
    ),
    experienceHighlights: experiences(ctx).map((e) => ({
      company: e.company,
      role: e.role,
      ...(e.period ? { period: e.period } : {}),
      bullets: (e.highlights.length > 0 ? e.highlights : [e.summary || e.company]).slice(0, 4).map((h) => bi(h, h)),
    })),
    achievementBullets: experiences(ctx)
      .flatMap((e) => e.highlights.slice(0, 1))
      .map((h) => bi(h, h)),
    technicalSkills: [{ category: "JD-relevant", skills: found.filter((s) => profileHas(ctx, s)) }],
    atsKeywords: found,
    missingSkillsToStudy: found
      .filter((s) => !profileHas(ctx, s))
      .map((s) => ({
        skill: s,
        reason: mock(`${s} appears in the JD but not in the profile.`, `${s} có trong JD nhưng không có trong hồ sơ.`),
        priority: "high" as const,
      })),
    claimNotes: [
      mock("Mock content — verify every bullet against your real experience.", "Nội dung mock — kiểm tra lại từng ý."),
    ],
  };
}

function introSection(ctx: MockGenerationContext): SectionContentMap["intro"] {
  const companies =
    experiences(ctx)
      .map((e) => e.company)
      .join(", ") || "my previous teams";
  const variant = (durationSeconds: 30 | 60 | 90) => ({
    durationSeconds,
    script: mock(
      `Hi, I'm a ${ctx.profile.headline} with ${ctx.profile.yearsOfExperience}+ years of experience, most recently at ${companies}. I'm excited about the ${ctx.meta.jobTitle} role at ${ctx.meta.companyName}. (${durationSeconds}s version)`,
      `Xin chào, tôi là ${ctx.profile.headline} với ${ctx.profile.yearsOfExperience}+ năm kinh nghiệm. (bản ${durationSeconds}s)`,
    ),
    memoryShortcut: mock("Who → Where → Why this role", "Tôi là ai → Đã làm ở đâu → Vì sao chọn vị trí này"),
    keyPoints: [
      mock("Seniority and years", "Cấp độ và số năm"),
      mock("Relevant experience", "Kinh nghiệm liên quan"),
      mock("Motivation", "Động lực"),
    ],
  });
  return {
    variants: [variant(30), variant(60), variant(90)],
    deliveryTips: [
      mock("Speak slowly and smile.", "Nói chậm và mỉm cười."),
      mock("End with a question.", "Kết thúc bằng một câu hỏi."),
    ],
  };
}

function emailSection(ctx: MockGenerationContext): SectionContentMap["email"] {
  const draft = (subject: string | undefined, en: string, vi: string) => ({
    ...(subject ? { subject } : {}),
    body: mock(en, vi),
  });
  return {
    applicationEmail: draft(
      `Application: ${ctx.meta.jobTitle}`,
      `Dear [Recruiter name],\n\nI'd like to apply for the ${ctx.meta.jobTitle} role at ${ctx.meta.companyName}.\n\nBest regards`,
      "Thư ứng tuyển (bản dịch).",
    ),
    linkedinMessage: draft(
      undefined,
      `Hi [Name], I'm interested in the ${ctx.meta.jobTitle} role at ${ctx.meta.companyName}. Could we connect?`,
      "Tin nhắn LinkedIn (bản dịch).",
    ),
    coverLetter: draft(
      undefined,
      `Dear Hiring Team,\n\nI'm applying for ${ctx.meta.jobTitle}.\n\nSincerely`,
      "Thư xin việc (bản dịch).",
    ),
    followUpEmail: draft(
      `Following up: ${ctx.meta.jobTitle}`,
      "Hi [Recruiter name],\n\nI wanted to follow up on my application.\n\nThanks",
      "Email theo dõi (bản dịch).",
    ),
  };
}

function systemDesignSection(ctx: MockGenerationContext): SectionContentMap["systemDesign"] {
  const titles = ["Real-time dashboard", "Large data table with virtualization", "Offline-capable form workflow"];
  return {
    scenarios: titles.map((title, i) => ({
      id: `sd${i + 1}`,
      number: i + 1,
      title: mock(title, title),
      prompt: mock(
        `Design a ${title.toLowerCase()} for ${ctx.meta.companyName}.`,
        `Thiết kế ${title} cho ${ctx.meta.companyName}.`,
      ),
      functionalRequirements: [mock("Users can view and update data.", "Người dùng xem và cập nhật dữ liệu.")],
      nonFunctionalRequirements: [mock("p95 interaction latency under 100 ms.", "Độ trễ tương tác p95 dưới 100 ms.")],
      clarifyingQuestions: [mock("How many concurrent users?", "Bao nhiêu người dùng đồng thời?")],
      highLevelArchitecture: `${MOCK_LABEL} Client → BFF → services.`,
      componentResponsibilities: [
        { name: "Client", responsibility: mock("Render and cache data.", "Hiển thị và cache dữ liệu.") },
      ],
      dataFlow: `${MOCK_LABEL} Fetch → normalize → render.`,
      apiDesign: `${MOCK_LABEL} \`GET /api/items?cursor=\``,
      stateManagement: `${MOCK_LABEL} Server state in a query cache; UI state local.`,
      scalability: `${MOCK_LABEL} Paginate and virtualize.`,
      performance: `${MOCK_LABEL} Memoize and batch updates.`,
      security: `${MOCK_LABEL} AuthN/AuthZ at the BFF; escape output.`,
      reliability: `${MOCK_LABEL} Retries with backoff.`,
      errorRecovery: `${MOCK_LABEL} Error boundaries and retry actions.`,
      monitoring: `${MOCK_LABEL} RUM + error tracking.`,
      tradeOffs: [{ decision: "Polling vs WebSocket", pros: "Simple", cons: "Higher latency" }],
      recommendedAnswer: `${MOCK_LABEL} Clarify requirements, sketch the architecture, then go deep on the riskiest part.`,
      viExplanation: `${MOCK_LABEL} Làm rõ yêu cầu, vẽ kiến trúc, rồi đi sâu vào phần rủi ro nhất.`,
      architectureDiagram: {
        kind: "architecture",
        code: 'flowchart LR\n  C["Client"] --> B["BFF"]\n  B --> S["Services"]',
      },
      sequenceDiagram: {
        kind: "sequence",
        code: "sequenceDiagram\n  participant C as Client\n  participant B as BFF\n  C->>B: request\n  B-->>C: response",
      },
      memoryShortcut: mock("Clarify → Sketch → Deep-dive → Trade-offs", "Làm rõ → Phác thảo → Đi sâu → Trade-off"),
      followUps: [
        {
          id: "f1",
          question: mock("How do you scale it 10x?", "Mở rộng 10 lần thế nào?"),
          answer: mock("Cache, shard, and degrade gracefully.", "Cache, chia nhỏ và giảm tải hợp lý."),
        },
      ],
      difficulty: "hard",
      priority: priorities[Math.min(i, 3)],
      relatedQuestionIds: [],
    })),
  };
}

const CODING_LIBRARY: Array<{
  title: string;
  fn: string;
  code: string;
  example: { input: string; output: string };
  tests: Array<{ name: string; args: unknown[]; expected: unknown }>;
  time: string;
  space: string;
}> = [
  {
    title: "Merge overlapping intervals",
    fn: "mergeIntervals",
    code: "export function mergeIntervals(intervals: number[][]): number[][] {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const result: number[][] = [];\n  for (const [start, end] of sorted) {\n    const last = result[result.length - 1];\n    if (last && start <= last[1]) last[1] = Math.max(last[1], end);\n    else result.push([start, end]);\n  }\n  return result;\n}",
    example: { input: "[[1,3],[2,6],[8,10]]", output: "[[1,6],[8,10]]" },
    tests: [
      {
        name: "overlap",
        args: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
        ],
      },
      {
        name: "touching",
        args: [
          [
            [1, 4],
            [4, 5],
          ],
        ],
        expected: [[1, 5]],
      },
      { name: "empty", args: [[]], expected: [] },
    ],
    time: "O(n log n)",
    space: "O(n)",
  },
  {
    title: "Valid brackets",
    fn: "isValidBrackets",
    code: "export function isValidBrackets(s: string): boolean {\n  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };\n  const stack: string[] = [];\n  for (const ch of s) {\n    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);\n    else if (ch in pairs) {\n      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}",
    example: { input: '"({[]})"', output: "true" },
    tests: [
      { name: "balanced", args: ["({[]})"], expected: true },
      { name: "unbalanced", args: ["(]"], expected: false },
      { name: "unclosed", args: ["(("], expected: false },
    ],
    time: "O(n)",
    space: "O(n)",
  },
  {
    title: "Chunk an array",
    fn: "chunk",
    code: "export function chunk<T>(items: T[], size: number): T[][] {\n  if (size <= 0) return [];\n  const result: T[][] = [];\n  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));\n  return result;\n}",
    example: { input: "[1,2,3,4,5], 2", output: "[[1,2],[3,4],[5]]" },
    tests: [
      { name: "uneven", args: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] },
      { name: "invalid size", args: [[1, 2], 0], expected: [] },
    ],
    time: "O(n)",
    space: "O(n)",
  },
  {
    title: "Flatten a nested array",
    fn: "flattenDeep",
    code: "export function flattenDeep(input: unknown[]): unknown[] {\n  const result: unknown[] = [];\n  const stack: unknown[] = [...input].reverse();\n  while (stack.length > 0) {\n    const item = stack.pop();\n    if (Array.isArray(item)) for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);\n    else result.push(item);\n  }\n  return result;\n}",
    example: { input: "[1,[2,[3,[4]]]]", output: "[1,2,3,4]" },
    tests: [
      { name: "nested", args: [[1, [2, [3, [4]]]]], expected: [1, 2, 3, 4] },
      { name: "flat", args: [[1, 2]], expected: [1, 2] },
    ],
    time: "O(n)",
    space: "O(n)",
  },
  {
    title: "Top K frequent numbers",
    fn: "topKFrequent",
    code: "export function topKFrequent(nums: number[], k: number): number[] {\n  const counts = new Map<number, number>();\n  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);\n  return [...counts.entries()]\n    .sort((a, b) => b[1] - a[1] || a[0] - b[0])\n    .slice(0, k)\n    .map(([n]) => n);\n}",
    example: { input: "[1,1,1,2,2,3], 2", output: "[1,2]" },
    tests: [
      { name: "basic", args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { name: "single", args: [[5], 1], expected: [5] },
    ],
    time: "O(n log n)",
    space: "O(n)",
  },
];

function codingSection(): SectionContentMap["coding"] {
  return {
    exercises: CODING_LIBRARY.map((ex, i) => ({
      id: `c${pad(i + 1)}`,
      number: i + 1,
      title: mock(ex.title, ex.title),
      statement: mock(`Implement \`${ex.fn}\`.`, `Cài đặt hàm \`${ex.fn}\`.`),
      examples: [{ input: ex.example.input, output: ex.example.output }],
      constraints: ["Input fits in memory"],
      approach: mock("Iterate once with an auxiliary structure.", "Duyệt một lần với cấu trúc phụ trợ."),
      functionName: ex.fn,
      solution: { language: "ts", code: ex.code },
      steps: [mock("Handle edge cases.", "Xử lý trường hợp biên."), mock("Build the result.", "Xây dựng kết quả.")],
      timeComplexity: ex.time,
      spaceComplexity: ex.space,
      edgeCases: [mock("Empty input", "Đầu vào rỗng")],
      walkthrough: { steps: [`${ex.example.input} → ${ex.example.output}`] },
      memoryShortcut: mock("Edge cases → loop → result", "Biên → vòng lặp → kết quả"),
      followUp: {
        id: "f1",
        question: mock("Can you do it in place?", "Có thể làm in-place không?"),
        answer: mock("Discuss the trade-offs.", "Trình bày trade-off."),
      },
      testCases: ex.tests,
      difficulty: i < 2 ? "easy" : "medium",
      priority: i < 2 ? "high" : "medium",
      jdRequirement: "Problem solving",
    })),
  };
}

function starSection(ctx: MockGenerationContext): SectionContentMap["star"] {
  const competencies = [
    "Technical challenge",
    "Performance optimization",
    "Ownership",
    "Stakeholder management",
    "Technical disagreement",
    "Engineering quality",
  ];
  const exps = experiences(ctx);
  return {
    questions: competencies.map((competency, i) => {
      const exp = exps.length > 0 ? exps[i % exps.length] : undefined;
      return {
        id: `b${pad(i + 1)}`,
        number: i + 1,
        question: mock(
          `Tell me about a time you showed ${competency.toLowerCase()}.`,
          `Kể về lần bạn thể hiện ${competency.toLowerCase()}.`,
        ),
        competency,
        star: {
          situation: mock(
            exp ? `At ${exp.company}: ${exp.summary || "context from the profile"}` : "Describe a real situation.",
            "Mô tả tình huống thực tế.",
          ),
          task: mock("What I was responsible for.", "Trách nhiệm của tôi."),
          action: mock(exp?.highlights[0] ?? "The concrete actions I took.", "Các hành động cụ thể."),
          result: mock("Describe the real outcome — no invented metrics.", "Kết quả thực tế — không bịa số liệu."),
        },
        source: exp
          ? {
              company: exp.company,
              kind: "actual" as const,
              note: bi(`Grounded in the ${exp.company} profile entry.`, `Dựa trên kinh nghiệm tại ${exp.company}.`),
            }
          : {
              kind: "theoretical" as const,
              note: bi("Template — fill in with a real story.", "Mẫu — điền câu chuyện thật."),
            },
        memoryShortcut: mock("S-T-A-R in 90 seconds", "S-T-A-R trong 90 giây"),
        followUp: {
          id: "f1",
          question: mock("What would you do differently?", "Bạn sẽ làm khác đi điều gì?"),
          answer: mock("Reflect honestly.", "Tự đánh giá trung thực."),
        },
        cautions: [mock("Do not invent numbers.", "Không bịa số liệu.")],
        difficulty: "medium",
        priority: i < 3 ? "high" : "medium",
      };
    }),
  };
}

function hrSection(): SectionContentMap["hr"] {
  const groups = [
    [
      "technical-architecture",
      "Technical architecture",
      "Kiến trúc kỹ thuật",
      "What does the current frontend architecture look like?",
    ],
    [
      "project-responsibilities",
      "Project responsibilities",
      "Trách nhiệm dự án",
      "What would I own in the first 90 days?",
    ],
    ["engineering-culture", "Engineering culture", "Văn hoá kỹ thuật", "How do you run code reviews?"],
    ["team-structure", "Team structure", "Cấu trúc đội", "How big is the team and who would I work with?"],
    ["career-growth", "Career growth", "Phát triển sự nghiệp", "What does growth look like for seniors?"],
    ["compensation", "Compensation", "Đãi ngộ", "How is compensation reviewed?"],
    ["working-arrangements", "Working arrangements", "Hình thức làm việc", "What is the hybrid policy?"],
    ["interview-process", "Interview process", "Quy trình phỏng vấn", "What are the next interview steps?"],
  ] as const;
  return {
    groups: groups.map(([category, en, vi, q], i) => ({
      category,
      title: bi(en, vi),
      questions: [{ id: `hr-${i + 1}-1`, text: mock(q, q), why: mock("Clarifies expectations.", "Làm rõ kỳ vọng.") }],
    })),
  };
}

function projectSection(ctx: MockGenerationContext): SectionContentMap["project"] {
  const gaps =
    ctx.dependencies.match?.requirements
      .filter((r) => r.matchLevel === "gap" || r.matchLevel === "partial")
      .map((r) => r.requirement.en) ?? [];
  return {
    name: `${MOCK_LABEL} ${ctx.meta.companyName} practice app`,
    objective: mock(
      "Practice the largest gaps in a small, realistic app.",
      "Luyện các điểm còn thiếu qua một ứng dụng nhỏ.",
    ),
    targetGaps: gaps.length > 0 ? gaps.slice(0, 5) : ["Interview readiness"],
    techStack: [{ name: "React + TypeScript", reason: mock("Matches the JD.", "Phù hợp JD.") }],
    architectureDiagram: { kind: "architecture", code: 'flowchart LR\n  UI["React UI"] --> API["Mock API"]' },
    features: [{ id: "f1", title: mock("Core feature", "Tính năng chính"), priority: "high" }],
    implementationChecklist: [{ id: "t1", text: mock("Scaffold the project", "Khởi tạo dự án") }],
    testingRequirements: [mock("Unit tests for core logic", "Unit test cho logic chính")],
    performanceRequirements: [mock("Interactions under 100 ms", "Tương tác dưới 100 ms")],
    learningOutcomes: [mock("Confidence discussing the gap topics", "Tự tin trao đổi các chủ đề còn thiếu")],
  };
}

function studyPlanSection(ctx: MockGenerationContext): SectionContentMap["studyPlan"] {
  const ids = knownItemIds(ctx.dependencies);
  const slice = (from: number, size: number) => ids.slice(from, from + size);
  const plan = (id: "1d" | "3d" | "7d", days: number, en: string, vi: string) => ({
    id,
    title: mock(en, vi),
    days: Array.from({ length: days }, (_, d) => ({
      day: d + 1,
      focus: mock(`Day ${d + 1} focus`, `Trọng tâm ngày ${d + 1}`),
      tasks: [
        {
          id: `${id}-d${d + 1}-t1`,
          title: mock("Review high-priority questions", "Ôn câu hỏi ưu tiên cao"),
          durationMinutes: 60,
          priority: "high" as const,
          relatedItemIds: slice(d * 5, 5),
        },
      ],
    })),
  });
  return {
    plans: [
      plan("1d", 1, "1-day crash course", "Ôn cấp tốc 1 ngày"),
      plan("3d", 3, "3-day plan", "Kế hoạch 3 ngày"),
      plan("7d", 7, "7-day plan", "Kế hoạch 7 ngày"),
    ],
  };
}

function cheatsheetSection(ctx: MockGenerationContext): SectionContentMap["cheatsheet"] {
  const questions = ctx.dependencies.bilingual?.questions ?? [];
  const topicIds = new Set(ctx.dependencies.bilingual?.topics.map((t) => t.id) ?? []);
  const conceptCount = GENERATION_COUNTS.cheatConcepts.min;
  const cardCount = GENERATION_COUNTS.flashcards.min;
  return {
    concepts: Array.from({ length: conceptCount }, (_, i) => {
      const q = questions[i % Math.max(1, questions.length)];
      return {
        id: `c${pad(i + 1)}`,
        title: mock(`Concept ${i + 1}${q ? `: ${q.jdRequirement}` : ""}`, `Khái niệm ${i + 1}`),
        memoryShortcut: mock("Define → trade-off → example", "Định nghĩa → trade-off → ví dụ"),
        takeaway: mock("Connect the concept to user impact.", "Gắn khái niệm với tác động người dùng."),
        priority: q?.priority ?? "medium",
        ...(q && topicIds.has(q.topicId) ? { topicId: q.topicId } : {}),
        relatedItemIds: q ? [q.id] : [],
      };
    }),
    flashcards: Array.from({ length: cardCount }, (_, i) => {
      const q = questions[i % Math.max(1, questions.length)];
      return {
        id: `fc${pad(i + 1)}`,
        ...(q && topicIds.has(q.topicId) ? { topicId: q.topicId, relatedItemId: q.id } : {}),
        front: q ? q.question : mock(`Flashcard ${i + 1}`, `Thẻ ${i + 1}`),
        back: {
          answer: q?.answer ?? `${MOCK_LABEL} Answer ${i + 1}`,
          viExplanation: q?.viExplanation ?? `${MOCK_LABEL} Giải thích ${i + 1}`,
          memoryShortcut: q?.memoryShortcut ?? mock("Shortcut", "Mẹo nhớ"),
        },
        priority: q?.priority ?? "medium",
      };
    }),
  };
}

function mockSection(ctx: MockGenerationContext): SectionContentMap["mock"] {
  const ids = knownItemIds(ctx.dependencies);
  return {
    intro: mock(
      `Mock interview for ${ctx.meta.jobTitle} at ${ctx.meta.companyName}.`,
      `Phỏng vấn thử cho ${ctx.meta.jobTitle} tại ${ctx.meta.companyName}.`,
    ),
    questionPool: ids.length > 0 ? ids.slice(0, 30) : ["placeholder"],
    rubric: [
      { criterion: "technicalAccuracy", description: mock("Correct concepts.", "Khái niệm chính xác.") },
      {
        criterion: "seniorJudgment",
        description: mock("Trade-offs and failure modes.", "Trade-off và tình huống lỗi."),
      },
      { criterion: "communication", description: mock("Clear and structured.", "Rõ ràng, có cấu trúc.") },
      { criterion: "completeness", description: mock("Covers key points.", "Bao quát ý chính.") },
    ],
  };
}

function assessmentSection(ctx: MockGenerationContext): SectionContentMap["assessment"] {
  const gaps = ctx.dependencies.match?.requirements.filter((r) => r.matchLevel === "gap") ?? [];
  return {
    overallMatch: mock(`Mock assessment for ${ctx.meta.jobTitle}.`, `Đánh giá mock cho ${ctx.meta.jobTitle}.`),
    sellingPoints: [
      mock(
        `${ctx.profile.yearsOfExperience}+ years as ${ctx.profile.headline}`,
        `${ctx.profile.yearsOfExperience}+ năm kinh nghiệm`,
      ),
    ],
    knowledgeGaps:
      gaps.length > 0
        ? gaps.slice(0, 5).map((g) => ({ gap: g.requirement, priority: "high" as const }))
        : [
            {
              gap: mock("No major gaps detected by the mock.", "Mock không phát hiện thiếu hụt lớn."),
              priority: "low" as const,
            },
          ],
    interviewPriorities: [mock("Review critical topics first.", "Ôn các chủ đề quan trọng trước.")],
    recommendation: {
      decision: gaps.length > 3 ? "apply-after-prep" : "apply-now",
      rationale: mock("Based on the mock match.", "Dựa trên kết quả match mock."),
    },
    verificationNotes: [mock("All content is mock data.", "Toàn bộ nội dung là dữ liệu mock.")],
    unsupportedClaims: [],
  };
}

type NonBatchedKey = Exclude<keyof SectionContentMap, "bilingual">;

const BUILDERS: { [K in NonBatchedKey]: (ctx: MockGenerationContext) => SectionContentMap[K] } = {
  jd: jdSection,
  company: companySection,
  match: matchSection,
  cv: cvSection,
  intro: introSection,
  email: emailSection,
  systemDesign: systemDesignSection,
  coding: () => codingSection(),
  star: starSection,
  hr: () => hrSection(),
  project: projectSection,
  studyPlan: studyPlanSection,
  cheatsheet: cheatsheetSection,
  mock: mockSection,
  assessment: assessmentSection,
};

export function mockSectionContent<K extends NonBatchedKey>(key: K, ctx: MockGenerationContext): SectionContentMap[K] {
  return BUILDERS[key](ctx);
}
