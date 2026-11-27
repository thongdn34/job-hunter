import type { GenerationJobDto, GenerationJobStatus, SectionProgress } from "@/domain/generation/schema";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";

/** Pure helpers that merge the server-rendered package state with the live generation job. */

export type ChipStatus = SectionProgress["status"];
export type SectionStatuses = Record<SectionKey, ChipStatus>;

const ACTIVE_JOB_STATUSES: ReadonlySet<GenerationJobStatus> = new Set(["queued", "running"]);
const DONE_STATUSES: ReadonlySet<ChipStatus> = new Set(["ready", "skipped"]);
const FINISHED_STATUSES: ReadonlySet<ChipStatus> = new Set(["ready", "skipped", "failed", "cancelled"]);
const UNFINISHED_STATUSES: ReadonlySet<ChipStatus> = new Set(["pending", "generating"]);

export function isJobActive(job: GenerationJobDto | null | undefined): boolean {
  return Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
}

/** True when the banner should exist at all: user packages with at least one non-ready section. */
export function packageNeedsGeneration(pkg: InterviewPackage): boolean {
  if (pkg.meta.isSample) return false;
  return SECTION_KEYS.some((key) => pkg.sectionStates[key].status !== "ready");
}

/**
 * Live status of one section in the job, or undefined when the job doesn't cover it. A finished
 * job never finishes a "pending"/"generating" entry (e.g. it was interrupted before the server
 * recorded the outcome), so such entries read as failed — or cancelled — to offer Retry.
 */
export function jobSectionStatus(job: GenerationJobDto | null | undefined, key: SectionKey): ChipStatus | undefined {
  if (!job || !job.sections.includes(key)) return undefined;
  const progress = job.progress[key];
  const active = isJobActive(job);
  if (progress) {
    if (active || !UNFINISHED_STATUSES.has(progress.status)) return progress.status;
    return job.status === "cancelled" ? "cancelled" : "failed";
  }
  return active ? "pending" : undefined;
}

/** Per-section status: the job's progress wins for sections it covers, else the persisted state. */
export function deriveSectionStatuses(
  pkg: InterviewPackage,
  job: GenerationJobDto | null | undefined,
): SectionStatuses {
  const result = {} as SectionStatuses;
  for (const key of SECTION_KEYS) {
    result[key] = jobSectionStatus(job, key) ?? pkg.sectionStates[key].status;
  }
  return result;
}

/**
 * A section looks queued/in-flight but nothing will ever finish it: the latest job has been
 * loaded and either is not running (or there is none) or does not cover this section — e.g.
 * sections that a cancelled or interrupted run never reached, after a later single-section retry.
 * Such sections must offer "Generate section" instead of a skeleton.
 */
export function isSectionStalled(input: {
  status: ChipStatus | undefined;
  /** The latest job has been loaded (null = there is no job). */
  loaded: boolean;
  jobActive: boolean;
  /** The latest job's section list contains this section. */
  coveredByJob: boolean;
}): boolean {
  if (!input.loaded || input.status === undefined || !UNFINISHED_STATUSES.has(input.status)) return false;
  return !input.jobActive || !input.coveredByJob;
}

/** Sections that will not progress on their own (see isSectionStalled). `job === undefined` = still loading. */
export function stalledSections(pkg: InterviewPackage, job: GenerationJobDto | null | undefined): Set<SectionKey> {
  const statuses = deriveSectionStatuses(pkg, job);
  return new Set(
    SECTION_KEYS.filter((key) =>
      isSectionStalled({
        status: statuses[key],
        loaded: job !== undefined,
        jobActive: isJobActive(job),
        coveredByJob: Boolean(job?.sections.includes(key)),
      }),
    ),
  );
}

export function countDone(statuses: SectionStatuses): number {
  return SECTION_KEYS.filter((key) => DONE_STATUSES.has(statuses[key])).length;
}

export function countWithStatus(statuses: SectionStatuses, status: ChipStatus): number {
  return SECTION_KEYS.filter((key) => statuses[key] === status).length;
}

/**
 * True when the job reports results the rendered page doesn't show yet, i.e. the server
 * component must be refreshed: a section finished (ready/failed) in the job but the
 * persisted state still says otherwise, or the job ended while sections still look in-flight.
 */
export function pageIsBehindJob(pkg: InterviewPackage, job: GenerationJobDto | null | undefined): boolean {
  if (!job) return false;
  for (const key of SECTION_KEYS) {
    const live = jobSectionStatus(job, key);
    if (!live || !FINISHED_STATUSES.has(live)) continue;
    const persisted = pkg.sectionStates[key].status;
    if (DONE_STATUSES.has(live) && persisted !== "ready") return true;
    if (live === "failed" && persisted !== "failed") return true;
  }
  if (!isJobActive(job)) {
    return job.sections.some((key) => {
      const persisted = pkg.sectionStates[key].status;
      return persisted === "generating";
    });
  }
  return false;
}

/** Stable key describing which sections have finished — changes exactly when a section finishes. */
export function finishedSignature(job: GenerationJobDto | null | undefined): string {
  if (!job) return "";
  const finished = job.sections.filter((key) => {
    const status = jobSectionStatus(job, key);
    return status !== undefined && FINISHED_STATUSES.has(status);
  });
  return `${job.id}:${job.status}:${finished.join(",")}`;
}
