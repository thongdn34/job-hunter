import {
  generateText,
  JSONParseError,
  NoObjectGeneratedError,
  Output,
  TypeValidationError,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/server/ai/prompts/system";
import { buildRepairPrompt, formatZodIssues } from "@/server/ai/prompts/repair";
import { GenerationCancelledError, SectionGenerationError, describeError, isAbortError } from "./errors";
import { withRetry, type RetryOptions } from "./retry";

/**
 * One structured generation step:
 *   generateText + Output.object(schema)  (AI SDK v7 structured output)
 *   → retry with exponential backoff on 429/5xx (respecting retry-after)
 *   → on schema/JSON failure: ONE repair attempt that feeds the validation errors back
 *   → otherwise a SectionGenerationError with a readable message.
 *
 * `postProcess` runs on the validated output (normalization / sanitization / final domain
 * validation). If it throws a ZodError, that also counts as a validation failure and is repaired.
 */

export const MAX_OUTPUT_TOKENS = 16_000;
export const CALL_TIMEOUT_MS = 300_000;

export interface StructuredCallOptions<S extends z.ZodType, R> {
  model: LanguageModel;
  schema: S;
  prompt: string;
  /** Used in error messages, e.g. "Company Research". */
  label: string;
  /** Name/description forwarded to providers that support named structured outputs. */
  name?: string;
  postProcess?: (output: z.infer<S>) => R;
  signal?: AbortSignal;
  retry?: RetryOptions;
  providerOptions?: Record<string, Record<string, string | number | boolean | null>>;
  maxOutputTokens?: number;
  /** Called before every model call (including retries and the repair attempt). */
  onAttempt?: (info: { attempt: number; repair: boolean }) => void;
  /** Serializes model calls across a job (bounded concurrency). */
  limit?: <T>(fn: () => Promise<T>) => Promise<T>;
}

interface ValidationFailure {
  details: string;
  rawText: string;
}

/** Extracts readable validation details from AI SDK / Zod errors, or null when it is not a validation failure. */
export function validationFailureOf(error: unknown): ValidationFailure | null {
  if (error instanceof z.ZodError) return { details: formatZodIssues(error), rawText: "" };
  if (!NoObjectGeneratedError.isInstance(error)) return null;
  const rawText = error.text ?? "";
  let cause: unknown = error.cause;
  for (let depth = 0; cause && depth < 5; depth += 1) {
    if (cause instanceof z.ZodError) return { details: formatZodIssues(cause), rawText };
    if (
      typeof cause === "object" &&
      cause !== null &&
      "issues" in cause &&
      Array.isArray((cause as { issues: unknown }).issues)
    ) {
      return { details: formatZodIssues(cause as z.ZodError), rawText };
    }
    if (JSONParseError.isInstance(cause))
      return { details: `- (root): Output is not valid JSON (${cause.message.slice(0, 200)})`, rawText };
    if (TypeValidationError.isInstance(cause)) {
      cause = cause.cause;
      continue;
    }
    cause = (cause as { cause?: unknown }).cause;
  }
  return { details: `- (root): ${error.message.slice(0, 300)}`, rawText };
}

export async function generateStructured<S extends z.ZodType, R = z.infer<S>>(
  options: StructuredCallOptions<S, R>,
): Promise<R> {
  const limit = options.limit ?? (<T>(fn: () => Promise<T>) => fn());
  const post = (output: z.infer<S>): R => (options.postProcess ? options.postProcess(output) : (output as R));
  let attemptCounter = 0;

  const call = async (messages: ModelMessage[], repair: boolean): Promise<R> => {
    const result = await withRetry(
      () =>
        limit(async () => {
          if (options.signal?.aborted) throw new GenerationCancelledError();
          attemptCounter += 1;
          options.onAttempt?.({ attempt: attemptCounter, repair });
          return generateText({
            model: options.model,
            instructions: SYSTEM_PROMPT,
            messages,
            output: Output.object({ schema: options.schema, name: options.name }),
            maxRetries: 0, // retries are handled by withRetry (respects retry-after, cancellable)
            maxOutputTokens: options.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
            abortSignal: options.signal,
            timeout: CALL_TIMEOUT_MS,
            providerOptions: options.providerOptions,
          });
        }),
      { ...options.retry, signal: options.signal },
    );
    return post(result.output as z.infer<S>);
  };

  const messages: ModelMessage[] = [{ role: "user", content: options.prompt }];
  try {
    return await call(messages, false);
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) throw new GenerationCancelledError();
    const failure = validationFailureOf(error);
    if (!failure) throw error;

    const repairMessages: ModelMessage[] = [
      ...messages,
      { role: "assistant", content: failure.rawText || "(no parsable output)" },
      { role: "user", content: buildRepairPrompt(failure.details) },
    ];
    try {
      return await call(repairMessages, true);
    } catch (repairError) {
      if (options.signal?.aborted || isAbortError(repairError)) throw new GenerationCancelledError();
      const second = validationFailureOf(repairError);
      if (!second) throw repairError;
      const firstLines = second.details.split("\n").slice(0, 3).join("; ");
      throw new SectionGenerationError(
        `${options.label}: the AI output did not match the expected structure after one repair attempt (${firstLines || describeError(repairError)}).`,
        "VALIDATION_FAILED",
        { cause: repairError },
      );
    }
  }
}
