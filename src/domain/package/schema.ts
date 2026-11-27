import { z } from "zod";
import {
  BilingualSchema,
  CodeBlockSchema,
  DiagramSchema,
  DifficultySchema,
  ExperienceRefSchema,
  FactSchema,
  FollowUpSchema,
  PrioritySchema,
  VerificationStatusSchema,
} from "@/domain/common/schema";
import { SECTION_KEYS } from "./sections";

/* ------------------------------------------------------------------ */
/* Section 1 — Job Description Analysis                                */
/* ------------------------------------------------------------------ */

export const JdAnalysisSchema = z.object({
  jobTitle: FactSchema,
  company: FactSchema,
  location: FactSchema,
  workingArrangement: FactSchema,
  seniority: FactSchema,
  responsibilities: z.array(FactSchema).min(1),
  requiredSkills: z.array(FactSchema).min(1),
  preferredSkills: z.array(FactSchema),
  benefits: z.array(FactSchema),
  /** Only present when verified; otherwise a Fact with status "unverified". */
  compensation: FactSchema.optional(),
  keyExpectations: z.array(FactSchema),
  inferredArchitecture: z.object({
    summary: BilingualSchema,
    components: z.array(FactSchema),
    diagram: DiagramSchema.optional(),
  }),
  sourceUrls: z.array(z.string().url()),
  verification: z.object({
    overallStatus: VerificationStatusSchema,
    notes: z.array(BilingualSchema),
    checkedAt: z.string().optional(),
  }),
});
export type JdAnalysis = z.infer<typeof JdAnalysisSchema>;

/* ------------------------------------------------------------------ */
/* Section 2 — Company Research                                        */
/* ------------------------------------------------------------------ */

export const CompanyResearchSchema = z.object({
  overview: FactSchema,
  businessModel: FactSchema,
  productsAndServices: z.array(FactSchema),
  industry: FactSchema,
  engineeringCulture: z.array(FactSchema),
  companySize: FactSchema,
  potentialProjects: z.array(FactSchema),
  applicationRisks: z.array(FactSchema),
  recruiterQuestions: z.array(BilingualSchema),
  sources: z.array(z.object({ title: z.string(), url: z.string().url(), accessedAt: z.string().optional() })),
});
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

/* ------------------------------------------------------------------ */
/* Section 3 — Candidate Matching                                      */
/* ------------------------------------------------------------------ */

export const MATCH_LEVELS = ["strong", "relevant", "partial", "gap", "unverified"] as const;
export const MatchLevelSchema = z.enum(MATCH_LEVELS);
export type MatchLevel = z.infer<typeof MatchLevelSchema>;

export const MatchRequirementSchema = z.object({
  id: z.string().min(1),
  requirement: BilingualSchema,
  category: z.enum(["required", "preferred", "domain", "soft-skill"]),
  /** Relative weight 1..5 used by the transparent scoring formula. */
  weight: z.number().int().min(1).max(5),
  candidateExperience: BilingualSchema,
  matchLevel: MatchLevelSchema,
  evidence: z.array(ExperienceRefSchema),
  knowledgeGap: BilingualSchema.optional(),
  recommendedImprovement: BilingualSchema.optional(),
});
export type MatchRequirement = z.infer<typeof MatchRequirementSchema>;

export const MatchSectionSchema = z.object({
  requirements: z.array(MatchRequirementSchema).min(1),
  /** Points awarded per level; the score is computed, never hand-written. See domain/match/score.ts */
  scoringNotes: BilingualSchema,
  summary: BilingualSchema,
});
export type MatchSection = z.infer<typeof MatchSectionSchema>;

/* ------------------------------------------------------------------ */
/* Section 4 — Tailored CV                                             */
/* ------------------------------------------------------------------ */

