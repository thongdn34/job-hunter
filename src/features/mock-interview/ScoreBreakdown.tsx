"use client";

import { memo } from "react";
import { MOCK_CRITERIA, type MockEvaluation } from "@/domain/mock/schema";
import { CRITERION_WEIGHTS, SCORE_BAND_LABELS, scoreBand } from "@/domain/mock/scoring";
import { BilingualText } from "@/components/common/BilingualText";
import { cn } from "@/lib/utils";
import { CRITERION_LABELS, formatScore } from "./labels";

/** Big "/10" score with its qualitative band (never color alone). */
export const OverallScore = memo(function OverallScore({
  score,
  className,
  size = "lg",
}: {
  score: number;
  className?: string;
  size?: "sm" | "lg";
}) {
  const band = scoreBand(score);
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold tabular-nums", size === "lg" ? "text-4xl" : "text-xl")}>
        {formatScore(score)}
        <span className="text-muted-foreground text-base font-normal">/10</span>
      </span>
      <span className="bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 text-xs font-medium">
        {SCORE_BAND_LABELS[band].en}
        <span className="sr-only"> score band</span>
      </span>
    </div>
  );
});

/** Per-criterion horizontal bars. Values are in text; the bar itself is decorative. */
export const ScoreBreakdown = memo(function ScoreBreakdown({ scores }: { scores: MockEvaluation["scores"] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {MOCK_CRITERIA.map((c) => {
        const value = scores[c];
        return (
          <div key={c} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="min-w-0">
                <BilingualText value={CRITERION_LABELS[c]} className="font-medium" viClassName="text-xs" />
                <span className="sr-only">, weight {Math.round(CRITERION_WEIGHTS[c] * 100)}%</span>
              </dt>
              <dd className="shrink-0 font-medium tabular-nums">
                {formatScore(value)}
                <span className="text-muted-foreground">/10</span>
              </dd>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.max(0, Math.min(100, value * 10))}%` }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
});
