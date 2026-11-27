"use client";

import Link from "next/link";
import { ExternalLink, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";
import { ExportDialog } from "@/features/export/ExportDialog";
import { cn } from "@/lib/utils";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Company, role, run, source and package-level actions (export, flashcards). */
export function PackageHeader({ pkg }: { pkg: InterviewPackage }) {
  const { meta, sections, sectionStates } = pkg;
  const ready = SECTION_KEYS.filter((k) => sectionStates[k].status === "ready").length;
  const stats = [
    { label: "questions", count: sections.bilingual?.questions.length ?? 0 },
    { label: "system design", count: sections.systemDesign?.scenarios.length ?? 0 },
    { label: "coding", count: sections.coding?.exercises.length ?? 0 },
    { label: "behavioral", count: sections.star?.questions.length ?? 0 },
  ].filter((s) => s.count > 0);

  return (
    <header className="space-y-3 border-b pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          Run #10
        </Badge>
        {meta.isSample && <Badge variant="secondary">Sample package</Badge>}
        <span className="text-muted-foreground text-xs">
          {ready}/{SECTION_KEYS.length} sections ready
        </span>
      </div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">{meta.companyName}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{meta.jobTitle}</h1>
      </div>
      {stats.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {stats.map((s, i) => (
            <span key={s.label}>
              {i > 0 && <span aria-hidden> · </span>}
              <span className="text-foreground font-medium tabular-nums">{s.count}</span> {s.label}
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <ExportDialog pkg={pkg} />
        <Link
          href={`/packages/${meta.slug}/flashcards`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Layers className="size-3.5" aria-hidden />
          Flashcards
        </Link>
        {meta.sourceUrl && (
          <a
            href={meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground gap-1.5")}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            <span>
              Source: {hostname(meta.sourceUrl)}
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
        )}
      </div>
    </header>
  );
}
