import { CreatePackageRequestSchema } from "@/domain/generation/schema";
import type { NormalizedJd } from "@/domain/jd/schema";
import { toCompanyCode } from "@/domain/package/bookmarks";
import { extractJobFromUrl, isJdExtractionError, normalizeManualJd } from "@/server/jd";
import { getProviderForGeneration } from "@/server/ai/provider";
import { startPackageGeneration } from "@/server/generation/service";
import { errorToResponse, jsonError, parseJsonBody } from "@/server/generation/http";
import { createPackageShell, getPackageIdBySlug, listPackages } from "@/server/repositories/package-repository";

export const dynamic = "force-dynamic";

/** GET /api/packages -> { packages: PackageSummary[] } */
export async function GET(): Promise<Response> {
  try {
    const packages = await listPackages();
    return Response.json({ packages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, "GET /api/packages");
  }
}

/**
 * POST /api/packages { companyName, jobTitle?, sourceUrl?, rawText? }
 *  -> 201 { slug, jobId }
 *  -> 400 VALIDATION_ERROR | 422 EXTRACTION_FAILED (UI asks for manual paste) | 503 AI_NOT_CONFIGURED
 * Pasted text wins over the URL; the URL is then kept as the source reference only.
 * Generation runs in the background; poll GET /api/generation-jobs/[id].
 */
export async function POST(request: Request): Promise<Response> {
  const body = await parseJsonBody(request, CreatePackageRequestSchema);
  if ("response" in body) return body.response;
  const input = body.data;

  if (!input.rawText && !input.sourceUrl) {
    return jsonError(
      400,
      "Provide a job URL or paste the job description (at least 80 characters).",
      "VALIDATION_ERROR",
      {
        issues: [{ path: "rawText", message: "Provide a job URL or paste the job description." }],
      },
    );
  }

  const provider = getProviderForGeneration();
  if (!provider) {
    return jsonError(
      503,
      "No AI provider is configured on the server. See Settings for setup instructions.",
      "AI_NOT_CONFIGURED",
    );
  }

  let jd: NormalizedJd;
  try {
    jd = input.rawText
      ? normalizeManualJd({
          companyName: input.companyName,
          jobTitle: input.jobTitle,
          rawText: input.rawText,
          sourceUrl: input.sourceUrl,
        })
      : await extractJobFromUrl(input.sourceUrl as string, { signal: request.signal });
  } catch (error) {
    if (isJdExtractionError(error) || !input.rawText) {
      const message = isJdExtractionError(error)
        ? error.message
        : "We couldn't read the job description from that URL.";
      return jsonError(
        422,
        `${message} Paste the job description text instead.`,
        "EXTRACTION_FAILED",
        isJdExtractionError(error) ? { reason: error.code } : {},
      );
    }
    return errorToResponse(error, "POST /api/packages (normalize)");
  }

  try {
    const meta = await createPackageShell({
      companyName: input.companyName,
      companyCode: toCompanyCode(input.companyName),
      jobTitle: input.jobTitle || jd.jobTitle,
      sourceUrl: input.sourceUrl ?? jd.sourceUrl,
      jd,
    });
    const packageId = (await getPackageIdBySlug(meta.slug)) ?? meta.id;
    const job = await startPackageGeneration({ packageId, provider });
    return Response.json({ slug: meta.slug, jobId: job.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorToResponse(error, "POST /api/packages");
  }
}
