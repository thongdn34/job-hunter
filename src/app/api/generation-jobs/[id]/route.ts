import { getJobDto } from "@/server/generation/service";
import { errorToResponse, jsonError } from "@/server/generation/http";

export const dynamic = "force-dynamic";

/** GET /api/generation-jobs/[id] -> { job: GenerationJobDto } | 404 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  try {
    const job = await getJobDto(id);
    if (!job) return jsonError(404, `Generation job "${id}" was not found.`, "NOT_FOUND");
    return Response.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, `GET /api/generation-jobs/${id}`);
  }
}
