import { z } from "zod";
import {
  CandidateProfileSchema,
  SkillCategorySchema,
  type CandidateProfile,
  type TechnicalSkill,
  type WorkExperience,
} from "./schema";
import { CV_MAX_CHARS, sanitizeCvFileName, truncateCvText } from "./cv";

/**
 * Pure mapping between persisted rows (CandidateProfile / WorkExperience / TechnicalSkill tables)
 * and the domain `CandidateProfile`. Row shapes are structural so this module stays free of Prisma.
 */

/** Primary key used when the single local profile is created. */
export const LOCAL_PROFILE_ID = "local-profile";

export interface ProfileRow {
  id: string;
  fullName: string;
  headline: string;
  yearsOfExperience: number;
  location: string;
  /** Json column: string[] */
  targetRoles: unknown;
  workingArrangement: string;
  summary: string;
  cvText: string | null;
  cvFileName: string | null;
  cvUploadedAt: Date | null;
}

export interface ExperienceRow {
  id: string;
  company: string;
  role: string;
  period: string;
  summary: string;
  /** Json column: string[] */
  highlights: unknown;
  /** Json column: string[] */
  technologies: unknown;
  includeInGeneration: boolean;
  order: number;
}

export interface SkillRow {
  id: string;
  name: string;
  category: string;
  proficiency: string;
  createdAt: Date;
}

/** Scalar columns written for the profile row (CV columns are handled separately). */
export interface ProfileRowData {
  fullName: string;
  headline: string;
  yearsOfExperience: number;
  location: string;
  targetRoles: string[];
  workingArrangement: CandidateProfile["workingArrangement"];
  summary: string;
}

export interface ExperienceRowData {
  id?: string;
  company: string;
  role: string;
  period: string;
  summary: string;
  highlights: string[];
  technologies: string[];
  includeInGeneration: boolean;
  order: number;
}

export interface SkillRowData {
  id?: string;
  name: string;
  category: TechnicalSkill["category"];
  proficiency: TechnicalSkill["proficiency"];
  createdAt: Date;
}

export interface CvRowData {
  cvText: string | null;
  cvFileName: string | null;
  cvUploadedAt: Date | null;
}

const WorkingArrangementSchema = CandidateProfileSchema.shape.workingArrangement;
const ProficiencySchema = z.enum(["production", "familiar"]);

/** Reads a Json column expected to hold string[]; tolerates corrupted values. */
export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Trims, drops blanks and removes case-insensitive duplicates (first occurrence wins). */
export function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rows -> domain
// ---------------------------------------------------------------------------

export function experienceFromRow(row: ExperienceRow, order: number): WorkExperience {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    period: row.period,
    summary: row.summary,
    highlights: toStringArray(row.highlights),
    technologies: toStringArray(row.technologies),
    includeInGeneration: row.includeInGeneration,
    order,
  };
}

export function skillFromRow(row: SkillRow): TechnicalSkill {
  return {
    id: row.id,
    name: row.name,
    category: SkillCategorySchema.catch("other").parse(row.category),
    // Unknown proficiency is reported conservatively — never inflate.
    proficiency: ProficiencySchema.catch("familiar").parse(row.proficiency),
  };
}

/**
 * Assembles the domain profile. Experiences are ordered by `order` (ties keep row order) and
 * re-indexed 0..n-1; skills are ordered by insertion time (`createdAt`).
 */
export function profileFromRows(
  profile: ProfileRow,
  experiences: readonly ExperienceRow[],
  skills: readonly SkillRow[],
): CandidateProfile {
  const sortedExperiences = experiences
    .map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.order - b.row.order || a.index - b.index)
    .map(({ row }, order) => experienceFromRow(row, order));

  const sortedSkills = skills
    .map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.createdAt.getTime() - b.row.createdAt.getTime() || a.index - b.index)
    .map(({ row }) => skillFromRow(row));

  const result: CandidateProfile = {
    id: profile.id,
    fullName: profile.fullName,
    headline: profile.headline,
    yearsOfExperience: profile.yearsOfExperience,
    location: profile.location,
    targetRoles: toStringArray(profile.targetRoles),
    workingArrangement: WorkingArrangementSchema.catch("flexible").parse(profile.workingArrangement),
    summary: profile.summary,
    skills: sortedSkills,
    experiences: sortedExperiences,
  };
  if (profile.cvText != null) result.cvText = profile.cvText;
  if (profile.cvFileName != null) result.cvFileName = profile.cvFileName;
  if (profile.cvUploadedAt != null) result.cvUploadedAt = profile.cvUploadedAt.toISOString();
  return result;
}

