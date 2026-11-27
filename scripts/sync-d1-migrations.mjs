#!/usr/bin/env node
/**
 * Mirrors Prisma migrations (prisma/migrations/<timestamp>_<name>/migration.sql — the source of
 * truth, created with `pnpm db:migrate`) into Cloudflare D1's flat format
 * (migrations/<NNNN>_<name>.sql, applied with `wrangler d1 migrations apply`).
 *
 * Numbering follows Prisma's order, so it is stable as long as migrations are append-only (never
 * edit or delete an applied migration). `--check` exits 1 when the folders are out of sync (CI).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const prismaDir = join(root, "prisma", "migrations");
const d1Dir = join(root, "migrations");
const check = process.argv.includes("--check");

const prismaMigrations = readdirSync(prismaDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(prismaDir, entry.name, "migration.sql")))
  .map((entry) => entry.name)
  .sort();

const expected = new Map(
  prismaMigrations.map((dir, index) => {
    const name = dir.replace(/^\d+_/, "") || dir;
    const file = `${String(index + 1).padStart(4, "0")}_${name}.sql`;
    const sql = readFileSync(join(prismaDir, dir, "migration.sql"), "utf8");
    return [
      file,
      `-- Generated from prisma/migrations/${dir}/migration.sql by scripts/sync-d1-migrations.mjs. Do not edit.\n${sql}`,
    ];
  }),
);

const existing = existsSync(d1Dir) ? readdirSync(d1Dir).filter((f) => f.endsWith(".sql")) : [];
const stale = existing.filter((file) => !expected.has(file));
const changed = [...expected].filter(
  ([file, sql]) => !existing.includes(file) || readFileSync(join(d1Dir, file), "utf8") !== sql,
);

if (check) {
  if (stale.length || changed.length) {
    console.error(
      `D1 migrations are out of sync with prisma/migrations (${[...changed.map(([f]) => f), ...stale].join(", ")}). Run \`pnpm cf:migrations\`.`,
    );
    process.exit(1);
  }
  console.log(`D1 migrations in sync (${expected.size}).`);
  process.exit(0);
}

if (stale.length) {
  console.error(
    `Unexpected files in migrations/ (not generated from Prisma): ${stale.join(", ")}. Remove them manually.`,
  );
  process.exit(1);
}
mkdirSync(d1Dir, { recursive: true });
for (const [file, sql] of changed) writeFileSync(join(d1Dir, file), sql);
console.log(
  changed.length ? `Wrote ${changed.map(([f]) => f).join(", ")}` : `D1 migrations up to date (${expected.size}).`,
);