export const TailoredCvSchema = z.object({
  professionalTitle: z.string().min(1),
  summary: BilingualSchema,
  experienceHighlights: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      period: z.string().optional(),
      bullets: z.array(BilingualSchema).min(1),
    }),
  ),
  achievementBullets: z.array(BilingualSchema),
  technicalSkills: z.array(z.object({ category: z.string(), skills: z.array(z.string()) })),
  atsKeywords: z.array(z.string()),
  missingSkillsToStudy: z.array(z.object({ skill: z.string(), reason: BilingualSchema, priority: PrioritySchema })),
  claimNotes: z.array(BilingualSchema),
});
export type TailoredCv = z.infer<typeof TailoredCvSchema>;

/* ------------------------------------------------------------------ */
/* Section 5 — Self-introduction                                       */
/* ------------------------------------------------------------------ */

export const IntroVariantSchema = z.object({
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  script: BilingualSchema,
  memoryShortcut: BilingualSchema,
  keyPoints: z.array(BilingualSchema).min(1),
});
export const IntroSectionSchema = z.object({
  variants: z.array(IntroVariantSchema).length(3),
  deliveryTips: z.array(BilingualSchema),
});
export type IntroSection = z.infer<typeof IntroSectionSchema>;

/* ------------------------------------------------------------------ */
/* Section 6 — Application Communication                               */
/* ------------------------------------------------------------------ */

export const MessageDraftSchema = z.object({
  subject: z.string().optional(),
  body: BilingualSchema,
  notes: BilingualSchema.optional(),
});
export const CommunicationSectionSchema = z.object({
  applicationEmail: MessageDraftSchema,
  linkedinMessage: MessageDraftSchema,
  coverLetter: MessageDraftSchema,
  followUpEmail: MessageDraftSchema,
});
export type CommunicationSection = z.infer<typeof CommunicationSectionSchema>;

/* ------------------------------------------------------------------ */
/* Section 7 — Bilingual technical questions                           */
/* ------------------------------------------------------------------ */

export const InterviewTopicSchema = z.object({
  id: z.string().min(1),
  /** Bookmark suffix, e.g. "REACT" -> BOOKMARK_ISB_REACT */
  code: z.string().min(1),
  title: BilingualSchema,
  description: BilingualSchema.optional(),
  priority: PrioritySchema,
  /** Inclusive question number range for display, e.g. "1–7". */
  range: z.string().optional(),
});
export type InterviewTopic = z.infer<typeof InterviewTopicSchema>;

export const InterviewQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  topicId: z.string().min(1),
  question: BilingualSchema,
  /** Recommended spoken English answer (natural, senior-level, 120–250 words). */
  answer: z.string().min(1),
  viExplanation: z.string().min(1),
  /** Markdown. Detailed technical explanation, trade-offs, failure scenarios. */
  technicalExplanation: z.string().min(1),
  practicalExample: z.object({
    description: BilingualSchema,
    code: CodeBlockSchema.optional(),
  }),
  diagram: DiagramSchema.optional(),
  memoryShortcut: BilingualSchema,
  keyTakeaway: BilingualSchema,
  followUps: z.array(FollowUpSchema).min(1),
  difficulty: DifficultySchema,
  priority: PrioritySchema,
  jdRequirement: z.string().min(1),
  candidateExperience: ExperienceRefSchema.optional(),
  tags: z.array(z.string()),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const QuestionBankSchema = z.object({
  topics: z.array(InterviewTopicSchema).min(1),
  questions: z.array(InterviewQuestionSchema).min(1),
});
export type QuestionBank = z.infer<typeof QuestionBankSchema>;

/* ------------------------------------------------------------------ */
/* Section 8 — System design                                           */
/* ------------------------------------------------------------------ */

