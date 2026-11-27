import { z } from "zod";
import { CandidateProfileSchema, type CandidateProfile } from "@/domain/profile/schema";
import type { ProfilePayload } from "@/domain/profile/form";

/** Client-side wrappers for /api/profile. Responses are validated with Zod. */

export const PROFILE_QUERY_KEY = ["profile"] as const;

export interface ApiIssue {
  path: string;
  message: string;
}

export class ProfileApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly issues: ApiIssue[];

  constructor(message: string, status: number, code?: string, issues: ApiIssue[] = []) {
    super(message);
    this.name = "ProfileApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

const ErrorBodySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

const ProfileResponseSchema = z.object({ profile: CandidateProfileSchema });
const CvUploadResponseSchema = z.object({
  profile: CandidateProfileSchema,
  extractedChars: z.number(),
  truncated: z.boolean().optional().default(false),
});
export type CvUploadResult = z.infer<typeof CvUploadResponseSchema>;

async function request<T>(url: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ProfileApiError("Network error — check your connection and try again.", 0, "network");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ErrorBodySchema.safeParse(body);
    if (parsed.success) {
      throw new ProfileApiError(parsed.data.error, res.status, parsed.data.code, parsed.data.issues);
    }
    const fallback = res.status === 413 ? "The file is too large." : `Request failed (${res.status}).`;
    throw new ProfileApiError(fallback, res.status);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ProfileApiError("The server returned an unexpected response.", res.status, "invalid_response");
  }
  return parsed.data;
}

export async function fetchProfile(): Promise<CandidateProfile> {
  const { profile } = await request("/api/profile", { method: "GET" }, ProfileResponseSchema);
  return profile;
}

export async function updateProfile(payload: ProfilePayload): Promise<CandidateProfile> {
  const { profile } = await request(
    "/api/profile",
    { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
    ProfileResponseSchema,
  );
  return profile;
}

export async function uploadCv(file: File): Promise<CvUploadResult> {
  const form = new FormData();
  form.set("file", file);
  return request("/api/profile/cv", { method: "POST", body: form }, CvUploadResponseSchema);
}

export async function deleteCv(): Promise<CandidateProfile> {
  const { profile } = await request("/api/profile/cv", { method: "DELETE" }, ProfileResponseSchema);
  return profile;
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
