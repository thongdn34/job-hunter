# Deployment

Job Hunter has two supported production shapes:

- **Node.js + SQLite file** — one container or one VM (§1, §2). Local-first default.
- **Cloudflare Workers + D1 + Workflows** — managed, scales to zero, lowest running cost for a personal
  deployment (§3).

This document also covers switching to PostgreSQL, the environment variables, the serverless caveat, and CI.

> **No built-in login.** The app is single-user. On Cloudflare the Worker itself requires a valid
> Cloudflare Access token on every request (§3.4) and refuses to serve anything until Access is configured.
> On Node.js, bind the app to localhost or put it behind an authenticating reverse proxy (Caddy/nginx with
> basic auth, oauth2-proxy, Cloudflare Access + Tunnel, Tailscale, …) before exposing it to a network.
> `src/proxy.ts` only serves the `localhost` / `127.0.0.1` / `[::1]` Host names and refuses cross-origin
> state-changing requests: set `ALLOWED_HOSTS` to the public host name when the app is reached under another
> name.

## 1. Docker

`Dockerfile` (multi-stage, `node:24-bookworm-slim`):

| Stage    | What happens                                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`   | `corepack enable`, `NEXT_TELEMETRY_DISABLED=1`                                                                                                                                                                                                                |
| `deps`   | Installs `python3 make g++`, needed when `better-sqlite3` has no prebuilt binary. Copies `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `prisma.config.ts`, `prisma/`, then `pnpm install --frozen-lockfile` (`postinstall` runs `prisma generate`) |
| `build`  | Copies the source, then `pnpm db:generate && pnpm build`                                                                                                                                                                                                      |
| `runner` | `NODE_ENV=production`, `PORT=3000`, `DATABASE_URL=file:/data/job-hunter.db`; copies `/app`; `VOLUME /data`; `EXPOSE 3000`                                                                                                                                     |

On start, the container runs `pnpm db:setup` (`prisma migrate deploy` plus the idempotent seed) and then
`pnpm start --hostname 0.0.0.0 --port $PORT`. Migrations and the ISB sample therefore stay up to date on
every boot, and existing data and study progress are kept.

`.dockerignore` excludes `node_modules`, `.next`, `.git`, local `prisma/*.db` files, test reports and
**`.env*`** (except `.env.example`). Secrets are never baked into the image and must be supplied at
runtime.

### docker compose

```bash
cp .env.example .env         # add AI_PROVIDER / keys (optional)
docker compose up --build    # http://localhost:3000
```

`docker-compose.yml` builds the image, publishes `3000:3000`, loads `.env` if it exists
(`env_file: required: false`, which needs Docker Compose 2.24 or later), forces
`DATABASE_URL=file:/data/job-hunter.db`, and mounts the named volume `job-hunter-data` at `/data`, so the
database survives rebuilds.

### Plain docker

```bash
docker build -t job-hunter .
docker run -d --name job-hunter -p 3000:3000 \
  -v job-hunter-data:/data \
  -e AI_PROVIDER=anthropic -e ANTHROPIC_API_KEY=... \
  job-hunter
```

Notes:

- The runner image copies the whole build stage, including dev dependencies, because the start command
  needs the Prisma CLI and `tsx` (used by the seed). This favours simplicity over image size. To slim it
  down, run migrations and the seed as a separate one-off step and ship a pruned `node_modules`.
- Run **one** container per database. Generation jobs, cancellation, the JD rate limiter and the extraction
  cache all live in process memory (see §6).
- Back up `/data/job-hunter.db`. Use `sqlite3 job-hunter.db ".backup backup.db"` for a consistent copy
  while the app is running.

## 2. Single VM / bare Node.js

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env              # set DATABASE_URL (absolute path recommended) and the AI provider
pnpm db:setup                     # migrate + seed (safe to re-run on every deploy)
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

- Use Node.js 24 (the version CI and Docker use). `better-sqlite3` is a native module, so install on the
  target OS and architecture (or have a build toolchain available).