export const SystemDesignScenarioSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: BilingualSchema,
  prompt: BilingualSchema,
  functionalRequirements: z.array(BilingualSchema).min(1),
  nonFunctionalRequirements: z.array(BilingualSchema).min(1),
  clarifyingQuestions: z.array(BilingualSchema).min(1),
  highLevelArchitecture: z.string().min(1), // markdown
  componentResponsibilities: z.array(z.object({ name: z.string(), responsibility: BilingualSchema })).min(1),
  dataFlow: z.string().min(1), // markdown
  apiDesign: z.string().min(1), // markdown (may contain code blocks)
  stateManagement: z.string().min(1),
  scalability: z.string().min(1),
  performance: z.string().min(1),
  security: z.string().min(1),
  reliability: z.string().min(1),
  errorRecovery: z.string().min(1),
  monitoring: z.string().min(1),
  tradeOffs: z.array(z.object({ decision: z.string(), pros: z.string(), cons: z.string() })).min(1),
  recommendedAnswer: z.string().min(1),
  viExplanation: z.string().min(1),
  architectureDiagram: DiagramSchema,
  sequenceDiagram: DiagramSchema,
  memoryShortcut: BilingualSchema,
  followUps: z.array(FollowUpSchema).min(1),
  difficulty: DifficultySchema,
  priority: PrioritySchema,
  relatedQuestionIds: z.array(z.string()),
});
export type SystemDesignScenario = z.infer<typeof SystemDesignScenarioSchema>;

export const SystemDesignSectionSchema = z.object({
  scenarios: z.array(SystemDesignScenarioSchema).min(1),
});

/* ------------------------------------------------------------------ */
/* Section 9 — Coding                                                  */
/* ------------------------------------------------------------------ */

export const CodingTestCaseSchema = z.object({
  name: z.string().min(1),
  /** Positional arguments passed to `functionName`. JSON-serialisable. */
  args: z.array(z.unknown()),
  expected: z.unknown(),
});

export const CodingExerciseSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: BilingualSchema,
  statement: BilingualSchema,
  examples: z
    .array(z.object({ input: z.string(), output: z.string(), explanation: BilingualSchema.optional() }))
    .min(1),
  constraints: z.array(z.string()),
  approach: BilingualSchema,
  /** Name of the exported function inside solution.code that tests call. */
  functionName: z.string().min(1),
  solution: CodeBlockSchema,
  steps: z.array(BilingualSchema).min(1),
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
  edgeCases: z.array(BilingualSchema).min(1),
  walkthrough: z.object({ steps: z.array(z.string()).min(1), diagram: DiagramSchema.optional() }),
  memoryShortcut: BilingualSchema,
  followUp: FollowUpSchema,
  alternative: z
    .object({ description: BilingualSchema, code: CodeBlockSchema.optional(), complexity: z.string() })
    .optional(),
  testCases: z.array(CodingTestCaseSchema).min(1),
  difficulty: DifficultySchema,
  priority: PrioritySchema,
  jdRequirement: z.string().min(1),
});
export type CodingExercise = z.infer<typeof CodingExerciseSchema>;

export const CodingSectionSchema = z.object({ exercises: z.array(CodingExerciseSchema).min(1) });

/* ------------------------------------------------------------------ */
/* Section 10 — Behavioral                                             */
/* ------------------------------------------------------------------ */

export const BehavioralQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  question: BilingualSchema,
  competency: z.string().min(1),
  star: z.object({
    situation: BilingualSchema,
    task: BilingualSchema,
    action: BilingualSchema,
    result: BilingualSchema,
  }),
  /** `actual` = grounded in profile; `theoretical` = a template the candidate must fill with a real story. */
  source: ExperienceRefSchema,
  memoryShortcut: BilingualSchema,
  followUp: FollowUpSchema,
  /** Things the candidate must NOT claim (unsupported metrics etc.). */
  cautions: z.array(BilingualSchema),
  difficulty: DifficultySchema,
  priority: PrioritySchema,
});
export type BehavioralQuestion = z.infer<typeof BehavioralQuestionSchema>;

export const BehavioralSectionSchema = z.object({ questions: z.array(BehavioralQuestionSchema).min(1) });

/* ------------------------------------------------------------------ */
/* Section 11 — Questions for interviewer                              */
/* ------------------------------------------------------------------ */

export const HR_CATEGORIES = [
  "technical-architecture",
  "project-responsibilities",
  "engineering-culture",
  "team-structure",
  "career-growth",
  "compensation",
  "working-arrangements",
  "interview-process",
] as const;

