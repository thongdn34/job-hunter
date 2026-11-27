import { z } from "zod";
import { SkillCategorySchema, type CandidateProfile, type SkillCategory } from "./schema";

/**
 * Editor-facing schema for the profile form. Mirrors CandidateProfileSchema's limits with
 * user-friendly messages and no defaults/transforms (so form input and output types match).
 * CV fields are managed separately (upload endpoint) and are not part of the form.
 */

export const WORKING_ARRANGEMENTS = ["onsite", "hybrid", "remote", "flexible"] as const;
export const WORKING_ARRANGEMENT_LABELS: Record<(typeof WORKING_ARRANGEMENTS)[number], string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Databases",
  architecture: "Architecture",
  devops: "DevOps & tooling",
  testing: "Testing",
  other: "Other",
};

export const PROFICIENCY_LABELS = {
  production: "Production",
  familiar: "Familiar",
} as const;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const SkillFormSchema = z.object({
  id: z.string().optional(),
  name: requiredText("Skill name", 80),
  category: SkillCategorySchema,
  proficiency: z.enum(["production", "familiar"]),
});

export const ExperienceFormSchema = z.object({
  id: z.string().optional(),
  company: requiredText("Company", 120),
  role: optionalText("Role", 120),
  period: optionalText("Period", 60),
  summary: optionalText("Summary", 2000),
  /** Blank highlights are allowed while editing and dropped on save. */
  highlights: z.array(z.string().max(400, "Highlights must be at most 400 characters")),
  technologies: z.array(z.string().trim().min(1).max(60, "Technology names must be at most 60 characters")),
  includeInGeneration: z.boolean(),
});

export const ProfileFormSchema = z.object({
  fullName: optionalText("Full name", 120),
  headline: requiredText("Headline", 160),
  yearsOfExperience: z
    .number({ error: "Enter your years of experience" })
    .int("Use whole years")
    .min(0, "Years must be 0 or more")
    .max(60, "Years must be 60 or less"),
  location: optionalText("Location", 120),
  targetRoles: z
    .array(z.string().trim().min(1).max(120, "Target roles must be at most 120 characters"))
    .min(1, "Add at least one target role"),
  workingArrangement: z.enum(WORKING_ARRANGEMENTS, { error: "Choose a working arrangement" }),
  summary: optionalText("Summary", 3000),
  skills: z.array(SkillFormSchema),
  experiences: z.array(ExperienceFormSchema),
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
export type ExperienceFormValues = z.infer<typeof ExperienceFormSchema>;
export type SkillFormValues = z.infer<typeof SkillFormSchema>;

export function emptyExperience(): ExperienceFormValues {
  return {
    company: "",
    role: "",
    period: "",
    summary: "",
    highlights: [],
    technologies: [],
    includeInGeneration: true,
  };
}

export function profileToFormValues(profile: CandidateProfile): ProfileFormValues {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    yearsOfExperience: profile.yearsOfExperience,
    location: profile.location,
    targetRoles: [...profile.targetRoles],
    workingArrangement: profile.workingArrangement,
    summary: profile.summary,
    skills: profile.skills.map((s) => {
      const skill: SkillFormValues = { name: s.name, category: s.category, proficiency: s.proficiency };
      if (s.id) skill.id = s.id;
      return skill;
    }),
    experiences: [...profile.experiences]
      .sort((a, b) => a.order - b.order)
      .map((e) => {
        const exp: ExperienceFormValues = {
          company: e.company,
          role: e.role,
          period: e.period,
          summary: e.summary,
          highlights: [...e.highlights],
          technologies: [...e.technologies],
          includeInGeneration: e.includeInGeneration,
        };
        if (e.id) exp.id = e.id;
        return exp;
      }),
  };
}

/** Payload sent to PUT /api/profile. CV fields are intentionally omitted (they are preserved server-side). */
export type ProfilePayload = Omit<CandidateProfile, "cvText" | "cvFileName" | "cvUploadedAt" | "id">;

export function formValuesToPayload(values: ProfileFormValues): ProfilePayload {
  return {
    fullName: values.fullName.trim(),
    headline: values.headline.trim(),
    yearsOfExperience: values.yearsOfExperience,
    location: values.location.trim(),
    targetRoles: values.targetRoles.map((r) => r.trim()).filter(Boolean),
    workingArrangement: values.workingArrangement,
    summary: values.summary.trim(),
    skills: values.skills.map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      name: s.name.trim(),
      category: s.category,
      proficiency: s.proficiency,
    })),
    experiences: values.experiences.map((e, index) => ({
      ...(e.id ? { id: e.id } : {}),
      company: e.company.trim(),
      role: e.role.trim(),
      period: e.period.trim(),
      summary: e.summary.trim(),
      highlights: e.highlights.map((h) => h.trim()).filter(Boolean),
      technologies: e.technologies.map((t) => t.trim()).filter(Boolean),
      includeInGeneration: e.includeInGeneration,
      order: index,
    })),
  };
}
