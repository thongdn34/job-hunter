import type { Bilingual, CodeBlock, Diagram, ExperienceRef, Fact, FollowUp } from "@/domain/common/schema";
import {
  itemAnchorId,
  sectionAnchorId,
  sectionBookmark,
  bookmarkToAnchorId,
  topicBookmark,
} from "@/domain/package/bookmarks";
import { collectStudyItems, type StudyItem, type StudyItemKind } from "@/domain/package/items";
import type { InterviewPackage, PackageMeta, SectionContentMap } from "@/domain/package/schema";
import { SECTION_DEFINITIONS, type SectionDefinition, type SectionKey } from "@/domain/package/sections";
import { resolveSections } from "./shared";

/**
 * Format-neutral export document (intermediate representation). Section
 * content is mapped to blocks once; the Markdown and HTML renderers walk the
 * same tree, so both formats always contain the same (complete) content.
 */

/** A bilingual pair, or single-language text. `vi` text is hidden in English-only exports. */
export type Inline = { kind: "bi"; value: Bilingual } | { kind: "text"; text: string; lang: "en" | "vi" };

export interface ListItem {
  /** Short non-translated prefix, e.g. "Q7." */
  prefix?: string;
  text: Inline;
  tags?: string[];
  /** Internal (#anchor) or external (http/https) link for the text. */
  href?: string;
  /** Secondary line (reason, note, explanation). */
  detail?: Inline;
  /** External source URL rendered as a trailing "source" link. */
  source?: string;
}

export interface KvRow extends ListItem {
  label: string;
}

export type Block =
  | { type: "text"; text: Inline }
  | { type: "markdown"; source: string; lang: "en" | "vi" }
  | { type: "field"; label: string; blocks: Block[] }
  | { type: "kv"; rows: KvRow[] }
  | { type: "list"; ordered?: boolean; task?: boolean; items: ListItem[] }
  | { type: "table"; headers: string[]; rows: Inline[][] }
  | { type: "code"; code: CodeBlock }
  | { type: "diagram"; diagram: Diagram }
  | { type: "tags"; tags: string[] }
  | { type: "followUps"; items: FollowUp[] }
  | { type: "group"; title: Inline; anchorId?: string; bookmark?: string; blocks: Block[] }
  | { type: "item"; anchorId: string; prefix?: string; title: Inline; tags: string[]; blocks: Block[] }
  | { type: "note"; text: string };

export interface ExportSection {
  key: SectionKey;
  definition: SectionDefinition;
  bookmark: string;
  anchorId: string;
  blocks: Block[];
}

export interface TocEntry {
  anchorId: string;
  prefix?: string;
  title: Inline;
  children: TocEntry[];
}

export interface ExportDocument {
  meta: PackageMeta;
  sections: ExportSection[];
}

/* ------------------------------------------------------------------ */
/* Inline + block helpers                                               */
/* ------------------------------------------------------------------ */

export const bi = (value: Bilingual): Inline => ({ kind: "bi", value });
export const en = (text: string): Inline => ({ kind: "text", text, lang: "en" });
export const vi = (text: string): Inline => ({ kind: "text", text, lang: "vi" });

const text = (value: Inline): Block => ({ type: "text", text: value });
const md = (source: string, lang: "en" | "vi" = "en"): Block => ({ type: "markdown", source, lang });
const field = (label: string, blocks: Block[]): Block[] =>
  blocks.length > 0 ? [{ type: "field", label, blocks }] : [];
const biField = (label: string, value: Bilingual | undefined): Block[] =>
  value ? field(label, [text(bi(value))]) : [];
const mdField = (label: string, source: string, lang: "en" | "vi" = "en"): Block[] => field(label, [md(source, lang)]);
const list = (items: ListItem[], opts: { ordered?: boolean; task?: boolean } = {}): Block[] =>
  items.length > 0 ? [{ type: "list", items, ...opts }] : [];
