import { z } from "zod";
import { SECTION_KEYS } from "@/domain/package/sections";

/**
 * Machine-readable task descriptor appended to every user prompt. Real models read it as
 * an unambiguous summary of the task; the offline mock provider uses it to decide what to emit.
 */
export const TaskSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("topic-plan") }),
  z.object({ kind: z.literal("section"), section: z.enum(SECTION_KEYS).exclude(["bilingual"]) }),
  z.object({
    kind: z.literal("question-batch"),
    topicId: z.string(),
    topicCode: z.string(),
    count: z.number().int().positive(),
    startNumber: z.number().int().positive(),
  }),
  z.object({ kind: z.literal("single-question"), questionId: z.string(), topicId: z.string() }),
]);
export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const TASK_SPEC_TAG = "task_spec";

export function renderTaskSpec(spec: TaskSpec): string {
  return `<${TASK_SPEC_TAG}>${JSON.stringify(spec)}</${TASK_SPEC_TAG}>`;
}

/** Finds the LAST task spec in a prompt (the pipeline's own spec is always appended last). */
export function parseTaskSpec(text: string): TaskSpec | null {
  const matches = [...text.matchAll(/<task_spec>([\s\S]*?)<\/task_spec>/g)];
  const last = matches.at(-1);
  if (!last) return null;
  try {
    const parsed = TaskSpecSchema.safeParse(JSON.parse(last[1]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
