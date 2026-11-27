import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BehavioralQuestionSchema,
  CodingExerciseSchema,
  InterviewPackageSchema,
  InterviewQuestionSchema,
  SectionContentSchemas,
  SystemDesignScenarioSchema,
} from "@/domain/package/schema";
import { collectStudyItems } from "@/domain/package/items";
import { SECTION_KEYS } from "@/domain/package/sections";
import { isbSamplePackage } from "./index";
import { isbTopics } from "./topics";
import { realtimeQuestions } from "./questions/realtime";
import { reactPerformanceQuestionsA } from "./questions/react-performance-a";
import { reactPerformanceQuestionsB } from "./questions/react-performance-b";
import { jsTsQuestions } from "./questions/js-ts";
import { stateNextjsQuestions } from "./questions/state-nextjs";
import { financeVizQuestions } from "./questions/finance-viz";
import { feSystemDesignQuestions } from "./questions/fe-system-design";
import { testingPythonLinuxQuestions } from "./questions/testing-python-linux";
import { isbSystemDesign } from "./system-design";
import { isbCoding } from "./coding";
import { isbBehavioral } from "./behavioral";

const MERMAID_START =
  /^(flowchart|graph|sequenceDiagram|stateDiagram(-v2)?|classDiagram|erDiagram|gantt|timeline|mindmap|journey|block-beta|architecture-beta|C4Context|xychart-beta)\b/;

const pad = (n: number) => String(n).padStart(2, "0");

/** Each question group: file export, expected number range, expected topic id. Run one with `-t "Q01-07"` etc. */
const GROUPS = [
  { label: "Q01-07 realtime", list: realtimeQuestions, from: 1, to: 7, topic: "realtime" },
  {
    label: "Q08-13 react-performance-a",
    list: reactPerformanceQuestionsA,
    from: 8,
    to: 13,
    topic: "react-performance",
  },
  {
    label: "Q14-18 react-performance-b",
    list: reactPerformanceQuestionsB,
    from: 14,
    to: 18,
    topic: "react-performance",
  },
  { label: "Q19-25 js-ts", list: jsTsQuestions, from: 19, to: 25, topic: "js-ts" },
  { label: "Q26-30 state-nextjs", list: stateNextjsQuestions, from: 26, to: 30, topic: "state-nextjs" },
  { label: "Q31-36 finance-viz", list: financeVizQuestions, from: 31, to: 36, topic: "finance-viz" },
  { label: "Q37-44 fe-system-design", list: feSystemDesignQuestions, from: 37, to: 44, topic: "fe-system-design" },
  {
    label: "Q45-50 testing-python-linux",
    list: testingPythonLinuxQuestions,
    from: 45,
    to: 50,
    topic: "testing-python-linux",
  },
];

describe.each(GROUPS)("ISB questions $label", ({ list, from, to, topic }) => {
  it("validates against InterviewQuestionSchema", () => {
    for (const q of list) {
      const r = InterviewQuestionSchema.safeParse(q);
      expect(r.success, `${q.id}: ${r.success ? "" : z.prettifyError(r.error)}`).toBe(true);
    }
  });
  it("has the exact numbers, ids and topic", () => {
    expect(list.map((q) => q.number)).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i));
    for (const q of list) {
      expect(q.id).toBe(`isb-q${pad(q.number)}`);
      expect(q.topicId).toBe(topic);
      q.followUps.forEach((f, i) => expect(f.id).toBe(`${q.id}-f${i + 1}`));
    }
  });
  it("has rich bilingual content", () => {
    for (const q of list) {
      expect(q.answer.split(/\s+/).length, `${q.id} answer words`).toBeGreaterThanOrEqual(80);
      expect(q.viExplanation.length, `${q.id} viExplanation`).toBeGreaterThan(150);
      expect(q.technicalExplanation.length, `${q.id} technicalExplanation`).toBeGreaterThan(400);
      if (q.diagram) expect(q.diagram.code.trim(), `${q.id} mermaid`).toMatch(MERMAID_START);
    }
  });
});

describe("ISB system design scenarios", () => {
  it("validates and has 3–5 scenarios with ids isb-sd1..", () => {
    expect(isbSystemDesign.length).toBeGreaterThanOrEqual(3);
    expect(isbSystemDesign.length).toBeLessThanOrEqual(5);
    isbSystemDesign.forEach((s, i) => {
      const r = SystemDesignScenarioSchema.safeParse(s);
      expect(r.success, `${s.id}: ${r.success ? "" : z.prettifyError(r.error)}`).toBe(true);
      expect(s.id).toBe(`isb-sd${i + 1}`);
      expect(s.number).toBe(i + 1);
      expect(s.architectureDiagram.code.trim()).toMatch(MERMAID_START);
      expect(s.sequenceDiagram.code.trim()).toMatch(MERMAID_START);
    });
  });
});