const biList = (label: string, values: Bilingual[], ordered = false): Block[] =>
  field(
    label,
    list(
      values.map((v) => ({ text: bi(v) })),
      { ordered },
    ),
  );

const KIND_PREFIX: Record<StudyItemKind, string> = { question: "Q", systemDesign: "SD", coding: "C", behavioral: "B" };

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");

function factItem(fact: Fact): ListItem {
  return {
    text: bi(fact.text),
    tags: [fact.status],
    source: fact.sourceUrl,
    detail: fact.note ? en(fact.note) : undefined,
  };
}

function factRow(label: string, fact: Fact | undefined): KvRow[] {
  return fact ? [{ label, ...factItem(fact) }] : [];
}

const factList = (label: string, facts: Fact[]): Block[] => field(label, list(facts.map(factItem)));

function experienceBlocks(label: string, ref: ExperienceRef | undefined): Block[] {
  if (!ref) return [];
  const rows: KvRow[] = [{ label: "Kind", text: en(titleCase(ref.kind)) }];
  if (ref.company) rows.push({ label: "Company", text: en(ref.company) });
  return field(label, [{ type: "kv", rows }, text(bi(ref.note))]);
}

function codeBlocks(code: CodeBlock | undefined): Block[] {
  return code ? [{ type: "code", code }] : [];
}

function diagramBlocks(label: string, diagram: Diagram | undefined): Block[] {
  return diagram ? field(label, [{ type: "diagram", diagram }]) : [];
}

const followUps = (items: FollowUp[]): Block[] =>
  items.length > 0
    ? field(items.length === 1 ? "Follow-up" : "Follow-up questions", [{ type: "followUps", items }])
    : [];

const meta = (...values: Array<string | false | undefined>): string[] => values.filter((v): v is string => Boolean(v));

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */

interface Ctx {
  pkg: InterviewPackage;
  items: Map<string, StudyItem>;
  /** Ids of study items whose section is part of this export (link targets exist). */
  exported: Set<string>;
  anchors: Set<string>;
}

function anchor(ctx: Ctx, base: string): string {
  let id = base;
  for (let n = 2; ctx.anchors.has(id); n++) id = `${base}-${n}`;
  ctx.anchors.add(id);
  return id;
}

/** Link list entry for a related study item id (question, scenario, exercise, behavioral). */
function itemRef(ctx: Ctx, id: string): ListItem {
  const item = ctx.items.get(id);
  if (!item) return { text: en(id) };
  return {
    prefix: `${KIND_PREFIX[item.kind]}${item.number}.`,
    text: bi(item.title),
    href: ctx.exported.has(id) ? `#${item.anchorId}` : undefined,
  };
}

const itemRefs = (ctx: Ctx, label: string, ids: string[]): Block[] =>
  field(label, list(ids.map((id) => itemRef(ctx, id))));

/* ------------------------------------------------------------------ */
/* Section builders                                                     */
/* ------------------------------------------------------------------ */

type Builder<K extends SectionKey> = (data: SectionContentMap[K], ctx: Ctx) => Block[];

const jd: Builder<"jd"> = (d) => [
  {
    type: "kv",
    rows: [
      ...factRow("Job title", d.jobTitle),
      ...factRow("Company", d.company),
      ...factRow("Location", d.location),
      ...factRow("Working arrangement", d.workingArrangement),
      ...factRow("Seniority", d.seniority),
      ...factRow("Compensation", d.compensation),
    ],
  },
  ...factList("Responsibilities", d.responsibilities),
  ...factList("Required skills", d.requiredSkills),
  ...factList("Preferred skills", d.preferredSkills),
  ...factList("Benefits", d.benefits),
  ...factList("Key expectations", d.keyExpectations),
  ...field("Inferred architecture", [
    text(bi(d.inferredArchitecture.summary)),
    ...list(d.inferredArchitecture.components.map(factItem)),
    ...(d.inferredArchitecture.diagram ? [{ type: "diagram", diagram: d.inferredArchitecture.diagram } as const] : []),
  ]),
  ...field("Verification", [
    {
      type: "kv",
      rows: [
        { label: "Overall status", text: en(d.verification.overallStatus) },
        ...(d.verification.checkedAt ? [{ label: "Checked at", text: en(d.verification.checkedAt) }] : []),
      ],
    },
    ...list(d.verification.notes.map((n) => ({ text: bi(n) }))),
  ]),
  ...field("Sources", list(d.sourceUrls.map((url) => ({ text: en(url), href: url })))),
];

