"use client";

import { useMemo } from "react";
import { collectStudyItems } from "@/domain/package/items";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_DEFINITIONS } from "@/domain/package/sections";
import { GenerationProgressBanner } from "@/features/generation/GenerationProgressBanner";
import { ProgressPanel } from "@/features/study/ProgressPanel";
import { useProgressSync } from "@/features/study/use-progress-sync";
import { PackageHeader } from "./PackageHeader";
import { PackageSection } from "./PackageSection";
import { PackageToolbar } from "./PackageToolbar";
import { TableOfContents } from "./TableOfContents";
import { buildToc, flattenToc } from "./toc";
import { useActiveSectionTracking, usePackageNavigation } from "./use-package-navigation";

/**
 * Package page body. Layout: (left sidebar from AppShell) | sticky toolbar + header +
 * 16 sections | right sidebar (≥xl) with table of contents and study progress.
 */
export function PackageView({ pkg }: { pkg: InterviewPackage }) {
  const { slug, companyCode } = pkg.meta;
  const items = useMemo(() => collectStudyItems(pkg), [pkg]);
  const toc = useMemo(() => buildToc(pkg), [pkg]);
  const entries = useMemo(() => flattenToc(toc), [toc]);

  useProgressSync(slug);
  useActiveSectionTracking(toc);
  usePackageNavigation({ slug, companyCode, items });

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">
        <PackageToolbar pkg={pkg} items={items} toc={toc} entries={entries} />
        <article className="mx-auto max-w-4xl px-4 pt-6 pb-24 sm:px-6">
          <PackageHeader pkg={pkg} />
          <div className="mt-6 empty:hidden">
            <GenerationProgressBanner pkg={pkg} />
          </div>
          {toc.map((entry) => (
            <PackageSection
              key={entry.key}
              pkg={pkg}
              def={SECTION_DEFINITIONS[entry.key]}
              anchorId={entry.anchorId}
              bookmark={entry.bookmark}
            />
          ))}
        </article>
      </div>
      <aside
        aria-label="Table of contents and progress"
        className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-l px-3 py-4 xl:block"
      >
        <TableOfContents toc={toc} />
        <div className="mt-6 border-t pt-4">
          <ProgressPanel pkg={pkg} />
        </div>
      </aside>
    </div>
  );
}
