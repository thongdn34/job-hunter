import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, FolderOpen, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { collectStudyItems } from "@/domain/package/items";
import type { PackageSummary } from "@/domain/package/schema";
import { PackageCard } from "@/features/app-shell/dashboard/PackageCard";
import { getPackageBySlug, listPackages } from "@/server/repositories/package-repository";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

const PIPELINE: Array<{ title: string; body: string }> = [
  { title: "Add the job", body: "Paste a job URL or the description text. Job pages are treated as untrusted data." },
  {
    title: "Normalize & verify",
    body: "The JD is extracted into structured facts, each marked verified, unverified or assumption.",
  },
  { title: "Match your profile", body: "Requirements are scored against your real experience — nothing is invented." },
  {
    title: "Generate 16 sections",
    body: "Sections are generated in dependency order, validated with Zod and retried individually on failure.",
  },
  {
    title: "Study & rehearse",
    body: "Bilingual answers, bookmarks, search, flashcards, study plans and a mock interview.",
  },
  { title: "Export", body: "Download Markdown, JSON, standalone HTML or print to PDF." },
];

/** Total study items per package, used as the denominator for "studied %". */
async function countStudyItems(summary: PackageSummary): Promise<number> {
  try {
    const pkg = await getPackageBySlug(summary.slug);
    return pkg ? collectStudyItems(pkg).length : summary.questionCount;
  } catch {
    return summary.questionCount;
  }
}

export default async function DashboardPage() {
  const packages = await listPackages();
  const totals = await Promise.all(packages.map(countStudyItems));
  const sample = packages.find((p) => p.isSample);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      <section aria-labelledby="hero-title" className="bg-card rounded-2xl border p-6 sm:p-10">
        <p className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
          <Sparkles className="size-3.5" aria-hidden /> Run #10
        </p>
        <h1 id="hero-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Personalized, bilingual interview preparation for every application
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Turn a job description into a complete 16-section package: JD analysis, company research, candidate matching,
          tailored CV, bilingual technical questions, system design, coding, STAR stories, study plans and a mock
          interview.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/packages/new" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-4")}>
            <FilePlus2 aria-hidden />
            New Run #10 package
          </Link>
          {sample && (
            <Link
              href={`/packages/${sample.slug}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}
            >
              Open the {sample.companyName} sample
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="packages-title">
        <div className="mb-4 flex items-end justify-between gap-2">
          <h2 id="packages-title" className="text-xl font-semibold tracking-tight">
            Your packages
          </h2>
          {packages.length > 0 && (
            <span className="text-muted-foreground text-sm">
              {packages.length} package{packages.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {packages.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <FolderOpen className="text-muted-foreground size-8" aria-hidden />
            <h3 className="mt-3 font-medium">No packages yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Create your first Run #10 package from a job description to start preparing.
            </p>
            <Link href="/packages/new" className={cn(buttonVariants(), "mt-4")}>
              Create a package
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {packages.map((p, i) => (
              <PackageCard key={p.slug} pkg={p} totalItems={totals[i]} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="text-xl font-semibold tracking-tight">
          How Run #10 works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, i) => (
            <li key={step.title} className="rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <span
                  className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
