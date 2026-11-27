import { beforeEach, describe, expect, it, vi } from "vitest";
import { SectionContentSchemas } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { getProviderForGeneration } from "@/server/ai/provider";
import type { MockModelOptions } from "@/server/ai/mock";
import { GENERATION_COUNTS } from "@/server/ai/schemas";
import { dependentsOf, expandSectionsWithMissingDependencies, finalJobStatus, runGenerationJob } from "./pipeline";
import { fakeStore, FAKE_PACKAGE_ID, jobRepositoryFake, resetFakeStore } from "./test-fakes";

vi.mock("@/server/repositories/package-repository", async () => (await import("./test-fakes")).packageRepositoryFake);
vi.mock("@/server/repositories/profile-repository", async () => (await import("./test-fakes")).profileRepositoryFake);
vi.mock(
  "@/server/repositories/generation-job-repository",
  async () => (await import("./test-fakes")).jobRepositoryFake,
);

const FAST_RETRY = { baseDelayMs: 0, maxDelayMs: 0 };

function mockProvider(mock: MockModelOptions = {}) {
  const provider = getProviderForGeneration({ env: { AI_PROVIDER: "mock" }, mock });
  if (!provider) throw new Error("mock provider should always be configured");
  return provider;
}

async function runJob(
  sections: readonly SectionKey[] = SECTION_KEYS,
  options: { mock?: MockModelOptions; force?: boolean } = {},
) {
  const job = await jobRepositoryFake.createGenerationJob({
    packageId: FAKE_PACKAGE_ID,
    sections: [...sections],
    provider: "mock",
    model: "mock-run10-v1",
  });
  const result = await runGenerationJob(job.id, {
    provider: mockProvider(options.mock),
    retry: FAST_RETRY,
    force: options.force,
  });
  if (!result) throw new Error("job vanished");
  return result;
}

beforeEach(() => {
  resetFakeStore();
});

