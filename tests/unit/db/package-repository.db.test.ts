// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { emptyProgress, type PackageProgress } from "@/domain/progress/schema";
import type { PrismaClient } from "@/generated/prisma/client";
import { fixtureBank, fixtureJd, makeQuestion } from "@/server/repositories/test-fixtures";
import { ISB_SLUG, isbSamplePackage } from "@/content/samples/isb";

/**
 * Integration test for the package + progress repositories against a throwaway SQLite database.
 * The schema is created by applying prisma/migrations/*\/migration.sql in order (the same SQL that
 * `prisma migrate deploy` runs), which keeps the test fast and free of CLI child processes.
 *
 * Runs by default (~1 s); set SKIP_DB_TESTS=1 to skip it, e.g. on machines without the
 * better-sqlite3 native build. Run alone with: pnpm exec vitest run tests/unit/db
 */

type PackageRepo = typeof import("@/server/repositories/package-repository");
type ProgressRepo = typeof import("@/server/repositories/progress-repository");

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../prisma/migrations");

function applyMigrations(file: string): void {
  const db = new DatabaseSync(file);
  try {
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const dir of dirs) db.exec(readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8"));
  } finally {
    db.close();
  }
}

const progressAt = (updatedAt: string, studied: string[]): PackageProgress => ({
  ...emptyProgress(),
  studied,
  updatedAt,
});

