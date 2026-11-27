import type { Bilingual } from "@/domain/common/schema";
import { collectStudyItems, type StudyItem } from "@/domain/package/items";
import type { InterviewPackage } from "@/domain/package/schema";

/**
 * A study item plus the full content the mock evaluator needs: the prompt, the reference
 * answer, the memory shortcut / key takeaway (the "essence" of a good answer), supporting
 * notes, and the stored follow-up (if any).
 *
 * Follow-ups are themselves askable: their id (e.g. `isb-q01-f1`) resolves to an item whose
 * reference answer is the stored follow-up answer, so "answer the follow-up as the next turn"
 * is evaluated and persisted exactly like a primary question.
 */
export interface MockEvaluationItem extends StudyItem {
  /** What the interviewer asks (bilingual). */
  prompt: Bilingual;
  memoryShortcut?: Bilingual;
  keyTakeaway?: Bilingual;
  /** Extra reference material (Markdown/plain text) — used as AI context only, never shown as "the answer". */
  supportingNotes?: string;
  /** First stored interviewer follow-up of this item, if any. */
  followUp?: { id: string; question: Bilingual; answer: Bilingual };
  /** Set when this item IS a follow-up: the id of the parent item. */
  parentId?: string;
}

/** Generic follow-up used when an item has no stored follow-up. */
export const GENERIC_FOLLOW_UP: Bilingual = {
  en: "How would this change at 10x the scale, and what would you monitor in production to know it is working?",
  vi: "Nếu quy mô tăng gấp 10 lần thì cách làm này thay đổi thế nào, và bạn sẽ theo dõi chỉ số gì trên production để biết nó hoạt động tốt?",
};

function firstFollowUp(list: Array<{ id: string; question: Bilingual; answer: Bilingual }> | undefined) {
  const f = list?.[0];
  return f ? { id: f.id, question: f.question, answer: f.answer } : undefined;
}

function enrich(pkg: InterviewPackage, item: StudyItem): MockEvaluationItem {
  const { bilingual, systemDesign, coding, star } = pkg.sections;
  switch (item.kind) {
    case "question": {
      const q = bilingual?.questions.find((x) => x.id === item.id);
      if (!q) return { ...item, prompt: item.title };
      return {
        ...item,
        prompt: q.question,
        memoryShortcut: q.memoryShortcut,
        keyTakeaway: q.keyTakeaway,
        supportingNotes: q.technicalExplanation,
        followUp: firstFollowUp(q.followUps),
      };
    }
    case "systemDesign": {
      const s = systemDesign?.scenarios.find((x) => x.id === item.id);
      if (!s) return { ...item, prompt: item.title };
      return {
        ...item,
        prompt: s.prompt,
        memoryShortcut: s.memoryShortcut,
        supportingNotes: [
          s.highLevelArchitecture,
          s.scalability,
          s.reliability,
          ...s.tradeOffs.map((t) => `Trade-off: ${t.decision}. Pros: ${t.pros}. Cons: ${t.cons}.`),
        ].join("\n\n"),
        followUp: firstFollowUp(s.followUps),
      };
    }
    case "coding": {
      const c = coding?.exercises.find((x) => x.id === item.id);
      if (!c) return { ...item, prompt: item.title };
      return {
        ...item,
        prompt: c.statement,
        referenceAnswer: `${c.approach.en}\n\nTime complexity: ${c.timeComplexity}. Space complexity: ${c.spaceComplexity}.`,
        memoryShortcut: c.memoryShortcut,
        supportingNotes: [
          ...c.steps.map((s) => s.en),
          ...c.edgeCases.map((e) => `Edge case: ${e.en}`),
          "```" + c.solution.language + "\n" + c.solution.code + "\n```",
        ].join("\n"),
        followUp: firstFollowUp([c.followUp]),
      };
    }
    case "behavioral": {
      const b = star?.questions.find((x) => x.id === item.id);
      if (!b) return { ...item, prompt: item.title };
      return {
        ...item,
        prompt: b.question,
        memoryShortcut: b.memoryShortcut,
        supportingNotes: [
          `Competency: ${b.competency}`,
          ...b.cautions.map((c) => `Caution (do not claim): ${c.en}`),
        ].join("\n"),
        followUp: firstFollowUp([b.followUp]),
      };
    }
  }
}

function asFollowUpItem(parent: MockEvaluationItem): MockEvaluationItem | undefined {
  const f = parent.followUp;
  if (!f) return undefined;
  return {
    id: f.id,
    number: parent.number,
    kind: parent.kind,
    section: parent.section,
    topicId: parent.topicId,
    title: f.question,
    difficulty: parent.difficulty,
    priority: parent.priority,
    anchorId: parent.anchorId,
    referenceAnswer: f.answer.en,
    searchText: "",
    prompt: f.question,
    parentId: parent.id,
  };
}

/** Builds a lookup of every askable item (primary items + their first follow-ups) of a package. */
export function buildMockItemIndex(pkg: InterviewPackage): Map<string, MockEvaluationItem> {
  const index = new Map<string, MockEvaluationItem>();
  for (const item of collectStudyItems(pkg)) {
    const full = enrich(pkg, item);
    index.set(full.id, full);
  }
  for (const item of [...index.values()]) {
    const follow = asFollowUpItem(item);
    if (follow && !index.has(follow.id)) index.set(follow.id, follow);
  }
  return index;
}

/** Resolves one askable item (primary or follow-up) or null. */
export function resolveMockItem(pkg: InterviewPackage, itemId: string): MockEvaluationItem | null {
  return buildMockItemIndex(pkg).get(itemId) ?? null;
}
