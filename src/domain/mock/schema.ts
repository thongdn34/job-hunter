import { z } from "zod";
import { BilingualSchema } from "@/domain/common/schema";

export const MOCK_CRITERIA = ["technicalAccuracy", "seniorJudgment", "communication", "completeness"] as const;
export type MockCriterion = (typeof MOCK_CRITERIA)[number];

const score = z.number().min(0).max(10);

/** Evaluation output (heuristic or AI). Validated before persistence. */
export const MockEvaluationSchema = z.object({
  scores: z.object({
    technicalAccuracy: score,
    seniorJudgment: score,
    communication: score,
    completeness: score,
  }),
  /** Overall score out of 10, one decimal. */
  overall: score,
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  improvedAnswer: z.string().min(1),
  feedbackVi: z.string().min(1),
  followUpQuestion: BilingualSchema,
  evaluator: z.enum(["heuristic", "ai"]),
});
export type MockEvaluation = z.infer<typeof MockEvaluationSchema>;

export const MockAnswerInputSchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  answer: z.string().trim().min(1, "Answer cannot be empty").max(10_000),
  revealedBeforeSubmit: z.boolean().default(false),
});
export type MockAnswerInput = z.infer<typeof MockAnswerInputSchema>;
