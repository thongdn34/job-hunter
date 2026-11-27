"use client";

import { useProgressHydrated } from "@/hooks/use-hydrated";
import { usePackageProgress } from "@/stores/progress-store";

/** Percentage of studied items, clamped to 0..100. */
export function studiedPercent(studied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((Math.min(studied, total) / total) * 100));
}

/**
 * Local study progress for a package card. Renders a neutral placeholder until the
 * persisted progress store has hydrated, so server and client markup match.
 */
export function StudyProgressStat({ slug, totalItems }: { slug: string; totalItems: number }) {
  const hydrated = useProgressHydrated();
  const progress = usePackageProgress(slug);
  const studied = hydrated ? Math.min(progress.studied.length, totalItems) : 0;
  const percent = hydrated ? studiedPercent(studied, totalItems) : 0;

  return (
    <div>
      <dt className="text-muted-foreground text-xs">Studied</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums">
        {hydrated ? (
          <>
            {percent}%
            <span className="sr-only">
              {" "}
              ({studied} of {totalItems} items)
            </span>
          </>
        ) : (
          <span aria-label="Loading progress">—</span>
        )}
        <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full" aria-hidden>
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </dd>
    </div>
  );
}
