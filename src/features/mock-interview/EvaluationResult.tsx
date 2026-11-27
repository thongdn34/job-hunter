"use client";

import { memo, type ReactNode } from "react";
import { Bot, CheckCircle2, Cpu, MessageCircleQuestion, TriangleAlert } from "lucide-react";
import type { MockEvaluation } from "@/domain/mock/schema";
import { Badge } from "@/components/ui/badge";
import { BilingualText } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { Markdown } from "@/components/common/Markdown";
import { cn } from "@/lib/utils";
import { EVALUATOR_LABELS } from "./labels";
import { OverallScore, ScoreBreakdown } from "./ScoreBreakdown";

export const EvaluatorBadge = memo(function EvaluatorBadge({ evaluator }: { evaluator: MockEvaluation["evaluator"] }) {
  const meta = EVALUATOR_LABELS[evaluator];
  const Icon = evaluator === "ai" ? Bot : Cpu;
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1" title={meta.description}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
});

function ListBlock({ title, items, icon, empty }: { title: string; items: string[]; icon: ReactNode; empty: string }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="marker:text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface EvaluationResultProps {
  evaluation: MockEvaluation;
  /** Heading level for the result title (keeps the outline valid where it is embedded). */
  headingId?: string;
  revealedBeforeSubmit?: boolean;
  /** Rendered under the follow-up question (e.g. "Answer follow-up", "Next question"). */
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** Score /10, criterion bars, strengths/gaps, improved English answer, Vietnamese feedback, follow-up. */
export const EvaluationResult = memo(function EvaluationResult({
  evaluation,
  headingId,
  revealedBeforeSubmit,
  actions,
  className,
  compact = false,
}: EvaluationResultProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 id={headingId} tabIndex={-1} className="text-muted-foreground text-sm font-medium outline-none">
            Score
          </h3>
          <OverallScore score={evaluation.overall} size={compact ? "sm" : "lg"} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {revealedBeforeSubmit ? (
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
              <TriangleAlert aria-hidden />
              Answer revealed (−2)
            </Badge>
          ) : null}
          <EvaluatorBadge evaluator={evaluation.evaluator} />
        </div>
      </div>

      <ScoreBreakdown scores={evaluation.scores} />

      <div className="grid gap-4 md:grid-cols-2">
        <ListBlock
          title="Strengths"
          items={evaluation.strengths}
          empty="No clear strengths detected yet."
          icon={<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
        <ListBlock
          title="Gaps to close"
          items={evaluation.gaps}
          empty="No major gaps — nice work."
          icon={<TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />}
        />
      </div>

      <section aria-label="Vietnamese feedback" className="bg-muted/40 rounded-lg border p-3">
        <h4 className="mb-1 text-sm font-semibold">
          <span lang="vi">Nhận xét</span>{" "}
          <span className="text-muted-foreground font-normal">(Vietnamese feedback)</span>
        </h4>
        <p lang="vi" className="text-sm leading-relaxed">
          {evaluation.feedbackVi}
        </p>
      </section>

      <section aria-label="Improved sample answer" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Improved sample answer (English)</h4>
          <CopyButton text={evaluation.improvedAnswer} label="Copy answer" size="xs" />
        </div>
        <div lang="en" className="bg-card rounded-lg border p-3 text-sm leading-relaxed">
          <Markdown source={evaluation.improvedAnswer} />
        </div>
      </section>

      <section aria-label="Interviewer follow-up" className="space-y-2 rounded-lg border border-dashed p-3">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageCircleQuestion className="text-muted-foreground size-4" aria-hidden />
          Interviewer follow-up
        </h4>
        <BilingualText value={evaluation.followUpQuestion} as="p" className="text-sm" />
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </section>
    </div>
  );
});
