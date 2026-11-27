import { z } from "zod";
import { CreateMockSessionBodySchema, ListMockSessionsQuerySchema } from "@/domain/mock/dto";
import { errorResponse, jsonError, parseJsonBody } from "@/server/mock/http";
import { createSession, listSessions } from "@/server/repositories/mock-repository";

export const dynamic = "force-dynamic";

/** POST /api/mock/sessions { packageSlug } -> 201 { session } */
export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, CreateMockSessionBodySchema);
  if (!body.ok) return body.response;
  try {
    const session = await createSession(body.data.packageSlug);
    return Response.json({ session }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** GET /api/mock/sessions?packageSlug= -> { sessions } */
export async function GET(request: Request): Promise<Response> {
  const query = ListMockSessionsQuerySchema.safeParse({
    packageSlug: new URL(request.url).searchParams.get("packageSlug") ?? undefined,
  });
  if (!query.success) return jsonError(400, z.prettifyError(query.error), query.error.issues);
  try {
    const sessions = await listSessions(query.data.packageSlug);
    return Response.json({ sessions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
