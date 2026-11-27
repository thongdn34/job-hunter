/**
 * Reusable, versioned prompt templates for the Run #10 generation pipeline.
 * Referenced by docs (ARCHITECTURE.md / RUN_10_SPECIFICATION.md):
 *   - SYSTEM_PROMPT                  role + truthfulness / Elfie / verification / bilingual rules
 *   - fenceJobDescription            untrusted JD fencing (prompt-injection defence)
 *   - serializeCandidateProfile      profile → prompt (excluded experiences removed)
 *   - SECTION_PROMPT_TEMPLATES       one template per section (expectations mirror REQUIREMENTS §5)
 *   - TOPIC_PLAN_TEMPLATE            topic plan step for the question bank
 *   - QUESTION_BATCH_TEMPLATE        per-topic question batches
 *   - buildRepairPrompt              single repair attempt after a validation failure
 */
export { PROMPT_VERSION } from "./version";
export { SYSTEM_PROMPT } from "./system";
export {
  fenceJobDescription,
  fenceUntrusted,
  neutralizeInstructions,
  NEUTRALIZED_PLACEHOLDER,
  RESERVED_PROMPT_TAGS,
  type NeutralizeResult,
} from "./fencing";
export { excludedCompanies, profileForGeneration, serializeCandidateProfile } from "./profile";
export { digestDependency, knownItemIds, renderDependencies, type PromptContext } from "./context";
export { buildSectionPrompt, SECTION_PROMPT_TEMPLATES, type SectionPromptTemplate } from "./sections";
export {
  buildQuestionBatchPrompt,
  buildSingleQuestionPrompt,
  buildTopicPlanPrompt,
  QUESTION_BATCH_TEMPLATE,
  TOPIC_PLAN_TEMPLATE,
  type QuestionBatchInput,
  type SingleQuestionInput,
} from "./questions";
export { buildRepairPrompt, formatZodIssues, REPAIR_TEMPLATE_VERSION } from "./repair";
export { parseTaskSpec, renderTaskSpec, TaskSpecSchema, type TaskSpec } from "./task-spec";
