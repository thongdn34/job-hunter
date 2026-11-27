"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CornerDownRight, Eye, Flag, Loader2, Send } from "lucide-react";
import type { MockClientItem } from "@/domain/mock/client-items";
import { REVEAL_PENALTY } from "@/domain/mock/scoring";
import { BilingualText } from "@/components/common/BilingualText";
import { DifficultyBadge, PriorityBadge } from "@/components/common/Badges";
import { Markdown } from "@/components/common/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitMockAnswer } from "./api";
import { EvaluationResult } from "./EvaluationResult";
import { KIND_LABELS } from "./mock-plan";
import type { TurnResult } from "./session-reducer";

export const MAX_ANSWER_CHARS = 10_000;

export const AnswerFormSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Write your answer before submitting.")
    .max(MAX_ANSWER_CHARS, `Keep your answer under ${MAX_ANSWER_CHARS.toLocaleString("en-US")} characters.`),
});
/** Fraction of `MAX_ANSWER_CHARS` at which screen-reader users are warned that the limit is near. */
export const NEAR_LIMIT_RATIO = 0.9;

export type AnswerLengthState = "ok" | "near" | "over";

/** Coarse length state: changes only when a threshold is crossed, never on every keystroke. */
export function answerLengthState(charCount: number, max: number = MAX_ANSWER_CHARS): AnswerLengthState {
  if (charCount > max) return "over";
  if (charCount >= Math.ceil(max * NEAR_LIMIT_RATIO)) return "near";
  return "ok";
}

const LENGTH_ANNOUNCEMENTS: Record<AnswerLengthState, string> = {
  ok: "",
  near: `Approaching the ${MAX_ANSWER_CHARS.toLocaleString("en-US")} character limit.`,
  over: `Over the ${MAX_ANSWER_CHARS.toLocaleString("en-US")} character limit.`,
};

type AnswerFormInput = z.input<typeof AnswerFormSchema>;
type AnswerFormOutput = z.output<typeof AnswerFormSchema>;

interface QuestionTurnProps {
  sessionId: string;
  item: MockClientItem;
  position: number;
  total: number;
  result: TurnResult | undefined;
  isLast: boolean;
  finishing: boolean;
  /** Id of the stored follow-up that can be answered as the next turn, if any. */
  followUpId: string | undefined;
  onResult: (result: TurnResult) => void;
  onNext: () => void;
  onFollowUp: () => void;
  onFinish: () => void;
}