// ---------------------------------------------------------------------------
// Domain -> rows
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Keeps client-supplied ids only when well-formed and unique within the list. */
function stableIds<T extends { id?: string }>(items: readonly T[]): (string | undefined)[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const id = item.id;
    if (!id || !ID_PATTERN.test(id) || seen.has(id)) return undefined;
    seen.add(id);
    return id;
  });
}

export function profileToRowData(profile: CandidateProfile): ProfileRowData {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    yearsOfExperience: profile.yearsOfExperience,
    location: profile.location,
    targetRoles: [...profile.targetRoles],
    workingArrangement: profile.workingArrangement,
    summary: profile.summary,
  };
}

/** The array position is the source of truth for ordering; `order` is rewritten to the index. */
export function experiencesToRowData(experiences: readonly WorkExperience[]): ExperienceRowData[] {
  const ids = stableIds(experiences);
  return experiences.map((e, index) => {
    const row: ExperienceRowData = {
      company: e.company,
      role: e.role,
      period: e.period,
      summary: e.summary,
      highlights: [...e.highlights],
      technologies: [...e.technologies],
      includeInGeneration: e.includeInGeneration,
      order: index,
    };
    if (ids[index]) row.id = ids[index];
    return row;
  });
}

/**
 * Skills keep their array order via strictly increasing `createdAt` values (the table has no
 * order column). Duplicate names (case-insensitive) are dropped to respect @@unique([profileId, name]).
 */
export function skillsToRowData(skills: readonly TechnicalSkill[], base: Date = new Date()): SkillRowData[] {
  const seen = new Set<string>();
  const unique = skills.filter((s) => {
    const key = s.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ids = stableIds(unique);
  const start = base.getTime();
  return unique.map((s, index) => {
    const row: SkillRowData = {
      name: s.name.trim(),
      category: s.category,
      proficiency: s.proficiency,
      createdAt: new Date(start + index),
    };
    if (ids[index]) row.id = ids[index];
    return row;
  });
}

/**
 * Converts a client-supplied CV upload timestamp to a Date. Missing or unparseable values fall
 * back to `now` so an Invalid Date never reaches Prisma (the schema already rejects non-ISO input).
 */
export function parseUploadedAt(value: string | undefined, now: Date = new Date()): Date {
  if (!value) return now;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? now : new Date(ms);
}

/** CV columns for an uploaded CV (text normalized by the caller, capped here). */
export function cvToRowData(input: { fileName: string; text: string }, uploadedAt: Date = new Date()): CvRowData {
  return {
    cvText: truncateCvText(input.text, CV_MAX_CHARS).text,
    cvFileName: sanitizeCvFileName(input.fileName),
    cvUploadedAt: uploadedAt,
  };
}

export const EMPTY_CV_ROW_DATA: CvRowData = { cvText: null, cvFileName: null, cvUploadedAt: null };

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/** Trims text, removes blank/duplicate list entries and drops duplicate skills. */
export function sanitizeProfile(profile: CandidateProfile): CandidateProfile {
  const seenSkills = new Set<string>();
  const skills: TechnicalSkill[] = [];
  for (const s of profile.skills) {
    const name = s.name.trim();
    const key = name.toLowerCase();
    if (!name || seenSkills.has(key)) continue;
    seenSkills.add(key);
    skills.push({ ...s, name });
  }

  const result: CandidateProfile = {
    ...profile,
    fullName: profile.fullName.trim(),
    headline: profile.headline.trim(),
    location: profile.location.trim(),
    summary: profile.summary.trim(),
    targetRoles: uniqueStrings(profile.targetRoles),
    skills,
    experiences: profile.experiences.map((e, index) => ({
      ...e,
      company: e.company.trim(),
      role: e.role.trim(),
      period: e.period.trim(),
      summary: e.summary.trim(),
      highlights: e.highlights.map((h) => h.trim()).filter(Boolean),
      technologies: uniqueStrings(e.technologies),
      order: index,
    })),
  };
  return result;
}

/**
 * Validates an untrusted profile payload: schema check, sanitization, then a re-check so that
 * values which only become invalid after trimming (e.g. a whitespace-only headline) are rejected.
 */
export const ProfileInputSchema = CandidateProfileSchema.transform((profile, ctx) => {
  const result = CandidateProfileSchema.safeParse(sanitizeProfile(profile));
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
  }
  return z.NEVER;
});