describe("runGenerationJob with the mock provider", () => {
  it("generates, validates and persists every section", async () => {
    const job = await runJob();

    expect(job.status).toBe("succeeded");
    expect(job.error).toBeUndefined();
    for (const key of SECTION_KEYS) {
      expect(fakeStore.states[key].status, key).toBe("ready");
      expect(job.progress[key]?.status, key).toBe("ready");
      expect(SectionContentSchemas[key].safeParse(fakeStore.sections[key]).success, key).toBe(true);
      expect(fakeStore.states[key].inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(fakeStore.states[key].model).toBe("mock:mock-run10-v1");
    }

    const bank = SectionContentSchemas.bilingual.parse(fakeStore.sections.bilingual);
    expect(bank.questions.length).toBeGreaterThanOrEqual(GENERATION_COUNTS.questionsTotal.min);
    expect(bank.questions.length).toBeLessThanOrEqual(GENERATION_COUNTS.questionsTotal.max);
    // Merged + renumbered with stable ids.
    bank.questions.forEach((q, i) => {
      expect(q.number).toBe(i + 1);
      expect(q.id).toBe(`acme-q${String(i + 1).padStart(2, "0")}`);
      expect(bank.topics.some((t) => t.id === q.topicId)).toBe(true);
    });

    const cheatsheet = SectionContentSchemas.cheatsheet.parse(fakeStore.sections.cheatsheet);
    expect(cheatsheet.flashcards.length).toBeGreaterThanOrEqual(24);
    const studyPlan = SectionContentSchemas.studyPlan.parse(fakeStore.sections.studyPlan);
    const knownIds = new Set([
      ...bank.questions.map((q) => q.id),
      ...SectionContentSchemas.systemDesign.parse(fakeStore.sections.systemDesign).scenarios.map((s) => s.id),
      ...SectionContentSchemas.coding.parse(fakeStore.sections.coding).exercises.map((e) => e.id),
      ...SectionContentSchemas.star.parse(fakeStore.sections.star).questions.map((q) => q.id),
    ]);
    const related = studyPlan.plans.flatMap((p) => p.days.flatMap((d) => d.tasks.flatMap((t) => t.relatedItemIds)));
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((id) => knownIds.has(id))).toBe(true);
    const mock = SectionContentSchemas.mock.parse(fakeStore.sections.mock);
    expect(mock.questionPool.every((id) => knownIds.has(id))).toBe(true);

    // Excluded experience never leaks into generated content.
    expect(JSON.stringify(fakeStore.sections)).not.toContain("Elfie");
  });

  it("isolates a failing section: it ends as failed, others succeed, job is partial", async () => {
    const job = await runJob(SECTION_KEYS, { mock: { failSections: ["company", "coding"] } });

    expect(job.status).toBe("partial");
    expect(job.error).toMatch(/failed/);
    expect(fakeStore.states.company.status).toBe("failed");
    expect(fakeStore.states.company.error).toMatch(/repair attempt/);
    expect(fakeStore.states.coding.status).toBe("failed");
    // Dependents of failed sections fail fast with a readable error.
    expect(fakeStore.states.hr.status).toBe("failed");
    expect(fakeStore.states.hr.error).toMatch(/Company Research/);
    expect(fakeStore.states.studyPlan.status).toBe("failed");
    // Independent sections still succeed.
    for (const key of [
      "jd",
      "match",
      "cv",
      "intro",
      "email",
      "bilingual",
      "systemDesign",
      "star",
      "project",
      "cheatsheet",
      "mock",
      "assessment",
    ] as const) {
      expect(fakeStore.states[key].status, key).toBe("ready");
    }
  });

  it("retrying a failed section succeeds", async () => {
    await runJob(SECTION_KEYS, { mock: { failSections: ["company"] } });
    expect(fakeStore.states.company.status).toBe("failed");

    const sections = expandSectionsWithMissingDependencies(["company"], { sections: fakeStore.sections as never });
    expect(sections).toEqual(["company"]);
    const retry = await runJob(sections);

    expect(retry.status).toBe("succeeded");
    expect(fakeStore.states.company.status).toBe("ready");
    expect(fakeStore.states.company.error).toBeUndefined();

    // hr was skipped earlier because company failed; retrying hr pulls nothing extra now.
    const hrRetry = await runJob(
      expandSectionsWithMissingDependencies(["hr"], { sections: fakeStore.sections as never }),
    );
    expect(hrRetry.status).toBe("succeeded");
    expect(fakeStore.states.hr.status).toBe("ready");
  });

  it("skips ready sections whose input hash is unchanged unless forced", async () => {
    await runJob();
    fakeStore.saveCalls = [];

    const second = await runJob();
    expect(second.status).toBe("succeeded");
    expect(fakeStore.saveCalls).toEqual([]);
    for (const key of SECTION_KEYS) expect(second.progress[key]?.status, key).toBe("skipped");

    const forced = await runJob(["intro"], { force: true });
    expect(forced.progress.intro?.status).toBe("ready");
    expect(fakeStore.saveCalls).toEqual(["intro"]);
  });

  it("regenerates when the profile changes (hash includes the generation profile)", async () => {
    await runJob(["jd", "match"]);
    fakeStore.saveCalls = [];
    fakeStore.profile = { ...fakeStore.profile, headline: "Staff Software Engineer" };

    const job = await runJob(["jd", "match"]);
    expect(job.progress.jd?.status).toBe("ready");
    expect(fakeStore.saveCalls).toEqual(["jd", "match"]);
  });

  it("marks ready dependents outside the job as stale when a dependency changes", async () => {
    await runJob();
    fakeStore.profile = { ...fakeStore.profile, summary: "Changed summary" };
    await runJob(["match"]);
    expect(fakeStore.states.cv.status).toBe("stale");
    expect(fakeStore.states.assessment.status).toBe("stale");
    expect(fakeStore.states.coding.status).toBe("ready"); // does not depend on match
  });

  it("cancellation stops the remaining sections", async () => {
    let jobId = "";
    fakeStore.onSave = (key) => {
      if (key === "match") void jobRepositoryFake.requestJobCancel(jobId);
    };
    const created = await jobRepositoryFake.createGenerationJob({
      packageId: FAKE_PACKAGE_ID,
      sections: [...SECTION_KEYS],
    });
    jobId = created.id;
    const job = await runGenerationJob(jobId, { provider: mockProvider(), retry: FAST_RETRY, concurrency: 1 });

    expect(job?.status).toBe("cancelled");
    expect(fakeStore.states.jd.status).toBe("ready");
    expect(fakeStore.states.match.status).toBe("ready");
    expect(fakeStore.saveCalls).not.toContain("assessment");
    expect(job?.progress.assessment?.status).toBe("cancelled");
    // Nothing is left in a "generating" state.
    expect(Object.values(fakeStore.states).some((s) => s.status === "generating")).toBe(false);
  });

  it("malformed output triggers one repair attempt, then the section fails", async () => {
    const job = await runJob(["jd"], { mock: { failSections: ["jd"] } });
    expect(job.status).toBe("failed");
    expect(job.progress.jd?.attempts).toBe(2); // original + one repair
    expect(fakeStore.states.jd.status).toBe("failed");
    expect(fakeStore.states.jd.error).toMatch(/did not match the expected structure/);
  });

  it("a repair attempt fixes malformed output", async () => {
    const job = await runJob(["jd"], { mock: { malformedOnceSections: ["jd"] } });
    expect(job.status).toBe("succeeded");
    expect(job.progress.jd?.attempts).toBe(2);
    expect(fakeStore.states.jd.status).toBe("ready");
  });

  it("retries rate-limited calls with backoff", async () => {
    const job = await runJob(["jd"], { mock: { rateLimitOnceSections: ["jd"] } });
    expect(job.status).toBe("succeeded");
    expect(job.progress.jd?.attempts).toBe(2);
  });

  it("refuses to regenerate sample packages", async () => {
    resetFakeStore({ isSample: true });
    const job = await runJob(["jd"]);
    expect(job.status).toBe("failed");
    expect(job.error).toMatch(/read-only/);
    expect(fakeStore.saveCalls).toEqual([]);
  });

  it("fails the job when no provider is configured", async () => {
    const created = await jobRepositoryFake.createGenerationJob({ packageId: FAKE_PACKAGE_ID, sections: ["jd"] });
    const job = await runGenerationJob(created.id, { provider: null });
    expect(job?.status).toBe("failed");
    expect(job?.error).toMatch(/No AI provider/);
    expect(job?.progress.jd).toMatchObject({ status: "failed", error: expect.stringMatching(/No AI provider/) });
    expect(fakeStore.states.jd).toMatchObject({ status: "failed" });
  });

  it("finalizes every progress entry and section state when the run throws early", async () => {
    fakeStore.jd = null; // getNormalizedJd → null: run() throws before any section starts
    fakeStore.sections.company = { kept: true };
    fakeStore.states.company = { status: "generating" };
    const job = await runJob(["jd", "company", "match"]);
    expect(job.status).toBe("failed");
    expect(job.error).toMatch(/normalized job description/);
    for (const key of ["jd", "company", "match"] as const) {
      expect(job.progress[key]?.status, key).toBe("failed");
      expect(job.progress[key]?.finishedAt, key).toBeDefined();
    }
    expect(fakeStore.states.jd).toMatchObject({ status: "failed" });
    expect(fakeStore.states.match).toMatchObject({ status: "failed" });
    // A section with earlier content keeps it and is released from "generating".
    expect(fakeStore.states.company.status).toBe("ready");
    expect(fakeStore.sections.company).toEqual({ kept: true });
  });
});

describe("pipeline helpers", () => {
  it("computes the final job status", () => {
    expect(finalJobStatus(["ready", "skipped"])).toBe("succeeded");
    expect(finalJobStatus(["ready", "failed"])).toBe("partial");
    expect(finalJobStatus(["failed", "failed"])).toBe("failed");
    expect(finalJobStatus(["ready", "cancelled"])).toBe("cancelled");
  });

  it("expands missing dependencies transitively", () => {
    expect(expandSectionsWithMissingDependencies(["cv"], { sections: {} })).toEqual(["jd", "match", "cv"]);
    expect(expandSectionsWithMissingDependencies(["studyPlan"], { sections: {} })).toEqual([
      "jd",
      "match",
      "bilingual",
      "systemDesign",
      "coding",
      "star",
      "studyPlan",
    ]);
  });

  it("lists transitive dependents", () => {
    expect(dependentsOf("company")).toEqual(["hr"]);
    expect(dependentsOf("coding")).toEqual(["studyPlan"]);
  });
});
