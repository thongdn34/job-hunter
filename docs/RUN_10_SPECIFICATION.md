# Run #10: Package Specification

This is the implementation-level specification of a **Run #10** interview-preparation package. It refines
the product brief ([`REQUIREMENTS.md`](REQUIREMENTS.md) §5) and describes what the code actually enforces.
The sources of truth are:

| Concern                                                                | File                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Section registry (order, numbers, codes, titles, dependencies)         | `src/domain/package/sections.ts`                                                     |
| Section content schemas                                                | `src/domain/package/schema.ts`                                                       |
| Shared primitives (`Bilingual`, `Fact`, `ExperienceRef`, `Diagram`, …) | `src/domain/common/schema.ts`                                                        |
| Bookmarks and anchors                                                  | `src/domain/package/bookmarks.ts`                                                    |
| Generation counts and intermediate schemas                             | `src/server/ai/schemas.ts`                                                           |
| Id normalization                                                       | `src/server/generation/normalize.ts`                                                 |
| Per-section prompt expectations                                        | `src/server/ai/prompts/sections.ts`, `questions.ts` (see [`PROMPTS.md`](PROMPTS.md)) |
| Match score                                                            | `src/domain/match/score.ts`                                                          |
| Mock scoring                                                           | `src/domain/mock/scoring.ts`                                                         |

## 1. Package envelope

```ts
InterviewPackage = {
  meta: PackageMeta;                 // id, slug, run: "RUN_10", companyName, companyCode, jobTitle, sourceUrl?, isSample, createdAt, updatedAt
  sections: { [key in SectionKey]?: SectionContent };   // missing while pending / after failure
  sectionStates: { [key in SectionKey]: SectionState }; // status, error?, generatedAt?, model?, inputHash?
}
```

- `slug` matches `^[a-z0-9-]+$`. It is built from `"<company> <job title>"` and made unique with `-2`, `-3`, …
  The ISB sample is `isb-vietnam-senior-frontend-developer`.
- `companyCode` matches `^[A-Z0-9_]+$` (see §3). If a different company already has the code, a suffix is
  added (`ACME_2`).
- **Section status:** `pending | generating | ready | failed | stale`. `stale` means a section this one
  depends on was regenerated after it, so the content is still shown but may be outdated.
- **Job-level section progress** (`GenerationJob.progress`) also uses `skipped` (the input hash was
  unchanged) and `cancelled`.

## 2. The 16 sections

The order below is the canonical render and export order (`SECTION_KEYS`).

| #   | Key            | Bookmark code   | Title (EN / VI)                                                 | Depends on                            | Schema                       |
| --- | -------------- | --------------- | --------------------------------------------------------------- | ------------------------------------- | ---------------------------- |
| 1   | `jd`           | `JD`            | Job Description Analysis / Phân tích mô tả công việc            | –                                     | `JdAnalysisSchema`           |
| 2   | `company`      | `COMPANY`       | Company Research / Nghiên cứu công ty                           | jd                                    | `CompanyResearchSchema`      |
| 3   | `match`        | `MATCH`         | Candidate Matching / Mức độ phù hợp                             | jd                                    | `MatchSectionSchema`         |
| 4   | `cv`           | `CV`            | Tailored CV / CV tùy chỉnh                                      | jd, match                             | `TailoredCvSchema`           |
| 5   | `intro`        | `INTRO`         | Self-introduction / Giới thiệu bản thân                         | jd, match                             | `IntroSectionSchema`         |
| 6   | `email`        | `EMAIL`         | Application Communication / Email & tin nhắn ứng tuyển          | jd, match                             | `CommunicationSectionSchema` |
| 7   | `bilingual`    | `BILINGUAL`     | Bilingual Technical Interview / Câu hỏi kỹ thuật song ngữ       | jd, match                             | `QuestionBankSchema`         |
| 8   | `systemDesign` | `SYSTEM_DESIGN` | System Design / Thiết kế hệ thống                               | jd, match                             | `SystemDesignSectionSchema`  |
| 9   | `coding`       | `CODING`        | Coding and Algorithms / Lập trình & thuật toán                  | jd                                    | `CodingSectionSchema`        |
| 10  | `star`         | `STAR`          | Behavioral Interview (STAR) / Phỏng vấn hành vi (STAR)          | jd, match                             | `BehavioralSectionSchema`    |
| 11  | `hr`           | `HR`            | Questions for the Interviewer / Câu hỏi dành cho nhà tuyển dụng | jd, company                           | `InterviewerQuestionsSchema` |
| 12  | `project`      | `PROJECT`       | Practical Preparation Project / Dự án luyện tập thực hành       | match                                 | `PracticeProjectSchema`      |
| 13  | `studyPlan`    | `STUDY_PLAN`    | Study Plan / Kế hoạch ôn tập                                    | bilingual, systemDesign, coding, star | `StudyPlanSectionSchema`     |
| 14  | `cheatsheet`   | `CHEATSHEET`    | Interview Cheat Sheet / Tóm tắt ôn nhanh                        | bilingual                             | `CheatsheetSectionSchema`    |
| 15  | `mock`         | `MOCK`          | Mock Interview / Phỏng vấn thử                                  | bilingual                             | `MockConfigSchema`           |
| 16  | `assessment`   | `ASSESSMENT`    | Final Assessment / Đánh giá tổng kết                            | match, bilingual                      | `FinalAssessmentSchema`      |