const company: Builder<"company"> = (d) => [
  {
    type: "kv",
    rows: [
      ...factRow("Overview", d.overview),
      ...factRow("Business model", d.businessModel),
      ...factRow("Industry", d.industry),
      ...factRow("Company size", d.companySize),
    ],
  },
  ...factList("Products and services", d.productsAndServices),
  ...factList("Engineering culture", d.engineeringCulture),
  ...factList("Potential projects", d.potentialProjects),
  ...factList("Application risks", d.applicationRisks),
  ...biList("Questions to ask the recruiter", d.recruiterQuestions),
  ...field(
    "Sources",
    list(
      d.sources.map((s) => ({
        text: en(s.title),
        href: s.url,
        detail: s.accessedAt ? en(`Accessed ${s.accessedAt}`) : undefined,
      })),
    ),
  ),
];

const match: Builder<"match"> = (d, ctx) => [
  ...biField("Summary", d.summary),
  ...biField("Scoring notes", d.scoringNotes),
  ...d.requirements.map((r): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(`match-${r.id}`)),
    title: bi(r.requirement),
    tags: meta(r.category, `weight ${r.weight}`, `match: ${r.matchLevel}`),
    blocks: [
      ...biField("Candidate experience", r.candidateExperience),
      ...field(
        "Evidence",
        list(
          r.evidence.map((e) => ({
            prefix: e.company ? `${e.company}:` : undefined,
            text: bi(e.note),
            tags: [e.kind],
          })),
        ),
      ),
      ...biField("Knowledge gap", r.knowledgeGap),
      ...biField("Recommended improvement", r.recommendedImprovement),
    ],
  })),
];

const cv: Builder<"cv"> = (d) => [
  ...field("Professional title", [text(en(d.professionalTitle))]),
  ...biField("Summary", d.summary),
  ...field(
    "Experience highlights",
    d.experienceHighlights.map((x): Block => ({
      type: "group",
      title: en([x.role, x.company, x.period].filter(Boolean).join(" · ")),
      blocks: list(x.bullets.map((b) => ({ text: bi(b) }))),
    })),
  ),
  ...biList("Achievement bullets", d.achievementBullets),
  ...field(
    "Technical skills",
    d.technicalSkills.length > 0
      ? [{ type: "kv", rows: d.technicalSkills.map((s) => ({ label: s.category, text: en(s.skills.join(", ")) })) }]
      : [],
  ),
  ...field("ATS keywords", d.atsKeywords.length > 0 ? [{ type: "tags", tags: d.atsKeywords }] : []),
  ...field(
    "Missing skills to study",
    list(
      d.missingSkillsToStudy.map((s) => ({
        text: en(s.skill),
        tags: [`${s.priority} priority`],
        detail: bi(s.reason),
      })),
    ),
  ),
  ...biList("Claim notes", d.claimNotes),
];

const intro: Builder<"intro"> = (d, ctx) => [
  ...d.variants.map((v): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(`intro-${v.durationSeconds}s`)),
    title: {
      kind: "bi",
      value: { en: `${v.durationSeconds}-second introduction`, vi: `Giới thiệu ${v.durationSeconds} giây` },
    },
    tags: [],
    blocks: [
      ...biField("Script", v.script),
      ...biField("Memory shortcut", v.memoryShortcut),
      ...biList("Key points", v.keyPoints),
    ],
  })),
  ...biList("Delivery tips", d.deliveryTips),
];

