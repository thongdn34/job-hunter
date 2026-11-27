import { AddMockAnswerBodySchema, MockSessionIdSchema } from "@/domain/mock/dto";
import { resolveMockItem } from "@/domain/mock/item-context";
import { evaluateAnswer } from "@/server/mock/evaluate";
import { errorResponse, jsonError, parseJsonBody } from "@/server/mock/http";
import { addAnswer, getSessionInfo } from "@/server/repositories/mock-repository";
import { getPackageBySlug } from "@/server/repositories/package-repository";

export const dynamic = "force-dynamic";
// AI evaluation can take a while.
export const maxDuration = 60;

/**
 * POST /api/mock/sessions/[id]/answers { itemId, answer, revealedBeforeSubmit }
 * -> 201 { answer, evaluation }
 *
 * The server resolves the item (primary question or its stored follow-up) from the package,
 * evaluates with AI when configured (heuristic otherwise / on failure) and persists the result.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const id = MockSessionIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError(400, "Invalid session id.");
  const body = await parseJsonBody(request, AddMockAnswerBodySchema);
  if (!body.ok) return body.response;

  try {
    const session = await getSessionInfo(id.data);
    if (session.status === "completed") return jsonError(409, "This mock interview session is already completed.");

    const pkg = await getPackageBySlug(session.packageSlug);
    if (!pkg) return jsonError(404, `Package "${session.packageSlug}" was not found.`);

    const item = resolveMockItem(pkg, body.data.itemId);
    if (!item) return jsonError(404, `Question "${body.data.itemId}" does not exist in this package.`);

    const evaluation = await evaluateAnswer(
      { item, answer: body.data.answer, revealedBeforeSubmit: body.data.revealedBeforeSubmit },
      { signal: request.signal },
    );
    const answer = await addAnswer(id.data, item.id, body.data.answer, evaluation, body.data.revealedBeforeSubmit);
    return Response.json({ answer, evaluation: answer.evaluation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