describe("ISB coding exercises", () => {
  it("validates and is numbered 51–55", () => {
    expect(isbCoding.map((c) => c.number)).toEqual([51, 52, 53, 54, 55]);
    for (const c of isbCoding) {
      const r = CodingExerciseSchema.safeParse(c);
      expect(r.success, `${c.id}: ${r.success ? "" : z.prettifyError(r.error)}`).toBe(true);
      expect(c.id).toBe(`isb-q${c.number}`);
    }
  });
});

describe("ISB behavioral questions", () => {
  it("validates and is numbered 56–61", () => {
    expect(isbBehavioral.map((b) => b.number)).toEqual([56, 57, 58, 59, 60, 61]);
    for (const b of isbBehavioral) {
      const r = BehavioralQuestionSchema.safeParse(b);
      expect(r.success, `${b.id}: ${r.success ? "" : z.prettifyError(r.error)}`).toBe(true);
      expect(b.id).toBe(`isb-q${b.number}`);
    }
  });
});

describe.each(SECTION_KEYS)("ISB section %s", (key) => {
  it("is present and valid", () => {
    const content = isbSamplePackage.sections[key];
    expect(content, `section ${key} missing`).toBeDefined();
    const r = SectionContentSchemas[key].safeParse(content);
    expect(r.success, r.success ? "" : z.prettifyError(r.error)).toBe(true);
  });
});

describe("ISB sample package (full)", () => {
  it("validates as an InterviewPackage", () => {
    const r = InterviewPackageSchema.safeParse(isbSamplePackage);
    expect(r.success, r.success ? "" : z.prettifyError(r.error)).toBe(true);
  });

  it("contains exactly 61 numbered interview items (1–61)", () => {
    const numbered = collectStudyItems(isbSamplePackage)
      .filter((i) => i.kind !== "systemDesign")
      .map((i) => i.number)
      .sort((a, b) => a - b);
    expect(numbered).toEqual(Array.from({ length: 61 }, (_, i) => i + 1));
  });

  it("has unique item ids and valid cross references", () => {
    const items = collectStudyItems(isbSamplePackage);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
    const topicIds = new Set(isbTopics.map((t) => t.id));
    for (const q of isbSamplePackage.sections.bilingual?.questions ?? []) expect(topicIds.has(q.topicId)).toBe(true);

    const s = isbSamplePackage.sections;
    const refs: Array<[string, string]> = [
      ...(s.studyPlan?.plans ?? []).flatMap((p) =>
        p.days.flatMap((d) =>
          d.tasks.flatMap((t) => t.relatedItemIds.map((id): [string, string] => [`plan ${t.id}`, id])),
        ),
      ),
      ...(s.cheatsheet?.concepts ?? []).flatMap((c) =>
        c.relatedItemIds.map((id): [string, string] => [`concept ${c.id}`, id]),
      ),
      ...(s.cheatsheet?.flashcards ?? []).flatMap((f) =>
        f.relatedItemId ? [[`flashcard ${f.id}`, f.relatedItemId] as [string, string]] : [],
      ),
      ...(s.mock?.questionPool ?? []).map((id): [string, string] => ["mock pool", id]),
      ...(s.systemDesign?.scenarios ?? []).flatMap((sd) =>
        sd.relatedQuestionIds.map((id): [string, string] => [sd.id, id]),
      ),
    ];
    for (const [where, id] of refs) expect(ids.has(id), `${where} -> unknown item ${id}`).toBe(true);
  });

  it("has at least 24 bilingual flashcards and 20–30 cheat-sheet concepts", () => {
    expect(isbSamplePackage.sections.cheatsheet?.flashcards.length ?? 0).toBeGreaterThanOrEqual(24);
    const concepts = isbSamplePackage.sections.cheatsheet?.concepts.length ?? 0;
    expect(concepts).toBeGreaterThanOrEqual(20);
    expect(concepts).toBeLessThanOrEqual(30);
  });

  it("never mentions Elfie (excluded experience)", () => {
    expect(JSON.stringify(isbSamplePackage).toLowerCase()).not.toContain("elfie");
  });
});
