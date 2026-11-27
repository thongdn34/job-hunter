import type { z } from "zod";
import type { FollowUp } from "@/domain/common/schema";
import type { NormalizedJd } from "@/domain/jd/schema";
import { toCompanyCode } from "@/domain/package/bookmarks";
import {
  PackageMetaSchema,
  SectionContentSchemas,
  SectionStateSchema,
  SectionStatusSchema,
  type BehavioralQuestion,
  type CodingExercise,
  type Flashcard,
  type InterviewPackage,
  type InterviewQuestion,
  type InterviewTopic,
  type PackageMeta,
  type PackageSummary,
  type QuestionBank,
  type SectionContentMap,
  type SectionState,
  type StudyPlan,
  type SystemDesignScenario,
} from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { InvalidSectionContentError, QuestionNotFoundError } from "./repository-errors";

/**
 * Pure mapping / assembly helpers for the package repository. No Prisma client, no I/O:
 * everything here is unit-tested without a database (package-mapper.test.ts).
 */

/* ------------------------------------------------------------------ */
/* Slugs + company codes                                               */
/* ------------------------------------------------------------------ */

const MAX_SLUG_BASE_LENGTH = 80;

/** "ISB Vietnam" + "Senior Front-End Developer" -> "isb-vietnam-senior-front-end-developer". */
export function slugifyText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPackageSlugBase(companyName: string, jobTitle: string): string {
  let base = slugifyText(`${companyName} ${jobTitle}`);
  if (base.length > MAX_SLUG_BASE_LENGTH) {
    base = base.slice(0, MAX_SLUG_BASE_LENGTH);
    const lastDash = base.lastIndexOf("-");
    if (lastDash > MAX_SLUG_BASE_LENGTH / 2) base = base.slice(0, lastDash);
    base = base.replace(/-+$/g, "");
  }
  return base || "package";
}

export const MAX_COMPANY_CODE_LENGTH = 60;
export const MAX_JOB_TITLE_LENGTH = 160;

/**
 * Company code capped at MAX_COMPANY_CODE_LENGTH. Long legal names (e.g. "Công ty TNHH ... Chi
 * nhánh Hồ Chí Minh") are accepted up to 120 characters, so their derived code is truncated here
 * instead of failing validation after the JD was already fetched.
 */
export function clampCompanyCode(input: string): string {
  const code = toCompanyCode(input).slice(0, MAX_COMPANY_CODE_LENGTH).replace(/_+$/, "");
  return code || "COMPANY";
}

/** Truncates text to `max` characters, preferring a word boundary and ending with "…". */
export function truncateText(input: string, max: number): string {
  const text = input.trim();
  if (text.length <= max) return text;
  let cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max / 2) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}

/** Returns `base`, or `base-2`, `base-3`, ... — the first one not in `taken`. */
export function pickUniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function isSameCompanyName(a: string, b: string): boolean {
  return toCompanyCode(a) === toCompanyCode(b);
}

export interface CompanyCandidate {
  id: string;
  code: string;
  name: string;
}

export type CompanyResolution = { kind: "reuse"; id: string; code: string } | { kind: "create"; code: string };

/**
 * Picks the Company for a new package. The code is `toCompanyCode(requested)`; an existing company
 * with that code is reused when it is the same company (same normalized name). A different company
 * that already owns the code pushes us to `CODE_2`, `CODE_3`, ...
 */
export function resolveCompany(
  requestedCode: string,
  companyName: string,
  candidates: readonly CompanyCandidate[],
): CompanyResolution {
  const base = toCompanyCode(requestedCode.trim() || companyName);
  const byCode = new Map(candidates.map((c) => [c.code, c]));
  for (let n = 1; ; n += 1) {
    const code = n === 1 ? base : `${base}_${n}`;
    const existing = byCode.get(code);
    if (!existing) return { kind: "create", code };
    if (isSameCompanyName(existing.name, companyName)) return { kind: "reuse", id: existing.id, code };
  }
}

/* ------------------------------------------------------------------ */
/* Assembly: DB rows -> InterviewPackage                               */
/* ------------------------------------------------------------------ */

