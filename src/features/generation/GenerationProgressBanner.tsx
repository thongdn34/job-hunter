"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Ban, CheckCircle2, Circle, Loader2, RotateCw, Sparkles, Square } from "lucide-react";
import type { GenerationJobDto } from "@/domain/generation/schema";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_DEFINITIONS, SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { sectionAnchorId } from "@/domain/package/bookmarks";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ApiError, cancelJob, errorMessage, generateMissingSections, generationKeys } from "./api";
import { providerLabel } from "./AiStatusPanel";
import {
  countDone,
  countWithStatus,
  deriveSectionStatuses,
  finishedSignature,
  isJobActive,
  packageNeedsGeneration,
  pageIsBehindJob,
  stalledSections,
  type ChipStatus,
} from "./section-progress";
import { STATUS_META } from "./status-meta";
import { useLatestJobPolling } from "./use-latest-job";

const TOTAL = SECTION_KEYS.length;
const STALLED_META = { ...STATUS_META.pending, label: "Not generated", spin: false };

/**
 * Live generation progress for a user package. Hidden for sample packages and packages whose
 * 16 sections are all ready. Polls the latest job every 2 s while it runs and refreshes the
 * server-rendered page whenever a section finishes.
 */
export function GenerationProgressBanner({ pkg }: { pkg: InterviewPackage }) {
  if (!packageNeedsGeneration(pkg)) return null;
  return <ActiveBanner pkg={pkg} />;
}

function ActiveBanner({ pkg }: { pkg: InterviewPackage }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const titleId = useId();
  const slug = pkg.meta.slug;
  const { data: job, isPending, isError } = useLatestJobPolling(slug, true);

  const statuses = useMemo(() => deriveSectionStatuses(pkg, job), [pkg, job]);
  const stalled = useMemo(() => stalledSections(pkg, job), [pkg, job]);
  const done = countDone(statuses);
  const failed = countWithStatus(statuses, "failed");
  const active = isJobActive(job);
  const missing = SECTION_KEYS.filter((key) => pkg.sections[key] === undefined).length;
  const outdated = SECTION_KEYS.filter(
    (key) => pkg.sections[key] !== undefined && pkg.sectionStates[key].status === "stale",
  ).length;

  // Refresh the server component once per newly finished section (and once when the job ends).
  const signature = finishedSignature(job);
  const behind = pageIsBehindJob(pkg, job);
  const lastRefresh = useRef<string | null>(null);
  useEffect(() => {
    if (!behind || lastRefresh.current === signature) return;
    lastRefresh.current = signature;
    router.refresh();
  }, [behind, signature, router]);

  const cancel = useMutation({
    mutationFn: (jobId: string) => cancelJob(jobId),
    onSuccess: () => {
      toast.info("Generation cancelled", { description: "Finished sections are kept. You can retry the rest later." });
      void queryClient.invalidateQueries({ queryKey: generationKeys.latestJob(slug) });
      router.refresh();
    },
    onError: (error) => toast.error("Couldn't cancel generation", { description: errorMessage(error) }),
  });

  const resume = useMutation({
    mutationFn: () => generateMissingSections(slug),
    onSuccess: () => {
      toast.success(missing > 0 ? "Generating the missing sections" : "Regenerating the outdated sections");
      void queryClient.invalidateQueries({ queryKey: generationKeys.latestJob(slug) });
      router.refresh();
    },
    onError: (error) => {
      const description =
        error instanceof ApiError && error.code === "AI_NOT_CONFIGURED"
          ? "No AI provider is configured. Add an API key to .env (see Settings) and restart the server."
          : errorMessage(error);
      toast.error("Couldn't start generation", { description });
    },
  });

  if (isPending) {
    return (
      <div
        role="status"
        className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm"
      >
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Checking generation status…
      </div>
    );
  }

  const heading = bannerHeading(job ?? null, active, failed, done, stalled.size);
  const HeadingIcon = heading.icon;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "bg-card text-card-foreground space-y-4 rounded-xl border p-4",
        active && "border-primary/30",
        !active && failed > 0 && "border-destructive/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <HeadingIcon
            className={cn(
              "mt-0.5 size-5 shrink-0",
              heading.iconClass,
              active && "animate-spin motion-reduce:animate-none",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 id={titleId} className="font-medium">
              {heading.title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {heading.description}
              {job?.provider ? (
                <>
                  {" "}
                  · {providerLabel(job.provider)}
                  {job.model ? (
                    <code className="bg-muted ml-1 rounded px-1 py-0.5 font-mono text-xs">{job.model}</code>
                  ) : null}
                </>
              ) : null}
            </p>
          </div>
        </div>
        {active && job ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cancel.mutate(job.id)}
            disabled={cancel.isPending}
            aria-busy={cancel.isPending || undefined}
          >
            {cancel.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Square aria-hidden />}
            {cancel.isPending ? "Cancelling…" : "Cancel"}
          </Button>
        ) : null}
        {!active && job !== undefined && missing + outdated > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => resume.mutate()}
            disabled={resume.isPending}
            aria-busy={resume.isPending || undefined}
          >
            {resume.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
            {resume.isPending ? "Starting…" : resumeLabel(missing, outdated)}
          </Button>
        ) : null}
      </div>

      <Progress value={done} max={TOTAL} getAriaValueText={() => `${done} of ${TOTAL} sections ready`}>
        <ProgressLabel className="text-muted-foreground text-xs font-normal">Sections ready</ProgressLabel>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums" aria-hidden>
          {done}/{TOTAL}
        </span>
      </Progress>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {active ? `Generating: ${done} of ${TOTAL} sections ready.` : `${done} of ${TOTAL} sections ready.`}
      </p>

      <ul className="flex flex-wrap gap-1.5" aria-label="Section status">
        {SECTION_KEYS.map((key) => (
          <SectionChip
            key={key}
            sectionKey={key}
            status={statuses[key]}
            stalled={stalled.has(key)}
            companyCode={pkg.meta.companyCode}
          />
        ))}
      </ul>

      {isError ? (
        <p className="text-muted-foreground text-xs" role="status">
          Couldn&apos;t refresh the progress — retrying…
        </p>
      ) : null}
    </section>
  );
}

