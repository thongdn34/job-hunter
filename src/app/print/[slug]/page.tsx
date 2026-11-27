import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXPORT_CSS } from "@/domain/export/html-assets";
import { buildPrintBodyUrl, describeIssues, PrintQuerySchema, searchParamsToObject } from "@/domain/export/options";
import { resolveSections } from "@/domain/export/shared";
import { getPackageBySlug } from "@/server/repositories/package-repository";
import { PrintView } from "./PrintView";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Diagrams are rendered with Mermaid's light theme for paper; keep them on a light surface on screen too. */
const PRINT_VIEW_CSS = `.jh-print-view .jh-export pre.mermaid[data-processed] { background: #fff; border-radius: 8px; }`;

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  return {
    title: pkg ? `${pkg.meta.companyName} — ${pkg.meta.jobTitle} (print)` : "Print",
    robots: { index: false, follow: false },
  };
}

/** Print-friendly view (outside the app shell): selected sections, fully expanded, for "Save as PDF". */
export default async function PrintPage({ params, searchParams }: PrintPageProps) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const parsed = PrintQuerySchema.safeParse(searchParamsToObject(await searchParams));
  const backHref = `/packages/${encodeURIComponent(slug)}`;

  if (!parsed.success) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Cannot open the print view</h1>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          {describeIssues(parsed.error).map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>
              <code>{issue.path}</code>: {issue.message}
            </li>
          ))}
        </ul>
        <Link href={backHref} className="text-primary text-sm font-medium underline underline-offset-4">
          Back to package
        </Link>
      </main>
    );
  }

  const { sections, lang, autoprint } = parsed.data;
  const sectionCount = resolveSections(pkg, sections).length;
  const bodyUrl = buildPrintBodyUrl(slug, { sections, lang });

  // The export body (~2 MB for a full package) is fetched by PrintView after mount: rendering it
  // here would send it twice, once in the SSR markup and again (JSON-escaped) in the RSC payload.
  return (
    <div className="jh-print-view bg-background min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: EXPORT_CSS + PRINT_VIEW_CSS }} />
      <PrintView
        bodyUrl={bodyUrl}
        backHref={backHref}
        autoprint={autoprint && sectionCount > 0}
        sectionCount={sectionCount}
      />
    </div>
  );
}
