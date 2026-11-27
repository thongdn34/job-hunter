"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GenerationJobDto } from "@/domain/generation/schema";
import type { SectionKey } from "@/domain/package/sections";
import { fetchLatestJob, generationKeys } from "./api";
import { isJobActive, jobSectionStatus, type ChipStatus } from "./section-progress";

export const JOB_POLL_INTERVAL_MS = 2_000;
const ERROR_RETRY_INTERVAL_MS = 5_000;

/**
 * Polls GET /api/packages/[slug]/jobs/latest every 2 s while the job is queued/running and
 * stops once it has finished. Other components read the same cache entry without polling.
 */
export function useLatestJobPolling(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: generationKeys.latestJob(slug),
    queryFn: () => fetchLatestJob(slug),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      if (query.state.status === "error") return ERROR_RETRY_INTERVAL_MS;
      return isJobActive(query.state.data) ? JOB_POLL_INTERVAL_MS : false;
    },
  });
}

export interface LiveSectionProgress {
  status?: ChipStatus;
  error?: string;
  /** The latest job has been loaded (it may be null = no job). */
  loaded: boolean;
  /** The latest job is queued/running. */
  jobActive: boolean;
  /** The latest job's section list contains this section. */
  coveredByJob: boolean;
}

/** Live status of one section from the cached job (no fetching of its own). */
export function useLiveSectionProgress(slug: string, key: SectionKey): LiveSectionProgress {
  const select = useCallback(
    (job: GenerationJobDto | null): LiveSectionProgress => ({
      status: jobSectionStatus(job, key),
      error: job?.progress[key]?.error,
      loaded: true,
      jobActive: isJobActive(job),
      coveredByJob: Boolean(job?.sections.includes(key)),
    }),
    [key],
  );
  const { data } = useQuery({
    queryKey: generationKeys.latestJob(slug),
    queryFn: () => fetchLatestJob(slug),
    enabled: false,
    select,
  });
  return data ?? { loaded: false, jobActive: false, coveredByJob: false };
}
