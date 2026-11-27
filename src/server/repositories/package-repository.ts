import "server-only";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { NormalizedJdSchema, type NormalizedJd } from "@/domain/jd/schema";
import {
  InterviewQuestionSchema,
  PackageMetaSchema,
  QuestionBankSchema,
  SectionContentSchemas,
  SectionStateSchema,
  type InterviewPackage,
  type InterviewQuestion,
  type PackageMeta,
  type PackageSummary,
  type SectionContentMap,
  type SectionState,
} from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { isbSamplePackage } from "@/content/samples/isb";
import { prisma, withTransaction } from "@/server/db";
import {
  assemblePackage,
  buildPackageSlugBase,
  clampCompanyCode,
  collectResearchSources,
  formatZodError,
  isNormalizedSectionKey,
  jdFromPackage,
  MAX_JOB_TITLE_LENGTH,
  mergeSummaries,
  normalizeSectionRows,
  overlayBuiltInSections,
  pickUniqueSlug,
  questionToRows,
  replaceQuestionInBank,
  resolveCompany,
  sectionStatePatch,
  summarizePackage,
  summarizePackageRow,
  toPackageMeta,
  truncateText,
  type NormalizedRows,
} from "./package-mapper";
import {
  InvalidSectionContentError,
  PackageNotFoundError,
  QuestionNotFoundError,
  SamplePackageError,
} from "./repository-errors";

export {
  InvalidSectionContentError,
  PackageNotFoundError,
  QuestionNotFoundError,
  SamplePackageError,
} from "./repository-errors";

/**
 * Interview package persistence (Prisma). `PackageSection.content` is the source used to assemble
 * an InterviewPackage; list sections (bilingual, systemDesign, coding, star, cheatsheet.flashcards,
 * studyPlan) are ALSO normalized into their own tables, rewritten in the same transaction.
 * Every write is validated with Zod first. Pure mapping lives in ./package-mapper.ts.
 *
 * The built-in ISB sample is served from code when it is not in the database (or the database is
 * unavailable), so the app works offline before `pnpm db:setup`.
 */

type Tx = Prisma.TransactionClient;

const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 } as const;
const SLUG_RETRIES = 3;
const SAMPLE_PACKAGES: readonly InterviewPackage[] = [isbSamplePackage];

/** True for slugs of built-in sample packages (never deletable, always available). */
export function isSamplePackageSlug(slug: string): boolean {
  return SAMPLE_PACKAGES.some((p) => p.meta.slug === slug);
}

function builtInSample(slug: string): InterviewPackage | null {
  return SAMPLE_PACKAGES.find((p) => p.meta.slug === slug) ?? null;
}

const newId = (): string => nanoid();

/** Domain objects are Zod-validated JSON; this strips `undefined` and satisfies Prisma's Json input type. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requirePackage(tx: Tx, packageId: string): Promise<{ id: string; isSample: boolean }> {
  const row = await tx.interviewPackage.findUnique({ where: { id: packageId }, select: { id: true, isSample: true } });
  if (!row) throw new PackageNotFoundError(packageId);
  return row;
}

function touchPackage(tx: Tx, packageId: string) {
  return tx.interviewPackage.update({ where: { id: packageId }, data: { updatedAt: new Date() } });
}

/* ------------------------------------------------------------------ */
/* Normalized tables                                                   */
/* ------------------------------------------------------------------ */

async function clearNormalizedRows(tx: Tx, packageId: string, key: SectionKey): Promise<void> {
  switch (key) {
    case "bilingual":
      // Explicit child deletes: do not rely on SQLite foreign-key cascades being enabled.
      await tx.followUpQuestion.deleteMany({ where: { question: { packageId } } });
      await tx.interviewQuestion.deleteMany({ where: { packageId } });
      await tx.interviewTopic.deleteMany({ where: { packageId } });
      return;
    case "systemDesign":
      await tx.systemDesignScenario.deleteMany({ where: { packageId } });
      return;
    case "coding":
      await tx.codingExercise.deleteMany({ where: { packageId } });
      return;
    case "star":
      await tx.behavioralQuestion.deleteMany({ where: { packageId } });
      return;
    case "cheatsheet":
      await tx.flashcard.deleteMany({ where: { packageId } });
      return;
    case "studyPlan":
      await tx.studyPlan.deleteMany({ where: { packageId } });
      return;
    default:
      return;
  }
}