describe.skipIf(Boolean(process.env.SKIP_DB_TESTS))("package + progress repositories (SQLite)", () => {
  let tmp: string;
  let previousUrl: string | undefined;
  let repo: PackageRepo;
  let progressRepo: ProgressRepo;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tmp = mkdtempSync(path.join(tmpdir(), "job-hunter-db-"));
    const file = path.join(tmp, "test.db");
    applyMigrations(file);

    previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `file:${file}`;
    delete (globalThis as { prisma?: unknown }).prisma;
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    ({ prisma } = await import("@/server/db"));
    repo = await import("@/server/repositories/package-repository");
    progressRepo = await import("@/server/repositories/progress-repository");
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    delete (globalThis as { prisma?: unknown }).prisma;
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  const input = { companyName: "Acme Đà Nẵng", companyCode: "", jobTitle: "Senior Front-End Engineer", jd: fixtureJd };

  it("serves the built-in sample before it is seeded", async () => {
    const sample = await repo.getPackageBySlug(ISB_SLUG);
    expect(sample?.meta.isSample).toBe(true);
    expect(await repo.getPackageIdBySlug(ISB_SLUG)).toBeNull();
    expect(await repo.getPackageBySlug("does-not-exist")).toBeNull();
    expect((await repo.listPackages()).map((p) => p.slug)).toEqual([ISB_SLUG]);
  });

  it("creates package shells with unique slugs and a reused company", async () => {
    const first = await repo.createPackageShell(input);
    expect(first.slug).toBe("acme-da-nang-senior-front-end-engineer");
    expect(first.companyCode).toBe("ACME_DA_NANG");
    expect(first.sourceUrl).toBe(fixtureJd.sourceUrl);
    expect(first.isSample).toBe(false);

    const second = await repo.createPackageShell(input);
    expect(second.slug).toBe("acme-da-nang-senior-front-end-engineer-2");
    expect(await prisma.company.count()).toBe(1);
    expect(await prisma.packageSection.count({ where: { packageId: first.id, status: "pending" } })).toBe(16);
    expect(await prisma.researchSource.count({ where: { packageId: first.id, kind: "jd", verified: true } })).toBe(1);

    // A different company that normalizes to the same code gets a suffixed code.
    const other = await repo.createPackageShell({
      ...input,
      companyName: "Acme Robotics",
      companyCode: "Acme Đà Nẵng",
    });
    expect(other.companyCode).toBe("ACME_DA_NANG_2");

    expect(await repo.getNormalizedJd(first.id)).toEqual(fixtureJd);
    expect(await repo.getPackageIdBySlug(first.slug)).toBe(first.id);

    const pkg = await repo.getPackageBySlug(first.slug);
    expect(pkg?.meta).toEqual(first);
    expect(Object.values(pkg!.sectionStates).every((s) => s.status === "pending")).toBe(true);
  });

  it("saves section content, normalizes rows and round-trips the package", async () => {
    const id = (await repo.getPackageIdBySlug("acme-da-nang-senior-front-end-engineer"))!;
    await repo.saveSectionContent(id, "bilingual", fixtureBank, { model: "test-model", inputHash: "hash-1" });
    // Saving twice must not duplicate normalized rows (delete-and-recreate).
    await repo.saveSectionContent(id, "bilingual", fixtureBank, { model: "test-model", inputHash: "hash-1" });

    expect(await prisma.interviewTopic.count({ where: { packageId: id } })).toBe(2);
    expect(await prisma.interviewQuestion.count({ where: { packageId: id } })).toBe(2);
    expect(await prisma.followUpQuestion.count({ where: { question: { packageId: id } } })).toBe(4);
    const q1 = await prisma.interviewQuestion.findUnique({
      where: { packageId_itemId: { packageId: id, itemId: "fx-q01" } },
      include: { topic: true },
    });
    expect(q1?.topic?.topicKey).toBe("react");

    const pkg = await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer");
    expect(pkg?.sections.bilingual).toEqual(fixtureBank);
    expect(pkg?.sectionStates.bilingual).toMatchObject({ status: "ready", model: "test-model", inputHash: "hash-1" });

    const summary = (await repo.listPackages()).find((p) => p.slug === "acme-da-nang-senior-front-end-engineer");
    expect(summary).toMatchObject({ readySections: 1, totalSections: 16, questionCount: 2 });

    await expect(
      repo.saveSectionContent(id, "bilingual", { topics: [], questions: [] } as never, {}),
    ).rejects.toThrow();
    await expect(repo.saveSectionContent("missing", "bilingual", fixtureBank, {})).rejects.toBeInstanceOf(
      repo.PackageNotFoundError,
    );
  });

  it("replaces a single question in both the section content and the normalized rows", async () => {
    const id = (await repo.getPackageIdBySlug("acme-da-nang-senior-front-end-engineer"))!;
    const base = makeQuestion(2, "realtime");
    const updated = makeQuestion(2, "react", {
      answer: "Regenerated answer.",
      followUps: [
        ...base.followUps,
        { id: "fx-q02-f3", question: { en: "f3?", vi: "f3?" }, answer: { en: "a", vi: "a" } },
      ],
    });
    await repo.replaceQuestion(id, updated);

    const pkg = await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer");
    expect(pkg?.sections.bilingual?.questions[1]).toEqual(updated);
    expect(pkg?.sections.bilingual?.questions[0]).toEqual(fixtureBank.questions[0]);

    const row = await prisma.interviewQuestion.findUnique({
      where: { packageId_itemId: { packageId: id, itemId: "fx-q02" } },
      include: { followUps: true, topic: true },
    });
    expect((row?.data as { answer: string }).answer).toBe("Regenerated answer.");
    expect(row?.topic?.topicKey).toBe("react");
    expect(row?.followUps).toHaveLength(3);

    await expect(repo.replaceQuestion(id, makeQuestion(42, "react"))).rejects.toBeInstanceOf(
      repo.QuestionNotFoundError,
    );
  });

  it("writes nothing when the optimistic check rejects the stored question", async () => {
    const id = (await repo.getPackageIdBySlug("acme-da-nang-senior-front-end-engineer"))!;
    const before = (await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer"))?.sections.bilingual
      ?.questions[0];
    const replaced = await repo.replaceQuestion(id, makeQuestion(1, "react", { answer: "Should not land." }), {
      isUnchanged: (stored) => stored.topicId === "not-the-topic",
    });
    expect(replaced).toBe(false);
    const after = await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer");
    expect(after?.sections.bilingual?.questions[0]).toEqual(before);
  });

  it("updates section state and reports invalid stored content as failed", async () => {
    const id = (await repo.getPackageIdBySlug("acme-da-nang-senior-front-end-engineer"))!;
    await repo.setSectionState(id, "coding", { status: "generating" });
    await repo.setSectionState(id, "jd", { status: "failed", error: "Provider timeout" });
    await prisma.packageSection.update({
      where: { packageId_key: { packageId: id, key: "company" } },
      data: { status: "ready", content: { overview: "not a fact" } },
    });

    const pkg = await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer");
    expect(pkg?.sectionStates.coding.status).toBe("generating");
    expect(pkg?.sectionStates.jd).toEqual({ status: "failed", error: "Provider timeout" });
    expect(pkg?.sections.company).toBeUndefined();
    expect(pkg?.sectionStates.company.status).toBe("failed");

    await repo.setSectionState(id, "jd", { status: "pending" });
    expect((await repo.getPackageBySlug("acme-da-nang-senior-front-end-engineer"))?.sectionStates.jd).toEqual({
      status: "pending",
    });
  });

  it("stores progress with last-write-wins", async () => {
    const slug = "acme-da-nang-senior-front-end-engineer";
    expect(await progressRepo.getProgress(slug)).toBeNull();

    const newer = progressAt("2026-11-20T10:00:00.000Z", ["fx-q01"]);
    const older = progressAt("2026-11-20T09:00:00.000Z", ["fx-q02"]);
    expect(await progressRepo.saveProgress(slug, newer)).toEqual(newer);
    expect(await progressRepo.saveProgress(slug, older)).toEqual(newer);
    expect(await progressRepo.getProgress(slug)).toEqual(newer);

    const newest = progressAt("2026-11-20T11:00:00.000Z", ["fx-q01", "fx-q02"]);
    expect(await progressRepo.saveProgress(slug, newest)).toEqual(newest);
    expect(await progressRepo.getProgress(slug)).toEqual(newest);

    await expect(progressRepo.saveProgress(slug, { studied: "x" } as never)).rejects.toThrow();
    await expect(progressRepo.saveProgress("unknown-slug", newer)).rejects.toBeInstanceOf(repo.PackageNotFoundError);

    // Built-in sample: stored on first use (no seed step, e.g. on Cloudflare D1), then it persists.
    expect(await repo.getPackageIdBySlug(ISB_SLUG)).toBeNull();
    expect(await progressRepo.saveProgress(ISB_SLUG, newer)).toEqual(newer);
    expect(await repo.getPackageIdBySlug(ISB_SLUG)).not.toBeNull();
    expect(await progressRepo.getProgress(ISB_SLUG)).toEqual(newer);
  });

  it("stores a built-in sample once even when first uses overlap", async () => {
    const ids = await Promise.all([repo.ensureSamplePackageStored(ISB_SLUG), repo.ensureSamplePackageStored(ISB_SLUG)]);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    expect(await prisma.interviewPackage.count({ where: { slug: ISB_SLUG } })).toBe(1);
    expect(await repo.ensureSamplePackageStored("not-a-sample")).toBeNull();
  });

  it("upserts the ISB sample idempotently and keeps its progress", async () => {
    const first = await repo.upsertFullPackage(isbSamplePackage);
    const progress = progressAt("2026-11-26T00:00:00.000Z", ["anything"]);
    await progressRepo.saveProgress(ISB_SLUG, progress);
    const second = await repo.upsertFullPackage(isbSamplePackage);

    expect(second.packageId).toBe(first.packageId);
    expect(second.counts).toEqual(first.counts);
    expect(await prisma.interviewPackage.count({ where: { slug: ISB_SLUG } })).toBe(1);
    expect(await prisma.interviewQuestion.count({ where: { packageId: first.packageId } })).toBe(
      first.counts.questions,
    );
    expect(await prisma.researchSource.count({ where: { packageId: first.packageId } })).toBe(
      first.counts.researchSources,
    );
    expect(await prisma.jobDescription.count({ where: { origin: "seed" } })).toBe(1);
    expect(await prisma.company.count({ where: { code: "ISB" } })).toBe(1);
    expect(await progressRepo.getProgress(ISB_SLUG)).toEqual(progress);

    const stored = await repo.getPackageBySlug(ISB_SLUG);
    expect(stored?.meta.isSample).toBe(true);
    expect(stored?.meta.id).toBe(first.packageId);
    expect(Object.keys(stored?.sections ?? {}).sort()).toEqual([...first.readySections].sort());

    const slugs = (await repo.listPackages()).map((p) => p.slug);
    expect(slugs.filter((s) => s === ISB_SLUG)).toHaveLength(1);
  });

  it("deletes user packages (cascading) but never samples", async () => {
    await expect(repo.deletePackage(ISB_SLUG)).rejects.toBeInstanceOf(repo.SamplePackageError);
    await expect(repo.deletePackage("nope")).rejects.toBeInstanceOf(repo.PackageNotFoundError);

    const slug = "acme-da-nang-senior-front-end-engineer";
    const id = (await repo.getPackageIdBySlug(slug))!;
    await repo.deletePackage(slug);

    expect(await repo.getPackageBySlug(slug)).toBeNull();
    expect(await prisma.packageSection.count({ where: { packageId: id } })).toBe(0);
    expect(await prisma.interviewQuestion.count({ where: { packageId: id } })).toBe(0);
    expect(await prisma.interviewTopic.count({ where: { packageId: id } })).toBe(0);
    expect(await prisma.studyProgress.count({ where: { packageId: id } })).toBe(0);
    expect(await prisma.researchSource.count({ where: { packageId: id } })).toBe(0);
    // The sibling package (-2) is untouched.
    expect(await repo.getPackageBySlug(`${slug}-2`)).not.toBeNull();
  });

  it("clamps a long derived company code and an extracted job title instead of rejecting them", async () => {
    const companyName = "Công ty TNHH Giải pháp Phần mềm Quốc tế ISB Việt Nam Chi nhánh Hồ Chí Minh";
    expect(companyName.length).toBeGreaterThan(60);
    const longTitle = `Senior Frontend Developer ${"(React, TypeScript, Next.js) ".repeat(8)}`.trim();
    expect(longTitle.length).toBeGreaterThan(160);

    const meta = await repo.createPackageShell({
      companyName,
      companyCode: companyName,
      jobTitle: "",
      jd: { ...fixtureJd, jobTitle: longTitle },
    });

    expect(meta.companyName).toBe(companyName);
    expect(meta.companyCode.length).toBeLessThanOrEqual(60);
    expect(meta.companyCode).toMatch(/^CONG_TY_TNHH_GIAI_PHAP_PHAN_MEM_QUOC_TE_ISB_VIET_NAM_CHI_NH/);
    expect(meta.companyCode).not.toMatch(/_$/);
    expect(meta.jobTitle.length).toBeLessThanOrEqual(160);
    expect(meta.jobTitle.startsWith("Senior Frontend Developer")).toBe(true);
    await repo.deletePackage(meta.slug);
  });
});
