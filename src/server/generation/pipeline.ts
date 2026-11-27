import "server-only";
import type { GenerationJobStatus, SectionProgress } from "@/domain/generation/schema";
import type { InterviewPackage, SectionContentMap, SectionState } from "@/domain/package/schema";
import { SECTION_DEFINITIONS, SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { getProviderForGeneration, type GenerationProvider } from "@/server/ai/provider";
import type { MockGenerationContext } from "@/server/ai/mock";
import type { TopicPlan } from "@/server/ai/schemas";
import {
  getNormalizedJd,
  getPackageBySlug,
  saveSectionContent,
  setSectionState,
} from "@/server/repositories/package-repository";
import { getProfile } from "@/server/repositories/profile-repository";
import {
  getGenerationJob,
  isJobCancelRequested,
  updateGenerationJob,
  type GenerationJobRecord,
  type JobProgress,
} from "@/server/repositories/generation-job-repository";
import { GenerationCancelledError, describeError, isAbortError } from "./errors";
import { computeSectionInputHash } from "./hash";
import { itemIdPrefix } from "./normalize";
import { createLimiter, registerJob, unregisterJob } from "./registry";
import type { RetryOptions } from "./retry";
import { generateSectionContent, type SectionGeneratorContext } from "./section-generators";
import { finalizeUnfinishedProgress, releaseUnfinishedSections, type UnfinishedOutcome } from "./unfinished";

/**
 * Run #10 generation pipeline (one GenerationJob):
 *
 *   load job → package (samples are read-only) → normalized JD → candidate profile
 *   → sections in dependency order (SECTION_DEFINITIONS.dependsOn), up to `concurrency` model
 *     calls in flight. match = requirements & gaps; bilingual = topic plan → per-topic batches.
 *   → each section: input hash (skip unchanged ready sections unless force) → generate →
 *     normalize ids → sanitize → validate (Zod) → saveSectionContent → job progress.
 *
 * Failures are isolated per section (dependents of a failed section fail fast with a readable
 * error). Cancellation: AbortController registry (in-flight calls abort immediately) +
 * GenerationJob.cancelRequested polled between steps.
 *
 * Started through the JobRunner (job-runner.ts): in-process under Node.js, inside a Cloudflare
 * Workflow on Workers (POST /api/internal/generation/run). Idempotent enough to be retried: ready
 * sections whose input hash is unchanged are skipped.
 */

export const DEFAULT_CONCURRENCY = 3;

export interface RunGenerationOptions {
  /** Regenerate even when the input hash is unchanged. */
  force?: boolean;
  /** Injected provider (tests). Defaults to getProviderForGeneration(). */
  provider?: GenerationProvider | null;
  concurrency?: number;
  retry?: RetryOptions;
}

type Outcome = "ready" | "skipped" | "failed" | "cancelled";

function nowIso(): string {
  return new Date().toISOString();
}

export function finalJobStatus(outcomes: Outcome[]): GenerationJobStatus {
  if (outcomes.length === 0) return "succeeded";
  if (outcomes.some((o) => o === "cancelled")) return "cancelled";
  const failed = outcomes.filter((o) => o === "failed").length;
  if (failed === 0) return "succeeded";
  return failed === outcomes.length ? "failed" : "partial";
}

/** Adds (transitively) dependencies that have no usable content yet, so a retried section can run. */
export function expandSectionsWithMissingDependencies(
  requested: readonly SectionKey[],
  pkg: Pick<InterviewPackage, "sections">,
): SectionKey[] {
  const result = new Set<SectionKey>(requested);
  const visit = (key: SectionKey) => {
    for (const dep of SECTION_DEFINITIONS[key].dependsOn) {
      if (!result.has(dep) && pkg.sections[dep] === undefined) {
        result.add(dep);
        visit(dep);
      }
    }
  };
  requested.forEach(visit);
  return SECTION_KEYS.filter((k) => result.has(k));
}

/** Sections (transitively) depending on `key`. */
export function dependentsOf(key: SectionKey): SectionKey[] {
  const out = new Set<SectionKey>();
  const visit = (k: SectionKey) => {
    for (const candidate of SECTION_KEYS) {
      if (SECTION_DEFINITIONS[candidate].dependsOn.includes(k) && !out.has(candidate)) {
        out.add(candidate);
        visit(candidate);
      }
    }
  };
  visit(key);
  return SECTION_KEYS.filter((k) => out.has(k));
}

class JobRun {
  private progress: JobProgress = {};
  private writes: Promise<unknown> = Promise.resolve();
  private readonly outcomes = new Map<SectionKey, Outcome>();
  private readonly available: Partial<SectionContentMap> = {};
  private readonly changed = new Set<SectionKey>();
  private topicPlan?: TopicPlan;

  constructor(
    private readonly job: GenerationJobRecord,
    private readonly pkg: InterviewPackage,
    private readonly provider: GenerationProvider,
    private readonly controller: AbortController,
    private readonly options: RunGenerationOptions,
  ) {
    for (const key of SECTION_KEYS) {
      const content = pkg.sections[key];
      if (content !== undefined) (this.available as Record<SectionKey, unknown>)[key] = content;
    }
    this.progress = Object.fromEntries(
      job.sections.map((k) => [k, { status: "pending", attempts: 0 } satisfies SectionProgress]),
    );
  }

  private setProgress(key: SectionKey, patch: Partial<SectionProgress>): void {
    const current = this.progress[key] ?? { status: "pending", attempts: 0 };
    this.progress = { ...this.progress, [key]: { ...current, ...patch } };
    const snapshot = this.progress;
    // Serialize writes so concurrent sections never overwrite each other's progress.
    this.writes = this.writes
      .then(() => updateGenerationJob(this.job.id, { progress: snapshot }))
      .catch((error: unknown) => {
        console.error(`[generation] failed to persist progress for job ${this.job.id}`, error);
      });
  }

  async flush(): Promise<void> {
    await this.writes;
  }

  private async checkCancelled(): Promise<void> {
    if (this.controller.signal.aborted) throw new GenerationCancelledError();
    if (await isJobCancelRequested(this.job.id)) {
      this.controller.abort(new GenerationCancelledError());
      throw new GenerationCancelledError();
    }
  }

  private async isCancelled(): Promise<boolean> {
    try {
      await this.checkCancelled();
      return false;
    } catch {
      return true;
    }
  }

  private dependencyContents(key: SectionKey): Partial<SectionContentMap> {
    const deps: Partial<SectionContentMap> = {};
    for (const dep of SECTION_DEFINITIONS[key].dependsOn) {
      if (this.available[dep] !== undefined) (deps as Record<SectionKey, unknown>)[dep] = this.available[dep];
    }
    return deps;
  }

  private async runSection(
    key: SectionKey,
    jd: NonNullable<Awaited<ReturnType<typeof getNormalizedJd>>>,
    profile: Awaited<ReturnType<typeof getProfile>>,
    limit: <T>(fn: () => Promise<T>) => Promise<T>,
  ): Promise<Outcome> {
    const packageId = this.job.packageId;
    const previous: SectionState = this.pkg.sectionStates[key];
    const meta = {
      companyName: this.pkg.meta.companyName,
      companyCode: this.pkg.meta.companyCode,
      jobTitle: this.pkg.meta.jobTitle,
    };
    const dependencies = this.dependencyContents(key);
    const inputHash = computeSectionInputHash({ key, jd, profile, dependencies, meta });
    const startedAt = nowIso();

    if (
      !this.options.force &&
      previous.status === "ready" &&
      previous.inputHash === inputHash &&
      this.pkg.sections[key] !== undefined
    ) {
      this.setProgress(key, { status: "skipped", startedAt, finishedAt: nowIso() });
      return "skipped";
    }

    let attempts = 0;
    this.setProgress(key, { status: "generating", startedAt, attempts, error: undefined });
    await setSectionState(packageId, key, { status: "generating", error: undefined });

    const promptContext = { meta, jd, profile, dependencies };
    const mockContext = (): MockGenerationContext => ({
      ...promptContext,
      dependencies: { ...this.available, ...dependencies },
      topicPlan: this.topicPlan,
    });
    const ctx: SectionGeneratorContext = {
      prompt: promptContext,
      model: this.provider.createModel(mockContext),
      prefix: itemIdPrefix(meta.companyCode),
      signal: this.controller.signal,
      limit,
      retry: this.options.retry,
      providerOptions: this.provider.providerOptions,
      onAttempt: () => {
        attempts += 1;
        this.setProgress(key, { attempts });
      },
      checkCancelled: () => this.checkCancelled(),
      onTopicPlan: (plan) => {
        this.topicPlan = plan;
      },
    };

    try {
      const content = await generateSectionContent(key, ctx);
      await this.checkCancelled();
      await saveSectionContent(packageId, key, content, {
        model: `${this.provider.id}:${this.provider.modelId}`,
        inputHash,
      });
      (this.available as Record<SectionKey, unknown>)[key] = content;
      if (this.pkg.sections[key] !== undefined) this.changed.add(key);
      this.setProgress(key, { status: "ready", finishedAt: nowIso(), error: undefined });
      return "ready";
    } catch (error) {
      if (error instanceof GenerationCancelledError || isAbortError(error) || this.controller.signal.aborted) {
        // Restore the previous state so cancelling never hides existing content.
        await setSectionState(packageId, key, {
          status: previous.status === "generating" ? "pending" : previous.status,
          error: previous.error,
        });
        this.setProgress(key, { status: "cancelled", finishedAt: nowIso() });
        return "cancelled";
      }
      const message = describeError(error);
      const hadContent =
        this.pkg.sections[key] !== undefined && (previous.status === "ready" || previous.status === "stale");
      // Keep previously generated content visible when a regeneration fails; record the error.
      await setSectionState(
        packageId,
        key,
        hadContent
          ? { status: previous.status, error: `Regeneration failed: ${message}` }
          : { status: "failed", error: message },
      );
      this.setProgress(key, { status: "failed", finishedAt: nowIso(), error: message });
      return "failed";
    }
  }

  private async failSection(key: SectionKey, message: string): Promise<void> {
    this.outcomes.set(key, "failed");
    const previous = this.pkg.sectionStates[key];
    if (this.pkg.sections[key] === undefined)
      await setSectionState(this.job.packageId, key, { status: "failed", error: message });
    else await setSectionState(this.job.packageId, key, { status: previous.status, error: message });
    this.setProgress(key, { status: "failed", error: message, finishedAt: nowIso() });
  }

  async run(): Promise<GenerationJobStatus> {
    const jd = await getNormalizedJd(this.job.packageId);
    if (!jd) throw new Error("The normalized job description for this package is missing.");
    const profile = await getProfile();

    const concurrency = Math.max(1, this.options.concurrency ?? DEFAULT_CONCURRENCY);
    const limit = createLimiter(concurrency);
    const requested = new Set(this.job.sections);
    const order = SECTION_KEYS.filter((k) => requested.has(k));
    const inflight = new Map<SectionKey, Promise<void>>();
    let cancelled = false;

    try {
      for (;;) {
        if (!cancelled && (await this.isCancelled())) cancelled = true;

        if (!cancelled) {
          for (const key of order) {
            if (this.outcomes.has(key) || inflight.has(key)) continue;
            if (inflight.size >= concurrency) break;
            const deps = SECTION_DEFINITIONS[key].dependsOn;
            const failedDep = deps.find(
              (d) => requested.has(d) && (this.outcomes.get(d) === "failed" || this.outcomes.get(d) === "cancelled"),
            );
            if (failedDep) {
              await this.failSection(
                key,
                `Skipped because "${SECTION_DEFINITIONS[failedDep].title.en}" did not generate. Retry it first.`,
              );
              continue;
            }
            const missingDep = deps.find((d) => !requested.has(d) && this.available[d] === undefined);
            if (missingDep) {
              await this.failSection(
                key,
                `Requires "${SECTION_DEFINITIONS[missingDep].title.en}" to be generated first.`,
              );
              continue;
            }
            const ready = deps.every(
              (d) => !requested.has(d) || this.outcomes.get(d) === "ready" || this.outcomes.get(d) === "skipped",
            );
            if (!ready) continue;
            const task = this.runSection(key, jd, profile, limit)
              .catch((error: unknown): Outcome => {
                // Persistence errors (e.g. DB unavailable) — isolate them to this section.
                console.error(`[generation] section ${key} of job ${this.job.id} crashed`, error);
                this.setProgress(key, { status: "failed", error: describeError(error), finishedAt: nowIso() });
                return "failed";
              })
              .then((outcome) => {
                this.outcomes.set(key, outcome);
                inflight.delete(key);
              });
            inflight.set(key, task);
          }
        }

        if (inflight.size === 0) {
          const remaining = order.filter((k) => !this.outcomes.has(k));
          if (remaining.length === 0) break;
          if (cancelled) {
            for (const key of remaining) {
              this.outcomes.set(key, "cancelled");
              this.setProgress(key, { status: "cancelled", finishedAt: nowIso() });
            }
            break;
          }
          // Defensive: nothing runnable (should not happen with a DAG) — fail the rest.
          for (const key of remaining) await this.failSection(key, "Could not be scheduled (unresolved dependencies).");
          break;
        }
        await Promise.race(inflight.values());
      }
    } catch (error) {
      // A fatal error (e.g. the DB went away) must not leave sections running behind a finished
      // job: abort them and wait until they have restored their state.
      if (inflight.size > 0) {
        this.controller.abort(new DOMException("The generation job failed", "AbortError"));
        await Promise.allSettled(inflight.values());
      }
      throw error;
    }

    await this.markStaleDependents(requested);
    await this.flush();
    return finalJobStatus(order.map((k) => this.outcomes.get(k) ?? "cancelled"));
  }

  /** Ready sections outside this job whose inputs changed become "stale". */
  private async markStaleDependents(requested: Set<SectionKey>): Promise<void> {
    const stale = new Set<SectionKey>();
    for (const key of this.changed) for (const dep of dependentsOf(key)) if (!requested.has(dep)) stale.add(dep);
    for (const key of stale) {
      if (this.pkg.sectionStates[key].status === "ready")
        await setSectionState(this.job.packageId, key, { status: "stale" });
    }
  }
}

/**
 * Ends a job that will not finish its sections: unfinished progress entries become
 * failed/cancelled and persisted "pending"/"generating" section states are released, so the UI
 * offers Retry instead of skeletons. `previousStates` are the section states before the run.
 */
async function finishUnfinishedJob(
  job: GenerationJobRecord,
  outcome: UnfinishedOutcome,
  extra: { startedAt?: Date; previousStates?: InterviewPackage["sectionStates"] } = {},
): Promise<GenerationJobRecord> {
  const finishedAt = new Date();
  try {
    const pkg = await getPackageBySlug(job.packageSlug);
    if (pkg && !pkg.meta.isSample) await releaseUnfinishedSections(job, pkg, outcome, extra.previousStates);
  } catch (error) {
    console.error(`[generation] could not release the sections of job ${job.id}`, error);
  }
  const current = (await getGenerationJob(job.id)) ?? job;
  return updateGenerationJob(job.id, {
    status: outcome.status,
    error: outcome.error,
    progress: finalizeUnfinishedProgress(current, outcome, finishedAt.toISOString()),
    startedAt: extra.startedAt,
    finishedAt,
  });
}

/**
 * Executes a queued job to completion. Never throws: failures are recorded on the job.
 * Returns the final job record (or null if the job does not exist).
 */
export async function runGenerationJob(
  jobId: string,
  options: RunGenerationOptions = {},
): Promise<GenerationJobRecord | null> {
  const job = await getGenerationJob(jobId);
  if (!job) return null;
  const controller = registerJob(jobId);
  const startedAt = new Date();
  let previousStates: InterviewPackage["sectionStates"] | undefined;

  try {
    const provider = options.provider === undefined ? getProviderForGeneration() : options.provider;
    if (!provider)
      return await finishUnfinishedJob(
        job,
        { status: "failed", error: "No AI provider is configured on the server." },
        { startedAt },
      );
    const pkg = await getPackageBySlug(job.packageSlug);
    if (!pkg) return await finishUnfinishedJob(job, { status: "failed", error: "Package not found." }, { startedAt });
    if (pkg.meta.isSample) {
      return await finishUnfinishedJob(
        job,
        { status: "failed", error: "Sample packages are read-only and cannot be regenerated." },
        { startedAt },
      );
    }
    previousStates = pkg.sectionStates;

    await updateGenerationJob(jobId, { status: "running", startedAt, error: null });
    const run = new JobRun(job, pkg, provider, controller, options);
    let status: GenerationJobStatus;
    try {
      status = await run.run();
    } catch (runError) {
      await run.flush();
      return await finishUnfinishedJob(
        job,
        {
          status: runError instanceof GenerationCancelledError ? "cancelled" : "failed",
          error: describeError(runError),
        },
        { previousStates },
      );
    }
    const final = await getGenerationJob(jobId);
    const failed = Object.entries(final?.progress ?? {})
      .filter(([, p]) => p?.status === "failed")
      .map(([k]) => k);
    let error: string | null = null;
    if (status === "partial")
      error = `${failed.length} section(s) failed: ${failed.join(", ")}. Retry them individually.`;
    if (status === "failed") error = "All sections failed. See section errors for details.";
    if (status === "cancelled") error = "Cancelled by user.";
    return await updateGenerationJob(jobId, { status, error, finishedAt: new Date() });
  } catch (fatal) {
    console.error(`[generation] job ${jobId} crashed`, fatal);
    try {
      return await finishUnfinishedJob(job, { status: "failed", error: describeError(fatal) }, { previousStates });
    } catch {
      try {
        return await updateGenerationJob(jobId, {
          status: "failed",
          error: describeError(fatal),
          finishedAt: new Date(),
        });
      } catch {
        return null;
      }
    }
  } finally {
    unregisterJob(jobId);
  }
}
