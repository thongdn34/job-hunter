import { getLatestJobDtoForPackage } from "@/server/generation/service";
import { errorToResponse } from "@/server/generation/http";

export const dynamic = "force-dynamic";

/** GET /api/packages/[slug]/jobs/latest -> { job: GenerationJobDto | null } */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  try {
    const job = await getLatestJobDtoForPackage(slug);
    return Response.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, `GET /api/packages/${slug}/jobs/latest`);
  }
}