export const InterviewerQuestionsSchema = z.object({
  groups: z
    .array(
      z.object({
        category: z.enum(HR_CATEGORIES),
        title: BilingualSchema,
        questions: z.array(z.object({ id: z.string(), text: BilingualSchema, why: BilingualSchema.optional() })).min(1),
      }),
    )
    .min(1),
});
export type InterviewerQuestions = z.infer<typeof InterviewerQuestionsSchema>;

/* ------------------------------------------------------------------ */
/* Section 12 — Practice project                                       */
/* ------------------------------------------------------------------ */

export const PracticeProjectSchema = z.object({
  name: z.string().min(1),
  objective: BilingualSchema,
  targetGaps: z.array(z.string()).min(1),
  techStack: z.array(z.object({ name: z.string(), reason: BilingualSchema })).min(1),
  architectureDiagram: DiagramSchema,
  features: z.array(z.object({ id: z.string(), title: BilingualSchema, priority: PrioritySchema })).min(1),
  implementationChecklist: z.array(z.object({ id: z.string(), text: BilingualSchema })).min(1),
  testingRequirements: z.array(BilingualSchema).min(1),
  performanceRequirements: z.array(BilingualSchema).min(1),
  learningOutcomes: z.array(BilingualSchema).min(1),
});
export type PracticeProject = z.infer<typeof PracticeProjectSchema>;

/* ------------------------------------------------------------------ */
/* Section 13 — Study plan                                             */
/* ------------------------------------------------------------------ */

export const StudyTaskSchema = z.object({
  id: z.string().min(1),
  title: BilingualSchema,
  durationMinutes: z.number().int().positive(),
  priority: PrioritySchema,
  /** Ids of questions / exercises / scenarios / behavioral questions. */
  relatedItemIds: z.array(z.string()),
});
export type StudyTask = z.infer<typeof StudyTaskSchema>;

export const StudyPlanSchema = z.object({
  id: z.enum(["1d", "3d", "7d"]),
  title: BilingualSchema,
  days: z
    .array(
      z.object({ day: z.number().int().positive(), focus: BilingualSchema, tasks: z.array(StudyTaskSchema).min(1) }),
    )
    .min(1),
});
export type StudyPlan = z.infer<typeof StudyPlanSchema>;

export const StudyPlanSectionSchema = z.object({ plans: z.array(StudyPlanSchema).length(3) });

/* ------------------------------------------------------------------ */
/* Section 14 — Cheat sheet + flashcards                               */
/* ------------------------------------------------------------------ */

