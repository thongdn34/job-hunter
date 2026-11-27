"use client";

import { lazy, memo, Suspense, useEffect, useMemo, useRef } from "react";
import { CornerDownRight, RotateCcw, Trophy } from "lucide-react";
import type { MockClientItem } from "@/domain/mock/client-items";
import { averageScore } from "@/domain/mock/scoring";
import { BilingualText } from "@/components/common/BilingualText";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EvaluatorBadge } from "./EvaluationResult";
import { formatScore } from "./labels";
import { OverallScore } from "./ScoreBreakdown";
import type { ScoreChartDatum } from "./ScoreChart";

const ScoreChart = lazy(() => import("./ScoreChart"));

export interface SummaryRow {
  key: string;
  item: MockClientItem | undefined;
  itemId: string;
  overall: number;
  evaluator: "ai" | "heuristic";
  revealed: boolean;
}

const SummaryRowItem = memo(function SummaryRowItem({ row, n }: { row: SummaryRow; n: number }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <p className="text-sm">
          <span className="text-muted-foreground mr-1.5 font-mono text-xs">Q{n}</span>
          {row.item?.parentId ? (
            <CornerDownRight className="text-muted-foreground mr-1 inline size-3.5" aria-label="Follow-up" />
          ) : null}
          {row.item ? (
            <BilingualText value={row.item.title} viClassName="text-xs" />
          ) : (
            <span className="text-muted-foreground">{row.itemId}</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <EvaluatorBadge evaluator={row.evaluator} />
          {row.revealed ? (
            <span className="text-xs text-amber-700 dark:text-amber-300">Answer revealed (−2)</span>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatScore(row.overall)}
        <span className="text-muted-foreground font-normal">/10</span>
      </span>
    </li>
  );
});

/** Per-question scores (list + bar chart) with the session average. */
export function ScoreOverview({ rows, average }: { rows: SummaryRow[]; average: number | null }) {
  const chartData = useMemo<ScoreChartDatum[]>(
    () => rows.map((r, i) => ({ label: `Q${i + 1}`, title: r.item?.title.en ?? r.itemId, score: r.overall })),
    [rows],
  );
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No answers were submitted in this session.</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ScoreChart data={chartData} average={average} />
      </Suspense>
      <ol className="divide-y" aria-label="Scores per question">
        {rows.map((row, i) => (
          <SummaryRowItem key={row.key} row={row} n={i + 1} />
        ))}
      </ol>
    </div>
  );
}

export function SessionSummary({
  rows,
  serverAverage,
  onRestart,
}: {
  rows: SummaryRow[];
  serverAverage: number | null | undefined;
  onRestart: () => void;
}) {
  const average = serverAverage ?? averageScore(rows.map((r) => r.overall));
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section aria-labelledby="mock-summary-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h3
            id="mock-summary-title"
            ref={headingRef}
            tabIndex={-1}
            className="flex items-center gap-2 text-lg font-semibold outline-none"
          >
            <Trophy className="text-muted-foreground size-5" aria-hidden />
            Session summary
          </h3>
          <p className="text-muted-foreground text-sm">
            {rows.length} answer{rows.length === 1 ? "" : "s"} evaluated
          </p>
        </div>
        {average !== null ? (
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Average score</p>
            <OverallScore score={average} />
          </div>
        ) : null}
      </div>
      <ScoreOverview rows={rows} average={average} />
      <Button type="button" onClick={onRestart}>
        <RotateCcw aria-hidden />
        Start a new session
      </Button>
    </section>
  );
}
