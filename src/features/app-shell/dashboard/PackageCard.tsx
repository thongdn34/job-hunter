import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PackageSummary } from "@/domain/package/schema";
import { StudyProgressStat } from "./StudyProgressStat";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Dashboard card. The whole card is clickable through a stretched title link. */
export function PackageCard({ pkg, totalItems }: { pkg: PackageSummary; totalItems: number }) {
  const readyPercent = pkg.totalSections > 0 ? Math.round((pkg.readySections / pkg.totalSections) * 100) : 0;
  const updated = formatDate(pkg.updatedAt);
  return (
    <li className="group bg-card text-card-foreground focus-within:ring-ring hover:border-foreground/20 relative flex flex-col rounded-xl border p-4 shadow-xs transition-colors focus-within:ring-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-sm font-medium">{pkg.companyName}</p>
          <h3 className="mt-0.5 font-semibold tracking-tight text-balance">
            <Link href={`/packages/${pkg.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-xl">
              {pkg.jobTitle}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          {pkg.isSample && <Badge variant="secondary">Sample</Badge>}
          <Badge variant="outline" className="font-mono">
            {pkg.companyCode}
          </Badge>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-muted-foreground text-xs">Sections</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums">
            {pkg.readySections}/{pkg.totalSections}
            <span className="sr-only"> ready</span>
            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full" aria-hidden>
              <div className="bg-primary h-full rounded-full" style={{ width: `${readyPercent}%` }} />
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Questions</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums">{pkg.questionCount}</dd>
        </div>
        <StudyProgressStat slug={pkg.slug} totalItems={totalItems} />
      </dl>

      <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
        <span>{updated && <>Updated {updated}</>}</span>
        <span className="text-foreground inline-flex items-center gap-1 font-medium group-hover:underline" aria-hidden>
          Open <ArrowRight className="size-3.5" />
        </span>
      </div>
    </li>
  );
}
