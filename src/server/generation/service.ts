import "server-only";
import type { GenerationJobDto } from "@/domain/generation/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { getProviderForGeneration, type GenerationProvider } from "@/server/ai/provider";
import type { InterviewPackage } from "@/domain/package/schema";
import { getPackageBySlug, getPackageIdBySlug } from "@/server/repositories/package-repository";
import {
  createGenerationJob,
  getGenerationJob,
  getLatestJobForPackage,
  requestJobCancel,
  toGenerationJobDto,
  updateGenerationJob,
  type GenerationJobRecord,
  type JobProgress,
} from "@/server/repositories/generation-job-repository";
import { GenerationRequestError } from "./errors";
import { expandSectionsWithMissingDependencies, type RunGenerationOptions } from "./pipeline";
import { abortJob, withPackageLock } from "./registry";
import { getJobRunner } from "./job-runner";
import { finalizeUnfinishedProgress, releaseUnfinishedSections, type UnfinishedOutcome } from "./unfinished";

/**
 * Application services used by the route handlers: start / retry / cancel / read jobs.
 * Jobs run in the background through the JobRunner (job-runner.ts): in-process under Node.js,
 * one Cloudflare Workflow instance per job on Cloudflare Workers.
 */

const ACTIVE_STATUSES = new Set(["queued", "running"]);

export function requireProvider(): GenerationProvider {
  const provider = getProviderForGeneration();
  if (!provider) {
    throw new GenerationRequestError(
      "AI_NOT_CONFIGURED",
      "No AI provider is configured. Set AI_PROVIDER and an API key in the server .env (see Settings).",
    );
  }
  return provider;
}

/**
 * Starts the job in the background. Errors during the run are recorded on the job by
 * runGenerationJob; a failure to dispatch it at all marks the job failed and is rethrown.
 */
export async function startJobInBackground(jobId: string, options: RunGenerationOptions = {}): Promise<void> {
  try {
    await getJobRunner().start(jobId, { force: options.force, provider: options.provider ?? undefined });
  } catch (error) {
    console.error(`[generation] could not dispatch job ${jobId}`, error);
    await updateGenerationJob(jobId, {
      status: "failed",
      error: "The generation job could not be started. Try again.",
      finishedAt: new Date(),
    }).catch(() => undefined);
    throw new GenerationRequestError("DISPATCH_FAILED", "The generation job could not be started. Try again.");
  }
}

export const INTERRUPTED_JOB_ERROR = "The generation was interrupted (server restarted). Retry the failed sections.";
export const INTERRUPTED_SECTION_ERROR = "Generation was interrupted before this section finished. Retry it.";

/** Job progress with every unfinished section marked failed (the job will never finish them). */
export function failUnfinishedProgress(
  job: Pick<GenerationJobRecord, "sections" | "progress">,
  finishedAt: string,
): JobProgress {
  return finalizeUnfinishedProgress(job, { status: "failed", error: INTERRUPTED_SECTION_ERROR }, finishedAt);
}

/**
 * Jobs persisted as queued/running but not registered in this process were interrupted
 * (server restart / crash). Mark them failed (cancelled when a cancel was requested) — and
 * release their unfinished progress entries and section states — so the UI does not poll or
 * show skeletons forever and offers Retry instead.
 */
async function reconcileOrphan(job: GenerationJobRecord): Promise<GenerationJobRecord> {
  if (!ACTIVE_STATUSES.has(job.status)) return job;
  // A just-created job may not be registered yet; give it a short grace period.
  if (Date.now() - Date.parse(job.createdAt) < 15_000) return job;
  if (await getJobRunner().isAlive(job.id)) return job;
  const finishedAt = new Date();
  const outcome: UnfinishedOutcome = job.cancelRequested
    ? { status: "cancelled", error: "Cancelled by user." }
    : { status: "failed", error: INTERRUPTED_SECTION_ERROR };
  try {
    await releaseUnfinishedSections(job, await getPackageBySlug(job.packageSlug), outcome);
  } catch (error) {
    console.error(`[generation] could not release the sections of interrupted job ${job.id}`, error);
  }
  return updateGenerationJob(job.id, {
    status: outcome.status,
    error: outcome.status === "failed" ? INTERRUPTED_JOB_ERROR : outcome.error,
    progress: finalizeUnfinishedProgress(job, outcome, finishedAt.toISOString()),
    finishedAt,
  });
}

/**
 * Throws JOB_RUNNING when the package already has a queued/running job (orphans are reconciled
 * first). Call it inside withPackageLock when a new job is created right after the check.
 */
