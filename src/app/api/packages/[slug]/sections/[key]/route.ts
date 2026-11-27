import { z } from "zod";
import { isSectionKey } from "@/domain/package/sections";
import { startSectionGeneration } from "@/server/generation/service";
import { errorToResponse, jsonError, parseJsonBody } from "@/server/generation/http";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ force: z.boolean().optional() }).strict();

/**
 * POST /api/packages/[slug]/sections/[key] { force? }
 *  -> 202 { jobId }   retry a failed section, or regenerate it (force skips the unchanged-input check).
 * Missing dependencies are generated in the same job. 403 for samples, 409 while a job is running,
 * 503 when no AI provider is configured.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; key: string }> },
): Promise<Response> {
  const { slug, key } = await params;
  if (!isSectionKey(key)) return jsonError(404, `Unknown section "${key}".`, "NOT_FOUND");
  const body = await parseJsonBody(request, BodySchema);
  if ("response" in body) return body.response;

  try {
    const job = await startSectionGeneration(slug, key, body.data.force ?? false);
    return Response.json({ jobId: job.id }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, `POST /api/packages/${slug}/sections/${key}`);
  }
}
