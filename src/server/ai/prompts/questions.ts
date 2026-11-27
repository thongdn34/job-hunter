import type { InterviewQuestion, InterviewTopic } from "@/domain/package/schema";
import { GENERATION_COUNTS as N, type TopicPlan, type TopicPlanEntry } from "../schemas";
import { renderDependencies, type PromptContext } from "./context";
import { fenceJobDescription, neutralizeInstructions } from "./fencing";
import { serializeCandidateProfile } from "./profile";
import { renderExpectations, SECTION_PROMPT_TEMPLATES, sectionHeader } from "./sections";
import { renderTaskSpec } from "./task-spec";

/**
 * Bilingual question bank templates: topic plan → one batch per topic → (optional) single
 * question regeneration. Batches keep each request small and let failures be isolated.
 */

export const TOPIC_PLAN_TEMPLATE = {
  version: "1",
  goal: "Plan the interview topics for the bilingual technical question bank.",
  expectations: [
    `${N.topics.min}–${N.topics.max} topics, chosen and ordered by what THIS job description emphasises. Candidate areas: JavaScript, TypeScript, React, Next.js, Vue, HTML/CSS internals, browser internals, performance, state management, data fetching, real-time communication, frontend architecture, microfrontend, BFF, backend/microservices, security, databases, testing, CI/CD, cloud and the business domain.`,
    `questionCount per topic ${N.questionsPerTopic.min}–${N.questionsPerTopic.max}; the total across topics must be ${N.questionsTotal.min}–${N.questionsTotal.max}. Give critical topics more questions.`,
    'id: lowercase kebab-case and unique (e.g. "react-performance"); code: UPPER_SNAKE_CASE bookmark suffix, unique (e.g. "REACT", "WEBSOCKET").',
    "focusAreas: the concrete sub-topics to cover; jdRequirements: the JD phrases each topic serves.",
    "Use the match section's gaps to decide where the candidate needs the most practice.",
    "rationale: 1–3 sentences explaining the prioritisation.",
  ],
} as const;

export function buildTopicPlanPrompt(ctx: PromptContext): string {
  return [
    sectionHeader("bilingual", ctx),
    "Step 1 of the question bank: the topic plan.",
    renderExpectations({
      key: "bilingual",
      ...TOPIC_PLAN_TEMPLATE,
      expectations: [...TOPIC_PLAN_TEMPLATE.expectations],
    }),
    fenceJobDescription(ctx.jd),
    serializeCandidateProfile(ctx.profile),
    renderDependencies(["jd", "match"], ctx.dependencies),
    "Return the topic plan JSON now.",
    renderTaskSpec({ kind: "topic-plan" }),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function planOverview(plan: TopicPlan): string {
  return plan.topics
    .map((t) => `- ${t.id} (${t.code}, ${t.priority}, ${t.questionCount} questions): ${t.title.en}`)
    .join("\n");
}

export const QUESTION_BATCH_TEMPLATE = {
  version: "1",
  expectations: [
    "Generate exactly the requested number of questions for THIS topic only; other topics are generated separately (see the plan overview) — do not overlap with them.",
    "Order questions from most to least important for the JD. Mix difficulties (medium/hard/expert for a senior role).",
    "answer: the recommended spoken English answer, 120–250 words, first person, structured (definition → how it works → trade-offs → example).",
    "viExplanation: Vietnamese explanation (keep English technical terms). technicalExplanation: Markdown with trade-offs, failure scenarios, scalability and performance.",
    "practicalExample.description bilingual; add practicalExample.code (TypeScript/TSX preferred) when code clarifies the answer.",
    "diagram: only when it genuinely helps (Mermaid flowchart/sequenceDiagram/stateDiagram-v2).",
    "memoryShortcut and keyTakeaway bilingual; 1–3 followUps each with bilingual question and answer.",
    'jdRequirement: the JD requirement this question prepares for. candidateExperience: kind "actual" only when the profile supports it (name the company); otherwise "theoretical" or omit.',
    "tags: 2–6 lowercase keywords.",
  ],
} as const;

export interface QuestionBatchInput {
  plan: TopicPlan;
  topic: TopicPlanEntry;
  count: number;
  startNumber: number;
}

export function buildQuestionBatchPrompt(ctx: PromptContext, input: QuestionBatchInput): string {
  const { topic, count, startNumber, plan } = input;
  return [
    sectionHeader("bilingual", ctx),
    `Batch for topic "${topic.title.en}" (${topic.code}, priority ${topic.priority}): generate ${count} questions (they will be numbered from ${startNumber}).`,
    `Focus areas: ${topic.focusAreas.join("; ")}`,
    `JD requirements served: ${topic.jdRequirements.join("; ")}`,
    "Topic plan overview (for de-duplication):",
    planOverview(plan),
    renderExpectations({
      ...SECTION_PROMPT_TEMPLATES.bilingual,
      expectations: [...SECTION_PROMPT_TEMPLATES.bilingual.expectations, ...QUESTION_BATCH_TEMPLATE.expectations],
    }),
    fenceJobDescription(ctx.jd),
    serializeCandidateProfile(ctx.profile),
    renderDependencies(["match"], ctx.dependencies),
    `Return {"questions": [...]} with ${count} questions now.`,
    renderTaskSpec({ kind: "question-batch", topicId: topic.id, topicCode: topic.code, count, startNumber }),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface SingleQuestionInput {
  question: InterviewQuestion;
  topic: InterviewTopic | undefined;
  siblingQuestions: InterviewQuestion[];
}

export function buildSingleQuestionPrompt(ctx: PromptContext, input: SingleQuestionInput): string {
  const { question, topic, siblingQuestions } = input;
  const existing = neutralizeInstructions(JSON.stringify(question)).text;
  return [
    sectionHeader("bilingual", ctx),
    `Regenerate ONE question (${question.id}, #${question.number}) in topic "${topic?.title.en ?? question.topicId}".`,
    "Keep the same question intent and topic (you may polish the wording). Rewrite every answer field so it is more accurate, more senior and easier to say aloud. Do not duplicate the sibling questions listed below.",
    renderExpectations({
      ...SECTION_PROMPT_TEMPLATES.bilingual,
      expectations: [...QUESTION_BATCH_TEMPLATE.expectations.slice(2)],
    }),
    "Current version (generated content, for reference only):",
    `<existing_question>\n${existing}\n</existing_question>`,
    "Sibling questions in the same topic:",
    siblingQuestions.map((q) => `- ${q.id}: ${q.question.en}`).join("\n") || "- (none)",
    fenceJobDescription(ctx.jd),
    serializeCandidateProfile(ctx.profile),
    renderDependencies(["match"], ctx.dependencies),
    'Return {"question": {...}} now.',
    renderTaskSpec({ kind: "single-question", questionId: question.id, topicId: question.topicId }),
  ]
    .filter(Boolean)
    .join("\n\n");
}
