import { MockSessionIdSchema } from "@/domain/mock/dto";
import { errorResponse, jsonError } from "@/server/mock/http";
import { getSession } from "@/server/repositories/mock-repository";

export const dynamic = "force-dynamic";

/** GET /api/mock/sessions/[id] -> { session, answers } */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const id = MockSessionIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError(400, "Invalid session id.");
  try {
    const { session, answers } = await getSession(id.data);
    return Response.json({ session, answers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
