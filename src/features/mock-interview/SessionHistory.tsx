"use client";

import { memo, useId, useState } from "react";
import { ChevronDown, History, RefreshCw } from "lucide-react";
import type { MockAnswerDto, MockSessionListItem } from "@/domain/mock/dto";
import type { MockClientItem } from "@/domain/mock/client-items";
import { BilingualText } from "@/components/common/BilingualText";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMockSessionDetail, useMockSessions } from "./api";
import { EvaluationResult } from "./EvaluationResult";
import { formatDateTime, formatScore } from "./labels";
import { ScoreOverview, type SummaryRow } from "./SessionSummary";

type ItemLookup = ReadonlyMap<string, MockClientItem>;

const AnswerDetail = memo(function AnswerDetail({
  answer,
  item,
}: {
  answer: MockAnswerDto;
  item: MockClientItem | undefined;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li className="py-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted focus-visible:ring-ring/50 flex w-full items-start justify-between gap-3 rounded-md px-1 py-1 text-left focus-visible:ring-3 focus-visible:outline-none"
      >
        <span className="min-w-0 text-sm">
          {item ? <BilingualText value={item.title} viClassName="text-xs" /> : answer.itemId}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums">
          {formatScore(answer.overall)}
          <span className="text-muted-foreground font-normal">/10</span>
          <ChevronDown
            className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>
      <div id={panelId} hidden={!open} className="mt-2 space-y-3 pl-1">
        {open ? (
          <>
            <div className="space-y-1">
              <h5 className="text-muted-foreground text-xs font-semibold uppercase">Your answer</h5>
              <p className="bg-muted/40 rounded-md border p-2 text-sm whitespace-pre-wrap">{answer.answer}</p>
            </div>
            <EvaluationResult
              evaluation={answer.evaluation}
              revealedBeforeSubmit={answer.revealedBeforeSubmit}
              compact
            />
          </>
        ) : null}
      </div>
    </li>
  );
});

function SessionDetail({ id, lookup }: { id: string; lookup: ItemLookup }) {
  const detail = useMockSessionDetail(id, true);
  if (detail.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <div role="alert" className="text-destructive flex flex-wrap items-center gap-2 text-sm">
        {detail.error.message}
        <Button size="xs" variant="outline" onClick={() => void detail.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  const { session, answers } = detail.data;
  const rows: SummaryRow[] = answers.map((a) => ({
    key: a.id,
    item: lookup.get(a.itemId),
    itemId: a.itemId,
    overall: a.overall,
    evaluator: a.evaluation.evaluator,
    revealed: a.revealedBeforeSubmit,
  }));
  return (
    <div className="space-y-4">
      <ScoreOverview rows={rows} average={session.averageScore} />
      {answers.length > 0 ? (
        <div>
          <h5 className="text-sm font-semibold">Answers & feedback</h5>
          <ul className="divide-y">
            {answers.map((a) => (
              <AnswerDetail key={a.id} answer={a} item={lookup.get(a.itemId)} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const SessionRow = memo(function SessionRow({ session, lookup }: { session: MockSessionListItem; lookup: ItemLookup }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const completed = session.completedAt !== null;
  return (
    <li className="bg-card rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/60 focus-visible:ring-ring/50 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-left focus-visible:ring-3 focus-visible:outline-none"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{formatDateTime(session.startedAt)}</span>
          <span className="text-muted-foreground block text-xs">
            {session.answerCount} answer{session.answerCount === 1 ? "" : "s"} ·{" "}
            {completed ? "Completed" : "In progress / abandoned"}
          </span>
        </span>
        <span className="flex items-center gap-2 text-sm tabular-nums">
          {session.averageScore !== null ? (
            <span className="font-semibold">
              {formatScore(session.averageScore)}
              <span className="text-muted-foreground font-normal">/10 avg</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No score</span>
          )}
          <ChevronDown
            className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>
      <div id={panelId} hidden={!open} className="border-t p-3">
        {open ? <SessionDetail id={session.id} lookup={lookup} /> : null}
      </div>
    </li>
  );
});

/** Previous sessions of this package with drill-down into answers and feedback. */
export function SessionHistory({ packageSlug, lookup }: { packageSlug: string; lookup: ItemLookup }) {
  const sessions = useMockSessions(packageSlug);
  return (
    <section aria-labelledby="mock-history-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="mock-history-title" className="flex items-center gap-2 text-base font-semibold">
          <History className="text-muted-foreground size-4" aria-hidden />
          Previous sessions
        </h3>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => void sessions.refetch()}
          disabled={sessions.isFetching}
          aria-label="Refresh session history"
        >
          <RefreshCw className={cn(sessions.isFetching && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>
      {sessions.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading previous sessions">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : sessions.isError ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
        >
          Could not load previous sessions: {sessions.error.message}
          <Button size="xs" variant="outline" onClick={() => void sessions.refetch()}>
            Retry
          </Button>
        </div>
      ) : sessions.data.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          No mock interviews yet. Your sessions and scores will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.data.map((s) => (
            <SessionRow key={s.id} session={s} lookup={lookup} />
          ))}
        </ul>
      )}
    </section>
  );
}
