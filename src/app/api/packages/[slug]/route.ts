import { NextResponse } from "next/server";
import {
  PackageNotFoundError,
  SamplePackageError,
  deletePackage,
  getPackageBySlug,
  getPackageIdBySlug,
} from "@/server/repositories/package-repository";
import { getLatestJobForPackage, requestJobCancel } from "@/server/repositories/generation-job-repository";
import { getJobRunner } from "@/server/generation/job-runner";

/** Stops an in-flight generation job so it cannot keep calling the model or write to a deleted package. */
async function stopActiveGeneration(slug: string): Promise<void> {
  const packageId = await getPackageIdBySlug(slug);
  if (!packageId) return;
  const job = await getLatestJobForPackage(packageId);
  if (job && (job.status === "queued" || job.status === "running")) {
    await requestJobCancel(job.id);
    await getJobRunner().stop(job.id, "Package deleted");
  }
}

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface ApiErrorBody {
  error: string;
  code: string;
}

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status });
}

/** GET /api/packages/[slug] -> { package } | 404 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  try {
    const pkg = await getPackageBySlug(slug);
    if (!pkg) return jsonError(404, "Interview package not found.", "not_found");
    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error(`[api/packages/${slug}] GET failed`, error);
    return jsonError(500, "Could not load the interview package. Please try again.", "internal");
  }
}

/** DELETE /api/packages/[slug] -> 204 | 403 (built-in sample) | 404 (unknown) */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  try {
    await stopActiveGeneration(slug).catch((error) =>
      console.warn(`[api/packages/${slug}] could not stop generation`, error),
    );
    await deletePackage(slug);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SamplePackageError) {
      return jsonError(403, "The built-in sample package cannot be deleted.", "sample_package");
    }
    if (error instanceof PackageNotFoundError) {
      return jsonError(404, "Interview package not found.", "not_found");
    }
    console.error(`[api/packages/${slug}] DELETE failed`, error);
    return jsonError(500, "Could not delete the interview package. Please try again.", "internal");
  }
}
