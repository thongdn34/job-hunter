import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ProfileInputSchema } from "@/domain/profile/persistence";
import { getProfile, saveProfile } from "@/server/repositories/profile-repository";
import { internalError, jsonError, zodIssues } from "./_lib/responses";

export const dynamic = "force-dynamic";

/** GET /api/profile -> { profile } */
export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    return internalError("GET", error);
  }
}

/** PUT /api/profile (CandidateProfile JSON) -> { profile } */
export async function PUT(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError(415, "Send the profile as application/json.", { code: "unsupported_media_type" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body is not valid JSON.", { code: "invalid_json" });
  }

  const parsed = ProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Some profile fields are invalid.", { code: "validation", issues: zodIssues(parsed.error) });
  }

  try {
    const profile = await saveProfile(parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "Some profile fields are invalid.", { code: "validation", issues: zodIssues(error) });
    }
    return internalError("PUT", error);
  }
}
