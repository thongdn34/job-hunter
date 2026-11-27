import { describe, expect, it } from "vitest";
import type { NormalizedJd } from "@/domain/jd/schema";
import { SECTION_KEYS } from "@/domain/package/sections";
import type { SectionContentMap } from "@/domain/package/schema";
import { defaultProfile } from "@/content/profile/default-profile";
import { questionBatchSchema, SectionGenerationSchemas, TopicPlanSchema } from "../schemas";
import {
  MOCK_LABEL,
  mockQuestionBatch,
  mockSectionContent,
  mockSingleQuestion,
  mockTopicPlan,
  type MockGenerationContext,
} from "./content";
import { mockOptionsFromEnv } from "./model";
import { detectSkills, pickTopics } from "./keywords";

const jd: NormalizedJd = {
  companyName: "Acme",
  jobTitle: "Senior Frontend Engineer",
  origin: "manual",
  text: "We need React, TypeScript and WebSocket experience for real-time dashboards. Testing with Playwright.",
  sections: [],
  extractedAt: "2026-11-01T00:00:00.000Z",
  warnings: [],
};

function context(): MockGenerationContext {
  return {
    meta: { companyName: "Acme", companyCode: "ACME", jobTitle: jd.jobTitle },
    jd,
    profile: defaultProfile,
    dependencies: {},
  };
}

describe("mock content", () => {
  it("is deterministic and keyword-driven", () => {
    expect(detectSkills(jd)).toEqual(expect.arrayContaining(["React", "TypeScript", "WebSocket", "Playwright"]));
    expect(pickTopics(jd).map((t) => t.id)).toContain("realtime");
    expect(mockTopicPlan(context())).toEqual(mockTopicPlan(context()));
  });

  it("produces schema-valid content for every section (with generation counts)", () => {
    const ctx = context();
    const plan = TopicPlanSchema.parse(mockTopicPlan(ctx));
    ctx.topicPlan = plan;
    // Build the question bank the way the pipeline would, so dependent sections have ids.
    let n = 0;
    const questions = plan.topics.flatMap((t) =>
      questionBatchSchema(t.questionCount)
        .parse(mockQuestionBatch(ctx, t.id, t.questionCount))
        .questions.map((q) => {
          n += 1;
          const id = `acme-q${n}`;
          return {
            ...q,
            id,
            number: n,
            topicId: t.id,
            followUps: q.followUps.map((f, i) => ({ ...f, id: `${id}-f${i}` })),
          };
        }),
    );
    const deps = ctx.dependencies as Record<string, unknown>;
    deps.bilingual = {
      topics: plan.topics.map((t) => ({ id: t.id, code: t.code, title: t.title, priority: t.priority })),
      questions,
    } satisfies SectionContentMap["bilingual"];

    for (const key of SECTION_KEYS) {
      if (key === "bilingual") continue;
      const content = mockSectionContent(key, ctx);
      const result = SectionGenerationSchemas[key].safeParse(content);
      expect(result.success, `${key}: ${result.success ? "" : JSON.stringify(result.error.issues.slice(0, 3))}`).toBe(
        true,
      );
      deps[key] = content;
    }
    expect(JSON.stringify(deps.jd)).toContain(MOCK_LABEL);
  });

  it("regenerates a single question keeping the original question text", () => {
    const ctx = context();
    ctx.topicPlan = mockTopicPlan(ctx);
    const topic = ctx.topicPlan.topics[0];
    const draft = mockQuestionBatch(ctx, topic.id, 1).questions[0];
    const existing = {
      ...draft,
      id: "acme-q01",
      number: 1,
      topicId: topic.id,
      followUps: draft.followUps.map((f, i) => ({ ...f, id: `f${i}` })),
    };
    (ctx.dependencies as Record<string, unknown>).bilingual = {
      topics: [{ id: topic.id, code: topic.code, title: topic.title, priority: topic.priority }],
      questions: [existing],
    };
    const { question } = mockSingleQuestion(ctx, "acme-q01", topic.id);
    expect(question.question).toEqual(existing.question);
    expect(question.answer).toContain("regenerated");
  });

  it("parses failure injection targets from env", () => {
    expect(
      mockOptionsFromEnv({
        MOCK_FAIL_SECTIONS: "company, coding,bogus",
        MOCK_RATE_LIMIT_ONCE_SECTIONS: "topic-plan",
        MOCK_DELAY_MS: "25",
      }),
    ).toEqual({
      failSections: ["company", "coding"],
      malformedOnceSections: [],
      rateLimitOnceSections: ["topic-plan"],
      delayMs: 25,
    });
  });
});
