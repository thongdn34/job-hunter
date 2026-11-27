import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PrismaD1 } from "@prisma/adapter-d1";

/**
 * Cloudflare Workers runtime access (OpenNext). Everything here is optional at runtime: under
 * Node (`pnpm dev`, `pnpm start`, Docker, tests) `isCloudflareRuntime()` is false and none of the
 * bindings are touched. See wrangler.jsonc for the binding names and docs/DEPLOYMENT.md.
 */

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];

export interface GenerationWorkflowParams {
  jobId: string;
  force?: boolean;
}

/** Subset of the Workflows binding API used by the app (keeps tests free of workers-types). */
export interface WorkflowInstanceLike {
  id: string;
  status(): Promise<{ status: string; error?: unknown }>;
  terminate(): Promise<void>;
}
export interface WorkflowBindingLike<Params> {
  create(options: { id?: string; params?: Params }): Promise<WorkflowInstanceLike>;
  get(id: string): Promise<WorkflowInstanceLike>;
}

/** Workers Rate Limiting binding (https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). */
export interface RateLimitBindingLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface AppCloudflareEnv {
  DB: D1Binding;
  GENERATION_WORKFLOW?: WorkflowBindingLike<GenerationWorkflowParams>;
  JD_RATE_LIMITER?: RateLimitBindingLike;
}

export { isCloudflareRuntime } from "./runtime";

/** Bindings of the current request. Only valid inside a request handled by the OpenNext worker. */
export function getCloudflareEnv(): AppCloudflareEnv {
  return getCloudflareContext().env as unknown as AppCloudflareEnv;
}
