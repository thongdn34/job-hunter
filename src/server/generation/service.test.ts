import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelJob,
  failUnfinishedProgress,
  getJobDto,
  getLatestJobDtoForPackage,
  INTERRUPTED_SECTION_ERROR,
  sectionsToResume,
  startMissingSectionsGeneration,
  startSectionGeneration,
} from "./service";
import { regenerateQuestion } from "./regenerate-question";
import { runGenerationJob } from "./pipeline";
import { GenerationRequestError } from "./errors";
import { fakeStore, FAKE_PACKAGE_ID, FAKE_SLUG, jobRepositoryFake, resetFakeStore } from "./test-fakes";
import { getProviderForGeneration } from "@/server/ai/provider";
import { SECTION_KEYS } from "@/domain/package/sections";

vi.mock("@/server/repositories/package-repository", async () => (await import("./test-fakes")).packageRepositoryFake);
vi.mock("@/server/repositories/profile-repository", async () => (await import("./test-fakes")).profileRepositoryFake);
vi.mock(
  "@/server/repositories/generation-job-repository",
  async () => (await import("./test-fakes")).jobRepositoryFake,
);

async function waitForJob(id: string) {
  for (let i = 0; i < 200; i += 1) {
    const job = await getJobDto(id);
    if (job && !["queued", "running"].includes(job.status)) return job;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("job did not finish");
}

const expectCode = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GenerationRequestError);
  expect((error as GenerationRequestError).code).toBe(code);
};

beforeEach(() => {
  resetFakeStore();
  vi.stubEnv("AI_PROVIDER", "mock");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startSectionGeneration", () => {
  it("starts a background job that also generates missing dependencies", async () => {
    const dto = await startSectionGeneration(FAKE_SLUG, "cv", false);
    expect(dto.sections).toEqual(["jd", "match", "cv"]);
    const job = await waitForJob(dto.id);
    expect(job.status).toBe("succeeded");
    expect(fakeStore.states.cv.status).toBe("ready");
  });

  it("rejects samples, unknown packages, missing providers and concurrent jobs", async () => {
    await expectCode(startSectionGeneration("missing", "cv", false), "NOT_FOUND");

    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expectCode(startSectionGeneration(FAKE_SLUG, "cv", false), "AI_NOT_CONFIGURED");
    vi.stubEnv("AI_PROVIDER", "mock");

    await jobRepositoryFake.createGenerationJob({ packageId: FAKE_PACKAGE_ID, sections: ["jd"] }); // queued, just created
    await expectCode(startSectionGeneration(FAKE_SLUG, "jd", false), "JOB_RUNNING");

    resetFakeStore({ isSample: true });
    await expectCode(startSectionGeneration(FAKE_SLUG, "jd", true), "SAMPLE_READ_ONLY");
  });

  it("starts only one job when two retries overlap", async () => {
    const results = await Promise.allSettled([
      startSectionGeneration(FAKE_SLUG, "jd", false),
      startSectionGeneration(FAKE_SLUG, "company", false),
    ]);
    const started = results.filter((r) => r.status === "fulfilled");
    expect(started).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect((rejected?.reason as GenerationRequestError).code).toBe("JOB_RUNNING");
    expect(fakeStore.jobs.size).toBe(1);
    if (started[0]?.status === "fulfilled") await waitForJob(started[0].value.id);
  });
});