- Keep it running with systemd, pm2 or similar, and put a TLS-terminating, authenticating reverse proxy in
  front of it.
- To deploy an update: `git pull && pnpm install --frozen-lockfile && pnpm db:setup && pnpm build`, then
  restart. Jobs that are running when the process restarts are marked `failed` the next time they are read,
  and their sections can be retried from the UI.
- Long-running requests: single-question regeneration declares `maxDuration = 300` and mock-answer
  evaluation `maxDuration = 60`. Make sure the proxy's read timeout is at least that long. Package
  creation returns immediately, because generation continues in the background.

## 3. Cloudflare Workers (D1 + Workflows)

The same codebase builds for Cloudflare Workers with [OpenNext](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`). Under Node.js nothing changes; the runtime is detected at request time
(`src/server/cloudflare/runtime.ts`).

### 3.1 What runs where

| Concern            | Node.js (§1/§2)                                 | Cloudflare Workers                                                                                                                                          |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP / SSR         | `next start`                                    | OpenNext handler, wrapped by `cloudflare/worker.ts` (`wrangler.jsonc` `main`)                                                                               |
| Database           | SQLite file via `better-sqlite3`                | **D1** (`DB` binding) via `@prisma/adapter-d1`, same Prisma schema and migrations (`src/server/db.ts`)                                                      |
| Generation jobs    | in-process, fire-and-forget                     | **Workflows**: one `GenerationWorkflow` instance per job (`GENERATION_WORKFLOW`), durable, retried; it calls `POST /api/internal/generation/run` in-process |
| Job liveness       | in-memory registry                              | Workflow instance status (`src/server/generation/job-runner.ts`)                                                                                            |
| Cancellation       | aborts in-flight model calls immediately        | persisted `cancelRequested` flag, honoured between model calls                                                                                              |
| Job-URL SSRF guard | DNS check + guarded socket lookup               | DNS-over-HTTPS pre-check + the `global_fetch_strictly_public` compatibility flag (fetch can't reach private addresses)                                      |
| JD rate limit      | in-memory per process, keyed on X-Forwarded-For | **Workers Rate Limiting** binding (`JD_RATE_LIMITER`), keyed on `CF-Connecting-IP`                                                                          |
| Authentication     | your reverse proxy                              | **Cloudflare Access** JWT verified in the Worker (`src/server/cloudflare/access.ts`), fail-closed                                                           |
| Static assets      | Next.js                                         | Workers static assets (`.open-next/assets`, free, not billed as requests); `public/_headers` makes `/_next/static/*` immutable                              |
| Sample package     | seeded by `pnpm db:setup`                       | no seed step: read from code, stored in D1 on first DB-backed use (mock interview, progress sync) — `ensureSamplePackageStored`                             |
| AI calls           | provider APIs (optionally through AI Gateway)   | same; set `AI_GATEWAY_URL` to route OpenAI/Anthropic through **AI Gateway** (caching, cost analytics, rate limits)                                          |

### 3.2 Cost

A personal deployment fits in the **Workers Paid** plan's base fee. The Workers Free plan is not enough:
it allows 10 ms of CPU per request, and server-rendering the package page alone needs more. Allowances
below are from Cloudflare's pricing pages as read on 2026-11-27; re-check them before relying on them.

| Product               | Included with Workers Paid ($5/month minimum)                    | Typical single-user usage                               |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Workers               | 10M requests + 30M CPU-ms / month                                | thousands of requests                                   |
| Static assets         | free, unmetered                                                  | all JS/CSS                                              |
| D1                    | 25B rows read, 50M rows written, 5 GB storage / month            | MBs of storage, thousands of rows per generated package |
| Workflows             | 500,000 steps + 1 GB-month state / month                         | 1 step per generation job                               |
| Workers Rate Limiting | no separate charge                                               | —                                                       |
| AI Gateway            | core features (analytics, caching, rate limiting) have no charge | optional                                                |
| Cloudflare Access     | Zero Trust free plan (check the current seat limit)              | 1 user                                                  |

So the infrastructure cost is the **$5/month** base fee; the model provider's token bill (one package is
about 20–26 structured calls: 15 sections, the topic plan and one call per question topic) is the real variable cost. AI Gateway's dashboard shows it per request, and its
cache can serve repeated identical calls (e.g. retries) without paying the provider again.

### 3.3 Local preview (workerd + local D1 + local Workflows)

```bash
cp .dev.vars.example .dev.vars   # AI_PROVIDER=mock, ALLOW_UNAUTHENTICATED=true (local only)
pnpm cf:d1:migrate:local         # applies migrations/ to the local D1 in .wrangler/state
pnpm cf:preview                  # opennextjs-cloudflare build + wrangler dev on http://localhost:8787
pnpm cf:smoke                    # 12 checks: D1, Workflow generation, guards, exports, CV parsing
```

`pnpm dev` stays the day-to-day loop (Node.js + SQLite). Use the preview to check Workers-specific
behaviour before deploying. `node scripts/cf-smoke.mjs --slow` adds a liveness + cancellation check (start
the preview with `wrangler dev --var MOCK_DELAY_MS:3000`).

### 3.4 First deployment

1. **Log in:** `pnpm wrangler login`.
2. **Create the database:** `pnpm cf:d1:create`, then paste the printed `database_id` into
   `wrangler.jsonc` (`d1_databases[0].database_id`).
3. **Create the tables:** `pnpm cf:d1:migrate:remote`.
4. **AI provider secrets** (never in `wrangler.jsonc`):

   ```bash
   pnpm wrangler secret put AI_PROVIDER         # e.g. anthropic
   pnpm wrangler secret put ANTHROPIC_API_KEY   # or OPENAI_API_KEY / OPENAI_COMPATIBLE_*
   pnpm wrangler secret put AI_GATEWAY_URL      # optional: https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY_ID>
   ```

5. **Cloudflare Access.** In Zero Trust → Access → Applications, add a _self-hosted_ application for the
   Worker's hostname (`job-hunter.<subdomain>.workers.dev` and/or your custom domain) with a policy that
   allows only your email. Copy the application's **AUD tag** and your **team domain**
   (`<team>.cloudflareaccess.com`) into `wrangler.jsonc` → `vars.CF_ACCESS_AUD` / `vars.CF_ACCESS_TEAM_DOMAIN`.
   Until both are set the Worker answers every request with `503 ACCESS_NOT_CONFIGURED`. Consider
   disabling the `workers.dev` route and preview URLs once a custom domain is attached.
6. **Deploy:** `pnpm cf:deploy` (checks that `migrations/` matches Prisma, builds, uploads).

Later deployments: `pnpm cf:d1:migrate:remote` when there are new migrations, then `pnpm cf:deploy`.

### 3.5 Schema changes

Prisma stays the source of truth: `pnpm db:migrate` (local SQLite) creates
`prisma/migrations/<timestamp>_<name>/migration.sql`. `pnpm cf:migrations` mirrors it to
`migrations/NNNN_<name>.sql` (the flat format `wrangler d1 migrations apply` expects); CI fails when the two
folders drift. Never edit or delete an applied migration (the numbering would shift).

### 3.6 Behaviour differences and limits

- **No atomic multi-statement writes on D1.** Prisma refuses interactive transactions on D1, so
  `withTransaction` (`src/server/db.ts`) runs the same statements in order without a transaction. Writes
  are ordered so the authoritative row comes first (a section's JSON content before its derived question
  rows; a package's rows before its dependants) and every operation can be retried. A failure in the
  middle can leave derived rows stale until the section is saved again, or leave unused company/application
  rows behind. Profile saves use a batched `$transaction([...])`, which D1 also runs statement by statement.
- **Cancellation latency.** A cancel is honoured at the next checkpoint (before each model call and before
  saving). The model call already in flight completes, since it runs in another isolate.
- **Per-isolate state.** `withPackageLock` and the `/api/jd/extract` result cache are per isolate. Two
  simultaneous "Retry" clicks served by different isolates could start two jobs for one package (harmless
  but wasteful); the rate limiter is shared (binding).
- **Workflow step limits.** The generation step has a 30-minute timeout and 2 retries; a retry resumes the
  job (unchanged ready sections are skipped by input hash, a finished job is never re-run). Generation is
  I/O-bound; if a job ever hits the CPU limit (default 30 s per invocation on Workers Paid), raise
  `limits.cpu_ms` in `wrangler.jsonc`.
- **Row size.** D1 rows are limited to 2 MB. The largest section (the 50-question bilingual bank) is about
  650 KB for the ISB sample.
- **Bundle size.** The deploy bundle is ~44 MiB uncompressed (~11 MiB gzip) against the 64 MiB Workers
  limit. The biggest contributors are Mermaid/Cytoscape in the server render bundle, pdf.js (CV parsing)
  and the sample content.
- **Prisma's query compiler.** Workers can't compile WebAssembly at runtime, so
  `scripts/prepare-prisma-workerd.mjs` (run by `postinstall`, `db:generate` and `cf:build`) writes the
  query-compiler `.wasm` next to the generated client and patches the client to use the precompiled module
  that `cloudflare/worker.ts` imports. Re-run `pnpm cf:preview` + `pnpm cf:smoke` after upgrading Prisma;
  the script fails loudly if the generated code changes shape.
- **Middleware.** `src/proxy.ts` (Next.js 16 Proxy, Node.js runtime) runs on OpenNext's experimental
  Node-middleware support. `ALLOWED_HOSTS` is `*` on Cloudflare (only the Worker's own routes reach it); the
  Origin/CSRF check still applies.
- **`keep_names: false`** in `wrangler.jsonc` is required: esbuild's name helper otherwise breaks scripts
  that Next.js serializes into the page (`__name is not defined`).

## 4. Switching to PostgreSQL

The schema only uses PostgreSQL-compatible types: string statuses instead of enums, and `Json` columns
that become `jsonb`. The repositories use only the Prisma client API, with no raw SQL. Switching takes
these steps:

1. **Add the driver adapter**, keeping it on the same version as `prisma` / `@prisma/client` (7.10.x):

   ```bash
   pnpm add @prisma/adapter-pg@7.10.1
   ```

2. **Change the datasource** in `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```

   The URL keeps coming from `prisma.config.ts` (`DATABASE_URL`).

3. **Swap the adapter** in `src/server/db.ts`:

   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";

   function createClient(): PrismaClient {
     const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
     return new PrismaClient({ adapter });
   }
   ```

   You can then remove `better-sqlite3` and `@prisma/adapter-better-sqlite3` from `serverExternalPackages`
   in `next.config.ts` and from the dependencies.

4. **Recreate the migrations.** `prisma/migrations` contains SQLite SQL, and `migration_lock.toml` pins
   `sqlite`. Move the folder aside and create a fresh baseline against an empty Postgres database:

   ```bash
   export DATABASE_URL="postgresql://jobhunter:secret@localhost:5432/jobhunter?schema=public"
   pnpm db:generate
   pnpm db:migrate --name init     # prisma migrate dev
   pnpm db:seed
   ```

   In production, use `pnpm db:setup` (`migrate deploy` plus seed) as usual.

5. **Tests and tooling.** `tests/unit/db/*.db.test.ts` builds a throwaway SQLite database from the
   migration SQL with `node:sqlite`. Either point it at a Postgres test database or set
   `SKIP_DB_TESTS=1`. Update `DATABASE_URL` in `.github/workflows/ci.yml` (add a `postgres` service) and in
   the `Dockerfile` / `docker-compose.yml` (you can drop the `/data` volume and the native toolchain).

6. **Data migration (optional).** To carry over existing SQLite data, export the rows (for example with
   `prisma db pull` plus a small script, or `pgloader`). The seed recreates the profile, preferences and the
   ISB sample, but not user packages or progress.

PostgreSQL removes the single-writer limit, but it does **not** by itself make multiple app instances
safe. See §6.

## 5. Environment variables

All variables are read on the server only. **Never** prefix an AI key with `NEXT_PUBLIC_`.

| Variable                        | Default                    | Purpose                                                                                                                                                                                 |
| ------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | `file:./prisma/dev.db`     | Database URL (relative SQLite paths resolve from the project root). The Docker image uses `file:/data/job-hunter.db`.                                                                   |
| `AI_PROVIDER`                   | empty (auto-detect)        | `openai`, `anthropic`, `openai-compatible` or `mock`. If empty, the first configured of OpenAI → Anthropic → OpenAI-compatible is used. `mock` is never auto-selected.                  |
| `AI_MODEL`                      | per provider               | Overrides `DEFAULT_MODELS` (`gpt-5-mini`, `claude-sonnet-5-5`, `llama-3.3-70b-instruct`, `mock-run10-v1`).                                                                              |
| `OPENAI_API_KEY`                | –                          | Required for `openai`                                                                                                                                                                   |
| `ANTHROPIC_API_KEY`             | –                          | Required for `anthropic`                                                                                                                                                                |
| `OPENAI_COMPATIBLE_BASE_URL`    | –                          | Required for `openai-compatible` (Ollama, LM Studio, OpenRouter, vLLM, …)                                                                                                               |
| `OPENAI_COMPATIBLE_API_KEY`     | –                          | Optional for `openai-compatible` (local servers usually need none)                                                                                                                      |
| `MOCK_FAIL_SECTIONS`            | –                          | Testing: comma-separated section keys (or `topic-plan`) the mock always fails                                                                                                           |
| `MOCK_MALFORMED_ONCE_SECTIONS`  | –                          | Testing: first attempt malformed, repair succeeds                                                                                                                                       |
| `MOCK_RATE_LIMIT_ONCE_SECTIONS` | –                          | Testing: first call returns HTTP 429                                                                                                                                                    |
| `MOCK_DELAY_MS`                 | `0`                        | Testing and demos: latency per mock model call                                                                                                                                          |
| `AI_GATEWAY_URL`                | –                          | Optional Cloudflare AI Gateway base URL (`https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY_ID>`) for OpenAI/Anthropic; other hosts are rejected                               |
| `JD_READER_FALLBACK`            | – (on in `wrangler.jsonc`) | `jina` reads a job page through Jina Reader (`r.jina.ai`) when the site blocks direct fetching, e.g. LinkedIn on Cloudflare IPs. **Sends the job URL to a third party**; off unless set |
| `JINA_API_KEY`                  | –                          | Optional Jina Reader key (`wrangler secret put JINA_API_KEY`) for a higher rate limit than the keyless 20 requests/minute                                                               |
| `AI_GATEWAY_TOKEN`              | –                          | Optional token for authenticated AI Gateways (`cf-aig-authorization`)                                                                                                                   |
| `CF_ACCESS_TEAM_DOMAIN`         | – (Cloudflare only)        | Zero Trust team domain; with `CF_ACCESS_AUD` enables the Access check in the Worker                                                                                                     |
| `CF_ACCESS_AUD`                 | – (Cloudflare only)        | Access application AUD tag                                                                                                                                                              |
| `ALLOW_UNAUTHENTICATED`         | – (Cloudflare only)        | `true` serves the Worker without Access when Access is not configured — local previews only                                                                                             |
| `ALLOWED_HOSTS`                 | –                          | Comma-separated host names (optionally `host:port`) served besides `localhost`/`127.0.0.1`/`[::1]`; required behind a reverse proxy or on a LAN IP. `*` disables the Host check         |
| `PORT`                          | `3000` (Docker)            | Port used by the Docker `CMD`                                                                                                                                                           |
| `E2E_PORT`                      | `3100`                     | Port Playwright starts the app on                                                                                                                                                       |
| `SKIP_DB_TESTS`                 | –                          | `1` skips the SQLite integration tests in `tests/unit/db`                                                                                                                               |

When no provider is configured, the app still works: the sample, studying, exports, profile and heuristic
mock-interview scoring all keep working. Creating or regenerating packages returns `503 AI_NOT_CONFIGURED`,
and the UI links to `/settings`, which shows the setup.

## 6. Serverless caveat

On Cloudflare Workers this is solved (§3): jobs run in Workflows, liveness comes from the Workflow
status, cancellation uses the persisted flag and the rate limiter is a shared binding. The rest of this
section applies to the Node.js build on other serverless platforms.

Under Node.js, generation runs **in-process and fire-and-forget**. `POST /api/packages` and
`POST /api/packages/[slug]/sections/[key]` create a `GenerationJob` row, call
`runGenerationJob(jobId)` without awaiting it, and respond right away. That works on a long-lived Node
server, but not on serverless or edge platforms (Vercel functions, Lambda, Cloud Run with CPU throttling):

- The function may be frozen or killed after the response, so jobs stall and are later reconciled as
  `failed` ("interrupted").
- The cancel registry (`AbortController`s), the JD rate limiter and the extraction cache are in-memory per
  instance.
- A SQLite file on an ephemeral filesystem is not durable.

To run serverless or on several instances:

1. Use PostgreSQL (§4).
2. Move job execution to a **durable worker**: a separate long-running process (or queue consumer) that
   claims `queued` `GenerationJob` rows and calls `runGenerationJob(jobId)`. The route handlers then only
   create the job (replace `startJobInBackground` in `src/server/generation/service.ts` with an enqueue).
3. Cancellation already works across processes through the persisted `GenerationJob.cancelRequested` flag,
   which the pipeline polls between steps. In-flight calls are aborted only inside the worker that owns
   the job.
4. Replace the orphan check. `reconcileOrphan` treats a `queued`/`running` job that is not registered _in
   the current process_ as interrupted (after a 15 s grace period). With a separate worker, use a heartbeat
   column (or the queue's own state) instead, or the web process will mark the worker's jobs as failed.
5. Move the `/api/jd/extract` rate limiter and cache to a shared store (e.g. Redis) if you need them across
   instances.

## 7. Continuous integration

`.github/workflows/ci.yml` runs two jobs on pushes to `main` and on pull requests (a newer run on the same ref
cancels the older one): `verify` (below) and `cloudflare`, which checks that `migrations/` and the generated
Worker types are in sync, type-checks the Worker entry, runs `pnpm cf:build`, starts `wrangler dev` with a
local D1 and runs `pnpm cf:smoke`. Nothing is deployed from CI.

`verify` (ubuntu-latest, 25 min timeout):

| Step          | Command                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup         | `pnpm/action-setup@v4` (version from `packageManager`), Node 24 with the pnpm cache                                                                                           |
| Install       | `pnpm install --frozen-lockfile`                                                                                                                                              |
| Database      | `pnpm db:setup` with `DATABASE_URL=file:./prisma/ci.db`                                                                                                                       |
| Static checks | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`                                                                                                                            |
| Unit tests    | `pnpm test`                                                                                                                                                                   |
| Build         | `pnpm build`                                                                                                                                                                  |
| E2E           | `pnpm exec playwright install --with-deps chromium`, then `pnpm test:e2e` (the Playwright web server runs `pnpm start` on port 3100 with `AI_PROVIDER=mock`; CI retries once) |
| Artifacts     | `playwright-report` uploaded on failure (kept 7 days)                                                                                                                         |

`AI_PROVIDER=mock` is set for the whole job, so CI never needs an API key or network access to a model.
Run the same checks locally with `pnpm verify` (typecheck, lint, unit tests, build), then `pnpm test:e2e`.
