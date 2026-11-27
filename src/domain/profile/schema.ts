import { z } from "zod";

export const SKILL_CATEGORIES = [
  "frontend",
  "backend",
  "database",
  "architecture",
  "devops",
  "testing",
  "other",
] as const;
export const SkillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const TechnicalSkillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  category: SkillCategorySchema,
  /** "production" = used at work; "familiar" = side projects / learning. Never inflate. */
  proficiency: z.enum(["production", "familiar"]).default("production"),
});
export type TechnicalSkill = z.infer<typeof TechnicalSkillSchema>;

export const WorkExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1).max(120),
  role: z.string().max(120).default(""),
  /** Free-form, e.g. "2022 – 2024". Left empty when unknown — never invented. */
  period: z.string().max(60).default(""),
  summary: z.string().max(2000).default(""),
  highlights: z.array(z.string().min(1).max(400)).default([]),
  technologies: z.array(z.string().min(1).max(60)).default([]),
  /** Excluded experiences (e.g. Elfie) are never used in generated intros/answers. */
  includeInGeneration: z.boolean().default(true),
  order: z.number().int().default(0),
});
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

export const CandidateProfileSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().max(120).default(""),
  headline: z.string().min(1).max(160),
  yearsOfExperience: z.number().int().min(0).max(60),
  location: z.string().max(120),
  targetRoles: z.array(z.string().min(1)).min(1),
  workingArrangement: z.enum(["onsite", "hybrid", "remote", "flexible"]),
  summary: z.string().max(3000).default(""),
  skills: z.array(TechnicalSkillSchema),
  experiences: z.array(WorkExperienceSchema),
  /** Extracted plain text from the uploaded CV, used as additional grounding. */
  cvText: z.string().max(100_000).optional(),
  cvFileName: z.string().optional(),
  /** ISO-8601 timestamp (as produced by Date#toISOString); anything else is rejected with a 400. */
  cvUploadedAt: z.iso.datetime({ offset: true }).optional(),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type CandidateProfileInput = z.input<typeof CandidateProfileSchema>;

/** Returns only the experiences allowed in generated content. */
export function generationExperiences(profile: CandidateProfile): WorkExperience[] {
  return profile.experiences.filter((e) => e.includeInGeneration);
}
