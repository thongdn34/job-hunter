import { z } from "zod";
import { MockAnswerInputSchema, MockEvaluationSchema } from "./schema";

/**
 * Wire formats for /api/mock/**. Shared by the route handlers (validation of request bodies)
 * and the client (validation of responses).
 */

const slug = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, "Invalid package slug");

export const CreateMockSessionBodySchema = z.object({ packageSlug: slug });
export type CreateMockSessionBody = z.infer<typeof CreateMockSessionBodySchema>;

export const ListMockSessionsQuerySchema = z.object({ packageSlug: slug });

export const AddMockAnswerBodySchema = MockAnswerInputSchema.omit({ sessionId: true });
export type AddMockAnswerBody = z.infer<typeof AddMockAnswerBodySchema>;

export const MockSessionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid session id");

export const MOCK_SESSION_STATUSES = ["active", "completed"] as const;

export const MockSessionDtoSchema = z.object({
  id: z.string(),
  packageSlug: z.string(),
  status: z.enum(MOCK_SESSION_STATUSES),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  averageScore: z.number().nullable(),
  answerCount: z.number().int().min(0),
});
export type MockSessionDto = z.infer<typeof MockSessionDtoSchema>;

export const MockAnswerDtoSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  itemId: z.string(),
  answer: z.string(),
  revealedBeforeSubmit: z.boolean(),
  overall: z.number(),
  evaluation: MockEvaluationSchema,
  createdAt: z.string(),
});
export type MockAnswerDto = z.infer<typeof MockAnswerDtoSchema>;

export const MockSessionResponseSchema = z.object({ session: MockSessionDtoSchema });
export const MockSessionListResponseSchema = z.object({
  sessions: z.array(
    MockSessionDtoSchema.pick({
      id: true,
      startedAt: true,
      completedAt: true,
      averageScore: true,
      answerCount: true,
    }).extend({
      status: z.enum(MOCK_SESSION_STATUSES).optional(),
    }),
  ),
});
export type MockSessionListItem = z.infer<typeof MockSessionListResponseSchema>["sessions"][number];
export const MockSessionDetailResponseSchema = z.object({
  session: MockSessionDtoSchema,
  answers: z.array(MockAnswerDtoSchema),
});
export type MockSessionDetail = z.infer<typeof MockSessionDetailResponseSchema>;
export const MockAnswerResponseSchema = z.object({ answer: MockAnswerDtoSchema, evaluation: MockEvaluationSchema });
export type MockAnswerResponse = z.infer<typeof MockAnswerResponseSchema>;

export const ApiErrorSchema = z.object({ error: z.string(), issues: z.array(z.unknown()).optional() });
