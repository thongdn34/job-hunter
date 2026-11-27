import { z } from "zod";
import { BilingualSchema, FollowUpSchema, PrioritySchema } from "@/domain/common/schema";
import {
  BehavioralQuestionSchema,
  BehavioralSectionSchema,
  CheatConceptSchema,
  CheatsheetSectionSchema,
  CodingExerciseSchema,
  CodingSectionSchema,
  FlashcardSchema,
  InterviewQuestionSchema,
  SectionContentSchemas,
  SystemDesignScenarioSchema,
  SystemDesignSectionSchema,
} from "@/domain/package/schema";
import type { SectionKey } from "@/domain/package/sections";

/**
 * Generation-time schemas. They wrap the domain schemas (the single source of truth)
 * with the explicit counts from docs/REQUIREMENTS.md §5 so the model receives them as
 * JSON-schema `minItems`/`maxItems`, and add the intermediate shapes used by the
 * pipeline (topic plan, per-topic question batches).
 */

/* ------------------------------------------------------------------ */
/* Counts (REQUIREMENTS §5)                                             */
/* ------------------------------------------------------------------ */

export const GENERATION_COUNTS = {
  questionsTotal: { min: 40, max: 60 },
  topics: { min: 4, max: 10 },
  questionsPerTopic: { min: 3, max: 12 },
  systemDesignScenarios: { min: 3, max: 5 },
  codingExercises: { min: 5, max: 10 },
  behavioralQuestions: { min: 6, max: 10 },
  cheatConcepts: { min: 20, max: 30 },
  flashcards: { min: 24, max: 40 },
} as const;

/* ------------------------------------------------------------------ */
/* Topic plan                                                           */
/* ------------------------------------------------------------------ */

export const TopicPlanEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Topic id must be lowercase kebab-case")
    .describe("Stable kebab-case topic id, e.g. 'react-performance'"),
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_]+$/, "Topic code must be UPPER_SNAKE_CASE")
    .describe("Bookmark suffix, e.g. 'REACT' -> BOOKMARK_<COMPANY>_REACT"),
  title: BilingualSchema,
  description: BilingualSchema,
  priority: PrioritySchema,
  questionCount: z
    .number()
    .int()
    .min(GENERATION_COUNTS.questionsPerTopic.min)
    .max(GENERATION_COUNTS.questionsPerTopic.max),
  focusAreas: z.array(z.string().min(1)).min(1).max(8),
  jdRequirements: z.array(z.string().min(1)).min(1).max(8),
});
export type TopicPlanEntry = z.infer<typeof TopicPlanEntrySchema>;

export const TopicPlanSchema = z.object({
  topics: z.array(TopicPlanEntrySchema).min(GENERATION_COUNTS.topics.min).max(GENERATION_COUNTS.topics.max),
  rationale: z.string().min(1),
});
export type TopicPlan = z.infer<typeof TopicPlanSchema>;

/* ------------------------------------------------------------------ */
/* Question batches (bilingual section is generated per topic)          */
/* ------------------------------------------------------------------ */

/** A question as produced by the model; ids/numbers/topic are assigned by the pipeline. */
export const QuestionDraftSchema = InterviewQuestionSchema.omit({
  id: true,
  number: true,
  topicId: true,
  followUps: true,
}).extend({
  followUps: z
    .array(FollowUpSchema.omit({ id: true }))
    .min(1)
    .max(3),
});
export type QuestionDraft = z.infer<typeof QuestionDraftSchema>;

export function questionBatchSchema(count: number) {
  return z.object({
    questions: z
      .array(QuestionDraftSchema)
      .min(Math.max(1, count - 1))
      .max(count + 1),
  });
}
export type QuestionBatch = z.infer<ReturnType<typeof questionBatchSchema>>;

export const SingleQuestionSchema = z.object({ question: QuestionDraftSchema });

/* ------------------------------------------------------------------ */
/* Section schemas with counts                                          */
/* ------------------------------------------------------------------ */

const c = GENERATION_COUNTS;

export const SectionGenerationSchemas = {
  ...SectionContentSchemas,
  systemDesign: SystemDesignSectionSchema.extend({
    scenarios: z.array(SystemDesignScenarioSchema).min(c.systemDesignScenarios.min).max(c.systemDesignScenarios.max),
  }),
  coding: CodingSectionSchema.extend({
    exercises: z.array(CodingExerciseSchema).min(c.codingExercises.min).max(c.codingExercises.max),
  }),
  star: BehavioralSectionSchema.extend({
    questions: z.array(BehavioralQuestionSchema).min(c.behavioralQuestions.min).max(c.behavioralQuestions.max),
  }),
  cheatsheet: CheatsheetSectionSchema.extend({
    concepts: z.array(CheatConceptSchema).min(c.cheatConcepts.min).max(c.cheatConcepts.max),
    flashcards: z.array(FlashcardSchema).min(c.flashcards.min).max(c.flashcards.max),
  }),
} as const;

/** Schema the model is asked to produce for a (non-batched) section. */
export function sectionGenerationSchema(key: Exclude<SectionKey, "bilingual">) {
  return SectionGenerationSchemas[key];
}
