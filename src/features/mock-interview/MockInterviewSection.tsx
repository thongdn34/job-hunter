"use client";

import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { buildMockClientItems, type MockClientItem } from "@/domain/mock/client-items";
import type { MockConfig } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompleteMockSession, useStartMockSession } from "./api";
import { buildQuestionPlan, resolvePool, type PlanOptions } from "./mock-plan";
import { MockSetup } from "./MockSetup";
import { QuestionTurn } from "./QuestionTurn";
import { answeredTurns, initialRunState, mockRunReducer, type TurnResult } from "./session-reducer";
import { SessionHistory } from "./SessionHistory";
import { SessionSummary, type SummaryRow } from "./SessionSummary";

type Variant = "section" | "page";

interface MockInterviewSectionProps extends SectionProps<"mock"> {
  /** "section" (inside the package page, default) or "page" (full-width /packages/[slug]/mock). */
  variant?: Variant;
}

/**
 * Section 15 — Mock Interview, as registered in the package view. The package page already holds
 * the full package on the client, so the slim item list is derived here; the standalone mock page
 * builds it on the server instead (see `MockInterview`).
 */
export function MockInterviewSection({ pkg, data, variant = "section" }: MockInterviewSectionProps) {
  const items = useMemo(() => buildMockClientItems(pkg), [pkg]);
  return <MockInterview slug={pkg.meta.slug} config={data} items={items} variant={variant} />;
}

export interface MockInterviewProps {
  slug: string;
  config: MockConfig;
  /** Every askable item (primary + stored follow-ups) as slim client DTOs — see `buildMockClientItems`. */
  items: readonly MockClientItem[];
  variant?: Variant;
}

/**
 * One question at a time from `config.questionPool`, evaluated on the server (AI when configured,
 * deterministic heuristic otherwise) and saved as a session. Takes only the slim item DTOs, never
 * the whole package, so a server page can render it without serializing every section.
 */
export function MockInterview({ slug, config: data, items, variant = "section" }: MockInterviewProps) {
  const [state, dispatch] = useReducer(mockRunReducer, initialRunState);

  const itemIndex = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  // Only primary items can be planned; follow-ups are asked on demand after their parent.
  const pool = useMemo(
    () =>
      resolvePool(
        items.filter((i) => !i.parentId),
        data.questionPool,
      ),
    [items, data.questionPool],
  );

  const start = useStartMockSession(slug);
  const complete = useCompleteMockSession(slug);

  const handleStart = useCallback(
    (options: PlanOptions) => {
      const plan = buildQuestionPlan(pool, options);
      if (plan.length === 0) return;
      start.mutate(undefined, {
        onSuccess: (session) => dispatch({ type: "start", sessionId: session.id, itemIds: plan.map((i) => i.id) }),
      });
    },
    [pool, start],
  );

  const sessionId = state.phase === "setup" ? null : state.sessionId;
  const handleFinish = useCallback(() => {
    if (!sessionId) return;
    complete.mutate(sessionId, {
      onSuccess: (session) => dispatch({ type: "finish", session }),
      onError: (error) => {
        toast.error("Could not mark the session as completed", { description: error.message });
        dispatch({ type: "finish", session: null });
      },
    });
  }, [complete, sessionId]);

  const handleResult = useCallback(
    (index: number, result: TurnResult) => dispatch({ type: "result", index, result }),
    [],
  );

  const summaryRows = useMemo<SummaryRow[]>(() => {
    if (state.phase !== "summary") return [];
    return answeredTurns(state.turns, state.results).map((t) => ({
      key: `${t.index}-${t.itemId}`,
      item: itemIndex.get(t.itemId),
      itemId: t.itemId,
      overall: t.result.overall,
      evaluator: t.result.evaluation.evaluator,
      revealed: t.result.revealedBeforeSubmit,
    }));
  }, [state, itemIndex]);

  if (pool.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
        The mock interview question pool is empty for this package. Generate the question sections first.
      </div>
    );
  }

  let body: ReactNode;
  if (state.phase === "setup") {
    body = (
      <MockSetup
        config={data}
        pool={pool}
        pending={start.isPending}
        error={start.isError ? start.error.message : null}
        onStart={handleStart}
      />
    );
  } else if (state.phase === "interview") {
    const turn = state.turns[state.index]!;
    const item = itemIndex.get(turn.itemId);
    const result = state.results[state.index];
    const followUpId = item?.followUp && itemIndex.has(item.followUp.id) ? item.followUp.id : undefined;
    body = item ? (
      <QuestionTurn
        key={`${state.index}-${turn.itemId}`}
        sessionId={state.sessionId}
        item={item}
        position={state.index + 1}
        total={state.turns.length}
        result={result}
        isLast={state.index + 1 >= state.turns.length}
        finishing={complete.isPending}
        followUpId={followUpId}
        onResult={(r) => handleResult(state.index, r)}
        onNext={() => dispatch({ type: "next" })}
        onFollowUp={() => followUpId && dispatch({ type: "followUp", followUpId, parentId: item.id })}
        onFinish={handleFinish}
      />
    ) : (
      <div role="alert" className="text-destructive text-sm">
        Question “{turn.itemId}” is no longer available in this package.
      </div>
    );
  } else {
    body = (
      <SessionSummary
        rows={summaryRows}
        serverAverage={state.session?.averageScore}
        onRestart={() => {
          start.reset();
          complete.reset();
          dispatch({ type: "reset" });
        }}
      />
    );
  }

  return (
    <div className={cn("space-y-8", variant === "page" && "mx-auto w-full max-w-5xl")}>
      {variant === "section" ? (
        <div className="flex justify-end">
          <Link
            href={`/packages/${encodeURIComponent(slug)}/mock`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
          >
            <Maximize2 aria-hidden />
            Open full-page mode
          </Link>
        </div>
      ) : null}
      <div className="bg-card text-card-foreground rounded-xl border p-4 sm:p-6">{body}</div>
      {state.phase !== "interview" ? <SessionHistory packageSlug={slug} lookup={itemIndex} /> : null}
    </div>
  );
}
