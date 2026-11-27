# Job Hunter — Original Product Brief (source requirements)

> This is the original brief from the product owner, kept verbatim as the source of truth.
> The refined, implementation-level spec is `docs/RUN_10_SPECIFICATION.md`.

## 1. Role

Act as a Senior Full-stack Software Engineer, Solution Architect, Technical Interviewer, and UI/UX Designer.

Build a production-quality, extensible web application called **Job Hunter** that generates personalized job application and interview preparation packages from job descriptions and candidate profiles.

The main workflow is called **Run #10**.

## 2. Project objectives

The application must allow me to:

- Input a job description URL, such as LinkedIn, ITviec, or a company career page.
- Manually paste a job description if URL extraction fails.
- Upload and manage my CV.
- Maintain my professional profile and work experience.
- Generate a complete Run #10 package.
- Study bilingual interview questions and answers.
- Navigate directly to important sections using bookmarks.
- Track interview preparation progress.
- Save and revisit packages for different companies.
- Export generated content.

The application should prioritize technical accuracy, maintainability, usability, and personalized interview preparation.

## 3. Technology stack

Frontend: Next.js App Router, React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide React, Zustand (client state), TanStack Query (server state), React Hook Form + Zod, Mermaid (diagrams), Recharts (data visualization).

Backend: Next.js Route Handlers, Prisma ORM, SQLite (local-first), PostgreSQL-compatible architecture, Vercel AI SDK.

Testing: Vitest, React Testing Library, Playwright.

Dev environment: pnpm, ESLint, Prettier, Docker where appropriate, GitHub Actions CI.

Avoid unnecessary architectural complexity. Build a modular monolith with clearly separated domain modules.

## 4. Candidate profile

Editable candidate profile, initial information:

- Senior Software Engineer
- 7+ years of software development experience
- Location: Ho Chi Minh City, Vietnam
- Target roles: Senior Frontend Engineer and Senior Full-stack JavaScript Engineer
- Preferred working arrangement: Hybrid

Technical skills

- Frontend: React, Next.js, Vue.js, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, TanStack Query, Redux, Zustand, GraphQL, Apollo Client.
- Backend: Node.js, NestJS, Express.js, Python, FastAPI, Go, REST APIs, Microservices, Prisma, TypeORM.
- Database: PostgreSQL, MongoDB, Redis.
- Architecture: Monorepo, Microfrontend, BFF, Microservices, Event-driven Architecture.
- DevOps: Docker, Kubernetes, GitHub Actions, AWS, GCP, Vite, Webpack, Turborepo.
- Testing: Jest, React Testing Library, Playwright, Cypress.

Professional experience

- **Persefoni** — Carbon accounting and climate management platform. React, TypeScript, GraphQL, TanStack Query. Background prefetching and caching. Monorepo architecture with Vite and Turborepo. WCAG accessibility, keyboard navigation, ARIA. Automated testing and enterprise frontend development.
- **Ninja Van — TechLab** — Logistics applications. Socket.IO real-time communication. Thermal printer integration. Shipping label generation with Labelary and ZPL. REST API integration. Microservices and Go experience.
- **NAB** — Enterprise banking environment. Adobe Experience Manager. AEM Assets / DAM. AEM Sites and Forms. Author and Publish workflows. Asset integration. Deployment and stakeholder support.

Do not include Elfie experience in professional introductions or interview answers unless explicitly enabled by the user.

**Never invent employment history, achievements, business metrics, technologies used in production, or project responsibilities. Distinguish actual experience from theoretical knowledge and recommended approaches.**

## 5. Run #10 package specification

Sections (bookmark format `BOOKMARK_[COMPANY]_[SECTION]`):

