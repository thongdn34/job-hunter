import "server-only";
import type { MockEvaluation } from "@/domain/mock/schema";
import { aiEvaluator } from "./ai-evaluator";
import { heuristicEvaluator } from "./heuristic-evaluator";
import type { EvaluateAnswerInput } from "./types";

export type { EvaluateAnswerInput, MockEvaluator } from "./types";
export { heuristicEvaluator } from "./heuristic-evaluator";
export { aiEvaluator } from "./ai-evaluator";

/**
 * Evaluates one mock interview answer. Uses the AI evaluator when a provider is configured
 * (it falls back to the heuristic on any failure and labels `evaluator` accordingly);
 * otherwise the deterministic heuristic. The result is always MockEvaluationSchema-valid.
 */
export async function evaluateAnswer(
  input: EvaluateAnswerInput,
  options: { signal?: AbortSignal; prefer?: "ai" | "heuristic" } = {},
): Promise<MockEvaluation> {
  const evaluator = options.prefer === "heuristic" ? heuristicEvaluator : aiEvaluator;
  return evaluator.evaluate(input, { signal: options.signal });
}
