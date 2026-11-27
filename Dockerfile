# syntax=docker/dockerfile:1.7
# Multi-stage image for Job Hunter (Next.js 16 + Prisma 7 + SQLite).
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
# better-sqlite3 needs a toolchain when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate` + scripts/prepare-prisma-workerd.mjs.
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 DATABASE_URL=file:/data/job-hunter.db
COPY --from=build /app ./
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
# Apply migrations + idempotent seed on start, then serve.
CMD ["sh", "-c", "pnpm db:setup && pnpm start --hostname 0.0.0.0 --port ${PORT}"]
