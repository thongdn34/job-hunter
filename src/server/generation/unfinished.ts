import type { InterviewPackage, SectionState } from "@/domain/package/schema";
import type { SectionKey } from "@/domain/package/sections";
import { setSectionState } from "@/server/repositories/package-repository";
import type { GenerationJobRecord, JobProgress } from "@/server/repositories/generation-job-repository";

/**
 * Finalizing a job that ends without finishing its sections (interrupted by a restart, failed
 * before/while running, cancelled by a fatal error). Without this, progress entries stay
 * "pending"/"generating" and persisted section states stay "generating", so the UI shows
 * skeletons forever and never offers Retry.
 */

const UNFINISHED_STATUSES: ReadonlySet<string> = new Set(["pending", "generating"]);

export interface UnfinishedOutcome {
  /** "failed" offers Retry; "cancelled" when the user asked for the cancellation. */
  status: "failed" | "cancelled";
  error: string;
}

/** Job progress with every unfinished (or missing) section entry moved to the outcome's status. */
export function finalizeUnfinishedProgress(
  job: Pick<GenerationJobRecord, "sections" | "progress">,
  outcome: UnfinishedOutcome,
  finishedAt: string,
): JobProgress {
  const progress: JobProgress = { ...job.progress };
  for (const key of job.sections) {
    const current = progress[key];
    if (current && !UNFINISHED_STATUSES.has(current.status)) continue;
    progress[key] =
      outcome.status === "failed"
        ? { attempts: 0, ...current, status: "failed", error: outcome.error, finishedAt }
        : { attempts: 0, ...current, status: "cancelled", finishedAt };
  }
  return progress;
}

/**
 * Releases persisted section states the job left "pending"/"generating". Sections without
 * content become "failed" (Retry button) — or "pending" when cancelled; sections that still hold
 * earlier content keep it and get back their previous ready/stale status.
 *
 * `previousStates` are the states before the job touched them (when known); otherwise "ready".
 */
export async function releaseUnfinishedSections(
  job: Pick<GenerationJobRecord, "packageId" | "sections">,
  pkg: Pick<InterviewPackage, "sections" | "sectionStates"> | null,
  outcome: UnfinishedOutcome,
  previousStates?: Partial<Record<SectionKey, SectionState>>,
): Promise<void> {
  if (!pkg) return;
  for (const key of job.sections) {
    const state = pkg.sectionStates[key];
    if (!UNFINISHED_STATUSES.has(state.status)) continue;
    const hasContent = pkg.sections[key] !== undefined;
    if (!hasContent) {
      // Nothing to show either way; only a persisted "generating" needs to move when cancelling.
      if (outcome.status === "cancelled") {
        if (state.status === "generating") await setSectionState(job.packageId, key, { status: "pending" });
        continue;
      }
      await setSectionState(job.packageId, key, { status: "failed", error: outcome.error });
      continue;
    }
    const previous = previousStates?.[key]?.status;
    const restored = previous === "stale" ? "stale" : "ready";
    await setSectionState(
      job.packageId,
      key,
      outcome.status === "failed"
        ? { status: restored, error: `Regeneration did not finish: ${outcome.error}` }
        : { status: restored },
    );
  }
}