1. **Job Description Analysis** (`_JD`): job title, company, location, working arrangement, seniority, responsibilities, required skills, preferred skills, benefits, compensation (if verified), key expectations, technical architecture inferred from the JD, source URLs, verification status. Clearly distinguish verified facts from assumptions.
2. **Company Research** (`_COMPANY`): overview, business model, products/services, industry, engineering culture (where verifiable), company size (where verifiable), potential project information, application risks, questions requiring recruiter confirmation. Do not fabricate.
3. **Candidate Matching** (`_MATCH`): for every requirement — requirement, relevant candidate experience, match level, supporting evidence, knowledge gap, recommended improvement. Estimated match score with transparent weighted criteria. Categories: Strong, Relevant, Partial, Gap, Unverified. Label the score as an internal estimate, not an official employer/ATS evaluation.
4. **Tailored CV** (`_CV`): recommended title, ATS-friendly summary, relevant experience highlights, tailored achievement bullets, technical skills, ATS keywords, missing skills to study, copy-to-clipboard actions. Only claims supported by the profile/CV.
5. **Self-introduction** (`_INTRO`): 30/60/90-second versions, English + Vietnamese, memory shortcut, key points, copy English button. Natural spoken English for a senior SWE interview.
6. **Application Communication** (`_EMAIL`): application email, LinkedIn recruiter message, short cover letter, follow-up email. Concise, professional, humanized.
7. **Bilingual Technical Interview Preparation** (`_BILINGUAL`): ~40–60 questions grouped by topic (JS, TS, React, Next.js, Vue, HTML/CSS internals, browser internals, performance, state, data fetching, real-time, FE architecture, microfrontend, BFF, backend/microservices, security, database, testing, CI/CD, cloud, domain). Prioritize by actual JD. Each question: (1) EN question (2) VI question (3) recommended spoken EN answer (4) VI explanation (5) detailed technical explanation (6) practical example (7) Mermaid diagram where applicable (8) memory shortcut (9) key takeaway EN+VI (10) interviewer follow-up (11) follow-up answer EN (12) follow-up answer VI (13) difficulty (14) priority (15) relevant JD requirement (16) related candidate experience. Senior-level judgment: trade-offs, scalability, maintainability, failure scenarios, performance. Not overly academic; easy to speak and memorize.
8. **System Design** (`_SYSTEM_DESIGN`): 3–5 scenarios, each with functional + non-functional requirements, clarifying questions, high-level architecture, component responsibilities, data flow, API design, state management, scalability, performance, security, reliability, error recovery, monitoring, trade-offs, recommended EN answer, VI explanation, Mermaid architecture + sequence diagrams, memory shortcut, follow-ups + answers. For frontend-heavy roles focus on frontend system design.
9. **Coding and Algorithms** (`_CODING`): 5–10 exercises with EN+VI statements, example input, expected output, constraints, approach, complete TypeScript solution, step-by-step explanation, time + space complexity, edge cases, visual walkthrough, memory shortcut, interviewer follow-up, alternative solution when appropriate. Executable test cases where practical.
10. **Behavioral Interview** (`_STAR`): 6–10 questions, STAR with EN+VI per element, prioritize the candidate's actual experience. Cover technical challenges, performance optimization, ownership, stakeholder management, technical disagreements, time management, leadership, engineering quality, production incidents (only if supported). No invented numbers or incidents. Memory shortcut + follow-up for each.
11. **Questions for the Interviewer** (`_HR`): grouped by technical architecture, project responsibilities, engineering culture, team structure, career growth, compensation, working arrangements, interview process. EN + VI.
12. **Practical Preparation Project** (`_PROJECT`): small hands-on project for the largest gaps — objective, stack, architecture diagram, features, implementation checklist, testing requirements, performance requirements, learning outcomes.
13. **Study Plan** (`_STUDY_PLAN`): 1-day / 3-day / 7-day plans — priority-based tasks, estimated duration, related question IDs, interactive checkboxes, overall progress.
14. **Interview Cheat Sheet** (`_CHEATSHEET`): top 20–30 concepts, EN + VI memory shortcuts, key takeaways, rapid review mode, interactive flashcards, high-priority concepts.
15. **Mock Interview** (`_MOCK`): one question at a time; candidate submits an answer; recommended answer hidden until submission unless requested; evaluate technical accuracy, senior judgment, communication, completeness; score /10; improved EN sample answer; VI feedback; follow-up question; save history and results.
16. **Final Assessment** (`_ASSESSMENT`): overall match, strongest selling points, main gaps, interview priorities, application recommendation, verification notes, unsupported claims/assumptions.

## 6. UI/UX requirements

Clean, professional, inspired by developer documentation and learning platforms. Light + dark themes.

Layout — Desktop: left sidebar (company + package navigation), main content, right sidebar (TOC, section bookmarks, study progress). Mobile: collapsible navigation, responsive content, sticky search and language controls.

Question accordion (accessible). Collapsed: number, EN question, VI question, priority, difficulty, completion status. Expanded: EN answer, VI explanation, technical explanation, practical example, Mermaid diagram, memory shortcut, key takeaway, follow-up + bilingual answer, copy English answer, mark as studied, favorite. Plus: expand all, collapse all, search, filter by topic / difficulty / priority / study status.

Language switch: English / Vietnamese / Bilingual (default Bilingual), applied consistently. Preserve English technical terminology in Vietnamese where translating would hurt recognition.

