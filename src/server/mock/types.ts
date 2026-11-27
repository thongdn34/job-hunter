import type { MockEvaluationItem } from "@/domain/mock/item-context";
import type { MockEvaluation } from "@/domain/mock/schema";

export interface EvaluateAnswerInput {
  /** The study item plus its full content (reference answer, shortcut, takeaway, follow-up). */
  item: MockEvaluationItem;
  answer: string;
  revealedBeforeSubmit: boolean;
}

/** One evaluation strategy. Implementations must return a MockEvaluationSchema-valid object. */
export interface MockEvaluator {
  readonly name: MockEvaluation["evaluator"];
  evaluate(input: EvaluateAnswerInput, options?: { signal?: AbortSignal }): Promise<MockEvaluation>;
}