describe("interrupted jobs (server restart)", () => {
  async function orphanJob() {
    const created = await jobRepositoryFake.createGenerationJob({
      packageId: FAKE_PACKAGE_ID,
      sections: ["jd", "match", "cv"],
    });
    // Simulate a process that died mid-run: jd done, match generating, cv not started.
    const stored = fakeStore.jobs.get(created.id)!;
    stored.status = "running";
    stored.createdAt = new Date(Date.now() - 60_000).toISOString();
    stored.progress = {
      jd: { status: "ready", attempts: 1 },
      match: { status: "generating", attempts: 1 },
      cv: { status: "pending", attempts: 0 },
    };
    fakeStore.sections.jd = {} as never;
    fakeStore.states.jd = { status: "ready" };
    fakeStore.states.match = { status: "generating" };
    return created;
  }

  it("fails the job, its unfinished progress and the stuck section states", async () => {
    const created = await orphanJob();
    const job = await getLatestJobDtoForPackage(FAKE_SLUG);
    expect(job?.id).toBe(created.id);
    expect(job?.status).toBe("failed");
    expect(job?.progress.jd?.status).toBe("ready");
    expect(job?.progress.match).toMatchObject({ status: "failed", error: INTERRUPTED_SECTION_ERROR });
    expect(job?.progress.cv).toMatchObject({ status: "failed", error: INTERRUPTED_SECTION_ERROR });
    expect(fakeStore.states.jd.status).toBe("ready");
    expect(fakeStore.states.match).toMatchObject({ status: "failed", error: INTERRUPTED_SECTION_ERROR });
    expect(fakeStore.states.cv).toMatchObject({ status: "failed", error: INTERRUPTED_SECTION_ERROR });
    // The sections can be retried right away.
    const retry = await startSectionGeneration(FAKE_SLUG, "cv", false);
    expect(retry.sections).toEqual(["match", "cv"]);
    expect((await waitForJob(retry.id)).status).toBe("succeeded");
  });

  it("keeps earlier content of a section whose regeneration was interrupted", async () => {
    await orphanJob();
    fakeStore.sections.match = { placeholder: true } as never;
    await getLatestJobDtoForPackage(FAKE_SLUG);
    expect(fakeStore.states.match.status).toBe("ready");
    expect(fakeStore.states.match.error).toContain("interrupted");
    expect(fakeStore.sections.match).toEqual({ placeholder: true });
  });

  it("cancelling an orphaned job marks it and its unfinished sections cancelled", async () => {
    const created = await orphanJob();
    const job = await cancelJob(created.id);
    expect(job.status).toBe("cancelled");
    expect(job.progress.match?.status).toBe("cancelled");
    expect(job.progress.cv?.status).toBe("cancelled");
    expect(fakeStore.states.match.status).toBe("pending");
    expect(fakeStore.states.jd.status).toBe("ready");
  });

  it("failUnfinishedProgress only touches pending/generating/missing entries", () => {
    const progress = failUnfinishedProgress(
      {
        sections: ["jd", "company", "match", "cv"],
        progress: {
          jd: { status: "ready" },
          company: { status: "cancelled" },
          match: { status: "generating", attempts: 2 },
        },
      },
      "2026-11-01T00:00:00.000Z",
    );
    expect(progress.jd?.status).toBe("ready");
    expect(progress.company?.status).toBe("cancelled");
    expect(progress.match).toMatchObject({ status: "failed", attempts: 2, finishedAt: "2026-11-01T00:00:00.000Z" });
    expect(progress.cv).toMatchObject({ status: "failed", attempts: 0 });
  });
});

describe("startMissingSectionsGeneration", () => {
  it("generates only the sections without content, leaving ready sections untouched", async () => {
    const first = await startSectionGeneration(FAKE_SLUG, "cv", false);
    await waitForJob(first.id);
    const readyBefore = structuredClone(fakeStore.states);
    fakeStore.saveCalls = [];

    const dto = await startMissingSectionsGeneration(FAKE_SLUG);
    expect(dto.sections).not.toContain("jd");
    expect(dto.sections).toHaveLength(SECTION_KEYS.length - 3);
    expect((await waitForJob(dto.id)).status).toBe("succeeded");
    expect(fakeStore.saveCalls).not.toContain("jd");
    expect(fakeStore.saveCalls).not.toContain("cv");
    expect(fakeStore.states.jd).toEqual(readyBefore.jd);
    for (const key of SECTION_KEYS) expect(fakeStore.states[key].status, key).toBe("ready");
  });

  it("also refreshes outdated sections", () => {
    const sections = { jd: {}, company: {}, hr: {} } as never;
    const sectionStates = Object.fromEntries(SECTION_KEYS.map((k) => [k, { status: "ready" }])) as never as Record<
      (typeof SECTION_KEYS)[number],
      { status: "ready" | "stale" }
    >;
    sectionStates.hr = { status: "stale" };
    expect(sectionsToResume({ sections, sectionStates })).toEqual(
      SECTION_KEYS.filter((k) => k !== "jd" && k !== "company"),
    );
  });

  it("rejects when nothing is missing, for samples and while a job runs", async () => {
    await jobRepositoryFake.createGenerationJob({ packageId: FAKE_PACKAGE_ID, sections: ["jd"] }); // queued, just created
    await expectCode(startMissingSectionsGeneration(FAKE_SLUG), "JOB_RUNNING");

    resetFakeStore();
    for (const key of SECTION_KEYS) {
      fakeStore.sections[key] = {};
      fakeStore.states[key] = { status: "ready" };
    }
    await expectCode(startMissingSectionsGeneration(FAKE_SLUG), "NOT_READY");

    resetFakeStore({ isSample: true });
    await expectCode(startMissingSectionsGeneration(FAKE_SLUG), "SAMPLE_READ_ONLY");
  });
});

