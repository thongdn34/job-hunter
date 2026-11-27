"use client";

import { useId, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { InterviewPackage } from "@/domain/package/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useShallow } from "zustand/react/shallow";
import { emptyProgress } from "@/domain/progress/schema";
import { useProgressStore } from "@/stores/progress-store";
import { useProgressHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { StatBar } from "./StatBar";
import { latestScoredSession, summarizeProgress, type MockSessionSummary } from "./stats";
import { getStudyItemIndex } from "./study-items";
import { useProgressSync } from "./use-progress-sync";

const ProgressTopicChart = dynamic(() => import("./ProgressTopicChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-24 w-full" />,
});

const EMPTY_PROGRESS = emptyProgress();

const SessionsSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      startedAt: z.string(),
      completedAt: z.string().nullable().optional(),
      averageScore: z.number().nullable().optional(),
      answerCount: z.number().int().nonnegative().default(0),
    }),
  ),
});

export class MockSessionsUnavailableError extends Error {}

/** GET /api/mock/sessions?packageSlug=… — 404 (endpoint/package missing) means "no sessions". */
export async function fetchMockSessions(slug: string, signal?: AbortSignal): Promise<MockSessionSummary[]> {
  const res = await fetch(`/api/mock/sessions?packageSlug=${encodeURIComponent(slug)}`, {
    headers: { accept: "application/json" },
    signal,
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new MockSessionsUnavailableError(`HTTP ${res.status}`);
  const parsed = SessionsSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new MockSessionsUnavailableError("Malformed response");
  return parsed.data.sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    completedAt: s.completedAt ?? null,
    averageScore: s.averageScore ?? null,
    answerCount: s.answerCount,
  }));
}

/**
 * Compact study-progress summary for the right sidebar. Also keeps the package's progress
 * synced with the server (useProgressSync is shared/deduplicated per slug).
 */
export function ProgressPanel({ pkg }: { pkg: InterviewPackage }) {
  const slug = pkg.meta.slug;
  useProgressSync(slug);
  const hydrated = useProgressHydrated();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 text-sm" data-testid="progress-panel">
      <h2 id={headingId} className="text-sm font-semibold">
        Study progress
      </h2>
      {hydrated ? <ProgressBody pkg={pkg} /> : <ProgressSkeleton />}
    </section>
  );
}

function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading progress">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ProgressBody({ pkg }: { pkg: InterviewPackage }) {
  const slug = pkg.meta.slug;
  // Only the lists the summary uses: avoids re-rendering (and re-drawing the chart) when the
  // last reading position is saved while scrolling.
  const progress = useProgressStore(
    useShallow((s) => {
      const p = s.byPackage[slug] ?? EMPTY_PROGRESS;
      return {
        studied: p.studied,
        favorites: p.favorites,
        completedTopics: p.completedTopics,
        flashcards: p.flashcards,
        studyPlanTasks: p.studyPlanTasks,
      };
    }),
  );
  const chartLabelId = useId();
  const summary = useMemo(() => summarizeProgress(pkg, getStudyItemIndex(pkg).items, progress), [pkg, progress]);

  return (
    <div className="flex flex-col gap-4">
      <StatBar
        label="Items studied"
        value={summary.studiedPercent}
        detail={`${summary.studied} of ${summary.totalItems}`}
      />
      {summary.studyPlan && (
        <StatBar
          label="Study plan"
          value={summary.studyPlan.percent}
          detail={`${summary.studyPlan.completed} of ${summary.studyPlan.total} tasks`}
        />
      )}

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Favorites" value={summary.favorites} />
        <Stat label="Topics done" value={summary.completedTopics} total={summary.totalTopics || undefined} />
        <Stat label="Cards reviewed" value={summary.flashcardsReviewed} />
        <Stat label="Cards known" value={summary.flashcardsKnown} total={summary.totalFlashcards || undefined} />
        <MockStat slug={slug} />
      </dl>

      {summary.topics.length > 0 && (
        <figure className="flex flex-col gap-1.5">
          <figcaption id={chartLabelId} className="text-muted-foreground text-xs font-medium">
            Studied % by topic
          </figcaption>
          <div aria-hidden="true">
            <ProgressTopicChart topics={summary.topics} />
          </div>
          <ul className="sr-only" aria-labelledby={chartLabelId}>
            {summary.topics.map((t) => (
              <li key={t.id}>
                {t.title.en}: {t.studied} of {t.total} studied ({t.percent}%)
              </li>
            ))}
          </ul>
        </figure>
      )}
    </div>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  total?: number;
  hint?: ReactNode;
  className?: string;
}

function Stat({ label, value, total, hint, className }: StatProps) {
  return (
    <div className={cn("bg-card flex flex-col gap-0.5 rounded-lg border px-2.5 py-2", className)}>
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className="text-base leading-tight font-semibold tabular-nums">
        {value}
        {total !== undefined && <span className="text-muted-foreground text-xs font-normal">/{total}</span>}
      </dd>
      {hint && <dd className="text-muted-foreground text-[11px]">{hint}</dd>}
    </div>
  );
}

function MockStat({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ["mock-sessions", slug],
    queryFn: ({ signal }) => fetchMockSessions(slug, signal),
    retry: false,
    staleTime: 60_000,
  });

  if (query.isPending) {
    return (
      <div className="bg-card col-span-2 flex flex-col gap-1 rounded-lg border px-2.5 py-2">
        <dt className="text-muted-foreground text-[11px]">Latest mock interview</dt>
        <dd>
          <Skeleton className="h-5 w-16" />
        </dd>
      </div>
    );
  }
  if (query.isError) {
    return (
      <Stat
        className="col-span-2"
        label="Latest mock interview"
        value={<span className="text-muted-foreground text-sm font-normal">Unavailable</span>}
      />
    );
  }
  const latest = latestScoredSession(query.data);
  if (!latest || latest.averageScore === null) {
    return (
      <Stat
        className="col-span-2"
        label="Latest mock interview"
        value={<span className="text-muted-foreground text-sm font-normal">No sessions yet</span>}
      />
    );
  }
  const when = new Date(latest.completedAt ?? latest.startedAt);
  return (
    <Stat
      className="col-span-2"
      label="Latest mock average"
      value={
        <>
          {latest.averageScore.toFixed(1)}
          <span className="text-muted-foreground text-xs font-normal">/10</span>
        </>
      }
      hint={
        Number.isNaN(when.getTime())
          ? `${latest.answerCount} answers`
          : `${latest.answerCount} answers · ${when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      }
    />
  );
}
