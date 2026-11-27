import { z } from "zod";
import { INTERNAL_TOKEN_HEADER, isValidInternalToken } from "@/server/cloudflare/internal-token";
import { getGenerationJob } from "@/server/repositories/generation-job-repository";
import { runGenerationJob } from "@/server/generation/pipeline";

export const dynamic = "force-dynamic";

const RunRequestSchema = z.object({ jobId: z.string().min(1).max(64), force: z.boolean().optional() });

/**
 * POST /api/internal/generation/run { jobId, force? } -> { status }
 *
 * Called only in-process by the Cloudflare Workflow (cloudflare/worker.ts) to execute one job.
 * Returns 404 to everyone else (no token under Node.js; the public Worker entry blocks the path).
 * Idempotent: a retried Workflow step never re-runs a job that already finished; a job left
 * "running" by an evicted isolate resumes (unchanged ready sections are skipped by input hash).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isValidInternalToken(request.headers.get(INTERNAL_TOKEN_HEADER))) {
    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
  const parsed = RunRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body", code: "BAD_REQUEST" }, { status: 400 });

  const job = await getGenerationJob(parsed.data.jobId);
  if (!job) return Response.json({ status: "missing" });
  if (job.status !== "queued" && job.status !== "running") return Response.json({ status: job.status, skipped: true });

  const final = await runGenerationJob(job.id, { force: parsed.data.force });
  return Response.json({ status: final?.status ?? "missing" });
}