const email: Builder<"email"> = (d, ctx) => {
  const drafts = [
    ["application-email", "Application email", "Email ứng tuyển", d.applicationEmail],
    ["linkedin-message", "LinkedIn message", "Tin nhắn LinkedIn", d.linkedinMessage],
    ["cover-letter", "Cover letter", "Thư xin việc", d.coverLetter],
    ["follow-up-email", "Follow-up email", "Email theo dõi", d.followUpEmail],
  ] as const;
  return drafts.map(([id, enTitle, viTitle, draft]): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(`email-${id}`)),
    title: bi({ en: enTitle, vi: viTitle }),
    tags: [],
    blocks: [
      ...(draft.subject ? field("Subject", [text(en(draft.subject))]) : []),
      ...biField("Message", draft.body),
      ...biField("Notes", draft.notes),
    ],
  }));
};

const bilingual: Builder<"bilingual"> = (d, ctx) => {
  const companyCode = ctx.pkg.meta.companyCode;
  const questionItem = (q: SectionContentMap["bilingual"]["questions"][number]): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(q.id)),
    prefix: `Q${q.number}.`,
    title: bi(q.question),
    tags: meta(q.difficulty, `${q.priority} priority`),
    blocks: [
      { type: "kv", rows: [{ label: "JD requirement", text: en(q.jdRequirement) }] },
      ...mdField("Recommended answer", q.answer),
      ...mdField("Vietnamese explanation", q.viExplanation, "vi"),
      ...mdField("Technical explanation", q.technicalExplanation),
      ...field("Practical example", [text(bi(q.practicalExample.description)), ...codeBlocks(q.practicalExample.code)]),
      ...diagramBlocks("Diagram", q.diagram),
      ...biField("Memory shortcut", q.memoryShortcut),
      ...biField("Key takeaway", q.keyTakeaway),
      ...experienceBlocks("Candidate experience", q.candidateExperience),
      ...followUps(q.followUps),
      ...(q.tags.length > 0 ? field("Tags", [{ type: "tags", tags: q.tags }]) : []),
    ],
  });

  const known = new Set(d.topics.map((t) => t.id));
  const groups: Block[] = d.topics.flatMap((topic): Block[] => {
    const questions = d.questions.filter((q) => q.topicId === topic.id);
    if (questions.length === 0) return [];
    const bookmark = topicBookmark(companyCode, topic.code);
    return [
      {
        type: "group",
        title: bi(topic.title),
        bookmark,
        anchorId: anchor(ctx, bookmarkToAnchorId(bookmark)),
        blocks: [
          {
            type: "kv",
            rows: [
              { label: "Priority", text: en(topic.priority) },
              ...(topic.range ? [{ label: "Questions", text: en(topic.range) }] : []),
            ],
          },
          ...(topic.description ? [text(bi(topic.description))] : []),
          ...questions.map(questionItem),
        ],
      },
    ];
  });
  const orphans = d.questions.filter((q) => !known.has(q.topicId));
  if (orphans.length > 0) {
    groups.push({
      type: "group",
      title: bi({ en: "Other questions", vi: "Câu hỏi khác" }),
      anchorId: anchor(ctx, bookmarkToAnchorId(topicBookmark(companyCode, "OTHER"))),
      blocks: orphans.map(questionItem),
    });
  }
  return groups;
};

