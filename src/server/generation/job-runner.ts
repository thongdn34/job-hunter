import "server-only";
import {
  getCloudflareEnv,
  isCloudflareRuntime,
  type WorkflowBindingLike,
  type GenerationWorkflowParams,
} from "@/server/cloudflare/env";
import type { GenerationProvider } from "@/server/ai/provider";
import { runGenerationJob } from "./pipeline";
import { abortJob, isJobActive } from "./registry";

/**
 * Where generation jobs execute.
 *
 * - "in-process" (Node.js: dev, `next start`, Docker): fire-and-forget inside the server process;
 *   liveness = the in-memory registry.
 * - "cloudflare-workflow" (Cloudflare Workers): one durable Workflow instance per job (instance id =
 *   job id). The Workflow calls back into POST /api/internal/generation/run inside the same Worker,
 *   which runs `runGenerationJob`. Liveness = the instance status, because the job runs in another
 *   isolate than the request asking about it. Cancellation uses the persisted cancelRequested flag
 *   (polled by the pipeline between steps).
 */
export interface JobRunner {
  readonly kind: "in-process" | "cloudflare-workflow";
  start(jobId: string, options: { force?: boolean; provider?: GenerationProvider }): Promise<void>;
  /** True while the job may still make progress (queued, running, retrying). */
  isAlive(jobId: string): Promise<boolean>;
  /** Hard stop (package deleted). Normal cancellation goes through the cancelRequested flag. */
  stop(jobId: string, reason: string): Promise<void>;
}

export const inProcessRunner: JobRunner = {
  kind: "in-process",
  async start(jobId, options) {
    void runGenerationJob(jobId, options).catch((error: unknown) => {
      console.error(`[generation] background job ${jobId} failed`, error);
    });
  },
  async isAlive(jobId) {
    return isJobActive(jobId);
  },
  async stop(jobId, reason) {
    abortJob(jobId, reason);
  },
};

/** Workflow instance states in which the job can still make progress. */
const ALIVE_WORKFLOW_STATES = new Set(["queued", "running", "paused", "waiting", "waitingForPause"]);

export function createWorkflowRunner(binding: WorkflowBindingLike<GenerationWorkflowParams>): JobRunner {
  return {
    kind: "cloudflare-workflow",
    async start(jobId, options) {
      // The provider is re-resolved from the Worker's env inside the Workflow (same configuration).
      await binding.create({ id: jobId, params: { jobId, force: options.force } });
    },
    async isAlive(jobId) {
      let instance;
      try {
        instance = await binding.get(jobId);
      } catch {
        return false; // unknown instance: never started or expired
      }
      try {
        const { status } = await instance.status();
        return ALIVE_WORKFLOW_STATES.has(status);
      } catch (error) {
        // Transient API failure: do not declare a possibly running job dead.
        console.error(`[generation] could not read workflow status of job ${jobId}`, error);
        return true;
      }
    },
    async stop(jobId) {
      try {
        await (await binding.get(jobId)).terminate();
      } catch {
        // Already finished or never started.
      }
    },
  };
}

export function getJobRunner(): JobRunner {
  if (!isCloudflareRuntime()) return inProcessRunner;
  const binding = getCloudflareEnv().GENERATION_WORKFLOW;
  if (!binding) {
    throw new Error("The Workflow binding GENERATION_WORKFLOW is missing. Check workflows in wrangler.jsonc.");
  }
  return createWorkflowRunner(binding);
}
