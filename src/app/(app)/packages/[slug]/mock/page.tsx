import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SECTION_DEFINITIONS } from "@/domain/package/sections";
import { sectionAnchorId } from "@/domain/package/bookmarks";
import { buildMockClientItems } from "@/domain/mock/client-items";
import { getPackageBySlug } from "@/server/repositories/package-repository";
import { MockInterview } from "@/features/mock-interview/MockInterviewSection";

// Reads the local database on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  return { title: pkg ? `Mock interview · ${pkg.meta.companyName}` : "Mock interview" };
}

export default async function MockInterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();
  const data = pkg.sections.mock;
  const def = SECTION_DEFINITIONS.mock;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <Link
          href={`/packages/${encodeURIComponent(slug)}#${sectionAnchorId(pkg.meta.companyCode, "mock")}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-md text-sm focus-visible:ring-3 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to {pkg.meta.companyName} package
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {def.number}. {def.title.en}
          <span className="text-muted-foreground mt-1 block text-base font-normal" lang="vi">
            {def.title.vi}
          </span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {pkg.meta.jobTitle} · {pkg.meta.companyName}
        </p>
      </div>
      {data ? (
        // Only the slim item DTOs cross to the client — never the whole package (~1 MB of sections).
        <MockInterview slug={pkg.meta.slug} config={data} items={buildMockClientItems(pkg)} variant="page" />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
          The mock interview section has not been generated for this package yet.
        </p>
      )}
    </div>
  );
}
