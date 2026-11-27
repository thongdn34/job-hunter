import { z } from "zod";
import { SECTION_KEYS } from "@/domain/package/sections";
import { SectionStatusSchema } from "@/domain/package/schema";

export const SectionKeySchema = z.enum(SECTION_KEYS);

export const GENERATION_JOB_STATUSES = ["queued", "running", "succeeded", "partial", "failed", "cancelled"] as const;
export const GenerationJobStatusSchema = z.enum(GENERATION_JOB_STATUSES);
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;

export const SectionProgressSchema = z.object({
  status: z.union([SectionStatusSchema, z.literal("skipped"), z.literal("cancelled")]),
  error: z.string().optional(),
  attempts: z.number().int().min(0).optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});
export type SectionProgress = z.infer<typeof SectionProgressSchema>;

/** Wire format for GET /api/generation-jobs/[id] and /api/packages/[slug]/jobs/latest. */
export const GenerationJobDtoSchema = z.object({
  id: z.string(),
  packageSlug: z.string(),
  status: GenerationJobStatusSchema,
  sections: z.array(SectionKeySchema),
  progress: z.partialRecord(SectionKeySchema, SectionProgressSchema),
  provider: z.string().optional(),
  model: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});
export type GenerationJobDto = z.infer<typeof GenerationJobDtoSchema>;

/** POST /api/packages request body. `jd` comes from /api/jd/extract or manual paste normalization. */
export const CreatePackageRequestSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(160).optional(),
  sourceUrl: z.string().url().optional(),
  rawText: z.string().trim().min(80).max(60_000).optional(),
});
export type CreatePackageRequest = z.infer<typeof CreatePackageRequestSchema>;

/** Public AI configuration status (never includes secrets). */
export const AiStatusSchema = z.object({
  provider: z.enum(["openai", "anthropic", "openai-compatible", "mock", "none"]),
  model: z.string().optional(),
  configured: z.boolean(),
  availableProviders: z.array(z.object({ id: z.string(), configured: z.boolean(), defaultModel: z.string() })),
});
export type AiStatus = z.infer<typeof AiStatusSchema>;
