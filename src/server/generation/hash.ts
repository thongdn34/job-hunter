import { createHash } from "node:crypto";
import type { NormalizedJd } from "@/domain/jd/schema";
import type { SectionContentMap } from "@/domain/package/schema";
import type { CandidateProfile } from "@/domain/profile/schema";
import { SECTION_DEFINITIONS, type SectionKey } from "@/domain/package/sections";
import { profileForGeneration } from "@/server/ai/prompts/profile";
import { PROMPT_VERSION } from "@/server/ai/prompts/version";
import { SECTION_PROMPT_TEMPLATES } from "@/server/ai/prompts/sections";
import { QUESTION_BATCH_TEMPLATE, TOPIC_PLAN_TEMPLATE } from "@/server/ai/prompts/questions";

/** JSON.stringify with sorted object keys, so semantically equal inputs hash identically. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : stableStringify(v))).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** JD fields that influence generation (extraction timestamps and warnings are ignored). */
function jdForHash(jd: NormalizedJd) {
  return {
    companyName: jd.companyName,
    jobTitle: jd.jobTitle,
    location: jd.location,
    employmentType: jd.employmentType,
    sourceUrl: jd.sourceUrl,
    text: jd.text,
    sections: jd.sections,
  };
}

export interface SectionHashInput {
  key: SectionKey;
  jd: NormalizedJd;
  profile: CandidateProfile;
  dependencies: Partial<SectionContentMap>;
  meta: { companyName: string; companyCode: string; jobTitle: string };
}

/**
 * sha256(prompt version + section template version + JD + generation profile + dependency contents).
 * An unchanged hash on a ready section means regeneration would produce equivalent input → skip.
 */
export function computeSectionInputHash(input: SectionHashInput): string {
  const def = SECTION_DEFINITIONS[input.key];
  const templateVersion =
    input.key === "bilingual"
      ? `${SECTION_PROMPT_TEMPLATES.bilingual.version}/${TOPIC_PLAN_TEMPLATE.version}/${QUESTION_BATCH_TEMPLATE.version}`
      : SECTION_PROMPT_TEMPLATES[input.key].version;
  const dependencies = Object.fromEntries(def.dependsOn.map((k) => [k, input.dependencies[k] ?? null]));
  return sha256(
    stableStringify({
      promptVersion: PROMPT_VERSION,
      section: input.key,
      templateVersion,
      meta: input.meta,
      jd: jdForHash(input.jd),
      profile: profileForGeneration(input.profile),
      dependencies,
    }),
  );
}