async function writeNormalizedRows(tx: Tx, rows: NormalizedRows): Promise<void> {
  if (rows.topics.length) {
    await tx.interviewTopic.createMany({ data: rows.topics.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.questions.length) {
    await tx.interviewQuestion.createMany({ data: rows.questions.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.followUps.length) {
    await tx.followUpQuestion.createMany({ data: rows.followUps.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.systemDesigns.length) {
    await tx.systemDesignScenario.createMany({ data: rows.systemDesigns.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.codingExercises.length) {
    await tx.codingExercise.createMany({ data: rows.codingExercises.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.behavioral.length) {
    await tx.behavioralQuestion.createMany({ data: rows.behavioral.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.flashcards.length) {
    await tx.flashcard.createMany({ data: rows.flashcards.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
  if (rows.studyPlans.length) {
    await tx.studyPlan.createMany({ data: rows.studyPlans.map((r) => ({ ...r, data: toJson(r.data) })) });
  }
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listPackages(): Promise<PackageSummary[]> {
  let stored: PackageSummary[] = [];
  try {
    const rows = await prisma.interviewPackage.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        sections: { select: { key: true, status: true } },
        _count: { select: { questions: true } },
      },
    });
    stored = rows.map((row) => summarizePackageRow(row, row.sections, row._count.questions));
  } catch (error) {
    console.error("[package-repository] listPackages: database unavailable, serving built-in samples only", error);
  }
  return mergeSummaries(stored, SAMPLE_PACKAGES.map(summarizePackage));
}

/** Returns the package or null. Falls back to the built-in ISB sample when the DB has no copy. */
export async function getPackageBySlug(slug: string): Promise<InterviewPackage | null> {
  const sample = builtInSample(slug);
  try {
    const row = await prisma.interviewPackage.findUnique({ where: { slug }, include: { sections: true } });
    if (row) {
      const stored = assemblePackage(row, row.sections);
      return sample && row.isSample ? overlayBuiltInSections(stored, sample) : stored;
    }
  } catch (error) {
    if (!sample) throw error;
    console.error(`[package-repository] getPackageBySlug(${slug}): falling back to the built-in sample`, error);
  }
  return sample;
}

export async function getPackageIdBySlug(slug: string): Promise<string | null> {
  const row = await prisma.interviewPackage.findUnique({ where: { slug }, select: { id: true } });
  return row?.id ?? null;
}

const sampleSeeding = new Map<string, Promise<string>>();

/**
 * Returns the database id of a built-in sample, storing the sample first if the database has no
 * copy yet (null for non-sample slugs that are not stored). Lets DB-backed features (mock
 * interviews, synced progress) work on the sample without `pnpm db:setup` — needed on Cloudflare
 * D1, where there is no seed step. Concurrent first uses share one import.
 */
export async function ensureSamplePackageStored(slug: string): Promise<string | null> {
  const existing = await getPackageIdBySlug(slug);
  if (existing) return existing;
  const sample = builtInSample(slug);
  if (!sample) return null;
  let pending = sampleSeeding.get(slug);
  if (!pending) {
    pending = upsertFullPackage(sample)
      .then((result) => result.packageId)
      .catch(async (error: unknown) => {
        // Another isolate stored it at the same time.
        const id = isUniqueViolation(error) ? await getPackageIdBySlug(slug) : null;
        if (id) return id;
        throw error;
      })
      .finally(() => sampleSeeding.delete(slug));
    sampleSeeding.set(slug, pending);
  }
  return pending;
}

export async function getNormalizedJd(packageId: string): Promise<NormalizedJd | null> {
  const pkg = await prisma.interviewPackage.findUnique({ where: { id: packageId }, select: { applicationId: true } });
  if (!pkg?.applicationId) return null;
  const row = await prisma.jobDescription.findFirst({
    where: { applicationId: pkg.applicationId },
    orderBy: [{ extractedAt: "desc" }, { createdAt: "desc" }],
    select: { normalized: true },
  });
  if (!row) return null;
  const parsed = NormalizedJdSchema.safeParse(row.normalized);
  if (!parsed.success) {
    console.warn(
      `[package-repository] getNormalizedJd(${packageId}): stored JD is invalid — ${formatZodError(parsed.error)}`,
    );
    return null;
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export interface CreatePackageInput {
  companyName: string;
  companyCode: string;
  jobTitle: string;
  sourceUrl?: string;
  jd: NormalizedJd;
}

const CreatePackageInputSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  // Derived values (company code, a job title extracted from the page) are clamped rather than
  // rejected: the request already passed its own limits, so failing here would be an opaque 400.
  companyCode: z
    .string()
    .trim()
    .transform((code) => (code ? clampCompanyCode(code) : "")),
  jobTitle: z
    .string()
    .trim()
    .transform((title) => truncateText(title, MAX_JOB_TITLE_LENGTH)),
  sourceUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  jd: NormalizedJdSchema,
});

/** Creates Company/JobApplication/JobDescription/InterviewPackage + 16 pending PackageSection rows. */
export async function createPackageShell(input: CreatePackageInput): Promise<PackageMeta> {
  const parsed = CreatePackageInputSchema.parse(input);
  const { companyName, jd } = parsed;
  const jobTitle = parsed.jobTitle || truncateText(jd.jobTitle, MAX_JOB_TITLE_LENGTH) || "Untitled role";
  const sourceUrl = parsed.sourceUrl ?? jd.sourceUrl;
  const extractedAt = Number.isNaN(Date.parse(jd.extractedAt)) ? new Date() : new Date(jd.extractedAt);
  const slugBase = buildPackageSlugBase(companyName, jobTitle);
  const codeBase = clampCompanyCode(parsed.companyCode || companyName);

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await withTransaction(async (tx) => {
        const candidates = await tx.company.findMany({
          where: { code: { startsWith: codeBase } },
          select: { id: true, code: true, name: true },
        });
        const resolution = resolveCompany(codeBase, companyName, candidates);
        const companyId =
          resolution.kind === "reuse"
            ? resolution.id
            : (await tx.company.create({ data: { name: companyName, code: resolution.code }, select: { id: true } }))
                .id;

        const application = await tx.jobApplication.create({
          data: { companyId, jobTitle, status: "draft" },
          select: { id: true },
        });
        await tx.jobDescription.create({
          data: {
            applicationId: application.id,
            sourceUrl: sourceUrl ?? null,
            origin: jd.origin,
            rawText: jd.text,
            normalized: toJson(jd),
            extractedAt,
          },
        });

        const taken = await tx.interviewPackage.findMany({
          where: { slug: { startsWith: slugBase } },
          select: { slug: true },
        });
        // Never shadow a built-in sample slug, even when the sample is not seeded.
        const slug = pickUniqueSlug(slugBase, [
          ...taken.map((t) => t.slug),
          ...SAMPLE_PACKAGES.map((p) => p.meta.slug),
        ]);

        const pkg = await tx.interviewPackage.create({
          data: {
            slug,
            applicationId: application.id,
            companyName,
            companyCode: resolution.code,
            jobTitle,
            sourceUrl: sourceUrl ?? null,
            isSample: false,
            sections: { create: SECTION_KEYS.map((key) => ({ key, status: "pending" })) },
          },
        });

        if (sourceUrl) {
          await tx.researchSource.create({
            data: {
              companyId,
              packageId: pkg.id,
              title: `${companyName} — ${jobTitle} (job posting)`,
              url: sourceUrl,
              kind: "jd",
              verified: jd.origin === "url",
              accessedAt: extractedAt,
            },
          });
        }
        return toPackageMeta(pkg);
      }, TX_OPTIONS);
    } catch (error) {
      // Concurrent creation of the same slug/company code: retry with fresh uniqueness checks.
      if (isUniqueViolation(error) && attempt < SLUG_RETRIES) continue;
      throw error;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Section writes                                                      */
/* ------------------------------------------------------------------ */

/** Validates `content` with SectionContentSchemas[key], stores it, sets status "ready". */
export async function saveSectionContent<K extends SectionKey>(
  packageId: string,
  key: K,
  content: SectionContentMap[K],
  info: { model?: string; inputHash?: string },
): Promise<void> {
  const validated = SectionContentSchemas[key].parse(content) as SectionContentMap[K];
  // Normalize before opening the transaction so duplicate ids fail fast without touching the DB.
  const rows = isNormalizedSectionKey(key) ? normalizeSectionRows(packageId, key, validated, newId) : null;
  const generatedAt = new Date();

  await withTransaction(async (tx) => {
    await requirePackage(tx, packageId);
    const columns = {
      status: "ready",
      content: toJson(validated),
      error: null,
      model: info.model ?? null,
      inputHash: info.inputHash ?? null,
      generatedAt,
    };
    await tx.packageSection.upsert({
      where: { packageId_key: { packageId, key } },
      create: { packageId, key, ...columns },
      update: columns,
    });
    if (rows) {
      await clearNormalizedRows(tx, packageId, key);
      await writeNormalizedRows(tx, rows);
    }
    await touchPackage(tx, packageId);
  }, TX_OPTIONS);
}

export async function setSectionState(packageId: string, key: SectionKey, state: Partial<SectionState>): Promise<void> {
  const patch = sectionStatePatch(state);
  await withTransaction(async (tx) => {
    await requirePackage(tx, packageId);
    await tx.packageSection.upsert({
      where: { packageId_key: { packageId, key } },
      create: { packageId, key, ...patch, status: patch.status ?? "pending" },
      update: patch,
    });
  }, TX_OPTIONS);
}

export interface ReplaceQuestionOptions {
  /**
   * Optimistic concurrency check, evaluated inside the transaction against the stored question
   * with the same id. When it returns false nothing is written and replaceQuestion returns false
   * (e.g. the bank was regenerated meanwhile and the positional id now holds another question).
   */
  isUnchanged?: (stored: InterviewQuestion) => boolean;
}

/**
 * Replaces one question inside the bilingual section (single-answer regeneration). Returns false
 * when `options.isUnchanged` rejected the stored question (nothing was written).
 */
export async function replaceQuestion(
  packageId: string,
  question: InterviewQuestion,
  options: ReplaceQuestionOptions = {},
): Promise<boolean> {
  const parsed = InterviewQuestionSchema.parse(question);

  return withTransaction(async (tx) => {
    await requirePackage(tx, packageId);
    const section = await tx.packageSection.findUnique({
      where: { packageId_key: { packageId, key: "bilingual" } },
      select: { content: true },
    });
    if (!section || section.content === null) throw new QuestionNotFoundError(parsed.id);
    const bank = QuestionBankSchema.safeParse(section.content);
    if (!bank.success) {
      throw new InvalidSectionContentError(`Stored question bank is invalid: ${formatZodError(bank.error)}`);
    }
    const stored = bank.data.questions.find((q) => q.id === parsed.id);
    if (stored && options.isUnchanged && !options.isUnchanged(stored)) return false;
    const next = replaceQuestionInBank(bank.data, parsed);
    await tx.packageSection.update({
      where: { packageId_key: { packageId, key: "bilingual" } },
      data: { content: toJson(next) },
    });

    const topic = await tx.interviewTopic.findUnique({
      where: { packageId_topicKey: { packageId, topicKey: parsed.topicId } },
      select: { id: true },
    });
    const existing = await tx.interviewQuestion.findUnique({
      where: { packageId_itemId: { packageId, itemId: parsed.id } },
      select: { id: true },
    });
    const mapped = questionToRows(packageId, parsed, topic?.id ?? null, existing?.id ?? newId());
    const { id, ...columns } = mapped.question;
    if (existing) {
      await tx.followUpQuestion.deleteMany({ where: { questionId: existing.id } });
      await tx.interviewQuestion.update({ where: { id }, data: { ...columns, data: toJson(columns.data) } });
    } else {
      await tx.interviewQuestion.create({ data: { id, ...columns, data: toJson(columns.data) } });
    }
    if (mapped.followUps.length) {
      await tx.followUpQuestion.createMany({ data: mapped.followUps.map((f) => ({ ...f, data: toJson(f.data) })) });
    }
    await touchPackage(tx, packageId);
    return true;
  }, TX_OPTIONS);
}

/* ------------------------------------------------------------------ */
/* Full upsert (seed)                                                  */
/* ------------------------------------------------------------------ */

export interface UpsertFullPackageOptions {
  /** JobDescription to store; defaults to one derived from the JD analysis (origin "seed"). */
  jd?: NormalizedJd;
}

export interface UpsertFullPackageResult {
  packageId: string;
  slug: string;
  readySections: SectionKey[];
  /** Sections whose content failed validation; stored as `failed` without content. */
  failedSections: Array<{ key: SectionKey; error: string }>;
  emptySections: SectionKey[];
  counts: {
    topics: number;
    questions: number;
    followUps: number;
    systemDesigns: number;
    codingExercises: number;
    behavioral: number;
    flashcards: number;
    studyPlans: number;
    researchSources: number;
  };
}

interface PreparedSection {
  key: SectionKey;
  content: unknown;
  state: SectionState;
  rows: NormalizedRows | null;
}

/**
 * Upserts a complete package (used by the seed script for the ISB sample). Idempotent: re-running
 * rewrites sections, normalized rows, the seed JobDescription and research sources, and keeps
 * study progress. Each section is validated on its own, so one invalid section is stored as
 * `failed` instead of aborting the whole upsert.
 */
export async function upsertFullPackage(
  pkg: InterviewPackage,
  options: UpsertFullPackageOptions = {},
): Promise<UpsertFullPackageResult> {
  const meta = PackageMetaSchema.parse(pkg.meta);
  const existing = await prisma.interviewPackage.findUnique({
    where: { slug: meta.slug },
    select: { id: true, applicationId: true },
  });
  const packageId = existing?.id ?? meta.id;

  const prepared: PreparedSection[] = [];
  const failedSections: UpsertFullPackageResult["failedSections"] = [];
  const validSections: Partial<SectionContentMap> = {};

  for (const key of SECTION_KEYS) {
    const rawState = SectionStateSchema.safeParse(pkg.sectionStates?.[key]);
    let state: SectionState = rawState.success ? rawState.data : { status: "pending" };
    const raw = pkg.sections[key];
    if (raw === undefined) {
      if (state.status === "ready") state = { status: "pending" };
      prepared.push({ key, content: null, state, rows: null });
      continue;
    }
    const parsed = SectionContentSchemas[key].safeParse(raw);
    if (!parsed.success) {
      const error = `Invalid content: ${formatZodError(parsed.error)}`;
      failedSections.push({ key, error });
      prepared.push({ key, content: null, state: { ...state, status: "failed", error }, rows: null });
      continue;
    }
    try {
      const rows = isNormalizedSectionKey(key)
        ? normalizeSectionRows(packageId, key, parsed.data as SectionContentMap[typeof key], newId)
        : null;
      (validSections as Record<SectionKey, unknown>)[key] = parsed.data;
      prepared.push({ key, content: parsed.data, state, rows });
    } catch (error) {
      if (!(error instanceof InvalidSectionContentError)) throw error;
      failedSections.push({ key, error: error.message });
      prepared.push({ key, content: null, state: { ...state, status: "failed", error: error.message }, rows: null });
    }
  }

  const validPkg: InterviewPackage = { ...pkg, meta, sections: validSections as InterviewPackage["sections"] };
  const jd = NormalizedJdSchema.parse(options.jd ?? jdFromPackage(validPkg));
  const sources = collectResearchSources(validPkg);

  await withTransaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { code: meta.companyCode },
      create: { name: meta.companyName, code: meta.companyCode },
      update: { name: meta.companyName },
      select: { id: true },
    });

    const applicationId = existing?.applicationId
      ? (
          await tx.jobApplication.update({
            where: { id: existing.applicationId },
            data: { companyId: company.id, jobTitle: meta.jobTitle },
            select: { id: true },
          })
        ).id
      : (
          await tx.jobApplication.create({
            data: { companyId: company.id, jobTitle: meta.jobTitle },
            select: { id: true },
          })
        ).id;

    await tx.jobDescription.deleteMany({ where: { applicationId, origin: jd.origin } });
    await tx.jobDescription.create({
      data: {
        applicationId,
        sourceUrl: jd.sourceUrl ?? null,
        origin: jd.origin,
        rawText: jd.text,
        normalized: toJson(jd),
        extractedAt: Number.isNaN(Date.parse(jd.extractedAt)) ? new Date() : new Date(jd.extractedAt),
      },
    });

    const packageColumns = {
      run: meta.run,
      applicationId,
      companyName: meta.companyName,
      companyCode: meta.companyCode,
      jobTitle: meta.jobTitle,
      sourceUrl: meta.sourceUrl ?? null,
      isSample: meta.isSample,
    };
    await tx.interviewPackage.upsert({
      where: { slug: meta.slug },
      create: { id: packageId, slug: meta.slug, ...packageColumns },
      update: { ...packageColumns, updatedAt: new Date() },
    });

    for (const section of prepared) {
      const columns = {
        status: section.state.status,
        content: section.content === null ? Prisma.DbNull : toJson(section.content),
        error: section.state.error ?? null,
        model: section.state.model ?? null,
        inputHash: section.state.inputHash ?? null,
        generatedAt: section.state.generatedAt ? new Date(section.state.generatedAt) : null,
      };
      await tx.packageSection.upsert({
        where: { packageId_key: { packageId, key: section.key } },
        create: { packageId, key: section.key, ...columns },
        update: columns,
      });
      if (isNormalizedSectionKey(section.key)) {
        await clearNormalizedRows(tx, packageId, section.key);
        if (section.rows) await writeNormalizedRows(tx, section.rows);
      }
    }

    await tx.researchSource.deleteMany({ where: { packageId } });
    if (sources.length) {
      await tx.researchSource.createMany({
        data: sources.map((s) => ({ ...s, companyId: company.id, packageId })),
      });
    }
  }, TX_OPTIONS);

  const allRows = prepared.map((p) => p.rows).filter((r): r is NormalizedRows => r !== null);
  const count = (pick: (r: NormalizedRows) => unknown[]) => allRows.reduce((n, r) => n + pick(r).length, 0);
  return {
    packageId,
    slug: meta.slug,
    readySections: prepared.filter((p) => p.state.status === "ready" && p.content !== null).map((p) => p.key),
    failedSections,
    emptySections: prepared.filter((p) => p.content === null && p.state.status !== "failed").map((p) => p.key),
    counts: {
      topics: count((r) => r.topics),
      questions: count((r) => r.questions),
      followUps: count((r) => r.followUps),
      systemDesigns: count((r) => r.systemDesigns),
      codingExercises: count((r) => r.codingExercises),
      behavioral: count((r) => r.behavioral),
      flashcards: count((r) => r.flashcards),
      studyPlans: count((r) => r.studyPlans),
      researchSources: sources.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

/**
 * Deletes a user package and everything that belongs to it.
 * Throws SamplePackageError for built-in samples and PackageNotFoundError for unknown slugs.
 */
export async function deletePackage(slug: string): Promise<void> {
  if (isSamplePackageSlug(slug)) throw new SamplePackageError(slug);
  await withTransaction(async (tx) => {
    const row = await tx.interviewPackage.findUnique({
      where: { slug },
      select: { id: true, isSample: true, applicationId: true },
    });
    if (!row) throw new PackageNotFoundError(slug);
    if (row.isSample) throw new SamplePackageError(slug);

    await tx.followUpQuestion.deleteMany({ where: { question: { packageId: row.id } } });
    await tx.interviewPackage.delete({ where: { id: row.id } });

    if (row.applicationId) {
      const remaining = await tx.interviewPackage.count({ where: { applicationId: row.applicationId } });
      if (remaining === 0) {
        await tx.jobDescription.deleteMany({ where: { applicationId: row.applicationId } });
        await tx.jobApplication.delete({ where: { id: row.applicationId } });
      }
    }
  }, TX_OPTIONS);
}
