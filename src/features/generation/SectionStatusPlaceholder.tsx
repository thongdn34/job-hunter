"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Ban, Clock, History, Loader2, RotateCw } from "lucide-react";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_DEFINITIONS, type SectionKey } from "@/domain/package/sections";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage, generationKeys, retrySection } from "./api";
import { isSectionStalled } from "./section-progress";
import { useLiveSectionProgress } from "./use-latest-job";

/**
 * Rendered instead of a section that has no content: skeleton while pending/generating,
 * an error with "Retry section" when failed, "Regenerate" when outdated.
 */
export function SectionStatusPlaceholder({ pkg, sectionKey }: { pkg: InterviewPackage; sectionKey: SectionKey }) {
  const slug = pkg.meta.slug;
  const state = pkg.sectionStates[sectionKey];
  const live = useLiveSectionProgress(slug, sectionKey);
  const status = live.status ?? state.status;
  const title = SECTION_DEFINITIONS[sectionKey].title.en;
  const canRetry = !pkg.meta.isSample;
  // Pending/generating but no running job covers it: nothing will finish it, so offer to generate it.
  const stalled = isSectionStalled({ ...live, status });

  if (stalled) {
    return (
      <Alert>
        <Clock aria-hidden />
        <AlertTitle>This section hasn&apos;t been generated</AlertTitle>
        <AlertDescription>
          <p>Generation stopped before this section was reached.</p>
          {canRetry ? (
            <SectionActionButton
              slug={slug}
              sectionKey={sectionKey}
              jobRunning={live.jobActive}
              label="Generate section"
              pendingLabel="Starting…"
            />
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  switch (status) {
    case "pending":
    case "generating":
      return <GeneratingSkeleton generating={status === "generating"} title={title} />;
    case "failed":
      return (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>This section couldn&apos;t be generated</AlertTitle>
          <AlertDescription>
            <p className="break-words">
              {live.error ?? state.error ?? "The AI provider returned an error or an invalid result."}
            </p>
            {canRetry ? (
              <SectionActionButton
                slug={slug}
                sectionKey={sectionKey}
                jobRunning={live.jobActive}
                label="Retry section"
                pendingLabel="Retrying…"
                variant="outline"
              />
            ) : null}
          </AlertDescription>
        </Alert>
      );
    case "stale":
      return (
        <Alert className="border-amber-500/40">
          <History aria-hidden className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>This section is outdated</AlertTitle>
          <AlertDescription>
            <p>Your profile or the job description changed since it was generated.</p>
            {canRetry ? (
              <SectionActionButton
                slug={slug}
                sectionKey={sectionKey}
                jobRunning={live.jobActive}
                label="Regenerate"
                pendingLabel="Starting…"
              />
            ) : null}
          </AlertDescription>
        </Alert>
      );
    case "cancelled":
      return (
        <Alert>
          <Ban aria-hidden />
          <AlertTitle>Generation was cancelled</AlertTitle>
          <AlertDescription>
            <p>This section wasn&apos;t generated before the run was cancelled.</p>
            {canRetry ? (
              <SectionActionButton
                slug={slug}
                sectionKey={sectionKey}
                jobRunning={live.jobActive}
                label="Generate section"
                pendingLabel="Starting…"
              />
            ) : null}
          </AlertDescription>
        </Alert>
      );
    case "ready":
    case "skipped":
    default:
      return (
        <div className="text-muted-foreground space-y-2 rounded-xl border border-dashed p-4 text-sm">
          <p>No content is available for this section yet.</p>
          {canRetry ? (
            <SectionActionButton
              slug={slug}
              sectionKey={sectionKey}
              jobRunning={live.jobActive}
              label="Regenerate"
              pendingLabel="Starting…"
            />
          ) : null}
        </div>
      );
  }
}

function GeneratingSkeleton({ generating, title }: { generating: boolean; title: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={`${title}: ${generating ? "generating" : "waiting to be generated"}`}
      className="space-y-4"
    >
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {generating ? (
          <Loader2 className="text-primary size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Clock className="size-4" aria-hidden />
        )}
        {generating ? "Generating this section…" : "Waiting for earlier sections to finish…"}
      </p>
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

function SectionActionButton({
  slug,
  sectionKey,
  label,
  pendingLabel,
  variant = "default",
  jobRunning = false,
}: {
  slug: string;
  sectionKey: SectionKey;
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
  /** Another generation job runs for this package; the server would reject a second one (409). */
  jobRunning?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sectionTitle = SECTION_DEFINITIONS[sectionKey].title.en;
  const mutation = useMutation({
    mutationFn: () => retrySection(slug, sectionKey),
    onSuccess: () => {
      toast.success(`Regenerating “${sectionTitle}”`);
      void queryClient.invalidateQueries({ queryKey: generationKeys.latestJob(slug) });
      router.refresh();
    },
    onError: (error) => {
      const description =
        error instanceof ApiError && error.code === "AI_NOT_CONFIGURED"
          ? "No AI provider is configured. Add an API key to .env (see Settings) and restart the server."
          : errorMessage(error);
      toast.error(`Couldn't regenerate “${sectionTitle}”`, { description });
    },
  });

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="mt-2"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || jobRunning}
      title={jobRunning ? "Wait for the running generation to finish." : undefined}
      aria-busy={mutation.isPending || undefined}
      aria-label={`${label}: ${sectionTitle}`}
    >
      {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
      {mutation.isPending ? pendingLabel : label}
    </Button>
  );
}
