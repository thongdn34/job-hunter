import "server-only";
import { InterviewQuestionSchema, type InterviewQuestion, type SectionContentMap } from "@/domain/package/schema";
import { buildSingleQuestionPrompt } from "@/server/ai/prompts/questions";
import { SingleQuestionSchema } from "@/server/ai/schemas";
import type { GenerationProvider } from "@/server/ai/provider";
import {
  getNormalizedJd,
  getPackageBySlug,
  getPackageIdBySlug,
  replaceQuestion,
} from "@/server/repositories/package-repository";
import { getProfile } from "@/server/repositories/profile-repository";
import { GenerationRequestError, describeError } from "./errors";
import { draftToQuestion } from "./normalize";
import type { RetryOptions } from "./retry";
import { sanitizeGeneratedContent } from "./sanitize";
import { generateStructured } from "./structured";
import { assertNoActiveJob, requireProvider } from "./service";

export interface RegenerateQuestionOptions {
  provider?: GenerationProvider;
  retry?: RetryOptions;
  signal?: AbortSignal;
}

/**
 * Regenerates ONE bilingual question (same id, number and topic) with the section context,
 * validates it with InterviewQuestionSchema and persists it via replaceQuestion.
 *
 * Refused (JOB_RUNNING) while a generation job runs for the package: question ids are positional,
 * so a job that regenerates the bank could put another question under this id. The write is also
 * optimistic: if the stored question changed during the model call, nothing is written (CONFLICT).
 */
export async function regenerateQuestion(
  slug: string,
  itemId: string,
  options: RegenerateQuestionOptions = {},
): Promise<InterviewQuestion> {
  const provider = options.provider ?? requireProvider();
  const pkg = await getPackageBySlug(slug);
  if (!pkg) throw new GenerationRequestError("NOT_FOUND", `Package "${slug}" was not found.`);
  if (pkg.meta.isSample)
    throw new GenerationRequestError("SAMPLE_READ_ONLY", "Sample packages are read-only and cannot be regenerated.");

  const bank = pkg.sections.bilingual;
  if (!bank) throw new GenerationRequestError("NOT_READY", "The question bank has not been generated yet.");
  const question = bank.questions.find((q) => q.id === itemId);
  if (!question) throw new GenerationRequestError("NOT_FOUND", `Question "${itemId}" was not found in this package.`);

  const packageId = (await getPackageIdBySlug(slug)) ?? pkg.meta.id;
  await assertNoActiveJob(packageId);
  const jd = await getNormalizedJd(packageId);
  if (!jd) throw new GenerationRequestError("NOT_READY", "The job description for this package is missing.");
  const profile = await getProfile();

  const dependencies: Partial<SectionContentMap> = {
    bilingual: bank,
    ...(pkg.sections.jd ? { jd: pkg.sections.jd } : {}),
    ...(pkg.sections.match ? { match: pkg.sections.match } : {}),
  };
  const promptContext = {
    meta: { companyName: pkg.meta.companyName, companyCode: pkg.meta.companyCode, jobTitle: pkg.meta.jobTitle },
    jd,
    profile,
    dependencies,
  };

  let regenerated: InterviewQuestion;
  try {
    regenerated = await generateStructured({
      model: provider.createModel(() => promptContext),
      schema: SingleQuestionSchema,
      prompt: buildSingleQuestionPrompt(promptContext, {
        question,
        topic: bank.topics.find((t) => t.id === question.topicId),
        siblingQuestions: bank.questions.filter((q) => q.topicId === question.topicId && q.id !== question.id),
      }),
      label: `Question ${question.number}`,
      name: "run10_single_question",
      postProcess: (output) =>
        InterviewQuestionSchema.parse(
          sanitizeGeneratedContent(draftToQuestion(output.question, question.id, question.number, question.topicId)),
        ),
      signal: options.signal,
      retry: options.retry,
      providerOptions: provider.providerOptions,
    });
  } catch (error) {
    throw new GenerationRequestError("GENERATION_FAILED", describeError(error));
  }

  const replaced = await replaceQuestion(packageId, regenerated, {
    isUnchanged: (stored) => isSameQuestion(stored, question),
  });
  if (!replaced) {
    throw new GenerationRequestError(
      "CONFLICT",
      "The question bank changed while this answer was being regenerated. Reload the page and try again.",
    );
  }
  return regenerated;
}

/** The stored question is still the one the regeneration was based on (same slot, topic and text). */
function isSameQuestion(stored: InterviewQuestion, snapshot: InterviewQuestion): boolean {
  return (
    stored.number === snapshot.number &&
    stored.topicId === snapshot.topicId &&
    stored.question.en === snapshot.question.en &&
    stored.question.vi === snapshot.question.vi
  );
}