export async function assertNoActiveJob(packageId: string): Promise<void> {
  const latest = await getLatestJobForPackage(packageId);
  if (!latest) return;
  const reconciled = await reconcileOrphan(latest);
  if (ACTIVE_STATUSES.has(reconciled.status)) {
    throw new GenerationRequestError("JOB_RUNNING", "A generation job is already running for this package.", {
      jobId: reconciled.id,
    });
  }
}

/** Loads a regeneratable (existing, non-sample) package. */
async function requireUserPackage(slug: string): Promise<{ pkg: InterviewPackage; packageId: string }> {
  const pkg = await getPackageBySlug(slug);
  if (!pkg) throw new GenerationRequestError("NOT_FOUND", `Package "${slug}" was not found.`);
  if (pkg.meta.isSample)
    throw new GenerationRequestError("SAMPLE_READ_ONLY", "Sample packages are read-only and cannot be regenerated.");
  return { pkg, packageId: (await getPackageIdBySlug(slug)) ?? pkg.meta.id };
}

export interface StartGenerationInput {
  packageId: string;
  sections?: SectionKey[];
  force?: boolean;
  provider?: GenerationProvider;
}

/** Creates a job for a freshly created package (all sections) and starts it. */
export async function startPackageGeneration(input: StartGenerationInput): Promise<GenerationJobDto> {
  const provider = input.provider ?? requireProvider();
  const job = await createGenerationJob({
    packageId: input.packageId,
    sections: input.sections ?? [...SECTION_KEYS],
    provider: provider.id,
    model: provider.modelId,
  });
  await startJobInBackground(job.id, { force: input.force, provider });
  return toGenerationJobDto(job);
}

/** Retry a failed section or regenerate one section (force) of a non-sample package. */
export async function startSectionGeneration(slug: string, key: SectionKey, force: boolean): Promise<GenerationJobDto> {
  const provider = requireProvider();
  const { pkg, packageId } = await requireUserPackage(slug);
  return withPackageLock(packageId, async () => {
    await assertNoActiveJob(packageId);
    const sections = expandSectionsWithMissingDependencies([key], pkg);
    return startPackageGeneration({ packageId, sections, force, provider });
  });
}

/**
 * Sections a "resume" run should (re)generate: no usable content yet (never generated, failed,
 * cancelled or interrupted) or outdated ("stale"). Ready sections are left alone.
 */
export function sectionsToResume(pkg: Pick<InterviewPackage, "sections" | "sectionStates">): SectionKey[] {
  return SECTION_KEYS.filter((key) => pkg.sections[key] === undefined || pkg.sectionStates[key].status === "stale");
}

/**
 * Resumes a package after a cancelled / interrupted / partially failed run (and refreshes
 * outdated sections): one job for sectionsToResume(). NOT_READY when there is nothing to do.
 */
export async function startMissingSectionsGeneration(slug: string): Promise<GenerationJobDto> {
  const provider = requireProvider();
  const { pkg, packageId } = await requireUserPackage(slug);
  const sections = sectionsToResume(pkg);
  if (sections.length === 0)
    throw new GenerationRequestError("NOT_READY", "Every section is up to date. Regenerate sections individually.");
  return withPackageLock(packageId, async () => {
    await assertNoActiveJob(packageId);
    return startPackageGeneration({ packageId, sections, provider });
  });
}

export async function getJobDto(id: string): Promise<GenerationJobDto | null> {
  const job = await getGenerationJob(id);
  return job ? toGenerationJobDto(await reconcileOrphan(job)) : null;
}

export async function getLatestJobDtoForPackage(slug: string): Promise<GenerationJobDto | null> {
  const packageId = await getPackageIdBySlug(slug);
  if (!packageId) {
    if (await getPackageBySlug(slug)) return null; // built-in sample (not in DB): never has jobs
    throw new GenerationRequestError("NOT_FOUND", `Package "${slug}" was not found.`);
  }
  const job = await getLatestJobForPackage(packageId);
  return job ? toGenerationJobDto(await reconcileOrphan(job)) : null;
}

/** Requests cancellation: sets the DB flag (polled between steps) and aborts in-flight calls. */
export async function cancelJob(id: string): Promise<GenerationJobDto> {
  const job = await getGenerationJob(id);
  if (!job) throw new GenerationRequestError("NOT_FOUND", `Generation job "${id}" was not found.`);
  if (!ACTIVE_STATUSES.has(job.status)) return toGenerationJobDto(job);
  const updated = (await requestJobCancel(id)) ?? job;
  const wasRunningHere = abortJob(id);
  if (!wasRunningHere) return toGenerationJobDto(await reconcileOrphan(updated));
  return toGenerationJobDto(updated);
}
