import type { LanguageModel } from "ai";
import type { z } from "zod";
import {
  QuestionBankSchema,
  SectionContentSchemas,
  type QuestionBank,
  type SectionContentMap,
} from "@/domain/package/schema";
import { SECTION_DEFINITIONS, type SectionKey } from "@/domain/package/sections";
import { buildSectionPrompt } from "@/server/ai/prompts/sections";
import { buildQuestionBatchPrompt, buildTopicPlanPrompt } from "@/server/ai/prompts/questions";
import { knownItemIds, type PromptContext } from "@/server/ai/prompts/context";
import { questionBatchSchema, sectionGenerationSchema, TopicPlanSchema, type TopicPlan } from "@/server/ai/schemas";
import { GenerationCancelledError, SectionGenerationError } from "./errors";
import { mergeQuestionBatches, normalizeSectionContent, normalizeTopicPlan } from "./normalize";
import type { RetryOptions } from "./retry";
import { sanitizeGeneratedContent } from "./sanitize";
import { generateStructured } from "./structured";

/** Everything a section generator needs for one run. */
export interface SectionGeneratorContext {
  prompt: PromptContext;
  model: LanguageModel;
  prefix: string;
  signal: AbortSignal;
  limit: <T>(fn: () => Promise<T>) => Promise<T>;
  retry?: RetryOptions;
  providerOptions?: Record<string, Record<string, string | number | boolean | null>>;
  onAttempt: () => void;
  /** Throws GenerationCancelledError when the job was cancelled (DB flag or abort signal). */
  checkCancelled: () => Promise<void>;
  /** Exposes the topic plan to the mock provider / progress reporting. */
  onTopicPlan?: (plan: TopicPlan) => void;
}

function label(key: SectionKey): string {
  return SECTION_DEFINITIONS[key].title.en;
}

/** Normalizes ids, sanitizes and validates with the domain schema (ZodError → repair attempt). */
export function finalizeSectionContent<K extends Exclude<SectionKey, "bilingual">>(
  key: K,
  output: SectionContentMap[K],
  ctx: Pick<SectionGeneratorContext, "prefix" | "prompt">,
): SectionContentMap[K] {
  const deps = ctx.prompt.dependencies;
  const normalized = normalizeSectionContent(key, output, {
    prefix: ctx.prefix,
    knownItemIds: knownItemIds(deps),
    knownTopicIds: deps.bilingual?.topics.map((t) => t.id) ?? [],
  });
  const schema = SectionContentSchemas[key] as unknown as z.ZodType<SectionContentMap[K]>;
  return schema.parse(sanitizeGeneratedContent(normalized));
}

async function generateSingleSection<K extends Exclude<SectionKey, "bilingual">>(
  key: K,
  ctx: SectionGeneratorContext,
): Promise<SectionContentMap[K]> {
  const schema = sectionGenerationSchema(key) as unknown as z.ZodType<SectionContentMap[K]>;
  return generateStructured({
    model: ctx.model,
    schema,
    prompt: buildSectionPrompt(key, ctx.prompt),
    label: label(key),
    name: `run10_${key}`,
    postProcess: (output) => finalizeSectionContent(key, output, ctx),
    signal: ctx.signal,
    retry: ctx.retry,
    providerOptions: ctx.providerOptions,
    onAttempt: ctx.onAttempt,
    limit: ctx.limit,
  });
}

/**
 * Question bank: topic plan → one batch per topic (bounded concurrency via ctx.limit) →
 * merge + renumber with stable ids <prefix>-q01… → validate as QuestionBank.
 */
async function generateQuestionBank(ctx: SectionGeneratorContext): Promise<QuestionBank> {
  const plan = normalizeTopicPlan(
    await generateStructured({
      model: ctx.model,
      schema: TopicPlanSchema,
      prompt: buildTopicPlanPrompt(ctx.prompt),
      label: `${label("bilingual")} — topic plan`,
      name: "run10_topic_plan",
      signal: ctx.signal,
      retry: ctx.retry,
      providerOptions: ctx.providerOptions,
      onAttempt: ctx.onAttempt,
      limit: ctx.limit,
    }),
  );
  ctx.onTopicPlan?.(plan);
  await ctx.checkCancelled();

  // Sibling batches share an abort controller so one failed topic stops the others early.
  const batchController = new AbortController();
  const abortBatches = () => batchController.abort(ctx.signal.reason);
  ctx.signal.addEventListener("abort", abortBatches, { once: true });

  let startNumber = 1;
  const specs = plan.topics.map((topic) => {
    const spec = { topic, count: topic.questionCount, startNumber };
    startNumber += topic.questionCount;
    return spec;
  });

  try {
    const batches = await Promise.all(
      specs.map(async (spec) => {
        await ctx.checkCancelled();
        const output = await generateStructured({
          model: ctx.model,
          schema: questionBatchSchema(spec.count),
          prompt: buildQuestionBatchPrompt(ctx.prompt, { plan, ...spec }),
          label: `${label("bilingual")} — ${spec.topic.title.en}`,
          name: "run10_question_batch",
          postProcess: (o) => sanitizeGeneratedContent(o),
          signal: batchController.signal,
          retry: ctx.retry,
          providerOptions: ctx.providerOptions,
          onAttempt: ctx.onAttempt,
          limit: ctx.limit,
        }).catch((error: unknown) => {
          batchController.abort(error);
          throw error;
        });
        return { topicId: spec.topic.id, questions: output.questions.slice(0, spec.count) };
      }),
    );
    const bank = mergeQuestionBatches(plan, batches, ctx.prefix);
    const parsed = QuestionBankSchema.safeParse(bank);
    if (!parsed.success) {
      throw new SectionGenerationError(
        `${label("bilingual")}: merged question bank is invalid (${parsed.error.issues[0]?.message ?? "unknown"}).`,
        "INTERNAL",
      );
    }
    return parsed.data;
  } catch (error) {
    if (ctx.signal.aborted) throw new GenerationCancelledError();
    throw error;
  } finally {
    ctx.signal.removeEventListener("abort", abortBatches);
  }
}

/** Generates (and fully validates) one section. */
export async function generateSectionContent<K extends SectionKey>(
  key: K,
  ctx: SectionGeneratorContext,
): Promise<SectionContentMap[K]> {
  if (key === "bilingual") return (await generateQuestionBank(ctx)) as SectionContentMap[K];
  return (await generateSingleSection(key as Exclude<SectionKey, "bilingual">, ctx)) as SectionContentMap[K];
}