export function QuestionTurn({
  sessionId,
  item,
  position,
  total,
  result,
  isLast,
  finishing,
  followUpId,
  onResult,
  onNext,
  onFollowUp,
  onFinish,
}: QuestionTurnProps) {
  const ids = {
    question: useId(),
    answer: useId(),
    hint: useId(),
    count: useId(),
    error: useId(),
    result: useId(),
    reveal: useId(),
  };
  const [revealed, setRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const submit = useSubmitMockAnswer(sessionId);

  const form = useForm<AnswerFormInput, unknown, AnswerFormOutput>({
    resolver: zodResolver(AnswerFormSchema),
    defaultValues: { answer: "" },
  });
  const answer = useWatch({ control: form.control, name: "answer" }) ?? "";
  const fieldError = form.formState.errors.answer?.message;
  const submitted = Boolean(result);

  // Move focus to the new question when the turn mounts, and to the score once evaluated.
  useEffect(() => {
    questionRef.current?.focus({ preventScroll: false });
  }, []);
  useEffect(() => {
    if (result) document.getElementById(ids.result)?.focus();
  }, [result, ids.result]);

  const onSubmit = form.handleSubmit((values) => {
    if (submit.isPending || submitted) return;
    submit.mutate(
      { itemId: item.id, answer: values.answer, revealedBeforeSubmit: revealed },
      {
        onSuccess: (res) =>
          onResult({
            answerId: res.answer.id,
            itemId: item.id,
            overall: res.evaluation.overall,
            revealedBeforeSubmit: res.answer.revealedBeforeSubmit,
            evaluation: res.evaluation,
          }),
      },
    );
  });

  const charCount = answer.length;
  const lengthState = answerLengthState(charCount);
  const overLimit = lengthState === "over";

  return (
    <article aria-labelledby={ids.question} className="space-y-5">
      <header className="space-y-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <span className="text-foreground font-medium">
            Question {position} of {total}
          </span>
          {item.parentId ? (
            <Badge variant="outline" className="gap-1">
              <CornerDownRight aria-hidden />
              Follow-up
            </Badge>
          ) : (
            <Badge variant="outline">{KIND_LABELS[item.kind].en}</Badge>
          )}
          <PriorityBadge priority={item.priority} />
          <DifficultyBadge difficulty={item.difficulty} />
        </div>
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Interview progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={position - (submitted ? 0 : 1)}
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none"
            style={{ width: `${((position - (submitted ? 0 : 1)) / Math.max(1, total)) * 100}%` }}
          />
        </div>
        <h3
          id={ids.question}
          ref={questionRef}
          tabIndex={-1}
          className="text-lg leading-snug font-semibold outline-none"
        >
          <BilingualText value={item.prompt} viClassName="mt-1 text-base font-normal" />
        </h3>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-3" aria-busy={submit.isPending}>
        <div className="flex items-end justify-between gap-2">
          <label htmlFor={ids.answer} className="text-sm font-medium">
            Your answer
          </label>
          {/* Not a live region: it changes on every keystroke. Screen readers read it on focus via
              aria-describedby; threshold crossings are announced by the polite region below. */}
          <span
            id={ids.count}
            className={
              overLimit
                ? "text-destructive text-xs font-medium tabular-nums"
                : "text-muted-foreground text-xs tabular-nums"
            }
          >
            {charCount.toLocaleString("en-US")} / {MAX_ANSWER_CHARS.toLocaleString("en-US")}
          </span>
        </div>
        <span className="sr-only" aria-live="polite" data-testid="answer-length-status">
          {LENGTH_ANNOUNCEMENTS[lengthState]}
        </span>
        <Textarea
          id={ids.answer}
          rows={8}
          readOnly={submitted || submit.isPending}
          placeholder="Answer out loud first, then type the key points: core idea → how it works → trade-offs → failure cases → example."
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={[ids.hint, ids.count, fieldError ? ids.error : ""].filter(Boolean).join(" ")}
          className="min-h-40 resize-y"
          {...form.register("answer")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void onSubmit();
            }
          }}
        />
        <p id={ids.hint} className="text-muted-foreground text-xs">
          Press <kbd className="bg-muted rounded border px-1 font-mono text-[11px]">Ctrl</kbd> /{" "}
          <kbd className="bg-muted rounded border px-1 font-mono text-[11px]">⌘</kbd> +{" "}
          <kbd className="bg-muted rounded border px-1 font-mono text-[11px]">Enter</kbd> to submit.
        </p>
        {fieldError ? (
          <p id={ids.error} role="alert" className="text-destructive text-sm">
            {fieldError}
          </p>
        ) : null}

        {revealed && !submitted ? (
          <section
            id={ids.reveal}
            aria-label="Recommended answer"
            className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
          >
            <h4 className="text-sm font-semibold">Recommended answer (revealed)</h4>
            <div lang="en" className="text-sm leading-relaxed">
              <Markdown source={item.referenceAnswer} />
            </div>
          </section>
        ) : null}

        {submit.isError ? (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            <p className="font-medium">Your answer could not be evaluated.</p>
            <p className="mt-1">{submit.error.message}</p>
            <p className="mt-1 text-xs">Your text is kept — submit again to retry.</p>
          </div>
        ) : null}

        {!submitted ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={submit.isPending} aria-busy={submit.isPending}>
              {submit.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              {submit.isPending ? "Evaluating…" : "Submit answer"}
            </Button>
            {!revealed ? (
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)} disabled={submit.isPending}>
                <Eye aria-hidden />
                Reveal recommended answer
              </Button>
            ) : (
              <span className="text-muted-foreground text-xs">
                Revealed — recorded with this answer (−{REVEAL_PENALTY}).
              </span>
            )}
            <Button type="button" variant="ghost" onClick={onFinish} disabled={submit.isPending || finishing}>
              <Flag aria-hidden />
              End session
            </Button>
          </div>
        ) : null}
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal the recommended answer?</DialogTitle>
            <DialogDescription>
              This is recorded with your answer and lowers its overall score by {REVEAL_PENALTY} points. Try answering
              first — you will see the recommended answer after submitting anyway.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep it hidden</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setRevealed(true);
                setConfirmOpen(false);
              }}
            >
              Reveal answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result ? (
        <section aria-label="Evaluation" className="bg-card rounded-xl border p-4 shadow-xs">
          <EvaluationResult
            evaluation={result.evaluation}
            headingId={ids.result}
            revealedBeforeSubmit={result.revealedBeforeSubmit}
            actions={
              <>
                {followUpId ? (
                  <Button type="button" variant="outline" onClick={onFollowUp} disabled={finishing}>
                    <CornerDownRight aria-hidden />
                    Answer this follow-up next
                  </Button>
                ) : null}
                {isLast ? (
                  <Button type="button" onClick={onFinish} disabled={finishing} aria-busy={finishing}>
                    {finishing ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />}
                    {finishing ? "Finishing…" : "Finish & see summary"}
                  </Button>
                ) : (
                  <Button type="button" onClick={onNext} disabled={finishing}>
                    Next question
                    <ArrowRight aria-hidden />
                  </Button>
                )}
                {!isLast ? (
                  <Button type="button" variant="ghost" onClick={onFinish} disabled={finishing}>
                    <Flag aria-hidden />
                    End session
                  </Button>
                ) : null}
              </>
            }
          />
        </section>
      ) : null}
    </article>
  );
}
