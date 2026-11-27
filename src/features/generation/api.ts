import { z } from "zod";
import { NormalizedJdSchema, type NormalizedJd } from "@/domain/jd/schema";
import {
  AiStatusSchema,
  GenerationJobDtoSchema,
  type AiStatus,
  type CreatePackageRequest,
  type GenerationJobDto,
} from "@/domain/generation/schema";
import type { SectionKey } from "@/domain/package/sections";

/** Client wrappers for the JD extraction + generation endpoints. All responses are Zod-validated. */

export const generationKeys = {
  aiStatus: ["ai-status"] as const,
  latestJob: (slug: string) => ["generation-job", slug, "latest"] as const,
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const ErrorBodySchema = z.object({ error: z.string().min(1), code: z.string().optional() }).loose();

function fallbackMessage(status: number): string {
  if (status === 429) return "Too many requests — wait a moment and try again.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "The server ran into a problem. Try again in a moment.";
  return `Request failed (${status}).`;
}

async function requestJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init, headers: { accept: "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("Network error — check your connection and try again.", 0, "NETWORK");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ErrorBodySchema.safeParse(body);
    throw parsed.success
      ? new ApiError(parsed.data.error, res.status, parsed.data.code)
      : new ApiError(fallbackMessage(res.status), res.status);
  }
  return { status: res.status, body };
}

function parse<T>(schema: z.ZodType<T>, body: unknown, status: number): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError("The server returned an unexpected response.", status, "INVALID_RESPONSE");
  return parsed.data;
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/* ------------------------------------------------------------------ */

const ExtractResponseSchema = z.object({ jd: NormalizedJdSchema });

export async function extractJd(url: string): Promise<NormalizedJd> {
  const { status, body } = await requestJson("/api/jd/extract", postJson({ url }));
  return parse(ExtractResponseSchema, body, status).jd;
}

const CreatePackageResponseSchema = z.object({ slug: z.string().min(1), jobId: z.string().optional() }).loose();
export type CreatePackageResponse = z.infer<typeof CreatePackageResponseSchema>;

export async function createPackage(request: CreatePackageRequest): Promise<CreatePackageResponse> {
  const { status, body } = await requestJson("/api/packages", postJson(request));
  return parse(CreatePackageResponseSchema, body, status);
}

/** Accepts the bare AiStatus or a `{ status }` envelope. */
const AiStatusResponseSchema = z.union([
  AiStatusSchema,
  z.object({ status: AiStatusSchema }).transform((v) => v.status),
]);

export async function fetchAiStatus(): Promise<AiStatus> {
  const { status, body } = await requestJson("/api/ai/status");
  return parse(AiStatusResponseSchema, body, status);
}

/** Accepts the bare DTO, `{ job }` or `{ job: null }`. */
const LatestJobResponseSchema = z.union([
  GenerationJobDtoSchema,
  z.object({ job: GenerationJobDtoSchema.nullable() }).transform((v) => v.job),
  z.null(),
]);

/** Latest generation job for a package, or null when none exists. */
export async function fetchLatestJob(slug: string): Promise<GenerationJobDto | null> {
  try {
    const { status, body } = await requestJson(`/api/packages/${encodeURIComponent(slug)}/jobs/latest`);
    return parse(LatestJobResponseSchema, body, status);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  await requestJson(`/api/generation-jobs/${encodeURIComponent(jobId)}/cancel`, postJson({}));
}

export async function retrySection(slug: string, sectionKey: SectionKey): Promise<void> {
  await requestJson(
    `/api/packages/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionKey)}`,
    postJson({}),
  );
}

/** Resumes generation for every section that has no content yet (after cancel / interruption / failures). */
export async function generateMissingSections(slug: string): Promise<void> {
  await requestJson(`/api/packages/${encodeURIComponent(slug)}/generate`, postJson({}));
}

export async function regenerateItem(slug: string, itemId: string): Promise<void> {
  await requestJson(
    `/api/packages/${encodeURIComponent(slug)}/items/${encodeURIComponent(itemId)}/regenerate`,
    postJson({}),
  );
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
