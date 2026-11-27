import { z } from "zod";

/**
 * Shared primitive schemas used across all domain modules.
 * These are the single source of truth for both seeded content and
 * AI-generated structured outputs.
 */

/** A piece of text provided in both English and Vietnamese. */
export const BilingualSchema = z.object({
  en: z.string().min(1),
  vi: z.string().min(1),
});
export type Bilingual = z.infer<typeof BilingualSchema>;

export const LANGUAGE_MODES = ["en", "vi", "bilingual"] as const;
export const LanguageModeSchema = z.enum(LANGUAGE_MODES);
export type LanguageMode = z.infer<typeof LanguageModeSchema>;

export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const PrioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * verified   – confirmed from a cited source (JD page, company site).
 * unverified – stated somewhere but could not be confirmed by the generator.
 * assumption – inferred by the generator; must be confirmed with the recruiter.
 */
export const VERIFICATION_STATUSES = ["verified", "unverified", "assumption"] as const;
export const VerificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

/** A claim with an explicit verification status. */
export const FactSchema = z.object({
  text: BilingualSchema,
  status: VerificationStatusSchema,
  sourceUrl: z.string().url().optional(),
  note: z.string().optional(),
});
export type Fact = z.infer<typeof FactSchema>;

export const CodeBlockSchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
  caption: z.string().optional(),
});
export type CodeBlock = z.infer<typeof CodeBlockSchema>;

export const DIAGRAM_KINDS = ["flowchart", "sequence", "state", "class", "architecture", "other"] as const;
/** Mermaid source. Rendered lazily and sanitized (securityLevel=strict). */
export const DiagramSchema = z.object({
  kind: z.enum(DIAGRAM_KINDS),
  code: z.string().min(1),
  caption: BilingualSchema.optional(),
});
export type Diagram = z.infer<typeof DiagramSchema>;

/** Interviewer follow-up with a bilingual answer. */
export const FollowUpSchema = z.object({
  id: z.string().min(1),
  question: BilingualSchema,
  answer: BilingualSchema,
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

/** Whether an experience reference is real production experience or theoretical knowledge. */
export const EXPERIENCE_KINDS = ["actual", "theoretical", "recommended-approach"] as const;
export const ExperienceRefSchema = z.object({
  company: z.string().optional(),
  kind: z.enum(EXPERIENCE_KINDS),
  note: BilingualSchema,
});
export type ExperienceRef = z.infer<typeof ExperienceRefSchema>;
