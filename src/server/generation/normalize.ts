import type { InterviewQuestion, InterviewTopic, QuestionBank, SectionContentMap } from "@/domain/package/schema";
import type { SectionKey } from "@/domain/package/sections";
import { GENERATION_COUNTS, type QuestionDraft, type TopicPlan, type TopicPlanEntry } from "@/server/ai/schemas";

/**
 * Post-processing of model output: stable ids, renumbering, and removal of references to ids
 * that do not exist (models occasionally hallucinate ids). Pure functions.
 */

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "ISB_VIETNAM" → "isb-vietnam" (prefix for stable item ids). */
export function itemIdPrefix(companyCode: string): string {
  return (
    companyCode
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pkg"
  );
}

export const questionId = (prefix: string, n: number) => `${prefix}-q${pad2(n)}`;

/* ------------------------------------------------------------------ */
/* Topic plan                                                           */
/* ------------------------------------------------------------------ */

function uniqueToken(base: string, taken: Set<string>, separator: "-" | "_"): string {
  let candidate = base;
  for (let i = 2; taken.has(candidate); i += 1) candidate = `${base}${separator}${i}`;
  taken.add(candidate);
  return candidate;
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/**
 * Makes topic ids/codes unique and scales question counts so the total lands within
 * GENERATION_COUNTS.questionsTotal (higher-priority topics gain first and lose last).
 */
export function normalizeTopicPlan(plan: TopicPlan): TopicPlan {
  const ids = new Set<string>();
  const codes = new Set<string>();
  const { min: perMin, max: perMax } = GENERATION_COUNTS.questionsPerTopic;
  const topics: TopicPlanEntry[] = plan.topics.map((t) => ({
    ...t,
    id: uniqueToken(t.id, ids, "-"),
    code: uniqueToken(t.code, codes, "_"),
    questionCount: Math.min(perMax, Math.max(perMin, t.questionCount)),
  }));

  const { min, max } = GENERATION_COUNTS.questionsTotal;
  let total = topics.reduce((sum, t) => sum + t.questionCount, 0);
  while (total < min) {
    const target = topics
      .filter((t) => t.questionCount < perMax)
      .sort((a, b) => a.questionCount - b.questionCount || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
    if (!target) break;
    target.questionCount += 1;
    total += 1;
  }
  while (total > max) {
    const target = topics
      .filter((t) => t.questionCount > perMin)
      .sort((a, b) => b.questionCount - a.questionCount || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])[0];
    if (!target) break;
    target.questionCount -= 1;
    total -= 1;
  }
  return { ...plan, topics };
}

/* ------------------------------------------------------------------ */
/* Question bank                                                        */
/* ------------------------------------------------------------------ */

export function draftToQuestion(draft: QuestionDraft, id: string, number: number, topicId: string): InterviewQuestion {
  return {
    ...draft,
    id,
    number,
    topicId,
    followUps: draft.followUps.map((f, i) => ({ ...f, id: `${id}-f${i + 1}` })),
  };
}

/** Merges per-topic batches (in plan order), renumbers 1..N and assigns ids <prefix>-q01…; sets topic ranges. */
export function mergeQuestionBatches(
  plan: TopicPlan,
  batches: Array<{ topicId: string; questions: QuestionDraft[] }>,
  prefix: string,
): QuestionBank {
  const byTopic = new Map(batches.map((b) => [b.topicId, b.questions]));
  const topics: InterviewTopic[] = [];
  const questions: InterviewQuestion[] = [];
  for (const t of plan.topics) {
    const drafts = byTopic.get(t.id) ?? [];
    if (drafts.length === 0) continue;
    const start = questions.length + 1;
    drafts.forEach((draft) => {
      const n = questions.length + 1;
      questions.push(draftToQuestion(draft, questionId(prefix, n), n, t.id));
    });
    const end = questions.length;
    topics.push({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description,
      priority: t.priority,
      range: start === end ? String(start) : `${start}–${end}`,
    });
  }
  return { topics, questions };
}

/* ------------------------------------------------------------------ */
/* Other sections                                                       */
/* ------------------------------------------------------------------ */

export interface NormalizeContext {
  prefix: string;
  /** Ids of study items available to reference (questions, scenarios, exercises, behavioral). */
  knownItemIds: string[];
  knownTopicIds: string[];
}

/** Assigns stable ids/numbers and drops references to unknown ids. Never adds content. */
export function normalizeSectionContent<K extends Exclude<SectionKey, "bilingual">>(
  key: K,
  content: SectionContentMap[K],
  ctx: NormalizeContext,
): SectionContentMap[K] {
  const p = ctx.prefix;
  const known = new Set(ctx.knownItemIds);
  const knownTopics = new Set(ctx.knownTopicIds);
  const keepKnown = (ids: string[]) => [...new Set(ids.filter((id) => known.has(id)))];

  switch (key) {
    case "match": {
      const c = content as SectionContentMap["match"];
      return {
        ...c,
        requirements: c.requirements.map((r, i) => ({ ...r, id: `req-${pad2(i + 1)}` })),
      } as SectionContentMap[K];
    }
    case "systemDesign": {
      const c = content as SectionContentMap["systemDesign"];
      return {
        scenarios: c.scenarios.map((s, i) => {
          const id = `${p}-sd${i + 1}`;
          return {
            ...s,
            id,
            number: i + 1,
            followUps: s.followUps.map((f, j) => ({ ...f, id: `${id}-f${j + 1}` })),
            relatedQuestionIds: keepKnown(s.relatedQuestionIds),
          };
        }),
      } as SectionContentMap[K];
    }
    case "coding": {
      const c = content as SectionContentMap["coding"];
      return {
        exercises: c.exercises.map((e, i) => {
          const id = `${p}-c${pad2(i + 1)}`;
          return { ...e, id, number: i + 1, followUp: { ...e.followUp, id: `${id}-f1` } };
        }),
      } as SectionContentMap[K];
    }
    case "star": {
      const c = content as SectionContentMap["star"];
      return {
        questions: c.questions.map((q, i) => {
          const id = `${p}-b${pad2(i + 1)}`;
          return { ...q, id, number: i + 1, followUp: { ...q.followUp, id: `${id}-f1` } };
        }),
      } as SectionContentMap[K];
    }
    case "hr": {
      const c = content as SectionContentMap["hr"];
      return {
        groups: c.groups.map((g, i) => ({
          ...g,
          questions: g.questions.map((q, j) => ({ ...q, id: `hr-${i + 1}-${j + 1}` })),
        })),
      } as SectionContentMap[K];
    }
    case "project": {
      const c = content as SectionContentMap["project"];
      return {
        ...c,
        features: c.features.map((f, i) => ({ ...f, id: `feature-${i + 1}` })),
        implementationChecklist: c.implementationChecklist.map((t, i) => ({ ...t, id: `task-${i + 1}` })),
      } as SectionContentMap[K];
    }
    case "studyPlan": {
      const c = content as SectionContentMap["studyPlan"];
      return {
        plans: c.plans.map((plan) => ({
          ...plan,
          days: plan.days.map((d, di) => ({
            ...d,
            day: di + 1,
            tasks: d.tasks.map((t, ti) => ({
              ...t,
              id: `${plan.id}-d${di + 1}-t${ti + 1}`,
              relatedItemIds: keepKnown(t.relatedItemIds),
            })),
          })),
        })),
      } as SectionContentMap[K];
    }
    case "cheatsheet": {
      const c = content as SectionContentMap["cheatsheet"];
      return {
        concepts: c.concepts.map((concept, i) => {
          const { topicId, ...rest } = concept;
          return {
            ...rest,
            id: `concept-${pad2(i + 1)}`,
            ...(topicId && knownTopics.has(topicId) ? { topicId } : {}),
            relatedItemIds: keepKnown(concept.relatedItemIds),
          };
        }),
        flashcards: c.flashcards.map((card, i) => {
          const { topicId, relatedItemId, ...rest } = card;
          return {
            ...rest,
            id: `fc-${pad2(i + 1)}`,
            ...(topicId && knownTopics.has(topicId) ? { topicId } : {}),
            ...(relatedItemId && known.has(relatedItemId) ? { relatedItemId } : {}),
          };
        }),
      } as SectionContentMap[K];
    }
    case "mock": {
      const c = content as SectionContentMap["mock"];
      const pool = keepKnown(c.questionPool);
      return {
        ...c,
        questionPool:
          pool.length > 0 ? pool : ctx.knownItemIds.length > 0 ? ctx.knownItemIds.slice(0, 30) : c.questionPool,
      } as SectionContentMap[K];
    }
    default:
      return content;
  }
}
