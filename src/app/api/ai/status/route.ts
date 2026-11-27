import { getAiStatus } from "@/server/ai/provider";

export const dynamic = "force-dynamic";

/** GET /api/ai/status -> AiStatus (provider, model, configured flags — never secrets). */
export async function GET(): Promise<Response> {
  return Response.json(getAiStatus(), { headers: { "Cache-Control": "no-store" } });
}
