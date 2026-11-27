import { cancelJob } from "@/server/generation/service";
import { errorToResponse } from "@/server/generation/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/generation-jobs/[id]/cancel -> { job }
 * Sets cancelRequested and aborts in-flight AI calls. The job reaches status "cancelled"
 * shortly after (poll GET /api/generation-jobs/[id]). Finished jobs are returned unchanged.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  try {
    const job = await cancelJob(id);
    return Response.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, `POST /api/generation-jobs/${id}/cancel`);
  }
}
