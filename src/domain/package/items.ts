import type { Bilingual, Difficulty, Priority } from "@/domain/common/schema";
import { itemAnchorId } from "./bookmarks";
import type { InterviewPackage } from "./schema";
import type { SectionKey } from "./sections";

/**
 * A "study item" is anything the candidate can study, mark as studied, favorite,
 * search for, or be asked in a mock interview. All item ids are unique per package.
 */
export const STUDY_ITEM_KINDS = ["question", "systemDesign", "coding", "behavioral"] as const;
export type StudyItemKind = (typeof STUDY_ITEM_KINDS)[number];

export interface StudyItem {
  id: string;
  number: number;
  kind: StudyItemKind;
  section: SectionKey;
  topicId?: string;
  title: Bilingual;
  difficulty: Difficulty;
  priority: Priority;
  anchorId: string;
  /** Recommended English answer used by mock interview + flashcards. */
  referenceAnswer: string;
  /** Lower-cased concatenation of ALL text (including collapsed content) for app-level search. */
  searchText: string;
}

function join(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join("\n").toLowerCase();
}

function bi(b?: Bilingual): string {
  return b ? `${b.en}\n${b.vi}` : "";
}

export function collectStudyItems(pkg: InterviewPackage): StudyItem[] {
  const items: StudyItem[] = [];
  const { bilingual, systemDesign, coding, star } = pkg.sections;

  for (const q of bilingual?.questions ?? []) {
    items.push({
      id: q.id,
      number: q.number,
      kind: "question",
      section: "bilingual",
      topicId: q.topicId,
      title: q.question,
      difficulty: q.difficulty,
      priority: q.priority,
      anchorId: itemAnchorId(q.id),
      referenceAnswer: q.answer,
      searchText: join(
        bi(q.question),
        q.answer,
        q.viExplanation,
        q.technicalExplanation,
        bi(q.practicalExample.description),
        q.practicalExample.code?.code,
        q.diagram?.code,
        bi(q.memoryShortcut),
        bi(q.keyTakeaway),
        ...q.followUps.flatMap((f) => [bi(f.question), bi(f.answer)]),
        q.jdRequirement,
        q.candidateExperience ? bi(q.candidateExperience.note) : "",
        q.tags.join(" "),
      ),
    });
  }

  for (const s of systemDesign?.scenarios ?? []) {
    items.push({
      id: s.id,
      number: s.number,
      kind: "systemDesign",
      section: "systemDesign",
      title: s.title,
      difficulty: s.difficulty,
      priority: s.priority,
      anchorId: itemAnchorId(s.id),
      referenceAnswer: s.recommendedAnswer,
      searchText: join(
        bi(s.title),
        bi(s.prompt),
        ...s.functionalRequirements.map(bi),
        ...s.nonFunctionalRequirements.map(bi),
        ...s.clarifyingQuestions.map(bi),
        s.highLevelArchitecture,
        s.dataFlow,
        s.apiDesign,
        s.stateManagement,
        s.scalability,
        s.performance,
        s.security,
        s.reliability,
        s.errorRecovery,
        s.monitoring,
        ...s.tradeOffs.map((t) => `${t.decision} ${t.pros} ${t.cons}`),
        s.recommendedAnswer,
        s.viExplanation,
        bi(s.memoryShortcut),
        ...s.followUps.flatMap((f) => [bi(f.question), bi(f.answer)]),
      ),
    });
  }

  for (const c of coding?.exercises ?? []) {
    items.push({
      id: c.id,
      number: c.number,
      kind: "coding",
      section: "coding",
      title: c.title,
      difficulty: c.difficulty,
      priority: c.priority,
      anchorId: itemAnchorId(c.id),
      referenceAnswer: c.approach.en,
      searchText: join(
        bi(c.title),
        bi(c.statement),
        bi(c.approach),
        c.solution.code,
        ...c.steps.map(bi),
        ...c.edgeCases.map(bi),
        bi(c.memoryShortcut),
        bi(c.followUp.question),
        bi(c.followUp.answer),
        c.jdRequirement,
      ),
    });
  }

  for (const b of star?.questions ?? []) {
    items.push({
      id: b.id,
      number: b.number,
      kind: "behavioral",
      section: "star",
      title: b.question,
      difficulty: b.difficulty,
      priority: b.priority,
      anchorId: itemAnchorId(b.id),
      referenceAnswer: [b.star.situation.en, b.star.task.en, b.star.action.en, b.star.result.en].join(" "),
      searchText: join(
        bi(b.question),
        b.competency,
        bi(b.star.situation),
        bi(b.star.task),
        bi(b.star.action),
        bi(b.star.result),
        bi(b.memoryShortcut),
        bi(b.followUp.question),
        bi(b.followUp.answer),
      ),
    });
  }

  // Items stay grouped in section order (questions, system design, coding, behavioral).
  return items;
}
