import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { getCloudflareEnv, isCloudflareRuntime } from "./cloudflare/env";

/**
 * Prisma client for the current runtime:
 * - Node.js (dev, `next start`, Docker, tests): SQLite file via better-sqlite3 (DATABASE_URL), one
 *   client per process.
 * - Cloudflare Workers: Cloudflare D1 via the `DB` binding, one client per binding object.
 *
 * D1 has no interactive transactions: Prisma's D1 adapter runs `$transaction` bodies as individual
 * statements. Repositories therefore write the authoritative row first (e.g. the section's JSON
 * content) and derived rows after it, and every write is safe to retry — see docs/ARCHITECTURE.md.
 *
 * `prisma` is a lazy proxy so call sites stay `prisma.model.method()` on both runtimes.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const d1Clients = new WeakMap<object, PrismaClient>();

function nodeClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  }
  return globalForPrisma.prisma;
}

function d1Client(): PrismaClient {
  const binding = getCloudflareEnv().DB;
  if (!binding) throw new Error("The D1 binding `DB` is missing. Check d1_databases in wrangler.jsonc.");
  let client = d1Clients.get(binding);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(binding) });
    d1Clients.set(binding, client);
  }
  return client;
}

export function getPrisma(): PrismaClient {
  return isCloudflareRuntime() ? d1Client() : nodeClient();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export type TransactionClient = Prisma.TransactionClient;

/**
 * Interactive transaction on Node.js (SQLite: atomic). On Cloudflare D1, which has no interactive
 * transactions (Prisma refuses them), `fn` runs against the plain client: the same statements in
 * the same order, without atomicity. Callers keep D1 safe by writing the authoritative row first,
 * deriving the rest from it, and making every write retryable (see docs/ARCHITECTURE.md).
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  if (isCloudflareRuntime()) return fn(getPrisma());
  return getPrisma().$transaction(fn, options);
}
