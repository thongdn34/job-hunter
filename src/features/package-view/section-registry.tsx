import type { ComponentType } from "react";
import type { SectionKey } from "@/domain/package/sections";
import type { SectionProps } from "./section-types";
import { JdSection } from "@/features/sections/JdSection";
import { CompanySection } from "@/features/sections/CompanySection";
import { MatchSection } from "@/features/sections/MatchSection";
import { CvSection } from "@/features/sections/CvSection";
import { IntroSection } from "@/features/sections/IntroSection";
import { CommunicationSection } from "@/features/sections/CommunicationSection";
import { InterviewerQuestionsSection } from "@/features/sections/InterviewerQuestionsSection";
import { PracticeProjectSection } from "@/features/sections/PracticeProjectSection";
import { AssessmentSection } from "@/features/sections/AssessmentSection";
import { QuestionBankSection } from "@/features/questions/QuestionBankSection";
import { SystemDesignSection } from "@/features/questions/SystemDesignSection";
import { CodingSection } from "@/features/questions/CodingSection";
import { BehavioralSection } from "@/features/questions/BehavioralSection";
import { StudyPlanSection } from "@/features/study/StudyPlanSection";
import { CheatsheetSection } from "@/features/study/CheatsheetSection";
import { MockInterviewSection } from "@/features/mock-interview/MockInterviewSection";

/** Maps every Run #10 section to its renderer. Each renderer is owned by one feature module. */
export const SECTION_COMPONENTS: { [K in SectionKey]: ComponentType<SectionProps<K>> } = {
  jd: JdSection,
  company: CompanySection,
  match: MatchSection,
  cv: CvSection,
  intro: IntroSection,
  email: CommunicationSection,
  bilingual: QuestionBankSection,
  systemDesign: SystemDesignSection,
  coding: CodingSection,
  star: BehavioralSection,
  hr: InterviewerQuestionsSection,
  project: PracticeProjectSection,
  studyPlan: StudyPlanSection,
  cheatsheet: CheatsheetSection,
  mock: MockInterviewSection,
  assessment: AssessmentSection,
};