const systemDesign: Builder<"systemDesign"> = (d, ctx) =>
  d.scenarios.map((s): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(s.id)),
    prefix: `SD${s.number}.`,
    title: bi(s.title),
    tags: meta(s.difficulty, `${s.priority} priority`),
    blocks: [
      ...biField("Prompt", s.prompt),
      ...biList("Functional requirements", s.functionalRequirements),
      ...biList("Non-functional requirements", s.nonFunctionalRequirements),
      ...biList("Clarifying questions", s.clarifyingQuestions),
      ...mdField("High-level architecture", s.highLevelArchitecture),
      ...diagramBlocks("Architecture diagram", s.architectureDiagram),
      ...field(
        "Component responsibilities",
        list(s.componentResponsibilities.map((c) => ({ prefix: `${c.name}:`, text: bi(c.responsibility) }))),
      ),
      ...mdField("Data flow", s.dataFlow),
      ...diagramBlocks("Sequence diagram", s.sequenceDiagram),
      ...mdField("API design", s.apiDesign),
      ...mdField("State management", s.stateManagement),
      ...mdField("Scalability", s.scalability),
      ...mdField("Performance", s.performance),
      ...mdField("Security", s.security),
      ...mdField("Reliability", s.reliability),
      ...mdField("Error recovery", s.errorRecovery),
      ...mdField("Monitoring", s.monitoring),
      ...field("Trade-offs", [
        {
          type: "table",
          headers: ["Decision", "Pros", "Cons"],
          rows: s.tradeOffs.map((t) => [en(t.decision), en(t.pros), en(t.cons)]),
        },
      ]),
      ...mdField("Recommended answer", s.recommendedAnswer),
      ...mdField("Vietnamese explanation", s.viExplanation, "vi"),
      ...biField("Memory shortcut", s.memoryShortcut),
      ...followUps(s.followUps),
      ...itemRefs(ctx, "Related questions", s.relatedQuestionIds),
    ],
  }));

const json = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return String(value);
  }
};

const coding: Builder<"coding"> = (d, ctx) =>
  d.exercises.map((c): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(c.id)),
    prefix: `C${c.number}.`,
    title: bi(c.title),
    tags: meta(c.difficulty, `${c.priority} priority`),
    blocks: [
      {
        type: "kv",
        rows: [
          { label: "JD requirement", text: en(c.jdRequirement) },
          { label: "Function", text: en(c.functionName) },
        ],
      },
      ...biField("Problem statement", c.statement),
      ...field(
        "Examples",
        c.examples.map((x, i): Block => ({
          type: "group",
          title: en(`Example ${i + 1}`),
          blocks: [
            { type: "code", code: { language: "text", code: `Input:  ${x.input}\nOutput: ${x.output}` } },
            ...(x.explanation ? [text(bi(x.explanation))] : []),
          ],
        })),
      ),
      ...field("Constraints", list(c.constraints.map((x) => ({ text: en(x) })))),
      ...biField("Approach", c.approach),
      ...biList("Steps", c.steps, true),
      ...field("Solution", [{ type: "code", code: c.solution }]),
      ...field("Complexity", [
        {
          type: "kv",
          rows: [
            { label: "Time", text: en(c.timeComplexity) },
            { label: "Space", text: en(c.spaceComplexity) },
          ],
        },
      ]),
      ...biList("Edge cases", c.edgeCases),
      ...field("Walkthrough", [
        ...list(
          c.walkthrough.steps.map((x) => ({ text: en(x) })),
          { ordered: true },
        ),
        ...(c.walkthrough.diagram ? [{ type: "diagram", diagram: c.walkthrough.diagram } as const] : []),
      ]),
      ...biField("Memory shortcut", c.memoryShortcut),
      ...followUps([c.followUp]),
      ...(c.alternative
        ? field("Alternative approach", [
            text(bi(c.alternative.description)),
            ...codeBlocks(c.alternative.code),
            { type: "kv", rows: [{ label: "Complexity", text: en(c.alternative.complexity) }] },
          ])
        : []),
      ...field("Test cases", [
        {
          type: "table",
          headers: ["Name", "Arguments", "Expected"],
          rows: c.testCases.map((t) => [en(t.name), en(json(t.args)), en(json(t.expected))]),
        },
      ]),
    ],
  }));

