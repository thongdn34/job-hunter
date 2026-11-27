import type { CandidateProfile } from "@/domain/profile/schema";
import type { NormalizedJd } from "@/domain/jd/schema";
import type { SectionContentMap } from "@/domain/package/schema";
import { SECTION_DEFINITIONS, type SectionKey } from "@/domain/package/sections";
import { neutralizeInstructions } from "./fencing";

/** Everything a prompt template needs. */
export interface PromptContext {
  meta: { companyName: string; companyCode: string; jobTitle: string };
  jd: NormalizedJd;
  profile: CandidateProfile;
  /** Already generated + validated sections this prompt may build on. */
  dependencies: Partial<SectionContentMap>;
}

/**
 * Compact digests of dependency sections. Large list sections are reduced to ids + titles so
 * downstream prompts can reference real item ids without re-sending whole answers.
 */
export function digestDependency<K extends SectionKey>(key: K, content: SectionContentMap[K]): unknown {
  switch (key) {
    case "bilingual": {
      const c = content as SectionContentMap["bilingual"];
      return {
        topics: c.topics.map((t) => ({ id: t.id, code: t.code, title: t.title.en, priority: t.priority })),
        questions: c.questions.map((q) => ({
          id: q.id,
          number: q.number,
          topicId: q.topicId,
          question: q.question.en,
          priority: q.priority,
          difficulty: q.difficulty,
        })),
      };
    }
    case "systemDesign": {
      const c = content as SectionContentMap["systemDesign"];
      return c.scenarios.map((s) => ({ id: s.id, title: s.title.en, priority: s.priority, difficulty: s.difficulty }));
    }
    case "coding": {
      const c = content as SectionContentMap["coding"];
      return c.exercises.map((e) => ({ id: e.id, title: e.title.en, priority: e.priority, difficulty: e.difficulty }));
    }
    case "star": {
      const c = content as SectionContentMap["star"];
      return c.questions.map((q) => ({
        id: q.id,
        question: q.question.en,
        competency: q.competency,
        priority: q.priority,
      }));
    }
    default:
      return content;
  }
}

/** Renders the dependency block. Dependency content is model-generated (may echo JD text), so it is neutralized too. */
export function renderDependencies(keys: readonly SectionKey[], dependencies: Partial<SectionContentMap>): string {
  const blocks = keys
    .filter((k) => dependencies[k] !== undefined)
    .map((k) => {
      const json = JSON.stringify(digestDependency(k, dependencies[k] as SectionContentMap[typeof k]));
      return `<dependency section="${k}" title="${SECTION_DEFINITIONS[k].title.en}">\n${neutralizeInstructions(json).text}\n</dependency>`;
    });
  if (blocks.length === 0) return "";
  return [
    "Context from earlier sections of this package (already generated and validated — stay consistent with it):",
    ...blocks,
  ].join("\n");
}

/** All item ids that downstream sections may reference (study plan, cheat sheet, mock pool). */
export function knownItemIds(dependencies: Partial<SectionContentMap>): string[] {
  return [
    ...(dependencies.bilingual?.questions.map((q) => q.id) ?? []),
    ...(dependencies.systemDesign?.scenarios.map((s) => s.id) ?? []),
    ...(dependencies.coding?.exercises.map((e) => e.id) ?? []),
    ...(dependencies.star?.questions.map((q) => q.id) ?? []),
  ];
}