## 3. Bookmarks and anchors

All bookmarks and anchors are produced by `src/domain/package/bookmarks.ts`. Never build them by hand.

| Thing            | Format                                                                                                                    | Example (ISB)                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Company code     | `toCompanyCode(name)`: strip diacritics, `đ` → `D`, uppercase, runs of non `[A-Z0-9]` → `_`, trim `_`; fallback `COMPANY` | `ISB Vietnam` → `ISB_VIETNAM` (the sample's code is set to `ISB`) |
| Section bookmark | `BOOKMARK_<COMPANY>_<SECTION_CODE>` (`sectionBookmark`)                                                                   | `BOOKMARK_ISB_SYSTEM_DESIGN`                                      |
| Topic bookmark   | `BOOKMARK_<COMPANY>_<TOPIC_CODE>` (`topicBookmark`, under Section 7)                                                      | `BOOKMARK_ISB_WEBSOCKET`, `BOOKMARK_ISB_REACT`                    |
| Anchor id        | bookmark lower-cased, `_` → `-` (`bookmarkToAnchorId`)                                                                    | `bookmark-isb-system-design`                                      |
| Item anchor      | `item-<itemId>` lower-cased, non-alphanumerics → `-` (`itemAnchorId`)                                                     | `item-isb-q07`                                                    |

- Bookmark markers are rendered as plain visible text (`BookmarkMarker`), so Ctrl+F finds them. Each has a
  "copy link" action that copies `<page URL>#<anchorId>`.
- `sectionFromBookmark(companyCode, value)` accepts either form (`BOOKMARK_ISB_JD` or `bookmark-isb-jd`).
- Topic codes are UPPER_SNAKE_CASE (`^[A-Z0-9_]+$`) and unique within a package. A topic code should not
  repeat a section code, or the two anchors would collide.
- The ISB sample's topic bookmarks are `WEBSOCKET` (Q1–7), `REACT` (8–18), `JS_TS` (19–25), `STATE`
  (26–30), `TRADING` (31–36), `FE_ARCHITECTURE` (37–44) and `TESTING` (45–50).

## 4. Item id conventions

Study items are questions, system-design scenarios, coding exercises and behavioral questions. Their ids
are **unique within a package** and stable: progress, search, deep links, study-plan references,
flashcards and the mock-interview pool all use them. Ids are **assigned by the pipeline** (any ids the
model returns are overwritten), with `prefix = itemIdPrefix(companyCode)` (`ISB_VIETNAM` → `isb-vietnam`).

| Item                                  | Generated id                                                     | Notes                                     |
| ------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Interview question (§7)               | `<prefix>-q01`, `-q02`, …                                        | Numbered 1..N across topics in plan order |
| Question follow-up                    | `<questionId>-f1`, `-f2`, …                                      |                                           |
| Topic                                 | model-chosen kebab-case (`^[a-z0-9-]+$`, deduplicated with `-2`) | e.g. `react-performance`                  |
| System-design scenario (§8)           | `<prefix>-sd1`, `-sd2`, …                                        | follow-ups `<id>-f<n>`                    |
| Coding exercise (§9)                  | `<prefix>-c01`, …                                                | follow-up `<id>-f1`                       |
| Behavioral question (§10)             | `<prefix>-b01`, …                                                | follow-up `<id>-f1`                       |
| Match requirement (§3)                | `req-01`, …                                                      |                                           |
| Interviewer question (§11)            | `hr-<group>-<n>`                                                 |                                           |
| Practice-project feature / task (§12) | `feature-<n>` / `task-<n>`                                       | Checklist progress uses the task ids      |
| Study task (§13)                      | `<planId>-d<day>-t<n>`                                           | e.g. `3d-d2-t1`                           |
| Cheat-sheet concept / flashcard (§14) | `concept-01` / `fc-01`                                           |                                           |

**Reference hygiene.** References to other items (`relatedQuestionIds`, `relatedItemIds`,
`relatedItemId`, `topicId`, `questionPool`) are filtered against the ids that actually exist in the
dependency sections, so references the model made up are dropped. If the mock `questionPool` ends up empty,
it falls back to the first 30 known item ids.

**ISB sample.** The curated sample follows the brief's numbering 1–61 across sections: questions
`isb-q01`…`isb-q50`, coding exercises `isb-q51`…`isb-q55`, behavioral questions `isb-q56`…`isb-q61`,
system-design scenarios `isb-sd1`…`isb-sd4`.

## 5. Schemas per section (summary)

`Bilingual` = `{ en, vi }` (both non-empty). `Fact` = `{ text: Bilingual, status, sourceUrl?, note? }`.
`Diagram` = `{ kind: flowchart|sequence|state|class|architecture|other, code (Mermaid), caption? }`.
`FollowUp` = `{ id, question: Bilingual, answer: Bilingual }`. `ExperienceRef` = `{ company?, kind, note:
Bilingual }`. Difficulty is `easy|medium|hard|expert` and priority is `critical|high|medium|low`. "Markdown"
fields are rendered through `renderMarkdown` (sanitize-html allowlist).

1. **JD analysis**: `jobTitle`, `company`, `location`, `workingArrangement`, `seniority` (Facts);
   `responsibilities` (≥1), `requiredSkills` (≥1), `preferredSkills`, `benefits`, `keyExpectations`
   (Fact[]); `compensation?` (Fact, only when stated); `inferredArchitecture { summary, components: Fact[],
diagram? }`; `sourceUrls: url[]`; `verification { overallStatus, notes: Bilingual[], checkedAt? }`.
2. **Company research**: `overview`, `businessModel`, `industry`, `companySize` (Facts);
   `productsAndServices`, `engineeringCulture`, `potentialProjects`, `applicationRisks` (Fact[]);
   `recruiterQuestions: Bilingual[]`; `sources: { title, url, accessedAt? }[]`.
3. **Candidate matching**: `requirements[]` (≥1) of `{ id, requirement, category:
required|preferred|domain|soft-skill, weight 1–5, candidateExperience, matchLevel:
strong|relevant|partial|gap|unverified, evidence: ExperienceRef[], knowledgeGap?,
recommendedImprovement? }`, plus `scoringNotes` and `summary`. The **score is computed by the app, never
   written by the model** (§7).
4. **Tailored CV**: `professionalTitle`; `summary`; `experienceHighlights[] { company, role, period?,
bullets: Bilingual[] ≥1 }`; `achievementBullets`; `technicalSkills[] { category, skills[] }`;
   `atsKeywords[]`; `missingSkillsToStudy[] { skill, reason, priority }`; `claimNotes` (what to verify or
   not claim).
5. **Self-introduction**: `variants` (**exactly 3**: `durationSeconds` 30, 60, 90) with `{ script:
Bilingual, memoryShortcut, keyPoints ≥1 }`; `deliveryTips`.
6. **Application communication**: `applicationEmail`, `linkedinMessage`, `coverLetter`, `followUpEmail`,
   each `{ subject?, body: Bilingual, notes? }`.
7. **Bilingual technical questions**: `topics[] { id, code, title, description?, priority, range? }` and
   `questions[] { id, number, topicId, question: Bilingual, answer (spoken EN), viExplanation,
technicalExplanation (Markdown), practicalExample { description, code? }, diagram?, memoryShortcut,
keyTakeaway, followUps ≥1, difficulty, priority, jdRequirement, candidateExperience?: ExperienceRef,
tags[] }`.
8. **System design**: `scenarios[] { id, number, title, prompt, functionalRequirements ≥1,
nonFunctionalRequirements ≥1, clarifyingQuestions ≥1, highLevelArchitecture, componentResponsibilities
≥1, dataFlow, apiDesign, stateManagement, scalability, performance, security, reliability,
errorRecovery, monitoring, tradeOffs[] { decision, pros, cons } ≥1, recommendedAnswer, viExplanation,
architectureDiagram, sequenceDiagram, memoryShortcut, followUps ≥1, difficulty, priority,
relatedQuestionIds[] }`.
9. **Coding**: `exercises[] { id, number, title, statement, examples[] { input, output, explanation? } ≥1,
constraints[], approach, functionName, solution: CodeBlock, steps ≥1, timeComplexity, spaceComplexity,
edgeCases ≥1, walkthrough { steps ≥1, diagram? }, memoryShortcut, followUp, alternative? { description,
code?, complexity }, testCases[] { name, args: unknown[], expected } ≥1, difficulty, priority,
jdRequirement }`.
10. **Behavioral (STAR)**: `questions[] { id, number, question, competency, star { situation, task,
action, result } (each Bilingual), source: ExperienceRef, memoryShortcut, followUp, cautions[],
difficulty, priority }`.
11. **Questions for the interviewer**: `groups[] { category, title, questions[] { id, text, why? } ≥1 }`.
    Categories: `technical-architecture`, `project-responsibilities`, `engineering-culture`,
    `team-structure`, `career-growth`, `compensation`, `working-arrangements`, `interview-process`.
12. **Practice project**: `name`, `objective`, `targetGaps ≥1`, `techStack[] { name, reason } ≥1`,
    `architectureDiagram`, `features[] { id, title, priority } ≥1`, `implementationChecklist[] { id, text }
≥1`, `testingRequirements`, `performanceRequirements`, `learningOutcomes` (each ≥1).
13. **Study plan**: `plans` (**exactly 3**, ids `1d`, `3d`, `7d`) of `{ id, title, days[] { day, focus,
tasks[] { id, title, durationMinutes, priority, relatedItemIds[] } ≥1 } ≥1 }`.
14. **Cheat sheet**: `concepts[] { id, title, memoryShortcut, takeaway, priority, topicId?,
relatedItemIds[] }` and `flashcards[] { id, topicId?, relatedItemId?, front: Bilingual, back { answer,
viExplanation, memoryShortcut }, priority }`.
15. **Mock interview config**: `intro`, `questionPool: itemId[] ≥1`, `rubric` (**exactly 4**:
    `technicalAccuracy`, `seniorJudgment`, `communication`, `completeness`, each with a bilingual
    description).
16. **Final assessment**: `overallMatch`, `sellingPoints ≥1`, `knowledgeGaps[] { gap, priority } ≥1`,
    `interviewPriorities ≥1`, `recommendation { decision: apply-now|apply-after-prep|clarify-first|not-recommended,
rationale }`, `verificationNotes`, `unsupportedClaims`.

Mock-interview **results** are not part of the package. They are stored as `MockInterviewSession` and
`MockInterviewAnswer` rows. An evaluation has scores 0–10 for the four criteria, an `overall` (weighted
0.35 / 0.25 / 0.20 / 0.20, minus 2 if the reference answer was revealed before submitting), strengths,
gaps, an improved English answer, Vietnamese feedback, a bilingual follow-up question, and `evaluator: ai |
heuristic`.

## 6. Quality rules

### No fabrication

- Generated content may only use the **candidate profile** (and the fenced CV text) as evidence about the
  candidate. Empty profile fields stay unknown. No invented employers, achievements, metrics, team sizes,
  production technologies or responsibilities.
- The generator has **no web access**. Anything about the company that is not in the JD is `unverified` or
  `assumption` and is phrased as something to confirm with the recruiter. URLs must not be invented
  (`sourceUrls` and `sources` contain at most the JD source URL).
- Compensation appears only when the JD states it.
- STAR answers without a matching real story use `source.kind = "theoretical"` and are written as a
  template the candidate fills in. `cautions` lists what must not be claimed.
- The tailored CV keeps role and period exactly as in the profile, and `claimNotes` flags anything the
  candidate must verify.
- "Familiar" skills are presented as learning or side-project knowledge, not production experience.

These rules appear in the system prompt and in each section's expectations (see `PROMPTS.md`) and are
checked by prompt tests. The ISB sample follows the same rules.

### Verification statuses (`Fact.status`)

| Status       | Meaning                                                               |
| ------------ | --------------------------------------------------------------------- |
| `verified`   | Stated in the JD or in a cited source                                 |
| `unverified` | Claimed somewhere but not confirmable by the generator                |
| `assumption` | Inferred by the generator, so it must be confirmed with the recruiter |

`JdAnalysis.verification.overallStatus` summarizes the section. The UI renders Facts with a
`VerificationBadge`.

### Experience references (`ExperienceRef.kind`)

| Kind                   | Use                                             |
| ---------------------- | ----------------------------------------------- |
| `actual`               | Supported by the profile (name the company)     |
| `theoretical`          | Knowledge without production evidence           |
| `recommended-approach` | How the candidate should approach something new |

### Elfie (and any excluded experience)

- Exclusion is set **per work experience** with the "Include in generated content" switch
  (`includeInGeneration`, Profile page). The default profile does not contain Elfie. If you add an Elfie
  experience, turn the switch off; `/settings` explains this. Nothing is excluded automatically by company
  name.
- `profileForGeneration` drops excluded experiences, and also drops any CV-text line that mentions an
  excluded company, so the experience cannot leak back in through the uploaded CV.
- The prompt lists the excluded companies explicitly ("never mention, reference or draw examples from"),
  and the system prompt repeats the rule.
- The generation profile is part of every section's input hash, so toggling an exclusion makes the
  sections eligible for regeneration.

### Match score (`domain/match/score.ts`)

```text
score = round( Σ(weight × points[matchLevel]) / Σ(weight) × 100 )
points: strong 1.0 · relevant 0.75 · partial 0.4 · unverified 0.2 · gap 0
```

Weights are clamped to 1–5. There are per-category subscores, and display bands are strong ≥ 80, good ≥ 65,
moderate ≥ 45, otherwise low. Every rendered score carries the label **"Internal estimate — not an official
employer or ATS evaluation"**.

### Language

English is natural, spoken and senior-level, short enough to say aloud and memorize. Vietnamese is natural
and keeps English technical terms (React, hydration, memoization, WebSocket, trade-off, …). The UI language
switch (EN / VI / Bilingual) applies to every section, and Vietnamese text is tagged `lang="vi"`.

### Diagrams and Markdown

Mermaid only: `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`. No `%%{init}%%`, no
`click`/`callback`/`href`, no HTML labels. Markdown fields are GitHub-flavoured and contain no raw HTML.
Both are sanitized before storage and again at render time.

## 7. Generation ordering and counts

**Pipeline:** JD input → extract and normalize (`NormalizedJd`) → load profile → generate sections in
dependency order (match = requirements and gaps; bilingual = topic plan, then per-topic batches) →
normalize ids → sanitize → validate with Zod (one repair attempt) → persist → render.

Sections are scheduled in canonical order as soon as their requested dependencies are `ready` or
`skipped`, with at most 3 sections and 3 model calls in flight. In a full run, that means `jd` first, then
`company`, `match` and `coding`, then the sections that need `match`, and finally `studyPlan`, `cheatsheet`,
`mock` and `assessment` once the question bank and the other list sections exist.

**Counts.** These are enforced as JSON Schema `minItems`/`maxItems` in the generation schemas, or stated in
the prompt expectations where marked "prompt".

| Item                              | Count                                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| Topics (§7)                       | 4–10                                                             |
| Questions per topic               | 3–12 (a batch may return count ± 1; extra questions are trimmed) |
| Questions total (§7)              | 40–60 (the topic plan is rescaled to fit)                        |
| Follow-ups per question           | 1–3                                                              |
| System-design scenarios (§8)      | 3–5                                                              |
| Coding exercises (§9)             | 5–10, each with 2–5 test cases (prompt)                          |
| Behavioral questions (§10)        | 6–10                                                             |
| Self-introductions (§5)           | exactly 3 (30 / 60 / 90 s, about 75 / 150 / 225 words, prompt)   |
| Match requirements (§3)           | typically 8–16 (prompt)                                          |
| Interviewer-question groups (§11) | all 8 categories, 2–5 questions each (prompt)                    |
| Practice-project features (§12)   | 4–8 (prompt)                                                     |
| Study plans (§13)                 | exactly 3 (`1d`, `3d`, `7d`)                                     |
| Cheat-sheet concepts (§14)        | 20–30                                                            |
| Flashcards (§14)                  | 24–40                                                            |
| Mock question pool (§15)          | 20–40 ids (prompt)                                               |
| Mock rubric (§15)                 | exactly 4 criteria                                               |

The stored domain schemas are more lenient (mostly `min(1)`), so curated content such as the ISB sample is
not bound by the generation maximums. The sample has 50 technical questions in 7 topics, 4 system-design
scenarios, 5 coding exercises, 6 behavioral questions, 19 match requirements, 28 concepts, 35 flashcards and
3 study plans.