export interface PackageRowLike {
  id: string;
  slug: string;
  companyName: string;
  companyCode: string;
  jobTitle: string;
  sourceUrl: string | null;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionRowLike {
  key: string;
  status: string;
  content: unknown;
  error: string | null;
  inputHash: string | null;
  model: string | null;
  generatedAt: Date | null;
}

/** Short, human-readable summary of a Zod error (first few issues). */
export function formatZodError(error: z.ZodError, max = 3): string {
  const parts = error.issues.slice(0, max).map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  const more = error.issues.length > max ? ` (+${error.issues.length - max} more)` : "";
  return `${parts.join("; ")}${more}`;
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function toPackageMeta(row: PackageRowLike): PackageMeta {
  const companyCode = /^[A-Z0-9_]+$/.test(row.companyCode) ? row.companyCode : toCompanyCode(row.companyCode);
  return PackageMetaSchema.parse({
    id: row.id,
    slug: row.slug,
    run: "RUN_10",
    companyName: row.companyName,
    companyCode,
    jobTitle: row.jobTitle,
    sourceUrl: row.sourceUrl && isUrl(row.sourceUrl) ? row.sourceUrl : undefined,
    isSample: row.isSample,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export interface AssembledSection<K extends SectionKey> {
  content?: SectionContentMap[K];
  state: SectionState;
}

/**
 * Validates one stored section. Invalid stored content is dropped and the state becomes
 * `failed` with the validation error, so the UI can offer regeneration instead of crashing.
 */
export function assembleSection<K extends SectionKey>(key: K, row: SectionRowLike | undefined): AssembledSection<K> {
  if (!row) return { state: { status: "pending" } };

  const parsedStatus = SectionStatusSchema.safeParse(row.status);
  const state: SectionState = {
    status: parsedStatus.success ? parsedStatus.data : "pending",
    ...(row.error ? { error: row.error } : {}),
    ...(row.generatedAt ? { generatedAt: row.generatedAt.toISOString() } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.inputHash ? { inputHash: row.inputHash } : {}),
  };

  if (row.content === null || row.content === undefined) {
    if (state.status === "ready") {
      return { state: { ...state, status: "failed", error: "Stored content is missing; regenerate this section." } };
    }
    return { state };
  }

  const parsed = SectionContentSchemas[key].safeParse(row.content);
  if (!parsed.success) {
    return {
      state: { ...state, status: "failed", error: `Stored content is invalid: ${formatZodError(parsed.error)}` },
    };
  }
  return { content: parsed.data as SectionContentMap[K], state };
}

export function assemblePackage(row: PackageRowLike, sectionRows: readonly SectionRowLike[]): InterviewPackage {
  const byKey = new Map(sectionRows.map((s) => [s.key, s]));
  const sections: Partial<SectionContentMap> = {};
  const sectionStates = {} as Record<SectionKey, SectionState>;

  for (const key of SECTION_KEYS) {
    const assembled = assembleSection(key, byKey.get(key));
    sectionStates[key] = assembled.state;
    if (assembled.content !== undefined) {
      (sections as Record<SectionKey, unknown>)[key] = assembled.content;
    }
  }

  return {
    meta: toPackageMeta(row),
    sections: sections as InterviewPackage["sections"],
    sectionStates: sectionStates as InterviewPackage["sectionStates"],
  };
}

/**
 * Built-in samples are curated in code; the seeded DB copy can lag behind (seeded before all
 * content existed). Sections the DB copy lacks are filled from the built-in package.
 */
export function overlayBuiltInSections(stored: InterviewPackage, builtIn: InterviewPackage): InterviewPackage {
  const sections = { ...stored.sections } as Record<SectionKey, unknown>;
  const sectionStates = { ...stored.sectionStates };
  for (const key of SECTION_KEYS) {
    if (sections[key] === undefined && builtIn.sections[key] !== undefined) {
      sections[key] = builtIn.sections[key];
      sectionStates[key] = builtIn.sectionStates[key];
    }
  }
  return { ...stored, sections: sections as InterviewPackage["sections"], sectionStates };
}

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

export function summarizePackage(pkg: InterviewPackage): PackageSummary {
  return {
    slug: pkg.meta.slug,
    companyName: pkg.meta.companyName,
    companyCode: pkg.meta.companyCode,
    jobTitle: pkg.meta.jobTitle,
    isSample: pkg.meta.isSample,
    updatedAt: pkg.meta.updatedAt,
    readySections: SECTION_KEYS.filter((k) => pkg.sectionStates[k]?.status === "ready").length,
    totalSections: SECTION_KEYS.length,
    questionCount: pkg.sections.bilingual?.questions.length ?? 0,
  };
}

export function summarizePackageRow(
  row: PackageRowLike,
  sections: ReadonlyArray<{ key: string; status: string }>,
  questionCount: number,
): PackageSummary {
  const known = new Set<string>(SECTION_KEYS);
  return {
    slug: row.slug,
    companyName: row.companyName,
    companyCode: row.companyCode,
    jobTitle: row.jobTitle,
    isSample: row.isSample,
    updatedAt: row.updatedAt.toISOString(),
    readySections: sections.filter((s) => known.has(s.key) && s.status === "ready").length,
    totalSections: SECTION_KEYS.length,
    questionCount,
  };
}

/** Merges DB summaries with built-in samples (DB copy wins; no duplicate slugs), newest first. */
export function mergeSummaries(
  dbSummaries: readonly PackageSummary[],
  builtIns: readonly PackageSummary[],
): PackageSummary[] {
  const bySlug = new Map<string, PackageSummary>();
  for (const s of dbSummaries) bySlug.set(s.slug, s);
  for (const s of builtIns) {
    const stored = bySlug.get(s.slug);
    if (!stored) bySlug.set(s.slug, s);
    // Mirror overlayBuiltInSections: a stale seeded sample still shows the built-in content.
    else if (stored.isSample) {
      bySlug.set(s.slug, {
        ...stored,
        readySections: Math.max(stored.readySections, s.readySections),
        questionCount: Math.max(stored.questionCount, s.questionCount),
      });
    }
  }
  return [...bySlug.values()].sort((a, b) => {
    const diff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    return diff !== 0 && !Number.isNaN(diff) ? diff : a.slug.localeCompare(b.slug);
  });
}

/* ------------------------------------------------------------------ */
/* Section state patches                                               */
/* ------------------------------------------------------------------ */

export interface SectionStatePatch {
  status?: string;
  error?: string | null;
  generatedAt?: Date | null;
  model?: string | null;
  inputHash?: string | null;
}

/**
 * Converts a Partial<SectionState> into column updates. Keys that are present (even if
 * `undefined`) are written; `undefined` clears the column. Moving to any non-failed status
 * clears a stale error unless an error is given explicitly.
 */
export function sectionStatePatch(state: Partial<SectionState>): SectionStatePatch {
  const parsed = SectionStateSchema.partial().parse(state);
  const patch: SectionStatePatch = {};
  if ("status" in state && parsed.status) patch.status = parsed.status;
  if ("error" in state) patch.error = parsed.error ?? null;
  else if (parsed.status && parsed.status !== "failed") patch.error = null;
  if ("generatedAt" in state) {
    const time = parsed.generatedAt ? Date.parse(parsed.generatedAt) : Number.NaN;
    patch.generatedAt = Number.isNaN(time) ? null : new Date(time);
  }
  if ("model" in state) patch.model = parsed.model ?? null;
  if ("inputHash" in state) patch.inputHash = parsed.inputHash ?? null;
  return patch;
}

/* ------------------------------------------------------------------ */
/* Normalization: section content -> relational rows                   */
/* ------------------------------------------------------------------ */

export const NORMALIZED_SECTION_KEYS = [
  "bilingual",
  "systemDesign",
  "coding",
  "star",
  "cheatsheet",
  "studyPlan",
] as const;
export type NormalizedSectionKey = (typeof NORMALIZED_SECTION_KEYS)[number];

export function isNormalizedSectionKey(key: SectionKey): key is NormalizedSectionKey {
  return (NORMALIZED_SECTION_KEYS as readonly string[]).includes(key);
}

export interface TopicRow {
  id: string;
  packageId: string;
  topicKey: string;
  code: string;
  order: number;
  data: InterviewTopic;
}

export interface QuestionRow {
  id: string;
  packageId: string;
  itemId: string;
  number: number;
  topicId: string | null;
  difficulty: string;
  priority: string;
  data: Omit<InterviewQuestion, "followUps">;
}

export interface FollowUpRow {
  questionId: string;
  itemId: string;
  order: number;
  data: FollowUp;
}

export interface ItemRow<T> {
  packageId: string;
  itemId: string;
  number: number;
  difficulty: string;
  priority: string;
  data: T;
}

export interface FlashcardRow {
  packageId: string;
  itemId: string;
  order: number;
  data: Flashcard;
}

export interface StudyPlanRow {
  packageId: string;
  planKey: string;
  data: StudyPlan;
}

export interface NormalizedRows {
  topics: TopicRow[];
  questions: QuestionRow[];
  followUps: FollowUpRow[];
  systemDesigns: ItemRow<SystemDesignScenario>[];
  codingExercises: ItemRow<CodingExercise>[];
  behavioral: ItemRow<BehavioralQuestion>[];
  flashcards: FlashcardRow[];
  studyPlans: StudyPlanRow[];
}

export function emptyNormalizedRows(): NormalizedRows {
  return {
    topics: [],
    questions: [],
    followUps: [],
    systemDesigns: [],
    codingExercises: [],
    behavioral: [],
    flashcards: [],
    studyPlans: [],
  };
}

function assertUniqueIds(ids: readonly string[], what: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new InvalidSectionContentError(`Duplicate ${what} id "${id}".`);
    seen.add(id);
  }
}

/** Rows for one question + its follow-ups (shared by section normalization and replaceQuestion). */
export function questionToRows(
  packageId: string,
  question: InterviewQuestion,
  topicRowId: string | null,
  questionRowId: string,
): { question: QuestionRow; followUps: FollowUpRow[] } {
  assertUniqueIds(
    question.followUps.map((f) => f.id),
    `follow-up (question ${question.id})`,
  );
  const { followUps, ...data } = question;
  return {
    question: {
      id: questionRowId,
      packageId,
      itemId: question.id,
      number: question.number,
      topicId: topicRowId,
      difficulty: question.difficulty,
      priority: question.priority,
      data,
    },
    followUps: followUps.map((f, order) => ({ questionId: questionRowId, itemId: f.id, order, data: f })),
  };
}

function bankToRows(packageId: string, bank: QuestionBank, newId: () => string): NormalizedRows {
  assertUniqueIds(
    bank.topics.map((t) => t.id),
    "topic",
  );
  assertUniqueIds(
    bank.questions.map((q) => q.id),
    "question",
  );
  const rows = emptyNormalizedRows();
  const topicIdByKey = new Map<string, string>();
  bank.topics.forEach((topic, order) => {
    const id = newId();
    topicIdByKey.set(topic.id, id);
    rows.topics.push({ id, packageId, topicKey: topic.id, code: topic.code, order, data: topic });
  });
  for (const q of bank.questions) {
    const mapped = questionToRows(packageId, q, topicIdByKey.get(q.topicId) ?? null, newId());
    rows.questions.push(mapped.question);
    rows.followUps.push(...mapped.followUps);
  }
  return rows;
}

function itemRows<T extends { id: string; number: number; difficulty: string; priority: string }>(
  packageId: string,
  items: readonly T[],
  what: string,
): ItemRow<T>[] {
  assertUniqueIds(
    items.map((i) => i.id),
    what,
  );
  return items.map((item) => ({
    packageId,
    itemId: item.id,
    number: item.number,
    difficulty: item.difficulty,
    priority: item.priority,
    data: item,
  }));
}

/**
 * Normalizes validated section content into table rows. Non-list sections yield empty rows.
 * Throws InvalidSectionContentError for duplicate ids (they would violate unique constraints).
 */
export function normalizeSectionRows<K extends SectionKey>(
  packageId: string,
  key: K,
  content: SectionContentMap[K],
  newId: () => string,
): NormalizedRows {
  const rows = emptyNormalizedRows();
  switch (key) {
    case "bilingual":
      return bankToRows(packageId, content as SectionContentMap["bilingual"], newId);
    case "systemDesign":
      rows.systemDesigns = itemRows(packageId, (content as SectionContentMap["systemDesign"]).scenarios, "scenario");
      return rows;
    case "coding":
      rows.codingExercises = itemRows(packageId, (content as SectionContentMap["coding"]).exercises, "exercise");
      return rows;
    case "star":
      rows.behavioral = itemRows(packageId, (content as SectionContentMap["star"]).questions, "behavioral question");
      return rows;
    case "cheatsheet": {
      const { flashcards } = content as SectionContentMap["cheatsheet"];
      assertUniqueIds(
        flashcards.map((f) => f.id),
        "flashcard",
      );
      rows.flashcards = flashcards.map((data, order) => ({ packageId, itemId: data.id, order, data }));
      return rows;
    }
    case "studyPlan": {
      const { plans } = content as SectionContentMap["studyPlan"];
      assertUniqueIds(
        plans.map((p) => p.id),
        "study plan",
      );
      rows.studyPlans = plans.map((data) => ({ packageId, planKey: data.id, data }));
      return rows;
    }
    default:
      return rows;
  }
}

/** Returns a new bank with `question` replacing the one with the same id. */
export function replaceQuestionInBank(bank: QuestionBank, question: InterviewQuestion): QuestionBank {
  const index = bank.questions.findIndex((q) => q.id === question.id);
  if (index === -1) throw new QuestionNotFoundError(question.id);
  const questions = bank.questions.slice();
  questions[index] = question;
  return { ...bank, questions };
}

/* ------------------------------------------------------------------ */
/* Seed helpers: JobDescription + ResearchSource rows from a package    */
/* ------------------------------------------------------------------ */

/** Builds a NormalizedJd (origin "seed") from a package's JD analysis (or its meta when absent). */
export function jdFromPackage(pkg: InterviewPackage): NormalizedJd {
  const { meta } = pkg;
  const jd = pkg.sections.jd;
  const base = {
    companyName: meta.companyName,
    jobTitle: meta.jobTitle,
    ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
    origin: "seed" as const,
    extractedAt: meta.createdAt,
  };
  if (!jd) {
    return {
      ...base,
      text: `${meta.jobTitle} at ${meta.companyName}`,
      sections: [],
      warnings: ["Job description analysis is not available; seeded from package metadata only."],
    };
  }

  const sections = [
    { heading: "Responsibilities", items: jd.responsibilities.map((f) => f.text.en) },
    { heading: "Required skills", items: jd.requiredSkills.map((f) => f.text.en) },
    { heading: "Preferred skills", items: jd.preferredSkills.map((f) => f.text.en) },
    { heading: "Benefits", items: jd.benefits.map((f) => f.text.en) },
  ].filter((s) => s.items.length > 0);

  const header = [
    jd.jobTitle.text.en,
    jd.company.text.en,
    `Location: ${jd.location.text.en}`,
    `Working arrangement: ${jd.workingArrangement.text.en}`,
    `Seniority: ${jd.seniority.text.en}`,
  ];
  const body = sections.map((s) => [`${s.heading}:`, ...s.items.map((i) => `- ${i}`)].join("\n"));

  return {
    ...base,
    location: jd.location.text.en,
    text: [header.join("\n"), ...body].join("\n\n"),
    sections,
    warnings: [],
  };
}

export interface ResearchSourceInput {
  title: string;
  url: string;
  kind: "jd" | "company-site" | "web" | "other";
  verified: boolean;
  accessedAt: Date | null;
}

/** Collects every { sourceUrl, status } Fact-like object reachable from `value`. */
function collectFactSources(value: unknown, out: Map<string, boolean>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectFactSources(v, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.sourceUrl === "string" && typeof record.status === "string") {
    out.set(record.sourceUrl, (out.get(record.sourceUrl) ?? false) || record.status === "verified");
  }
  for (const v of Object.values(record)) collectFactSources(v, out);
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

/**
 * ResearchSource rows for a package: the JD URL, the JD analysis `sourceUrls` and the company
 * research `sources`. Deduplicated by URL; `verified` when a verified Fact cites that URL.
 */
export function collectResearchSources(pkg: InterviewPackage): ResearchSourceInput[] {
  const verifiedByUrl = new Map<string, boolean>();
  collectFactSources(pkg.sections.jd, verifiedByUrl);
  collectFactSources(pkg.sections.company, verifiedByUrl);

  const out = new Map<string, ResearchSourceInput>();
  const add = (source: Omit<ResearchSourceInput, "verified">) => {
    if (!isUrl(source.url) || out.has(source.url)) return;
    out.set(source.url, { ...source, verified: verifiedByUrl.get(source.url) ?? false });
  };

  const { meta } = pkg;
  if (meta.sourceUrl) {
    add({
      title: `${meta.companyName} — ${meta.jobTitle} (job posting)`,
      url: meta.sourceUrl,
      kind: "jd",
      accessedAt: null,
    });
  }
  for (const url of pkg.sections.jd?.sourceUrls ?? []) {
    add({
      title: `Job posting (${hostLabel(url)})`,
      url,
      kind: "jd",
      accessedAt: toDate(pkg.sections.jd?.verification.checkedAt),
    });
  }
  for (const source of pkg.sections.company?.sources ?? []) {
    add({ title: source.title, url: source.url, kind: "web", accessedAt: toDate(source.accessedAt) });
  }
  return [...out.values()];
}
