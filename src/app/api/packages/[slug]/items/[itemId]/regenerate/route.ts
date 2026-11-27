import { regenerateQuestion } from "@/server/generation/regenerate-question";
import { errorToResponse } from "@/server/generation/http";

export const dynamic = "force-dynamic";
/** One structured model call; allow time for slow providers. */
export const maxDuration = 300;

/**
 * POST /api/packages/[slug]/items/[itemId]/regenerate -> 200 { question }
 * Regenerates a single bilingual question (same id/number/topic) with the section context.
 * 403 sample · 404 unknown question · 409 question bank not ready · 502 generation failed · 503 no AI provider.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; itemId: string }> },
): Promise<Response> {
  const { slug, itemId } = await params;
  try {
    const question = await regenerateQuestion(slug, itemId, { signal: request.signal });
    return Response.json({ question }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, `POST /api/packages/${slug}/items/${itemId}/regenerate`);
  }
}
