import { z } from "zod";
import { startMissingSectionsGeneration } from "@/server/generation/service";
import { errorToResponse, parseJsonBody } from "@/server/generation/http";

export const dynamic = "force-dynamic";

const BodySchema = z.object({}).strict();

/**
 * POST /api/packages/[slug]/generate {}
 *  -> 202 { jobId, sections }   resume generation: one job for every section that has no content yet
 *     (after a cancelled, interrupted or partially failed run) or is outdated. Ready sections are untouched.
 * 403 sample · 404 unknown package · 409 a job is running / nothing to do · 503 no AI provider.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const body = await parseJsonBody(request, BodySchema);
  if ("response" in body) return body.response;

  try {
    const job = await startMissingSectionsGeneration(slug);
    return Response.json(
      { jobId: job.id, sections: job.sections },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorToResponse(error, `POST /api/packages/${slug}/generate`);
  }
}