export const CheatConceptSchema = z.object({
  id: z.string().min(1),
  title: BilingualSchema,
  memoryShortcut: BilingualSchema,
  takeaway: BilingualSchema,
  priority: PrioritySchema,
  topicId: z.string().optional(),
  relatedItemIds: z.array(z.string()),
});
export type CheatConcept = z.infer<typeof CheatConceptSchema>;

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().optional(),
  relatedItemId: z.string().optional(),
  front: BilingualSchema,
  back: z.object({
    answer: z.string().min(1),
    viExplanation: z.string().min(1),
    memoryShortcut: BilingualSchema,
  }),
  priority: PrioritySchema,
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const CheatsheetSectionSchema = z.object({
  concepts: z.array(CheatConceptSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(1),
});
export type CheatsheetSection = z.infer<typeof CheatsheetSectionSchema>;

/* ------------------------------------------------------------------ */
/* Section 15 — Mock interview config                                  */
/* ------------------------------------------------------------------ */

export const MockConfigSchema = z.object({
  intro: BilingualSchema,
  /** Ordered pool of item ids (questions, scenarios, behavioral) used by the mock interviewer. */
  questionPool: z.array(z.string()).min(1),
  rubric: z
    .array(
      z.object({
        criterion: z.enum(["technicalAccuracy", "seniorJudgment", "communication", "completeness"]),
        description: BilingualSchema,
      }),
    )
    .length(4),
});
export type MockConfig = z.infer<typeof MockConfigSchema>;

/* ------------------------------------------------------------------ */
/* Section 16 — Final assessment                                       */
/* ------------------------------------------------------------------ */

export const FinalAssessmentSchema = z.object({
  overallMatch: BilingualSchema,
  sellingPoints: z.array(BilingualSchema).min(1),
  knowledgeGaps: z.array(z.object({ gap: BilingualSchema, priority: PrioritySchema })).min(1),
  interviewPriorities: z.array(BilingualSchema).min(1),
  recommendation: z.object({
    decision: z.enum(["apply-now", "apply-after-prep", "clarify-first", "not-recommended"]),
    rationale: BilingualSchema,
  }),
  verificationNotes: z.array(BilingualSchema),
  unsupportedClaims: z.array(BilingualSchema),
});
export type FinalAssessment = z.infer<typeof FinalAssessmentSchema>;

/* ------------------------------------------------------------------ */
/* Section content map + package                                       */
/* ------------------------------------------------------------------ */

export const SectionContentSchemas = {
  jd: JdAnalysisSchema,
  company: CompanyResearchSchema,
  match: MatchSectionSchema,
  cv: TailoredCvSchema,
  intro: IntroSectionSchema,
  email: CommunicationSectionSchema,
  bilingual: QuestionBankSchema,
  systemDesign: SystemDesignSectionSchema,
  coding: CodingSectionSchema,
  star: BehavioralSectionSchema,
  hr: InterviewerQuestionsSchema,
  project: PracticeProjectSchema,
  studyPlan: StudyPlanSectionSchema,
  cheatsheet: CheatsheetSectionSchema,
  mock: MockConfigSchema,
  assessment: FinalAssessmentSchema,
} as const;

export type SectionContentMap = {
  [K in keyof typeof SectionContentSchemas]: z.infer<(typeof SectionContentSchemas)[K]>;
};

export const SECTION_STATUSES = ["pending", "generating", "ready", "failed", "stale"] as const;
export const SectionStatusSchema = z.enum(SECTION_STATUSES);
export type SectionStatus = z.infer<typeof SectionStatusSchema>;

export const SectionStateSchema = z.object({
  status: SectionStatusSchema,
  error: z.string().optional(),
  generatedAt: z.string().optional(),
  model: z.string().optional(),
  /** Hash of the inputs used to produce this section; unchanged hash => skip regeneration. */
  inputHash: z.string().optional(),
});
export type SectionState = z.infer<typeof SectionStateSchema>;

export const PackageMetaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  run: z.literal("RUN_10"),
  companyName: z.string().min(1),
  /** Uppercase bookmark token, e.g. "ISB". */
  companyCode: z.string().regex(/^[A-Z0-9_]+$/),
  jobTitle: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  isSample: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PackageMeta = z.infer<typeof PackageMetaSchema>;

const sectionShape = Object.fromEntries(SECTION_KEYS.map((k) => [k, SectionContentSchemas[k].optional()])) as {
  [K in keyof typeof SectionContentSchemas]: z.ZodOptional<(typeof SectionContentSchemas)[K]>;
};

const stateShape = Object.fromEntries(SECTION_KEYS.map((k) => [k, SectionStateSchema])) as {
  [K in keyof typeof SectionContentSchemas]: typeof SectionStateSchema;
};

/** The full, rendered interview package. Sections may be missing while generating or after failure. */
export const InterviewPackageSchema = z.object({
  meta: PackageMetaSchema,
  sections: z.object(sectionShape),
  sectionStates: z.object(stateShape),
});
export type InterviewPackage = z.infer<typeof InterviewPackageSchema>;

/** Lightweight listing entry for sidebars / dashboard. */
export interface PackageSummary {
  slug: string;
  companyName: string;
  companyCode: string;
  jobTitle: string;
  isSample: boolean;
  updatedAt: string;
  readySections: number;
  totalSections: number;
  questionCount: number;
}
