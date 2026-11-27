# Job Hunter

Job Hunter turns a job description and your candidate profile into a **Run #10** interview-preparation
package: 16 bilingual (English / Vietnamese) sections covering JD analysis, company research, candidate
matching, a tailored CV, self-introductions, application messages, a technical question bank, system design,
coding, STAR stories, questions for the interviewer, a practice project, study plans, a cheat sheet with
flashcards, a mock interview and a final assessment.

It is a local-first, single-user web app: Next.js 16 (App Router) + React 19, Prisma 7 on SQLite, and the
Vercel AI SDK v7 for section-by-section structured generation. The same code also deploys to
**Cloudflare Workers** (D1 database, Workflows for background generation, Access for sign-in, optional AI
Gateway) for about $5/month of infrastructure — see [Deploying to Cloudflare](#deploying-to-cloudflare). A complete curated sample package
(**ISB Vietnam: Senior Front-End Developer**) ships with the app and works **without any AI API key**.

- Product brief: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- Package specification: [`docs/RUN_10_SPECIFICATION.md`](docs/RUN_10_SPECIFICATION.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Prompt templates: [`docs/PROMPTS.md`](docs/PROMPTS.md)
- Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Conventions for contributors and coding agents: [`AGENTS.md`](AGENTS.md)

## Features

**Packages and generation**

- New-package wizard (`/packages/new`) with three steps: job description, profile review, generate. You can
  enter a job URL and use **Fetch & preview**, or paste the description text (80 to 60,000 characters).
- URL extraction for LinkedIn job links (`/jobs/view/<id>`, read through LinkedIn's public guest endpoint),
  pages with `JobPosting` JSON-LD (ITviec and many career sites) and generic career pages. If a page needs
  a login, is rendered by JavaScript or cannot be read, the wizard switches to paste mode and shows the reason.
- Server-side SSRF protection for URL fetching: public http(s) hosts only, DNS checked again when the socket
  connects, every redirect re-checked, 10 s timeout, 2 MB limit. Extraction is rate-limited to 10 requests per
  minute per client.
- Sections are generated in dependency order (up to 3 model calls at a time). Each one is validated with Zod
  and saved as soon as it is ready. A progress banner polls the job and shows sections as they arrive.
- **Cancel** a running job. Sections that already finished are kept.
- **Retry** a failed or cancelled section, or **Regenerate** a stale one. If the section needs an earlier
  section that has no content, that section is generated in the same job.
- **Regenerate one answer**: any Section 7 question can be regenerated on its own. It keeps its id, number
  and topic.
- Unchanged sections are skipped. Each section stores a hash of its inputs, and when that hash has not
  changed the section is not generated again.
- Providers: OpenAI, Anthropic, any OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter, vLLM), and an
  offline deterministic `mock` provider for tests and demos. API keys stay on the server.
  `/settings` shows which provider is active but never shows the keys.

**Studying**

- Package page with a sticky toolbar, a table of contents on the right with the active section highlighted
  (IntersectionObserver), study progress, and a left sidebar listing your packages. Light and dark themes.
- Language switch: **English / Vietnamese / Bilingual** (default Bilingual). Your choice is saved in the
  browser.
- Bookmarks: every section shows a visible `BOOKMARK_<COMPANY>_<SECTION>` marker (findable with Ctrl+F) with a
  copy-link button. Each section and each question topic (e.g. `BOOKMARK_ISB_WEBSOCKET`) has a stable anchor.
  Deep links work (`#bookmark-isb-coding`, `#item-isb-q07`), and the page remembers where you were reading.
- Global search (`/` or Ctrl/Cmd+K) across all question, scenario, exercise and STAR content, including text
  inside collapsed accordions. Picking a result expands the matching item and scrolls to it.
- Accessible accordions (`aria-expanded`/`aria-controls`, Arrow/Home/End keys). An item body is rendered only
  while it is open, and Mermaid diagrams load lazily. Section 7 can be filtered by topic, difficulty, priority
  and study status, and has expand all / collapse all.
- Per item: mark as studied, favorite, copy the English answer. Intros and the tailored CV also have copy
  buttons.
- Candidate-match score from a transparent weighted formula (`src/domain/match/score.ts`), always labelled
  as an internal estimate.
- 1-day, 3-day and 7-day study plans with checkboxes, cheat-sheet concepts with a rapid-review mode, and a
  flashcard deck (`/packages/<slug>/flashcards`) with shuffle, known/review marks and keyboard shortcuts
  (← → Space/Enter S K R).
- Mock interview (`/packages/<slug>/mock`): one question at a time, with the recommended answer hidden until you
  submit (revealing it early costs 2 points). Answers are scored /10 on four criteria and you get an improved
  English answer, Vietnamese feedback and a follow-up question. Sessions are saved with their score history.
  An AI evaluator is used when a provider is configured. Otherwise, or if the AI call fails, a deterministic
  heuristic scores the answer.
- Progress (studied, favorites, completed topics, flashcards, study-plan tasks, practice-project checklist,
  last reading position) is saved in `localStorage` and synced to the database.

**Profile and export**

- Editable candidate profile (`/profile`): skills with proficiency, ordered work experiences, and an
  **Include in generated content** switch on each experience (use it to keep Elfie out). You can upload a CV
  as PDF, TXT or Markdown (up to 5 MB). Its text is extracted on the server and used as extra evidence.
- Export the whole package or chosen sections as **Markdown**, **JSON** or **standalone HTML**, or open a
  **print view** and save it as PDF from the browser. Exports include content that is collapsed in the app.
  The HTML export keeps accordions (`<details>`), the language switch, bookmarks, the TOC and diagrams.

## Quick start

Requirements: Node.js 24 (the version CI and the Docker image use) and pnpm 10 (`corepack enable`).

```bash
pnpm install            # also runs `prisma generate`
cp .env.example .env    # SQLite path + (optional) AI provider settings
pnpm db:setup           # prisma migrate deploy + idempotent seed (profile, preferences, ISB sample)
pnpm dev                # http://localhost:3000
```

Open the dashboard and click **Open the ISB Vietnam sample**, or go to
`/packages/isb-vietnam-senior-frontend-developer`. The sample is curated content stored in
`src/content/samples/isb`. It needs no AI key. If the database has not been seeded yet, or cannot be
reached, the app serves the sample straight from code. The sample is read-only, so it cannot be regenerated
or deleted.

## Deploying to Cloudflare

```bash
cp .dev.vars.example .dev.vars && pnpm cf:d1:migrate:local
pnpm cf:preview          # build with OpenNext, run in workerd on http://localhost:8787
pnpm cf:smoke            # D1, Workflow generation, guards, exports, CV parsing
```

Production: create the D1 database, put the AI keys in Wrangler secrets, protect the hostname with
Cloudflare Access, then `pnpm cf:deploy`. Steps, cost breakdown and behaviour differences (D1 has no
interactive transactions, cancellation happens between model calls) are in
[`docs/DEPLOYMENT.md` §3](docs/DEPLOYMENT.md#3-cloudflare-workers-d1--workflows).

## Generating a new Run #10 package

1. **Configure a provider** in `.env` (server-side only, never prefix with `NEXT_PUBLIC_`):

   | Provider          | Settings                                                                                  |
   | ----------------- | ----------------------------------------------------------------------------------------- |
   | OpenAI            | `AI_PROVIDER=openai`, `OPENAI_API_KEY=...` (default model `gpt-5-mini`)                   |
   | Anthropic         | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...` (default model `claude-sonnet-5-5`)      |
   | OpenAI-compatible | `AI_PROVIDER=openai-compatible`, `OPENAI_COMPATIBLE_BASE_URL=...`, optional `..._API_KEY` |
   | Offline mock      | `AI_PROVIDER=mock` (deterministic `[MOCK]` content, no network; for tests and demos)      |

   `AI_MODEL` overrides the default model. If `AI_PROVIDER` is empty, the provider is picked from whichever
   key is set, checking OpenAI, then Anthropic, then OpenAI-compatible. The mock provider is never picked
   automatically. Restart the server after editing `.env`, then check `/settings`.

2. **Review your profile** at `/profile`. Generated content only uses what the profile and uploaded CV
   support.

3. **Open `/packages/new`** and fill in the company name and (optionally) the job title, then either:
   - **Job URL**: paste the link. **Fetch & preview** shows what was extracted, and you can switch to
     "edit as text". If extraction fails when you create the package, the API returns `EXTRACTION_FAILED`
     and the wizard switches to paste mode.
   - **Paste**: paste the job description text. Pasted text wins, and the URL (if any) is kept only as the
     source reference.

4. **Generate.** You are taken to the package page right away. Sections appear as they finish. From there
   you can:
   - **Cancel** in the progress banner. In-flight model calls are aborted and finished sections are kept.
   - **Retry section** on a failed or cancelled section, or **Regenerate** on a stale one (a section becomes
     stale when a section it depends on changed). The API also takes `{"force": true}` to regenerate a ready
     section whose inputs did not change.
   - Click **Regenerate** on a single Section 7 question to rewrite that one answer.

Only one generation job can run per package at a time (the API returns 409 `JOB_RUNNING` for a second one).
If the server restarts during a job, that job is marked `failed` ("The generation was interrupted") the next
time it is read, and you can retry its sections.

### Failure injection with the mock provider

With `AI_PROVIDER=mock` these variables simulate provider problems (comma-separated section keys, or
`topic-plan`):

| Variable                        | Effect                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `MOCK_FAIL_SECTIONS`            | Always returns malformed output, so the repair attempt also fails and the section is `failed` |
| `MOCK_MALFORMED_ONCE_SECTIONS`  | The first attempt is malformed and the repair attempt succeeds                                |
| `MOCK_RATE_LIMIT_ONCE_SECTIONS` | The first call throws HTTP 429, which exercises backoff                                       |
| `MOCK_DELAY_MS`                 | Adds this much latency to each model call (useful for demoing progress and cancel)            |

## Scripts

| Script                         | What it does                                              |
| ------------------------------ | --------------------------------------------------------- |
| `pnpm dev`                     | Next.js dev server                                        |
| `pnpm build` / `pnpm start`    | Production build / serve the build                        |
| `pnpm typecheck`               | `tsc --noEmit`                                            |
| `pnpm lint`                    | ESLint (`eslint-config-next`)                             |
| `pnpm format` / `format:check` | Prettier write / check                                    |
| `pnpm test` / `test:watch`     | Vitest unit and integration tests                         |
| `pnpm test:e2e`                | Playwright (Chromium)                                     |
| `pnpm db:generate`             | `prisma generate` (client goes to `src/generated/prisma`) |
| `pnpm db:migrate`              | `prisma migrate dev` (create a new migration)             |
| `pnpm db:deploy`               | `prisma migrate deploy`                                   |
| `pnpm db:seed`                 | Idempotent seed (`prisma/seed.ts`)                        |
| `pnpm db:setup`                | `db:deploy` + `db:seed`                                   |
| `pnpm db:reset`                | Drop, re-migrate and re-seed the database                 |
| `pnpm verify`                  | typecheck + lint + unit tests + production build          |
| `pnpm cf:preview`              | Cloudflare build (OpenNext) + `wrangler dev` on :8787     |
| `pnpm cf:smoke`                | Smoke test against the Cloudflare preview                 |
| `pnpm cf:deploy`               | Check D1 migrations, build, deploy to Cloudflare Workers  |
| `pnpm cf:migrations`           | Mirror `prisma/migrations` to `migrations/` (D1 format)   |
| `pnpm cf:d1:migrate:local`     | Apply D1 migrations locally (`:remote` for production)    |
| `pnpm cf:typegen`              | Regenerate `cloudflare/worker-configuration.d.ts`         |

## Testing

- **Unit and integration (Vitest, jsdom, React Testing Library):** `pnpm test`. Tests sit next to the code
  as `*.test.ts(x)`, plus `tests/unit/**`. They cover JD normalization and URL guarding, generation schemas,
  the pipeline (with fake and mock providers), prompt fencing, bookmarks, search and filters, the accordion,
  language switching, progress persistence and sync, flashcards, mock scoring, export builders and route
  handlers. `tests/unit/db` runs the package and progress repositories against a throwaway SQLite database
  built from `prisma/migrations` (set `SKIP_DB_TESTS=1` to skip it). The ISB sample's coding solutions are
  type-checked and run against their test cases.
- **End-to-end (Playwright):** specs live in `tests/e2e`:
  - `isb-sample.spec.ts`: open the sample, bookmark navigation and deep links, expand a question, switch
    EN/VI, search for a hidden answer (the match auto-expands), mark as studied and check it after a reload
    and in a fresh browser context.
  - `flashcards.spec.ts`, `export.spec.ts` (Markdown, JSON, HTML and the print view), `mock-interview.spec.ts`.
  - `new-package-wizard.spec.ts`: a pasted JD generates all 16 sections with the mock provider.
  - `mobile.spec.ts`: the navigation sheet and the language switch on a small screen.

  The config starts the app with `pnpm start` on port 3100 (`E2E_PORT`) and `AI_PROVIDER=mock`, so build and
  seed first:

  ```bash
  pnpm db:setup && pnpm build && pnpm exec playwright install chromium && pnpm test:e2e
  ```

CI (`.github/workflows/ci.yml`) runs install, `db:setup`, typecheck, lint, `format:check`, unit tests,
build and E2E on every push to `main` and on every pull request.

## Project structure

```text
.
├── prisma/
│   ├── schema.prisma          # 22 models; rich content in Zod-validated Json columns
│   ├── migrations/            # SQLite migrations (prisma migrate) — source of truth
│   └── seed.ts                # idempotent seed: default profile, preferences, ISB sample
├── prisma.config.ts           # Prisma 7 config (datasource URL, seed command)
├── migrations/                # D1 copies of prisma/migrations (pnpm cf:migrations; do not edit)
├── cloudflare/                # Worker entry (Access check, GenerationWorkflow) + generated types
├── wrangler.jsonc             # Cloudflare bindings: D1, Workflows, rate limiter, vars
├── open-next.config.ts        # OpenNext (Cloudflare adapter) config
├── scripts/                   # D1 migration sync, Prisma-for-workerd prep, Cloudflare smoke test
├── src/
│   ├── app/
│   │   ├── (app)/             # routes rendered inside the AppShell
│   │   │   ├── page.tsx                         # dashboard
│   │   │   ├── packages/new/                    # new-package wizard
│   │   │   ├── packages/[slug]/                 # package page (+ flashcards/, mock/)
│   │   │   ├── profile/  settings/
│   │   ├── print/[slug]/      # print view (browser "Save as PDF")
│   │   └── api/               # route handlers: packages, generation-jobs, jd/extract,
│   │                          #   progress, mock/sessions, profile (+ cv), ai/status
│   ├── domain/                # pure TS + Zod: package schema, sections, bookmarks, items,
│   │                          #   search/filters, match score, mock scoring, export builders, jd, profile
│   ├── server/                # server-only: db.ts, repositories/, generation/, ai/ (provider,
│   │                          #   prompts/, mock/), jd/ (SSRF-safe extraction), cv/, mock/ (evaluators)
│   ├── features/              # feature UI: app-shell, package-view, sections, questions, study,
│   │                          #   flashcards, mock-interview, generation, export, profile
│   ├── components/ui/         # shadcn/ui on Base UI (@base-ui/react)
│   ├── components/common/     # BilingualText, Markdown, MermaidDiagram, CopyButton, CodeBlock, ...
│   ├── stores/                # Zustand: preferences, progress (persisted), expansion
│   ├── content/               # default candidate profile + curated ISB sample package
│   ├── lib/                   # renderMarkdown (sanitize-html), sanitizeMermaid, utils
│   ├── hooks/                 # use-hydrated
│   └── generated/prisma/      # generated Prisma client (do not edit)
├── tests/
│   ├── setup/                 # Vitest setup (jest-dom, browser API shims)
│   ├── unit/                  # extra unit / DB integration tests
│   └── e2e/                   # Playwright specs
├── docs/                      # REQUIREMENTS, RUN_10_SPECIFICATION, ARCHITECTURE, PROMPTS, DEPLOYMENT
├── Dockerfile, docker-compose.yml
└── .github/workflows/ci.yml
```

## Known limitations

- **Single user, no built-in login.** On Node.js every API route is open: do not expose the app without
  authentication in front of it. The Cloudflare build requires Cloudflare Access (see `docs/DEPLOYMENT.md`).
- **In-process generation jobs on Node.js.** A restart interrupts them (they are marked failed and can be
  retried). On Cloudflare they run in durable Workflows instead.
- **Cloudflare D1 has no interactive transactions.** Multi-row saves run statement by statement there;
  they are ordered and retryable, but a crash mid-save can leave derived rows stale until the next save.
- **No web research.** Company research uses only the job description. Anything else is labelled
  `unverified` or `assumption` and turned into questions for the recruiter.
- **URL extraction is best-effort.** Pages rendered by JavaScript, login walls and bot checks fail, and you
  have to paste the text. LinkedIn only works for public `/jobs/view/<id>` postings. LinkedIn blocks datacenter
  IPs, so on Cloudflare a blocked page is retried through [Jina Reader](https://jina.ai/reader/)
  (`JD_READER_FALLBACK=jina`, set in `wrangler.jsonc`). That sends the job URL to Jina, the result is flagged in the
  JD warnings, and the keyless limit is 20 requests/minute. Remove the variable to disable it; it is off by
  default under Node.js.
- **CV upload** accepts PDF, TXT and Markdown only (no Word files). At most 12,000 characters of CV text are
  sent to the model.
- **Coding exercises in generated packages are not executed.** Only the ISB sample's solutions are checked
  by tests. Generated test cases are displayed but not run.
- **Single-answer regeneration** is available for Section 7 questions only. Scenarios, exercises and STAR
  answers are regenerated per section.
- The **standalone HTML export** loads Mermaid from jsDelivr. When offline, diagrams show as their source
  text.
- Under Node.js the URL-extraction rate limiter and its 10-minute result cache live in memory in a single
  process (on Cloudflare the limiter is a shared binding; the cache is per isolate).
- There is no UI to delete a package (the API supports `DELETE /api/packages/<slug>`).
- Language and theme preferences live in the browser. The `UserPreference` table is seeded but not read by
  the UI yet, and Elfie is excluded with the per-experience switch rather than `UserPreference.includeElfie`.