function resumeLabel(missing: number, outdated: number): string {
  const plural = (n: number) => (n === 1 ? "" : "s");
  if (outdated === 0) return `Generate ${missing} missing section${plural(missing)}`;
  if (missing === 0) return `Regenerate ${outdated} outdated section${plural(outdated)}`;
  return `Generate ${missing + outdated} sections`;
}

function bannerHeading(job: GenerationJobDto | null, active: boolean, failed: number, done: number, stalled: number) {
  if (active) {
    return {
      icon: Loader2,
      iconClass: "text-primary",
      title: job?.status === "queued" ? "Generation queued…" : "Generating your package…",
      description: `${done} of ${TOTAL} sections ready. You can keep reading while the rest is generated.`,
    };
  }
  if (job?.status === "cancelled") {
    return {
      icon: Ban,
      iconClass: "text-muted-foreground",
      title: "Generation cancelled",
      description: "Finished sections are kept. Generate the missing sections to continue.",
    };
  }
  if (failed > 0) {
    return {
      icon: AlertTriangle,
      iconClass: "text-destructive",
      title: `${failed} section${failed === 1 ? "" : "s"} failed`,
      description: job?.error ?? "Use “Retry section” on each failed section below.",
    };
  }
  if (stalled > 0) {
    return {
      icon: Circle,
      iconClass: "text-muted-foreground",
      title: `${stalled} section${stalled === 1 ? "" : "s"} not generated yet`,
      description: "Generation stopped before reaching them. Generate the missing sections to continue.",
    };
  }
  if (!job) {
    return {
      icon: Sparkles,
      iconClass: "text-muted-foreground",
      title: "Generation is not running",
      description: "Some sections have no content yet. Retry them individually below.",
    };
  }
  return {
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    title: "Generation finished",
    description: "Some sections are outdated and can be regenerated.",
  };
}

const SectionChip = memo(function SectionChip({
  sectionKey,
  status,
  stalled,
  companyCode,
}: {
  sectionKey: SectionKey;
  status: ChipStatus;
  /** Pending/generating but no running job will finish it. */
  stalled: boolean;
  companyCode: string;
}) {
  const def = SECTION_DEFINITIONS[sectionKey];
  const meta = stalled ? STALLED_META : STATUS_META[status];
  const Icon = meta.icon;
  return (
    <li>
      <a
        href={`#${sectionAnchorId(companyCode, sectionKey)}`}
        title={`${def.title.en}: ${meta.label}`}
        aria-label={`${def.number}. ${def.title.en}: ${meta.label}`}
        className={cn(
          "hover:bg-muted focus-visible:ring-ring/50 inline-flex max-w-56 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors outline-none focus-visible:ring-3",
          meta.chipClass,
        )}
      >
        <Icon
          className={cn("size-3.5 shrink-0", meta.iconClass, meta.spin && "animate-spin motion-reduce:animate-none")}
          aria-hidden
        />
        <span className="tabular-nums">{def.number}.</span>
        <span className="truncate">{def.title.en}</span>
      </a>
    </li>
  );
});
