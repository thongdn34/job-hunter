import { MockSessionIdSchema } from "@/domain/mock/dto";
import { errorResponse, jsonError } from "@/server/mock/http";
import { completeSession } from "@/server/repositories/mock-repository";

export const dynamic = "force-dynamic";

/** POST /api/mock/sessions/[id]/complete -> { session } (idempotent) */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const id = MockSessionIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError(400, "Invalid session id.");
  try {
    const session = await completeSession(id.data);
    return Response.json({ session });
  } catch (error) {
    return errorResponse(error);
  }
}