Bookmarks: every major section has a visible, searchable marker `BOOKMARK_[COMPANY]_[SECTION]` (e.g. BOOKMARK_ISB_BILINGUAL, BOOKMARK_ISB_REACT, BOOKMARK_ISB_WEBSOCKET, BOOKMARK_ISB_SYSTEM_DESIGN, BOOKMARK_ISB_CODING, BOOKMARK_ISB_STAR, BOOKMARK_ISB_CHEATSHEET). Stable HTML anchor IDs, direct deep links, copy-link action, smooth scrolling, active section highlight (IntersectionObserver), preserve last reading position, Ctrl+F works for visible headings, application-level search across collapsed accordion content, automatically expand matching accordions when navigating to a search result.

Flashcards: front = question; back = EN answer, VI explanation, memory shortcut; previous/next; shuffle; mark known; mark for review; progress indicator; keyboard shortcuts.

Progress tracking: studied questions, favorites, completed topics, flashcards reviewed, mock interview scores, study plan completion, last opened section — persisted between browser sessions.

## 7. AI generation architecture

No single enormous request. Section-based generation with structured outputs and validated schemas.
Pipeline: JD input → extract & normalize JD → load candidate profile → identify requirements & gaps → interview topic plan → generate sections independently → validate → persist → render.
Requirements: provider abstraction; configurable models; OpenAI, Anthropic and compatible providers; API keys server-side only, never in browser bundles; structured generation progress; retry individual failed sections; regenerate a single answer; avoid regenerating unchanged sections; cancellation where available; track status and errors; handle rate limits and malformed outputs; validate outputs with Zod; sanitize generated Markdown and diagrams; treat external JDs as untrusted data, not instructions. If external research is unavailable, mark as unverified instead of fabricating.

## 8. Data model

CandidateProfile, WorkExperience, TechnicalSkill, Company, JobApplication, JobDescription, ResearchSource, InterviewPackage, PackageSection, InterviewTopic, InterviewQuestion, FollowUpQuestion, CodingExercise, SystemDesignScenario, BehavioralQuestion, Flashcard, StudyPlan, StudyProgress, MockInterviewSession, MockInterviewAnswer, GenerationJob, UserPreference. Stable identifiers, relationships, timestamps. Migrations + seed data.

## 9. Export

Complete package or selected sections → Markdown, JSON, standalone HTML, print-friendly PDF (browser print). Standalone HTML preserves accordion behavior, bilingual content, bookmarks, internal navigation, diagrams, code formatting. Exported Markdown includes all answers even if accordions are collapsed.

## 10. Initial sample package — ISB Vietnam

Company: ISB Vietnam. Position: Senior Front-End Developer. JD reference: https://www.linkedin.com/jobs/view/4492566584/

Initial interview focus (subject to verification against the actual JD): React and TypeScript; high-performance frontend architecture; real-time financial dashboards; WebSocket and Server-Sent Events; high-frequency data streaming; browser rendering; React rendering optimization; memory management; virtualized tables; financial charting; Zustand and TanStack Query; Python and Rust backend integration; trading concepts; automated testing.

61 interview questions: 1–7 real-time communication; 8–18 React and browser performance; 19–25 JavaScript and TypeScript; 26–30 state management and Next.js; 31–36 financial visualization and trading fundamentals; 37–44 frontend system design; 45–50 testing, Python and Linux; 51–55 coding exercises; 56–61 behavioral questions. Bilingual answers, diagrams, memory shortcuts, key takeaways, answered follow-ups. At least 24 bilingual flashcards. Must work without an AI API key.

## 11. Engineering standards

SOLID where appropriate; composition over abstraction; organize by domain/feature; strongly typed interfaces; business logic separate from UI; no duplicated components; loading/empty/success/error states; WCAG; keyboard-accessible accordions; semantic HTML; responsive; avoid unnecessary re-renders; lazy-render expensive diagrams and large sections; stable state when expanding/collapsing.

## 12. Testing

Unit/integration: JD input & normalization; generation schemas; bookmark generation; question search & filtering; accordion expansion; language switching; progress persistence; flashcard navigation; mock scoring validation; export; failed generation recovery.

Playwright E2E: (1) open ISB sample (2) navigate to a bookmarked section (3) expand a question (4) switch EN/VI (5) search for a hidden answer (6) matching question auto-expands (7) mark studied (8) reload and verify persisted progress (9) review flashcards (10) export the package.

## 13–14. Delivery

Run typecheck, lint, unit tests, E2E, production build; fix issues. Deliverables: source, README.md, AGENTS.md, docs/ARCHITECTURE.md, docs/RUN_10_SPECIFICATION.md, reusable AI prompt templates, DB schema + seed, ISB sample, tests, .env.example, local dev + deployment instructions.