const star: Builder<"star"> = (d, ctx) =>
  d.questions.map((b): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(b.id)),
    prefix: `B${b.number}.`,
    title: bi(b.question),
    tags: meta(b.competency, b.difficulty, `${b.priority} priority`),
    blocks: [
      ...biField("Situation", b.star.situation),
      ...biField("Task", b.star.task),
      ...biField("Action", b.star.action),
      ...biField("Result", b.star.result),
      ...experienceBlocks("Source", b.source),
      ...biField("Memory shortcut", b.memoryShortcut),
      ...followUps([b.followUp]),
      ...biList("Cautions (do not claim)", b.cautions),
    ],
  }));

const hr: Builder<"hr"> = (d) =>
  d.groups.map((g): Block => ({
    type: "group",
    title: bi(g.title),
    blocks: list(
      g.questions.map((q) => ({ text: bi(q.text), detail: q.why ? bi(q.why) : undefined })),
      { ordered: true },
    ),
  }));

const project: Builder<"project"> = (d) => [
  ...field("Project", [text(en(d.name))]),
  ...biField("Objective", d.objective),
  ...field("Target gaps", [{ type: "tags", tags: d.targetGaps }]),
  ...field("Tech stack", list(d.techStack.map((t) => ({ prefix: `${t.name}:`, text: bi(t.reason) })))),
  ...diagramBlocks("Architecture diagram", d.architectureDiagram),
  ...field("Features", list(d.features.map((f) => ({ text: bi(f.title), tags: [`${f.priority} priority`] })))),
  ...field(
    "Implementation checklist",
    list(
      d.implementationChecklist.map((c) => ({ text: bi(c.text) })),
      { task: true },
    ),
  ),
  ...biList("Testing requirements", d.testingRequirements),
  ...biList("Performance requirements", d.performanceRequirements),
  ...biList("Learning outcomes", d.learningOutcomes),
];

const studyPlan: Builder<"studyPlan"> = (d, ctx) =>
  d.plans.map((p): Block => ({
    type: "item",
    anchorId: anchor(ctx, itemAnchorId(`study-plan-${p.id}`)),
    title: bi(p.title),
    tags: [p.id],
    blocks: p.days.map((day): Block => ({
      type: "group",
      title: { kind: "bi", value: { en: `Day ${day.day}: ${day.focus.en}`, vi: `Ngày ${day.day}: ${day.focus.vi}` } },
      blocks: list(
        day.tasks.map((t) => ({
          text: bi(t.title),
          tags: [`${t.durationMinutes} min`, `${t.priority} priority`],
        })),
        { task: true },
      ).concat(itemRefs(ctx, "Related items", [...new Set(day.tasks.flatMap((t) => t.relatedItemIds))])),
    })),
  }));

const cheatsheet: Builder<"cheatsheet"> = (d, ctx) => [
  ...field(
    "Key concepts",
    d.concepts.map((c): Block => ({
      type: "group",
      title: bi(c.title),
      anchorId: anchor(ctx, itemAnchorId(`concept-${c.id}`)),
      blocks: [
        { type: "kv", rows: [{ label: "Priority", text: en(c.priority) }] },
        ...biField("Memory shortcut", c.memoryShortcut),
        ...biField("Takeaway", c.takeaway),
        ...itemRefs(ctx, "Related items", c.relatedItemIds),
      ],
    })),
  ),
  ...field(
    "Flashcards",
    d.flashcards.map((f, i): Block => ({
      type: "item",
      anchorId: anchor(ctx, itemAnchorId(`flashcard-${f.id}`)),
      prefix: `F${i + 1}.`,
      title: bi(f.front),
      tags: [`${f.priority} priority`],
      blocks: [
        ...mdField("Answer", f.back.answer),
        ...mdField("Vietnamese explanation", f.back.viExplanation, "vi"),
        ...biField("Memory shortcut", f.back.memoryShortcut),
        ...(f.relatedItemId ? itemRefs(ctx, "Related item", [f.relatedItemId]) : []),
      ],
    })),
  ),
];

