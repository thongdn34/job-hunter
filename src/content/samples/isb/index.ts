import type { InterviewPackage, SectionContentMap, SectionState } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { isbMeta } from "./meta";
import { isbTopics } from "./topics";
import { isbMock } from "./mock";
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
import { isbStudyPlans } from "./study-plan";
import { isbCheatConcepts, isbFlashcards } from "./cheatsheet";
import { isbJd } from "./jd";
import { isbCompany } from "./company";
import { isbMatch } from "./match";
import { isbAssessment } from "./assessment";
import { isbCv } from "./cv";
import { isbIntro } from "./intro";
import { isbEmail } from "./email";
import { isbHr } from "./hr";
import { isbProject } from "./project";

export { ISB_SLUG, ISB_JD_URL } from "./meta";

const questions = [
  ...realtimeQuestions,
  ...reactPerformanceQuestionsA,
  ...reactPerformanceQuestionsB,
  ...jsTsQuestions,
  ...stateNextjsQuestions,
  ...financeVizQuestions,
  ...feSystemDesignQuestions,
  ...testingPythonLinuxQuestions,
].sort((a, b) => a.number - b.number);

const nonEmpty = <T>(list: T[]): T[] | undefined => (list.length > 0 ? list : undefined);

const sections: Partial<SectionContentMap> = {
  jd: isbJd,
  company: isbCompany,
  match: isbMatch,
  cv: isbCv,
  intro: isbIntro,
  email: isbEmail,
  bilingual: nonEmpty(questions) && { topics: isbTopics, questions },
  systemDesign: nonEmpty(isbSystemDesign) && { scenarios: isbSystemDesign },
  coding: nonEmpty(isbCoding) && { exercises: isbCoding },
  star: nonEmpty(isbBehavioral) && { questions: isbBehavioral },
  hr: isbHr,
  project: isbProject,
  studyPlan: isbStudyPlans.length === 3 ? { plans: isbStudyPlans } : undefined,
  cheatsheet: nonEmpty(isbCheatConcepts) &&
    nonEmpty(isbFlashcards) && { concepts: isbCheatConcepts, flashcards: isbFlashcards },
  mock: isbMock,
  assessment: isbAssessment,
};

const sectionStates = Object.fromEntries(
  SECTION_KEYS.map((key: SectionKey): [SectionKey, SectionState] => [
    key,
    sections[key]
      ? { status: "ready", generatedAt: isbMeta.updatedAt, model: "curated-sample" }
      : { status: "pending" },
  ]),
) as InterviewPackage["sectionStates"];

/**
 * The curated ISB Vietnam Run #10 sample package. Works fully offline (no AI key).
 * Validated by src/content/samples/isb/isb-sample.test.ts.
 */
export const isbSamplePackage: InterviewPackage = {
  meta: isbMeta,
  sections: sections as InterviewPackage["sections"],
  sectionStates,
};