describe("cancelJob", () => {
  it("cancels a queued job before it starts", async () => {
    const created = await jobRepositoryFake.createGenerationJob({
      packageId: FAKE_PACKAGE_ID,
      sections: [...SECTION_KEYS],
    });
    const requested = await cancelJob(created.id);
    expect(requested.id).toBe(created.id);
    const job = await runGenerationJob(created.id, { provider: getProviderForGeneration() });
    expect(job?.status).toBe("cancelled");
    expect(fakeStore.saveCalls).toEqual([]);
  });

  it("returns finished jobs unchanged and 404s unknown ids", async () => {
    const created = await jobRepositoryFake.createGenerationJob({ packageId: FAKE_PACKAGE_ID, sections: ["jd"] });
    await runGenerationJob(created.id, { provider: getProviderForGeneration() });
    expect((await cancelJob(created.id)).status).toBe("succeeded");
    await expectCode(cancelJob("nope"), "NOT_FOUND");
  });
});

describe("regenerateQuestion", () => {
  it("replaces one question keeping its id, number and topic", async () => {
    const created = await jobRepositoryFake.createGenerationJob({
      packageId: FAKE_PACKAGE_ID,
      sections: ["jd", "match", "bilingual"],
    });
    await runGenerationJob(created.id, { provider: getProviderForGeneration() });
    const bank = fakeStore.sections.bilingual as {
      questions: Array<{ id: string; number: number; topicId: string; answer: string }>;
    };
    const target = bank.questions[2];

    const question = await regenerateQuestion(FAKE_SLUG, target.id);
    expect(question).toMatchObject({ id: target.id, number: target.number, topicId: target.topicId });
    expect(question.answer).toContain("regenerated");
    expect(question.followUps[0].id).toBe(`${target.id}-f1`);
    const stored = (fakeStore.sections.bilingual as typeof bank).questions[2];
    expect(stored.answer).toBe(question.answer);
  });

  async function generateBank() {
    const created = await jobRepositoryFake.createGenerationJob({
      packageId: FAKE_PACKAGE_ID,
      sections: ["jd", "match", "bilingual"],
    });
    await runGenerationJob(created.id, { provider: getProviderForGeneration() });
    return fakeStore.sections.bilingual as {
      questions: Array<{ id: string; topicId: string; question: { en: string } }>;
    };
  }

  it("is refused while a generation job runs for the package", async () => {
    const bank = await generateBank();
    await jobRepositoryFake.createGenerationJob({ packageId: FAKE_PACKAGE_ID, sections: ["bilingual"] });
    await expectCode(regenerateQuestion(FAKE_SLUG, bank.questions[0].id), "JOB_RUNNING");
  });

  it("does not overwrite a question that changed during the model call", async () => {
    const bank = await generateBank();
    const target = bank.questions[1];
    const provider = getProviderForGeneration()!;
    const racing = {
      ...provider,
      createModel: (...args: Parameters<typeof provider.createModel>) => {
        // A bank regeneration lands while the single question is being generated.
        const stored = (fakeStore.sections.bilingual as typeof bank).questions[1];
        stored.question.en = "A different question now holds this id?";
        return provider.createModel(...args);
      },
    };
    await expectCode(regenerateQuestion(FAKE_SLUG, target.id, { provider: racing }), "CONFLICT");
    expect((fakeStore.sections.bilingual as typeof bank).questions[1].question.en).toBe(
      "A different question now holds this id?",
    );
  });

  it("reports missing questions and unready banks", async () => {
    await expectCode(regenerateQuestion(FAKE_SLUG, "acme-q01"), "NOT_READY");
    resetFakeStore({ isSample: true });
    await expectCode(regenerateQuestion(FAKE_SLUG, "acme-q01"), "SAMPLE_READ_ONLY");
  });
});