const mock: Builder<"mock"> = (d, ctx) => [
  ...biField("Introduction", d.intro),
  ...field(
    "Scoring rubric",
    list(
      d.rubric.map((r) => ({
        prefix: `${titleCase(r.criterion.replace(/([A-Z])/g, " $1").toLowerCase())}:`,
        text: bi(r.description),
      })),
    ),
  ),
  ...itemRefs(ctx, "Question pool", d.questionPool),
];

const DECISION_LABELS: Record<SectionContentMap["assessment"]["recommendation"]["decision"], Bilingual> = {
  "apply-now": { en: "Apply now", vi: "Ứng tuyển ngay" },
  "apply-after-prep": { en: "Apply after preparation", vi: "Ứng tuyển sau khi chuẩn bị" },
  "clarify-first": { en: "Clarify first", vi: "Cần làm rõ trước" },
  "not-recommended": { en: "Not recommended", vi: "Không khuyến nghị" },
};

const assessment: Builder<"assessment"> = (d) => [
  ...biField("Overall match", d.overallMatch),
  ...field("Recommendation", [
    {
      type: "kv",
      rows: [
        { label: "Decision", text: bi(DECISION_LABELS[d.recommendation.decision]), tags: [d.recommendation.decision] },
      ],
    },
    text(bi(d.recommendation.rationale)),
  ]),
  ...biList("Selling points", d.sellingPoints),
  ...field("Knowledge gaps", list(d.knowledgeGaps.map((g) => ({ text: bi(g.gap), tags: [`${g.priority} priority`] })))),
  ...biList("Interview priorities", d.interviewPriorities, true),
  ...biList("Verification notes", d.verificationNotes),
  ...biList("Unsupported claims (do not state)", d.unsupportedClaims),
];

const BUILDERS: { [K in SectionKey]: Builder<K> } = {
  jd,
  company,
  match,
  cv,
  intro,
  email,
  bilingual,
  systemDesign,
  coding,
  star,
  hr,
  project,
  studyPlan,
  cheatsheet,
  mock,
  assessment,
};

function buildSection<K extends SectionKey>(key: K, data: SectionContentMap[K], ctx: Ctx): Block[] {
  return BUILDERS[key](data, ctx);
}

/** Builds the export tree for the selected sections (canonical order, sections without content skipped). */
export function buildExportDocument(pkg: InterviewPackage, sections?: readonly SectionKey[]): ExportDocument {
  const keys = resolveSections(pkg, sections);
  const items = new Map(collectStudyItems(pkg).map((item) => [item.id, item]));
  const exportedKeys = new Set<SectionKey>(keys);
  const exported = new Set([...items.values()].filter((item) => exportedKeys.has(item.section)).map((item) => item.id));
  const ctx: Ctx = { pkg, items, exported, anchors: new Set() };
  const companyCode = pkg.meta.companyCode;

  return {
    meta: pkg.meta,
    sections: keys.map((key) => {
      const anchorId = anchor(ctx, sectionAnchorId(companyCode, key));
      const data = pkg.sections[key] as SectionContentMap[typeof key];
      return {
        key,
        definition: SECTION_DEFINITIONS[key],
        bookmark: sectionBookmark(companyCode, key),
        anchorId,
        blocks: buildSection(key, data, ctx),
      };
    }),
  };
}

/** Navigable entries (anchored groups and items) nested under each section. */
export function collectToc(blocks: Block[]): TocEntry[] {
  const out: TocEntry[] = [];
  for (const block of blocks) {
    if (block.type === "item") {
      out.push({ anchorId: block.anchorId, prefix: block.prefix, title: block.title, children: [] });
    } else if (block.type === "group" || block.type === "field") {
      const children = collectToc(block.blocks);
      if (block.type === "group" && block.anchorId) {
        out.push({ anchorId: block.anchorId, title: block.title, children });
      } else {
        out.push(...children);
      }
    }
  }
  return out;
}

/** Only http(s)/mailto URLs and in-document anchors are rendered as links. */
export function isSafeHref(href: string): boolean {
  return /^#[\w-]+$/.test(href) || /^(https?:|mailto:)/i.test(href);
}
