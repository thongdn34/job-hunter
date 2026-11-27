import { APICallError, type LanguageModel } from "ai";
import type { NormalizedJd } from "@/domain/jd/schema";
import { isSectionKey, type SectionKey } from "@/domain/package/sections";
import { defaultProfile } from "@/content/profile/default-profile";
import { parseTaskSpec, type TaskSpec } from "../prompts/task-spec";
import {
  MOCK_LABEL,
  mockQuestionBatch,
  mockSectionContent,
  mockSingleQuestion,
  mockTopicPlan,
  type MockGenerationContext,
} from "./content";

/**
 * Offline, deterministic AI SDK language model (AI_PROVIDER=mock). It reads the pipeline's
 * <task_spec> from the prompt and returns schema-valid JSON built by ./content.
 *
 * Failure injection (tests / e2e):
 *   failSections          always return malformed JSON (repair also fails → section "failed")
 *   malformedOnceSections first attempt malformed, repair attempt valid
 *   rateLimitOnceSections first call throws a 429 APICallError (retry-after: 0)
 * Env equivalents: MOCK_FAIL_SECTIONS, MOCK_MALFORMED_ONCE_SECTIONS, MOCK_RATE_LIMIT_ONCE_SECTIONS
 * (comma-separated section keys; "topic-plan" targets the topic plan step). MOCK_DELAY_MS adds latency.
 */

type LanguageModelV4 = Extract<LanguageModel, { specificationVersion: "v4" }>;
type CallOptions = Parameters<LanguageModelV4["doGenerate"]>[0];
type GenerateResult = Awaited<ReturnType<LanguageModelV4["doGenerate"]>>;
type StreamResult = Awaited<ReturnType<LanguageModelV4["doStream"]>>;
type StreamPart = StreamResult["stream"] extends ReadableStream<infer P> ? P : never;

export type MockTarget = SectionKey | "topic-plan";

export interface MockModelOptions {
  failSections?: MockTarget[];
  malformedOnceSections?: MockTarget[];
  rateLimitOnceSections?: MockTarget[];
  delayMs?: number;
}

export interface CreateMockModelOptions extends MockModelOptions {
  modelId?: string;
  getContext?: () => MockGenerationContext;
}

function parseTargets(value: string | undefined): MockTarget[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is MockTarget => s === "topic-plan" || isSectionKey(s));
}

export function mockOptionsFromEnv(env: Record<string, string | undefined>): MockModelOptions {
  const delay = Number(env.MOCK_DELAY_MS);
  return {
    failSections: parseTargets(env.MOCK_FAIL_SECTIONS),
    malformedOnceSections: parseTargets(env.MOCK_MALFORMED_ONCE_SECTIONS),
    rateLimitOnceSections: parseTargets(env.MOCK_RATE_LIMIT_ONCE_SECTIONS),
    delayMs: Number.isFinite(delay) && delay > 0 ? delay : 0,
  };
}

/** Context used when the mock model is called outside the pipeline (e.g. getLanguageModel()). */
export function defaultMockContext(): MockGenerationContext {
  const jd: NormalizedJd = {
    companyName: "Example Co",
    jobTitle: "Senior Frontend Engineer",
    origin: "manual",
    text: `${MOCK_LABEL} Senior Frontend Engineer working with React, TypeScript, Next.js and REST APIs.`,
    sections: [],
    extractedAt: new Date(0).toISOString(),
    warnings: [],
  };
  return {
    meta: { companyName: jd.companyName, companyCode: "EXAMPLE_CO", jobTitle: jd.jobTitle },
    jd,
    profile: defaultProfile,
    dependencies: {},
  };
}

function promptText(options: CallOptions, roles: Array<"system" | "user" | "assistant">): string {
  return options.prompt
    .filter((m) => (roles as string[]).includes(m.role))
    .map((m) =>
      typeof m.content === "string"
        ? m.content
        : m.content.map((p) => ("text" in p && typeof p.text === "string" ? p.text : "")).join("\n"),
    )
    .join("\n");
}

function targetOf(spec: TaskSpec): MockTarget {
  switch (spec.kind) {
    case "topic-plan":
      return "topic-plan";
    case "section":
      return spec.section;
    case "question-batch":
    case "single-question":
      return "bilingual";
  }
}

function buildOutput(spec: TaskSpec, ctx: MockGenerationContext): unknown {
  switch (spec.kind) {
    case "topic-plan":
      return mockTopicPlan(ctx);
    case "section":
      return mockSectionContent(spec.section, ctx);
    case "question-batch":
      return mockQuestionBatch(ctx, spec.topicId, spec.count);
    case "single-question":
      return mockSingleQuestion(ctx, spec.questionId, spec.topicId);
  }
}

const USAGE: GenerateResult["usage"] = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true },
    );
  });
}

export function createMockLanguageModel(options: CreateMockModelOptions = {}): LanguageModelV4 {
  const failed = new Set<string>();
  const rateLimited = new Set<string>();
  const modelId = options.modelId ?? "mock-run10-v1";

  async function respond(call: CallOptions): Promise<string> {
    if (call.abortSignal?.aborted) throw call.abortSignal.reason ?? new Error("Aborted");
    await sleep(options.delayMs ?? 0, call.abortSignal);

    const spec = parseTaskSpec(promptText(call, ["user"]));
    if (!spec) return JSON.stringify({ text: `${MOCK_LABEL} No task spec found in the prompt.` });

    const target = targetOf(spec);
    const lastUser = call.prompt.filter((m) => m.role === "user").at(-1);
    const isRepair = lastUser
      ? promptText({ ...call, prompt: [lastUser] }, ["user"]).includes("<validation_errors>")
      : false;

    if (options.rateLimitOnceSections?.includes(target) && !rateLimited.has(target)) {
      rateLimited.add(target);
      throw new APICallError({
        message: `${MOCK_LABEL} Rate limited`,
        url: "mock://generate",
        requestBodyValues: {},
        statusCode: 429,
        responseHeaders: { "retry-after": "0" },
        isRetryable: true,
      });
    }
    if (options.failSections?.includes(target)) {
      return JSON.stringify({ malformed: true, note: `${MOCK_LABEL} injected failure for ${target}` });
    }
    if (options.malformedOnceSections?.includes(target) && !isRepair && !failed.has(target)) {
      failed.add(target);
      return `{"malformed": true, "note": "${MOCK_LABEL} injected malformed output"`; // invalid JSON
    }

    const ctx = options.getContext?.() ?? defaultMockContext();
    return JSON.stringify(buildOutput(spec, ctx));
  }

  return {
    specificationVersion: "v4",
    provider: "mock",
    modelId,
    supportedUrls: {},
    async doGenerate(call): Promise<GenerateResult> {
      const text = await respond(call);
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: USAGE,
        warnings: [],
      };
    },
    async doStream(call): Promise<StreamResult> {
      const text = await respond(call);
      const parts: StreamPart[] = [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: text },
        { type: "text-end", id: "t1" },
        { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: USAGE },
      ];
      return {
        stream: new ReadableStream<StreamPart>({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          },
        }),
      };
    },
  };
}
