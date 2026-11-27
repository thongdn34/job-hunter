"use client";

import { memo, type ComponentType } from "react";
import { BilingualText } from "@/components/common/BilingualText";
import { BookmarkMarker } from "@/components/common/BookmarkMarker";
import { Badge } from "@/components/ui/badge";
import type { InterviewPackage } from "@/domain/package/schema";
import type { SectionDefinition, SectionKey } from "@/domain/package/sections";
import { SectionStatusPlaceholder } from "@/features/generation/SectionStatusPlaceholder";
import { SECTION_COMPONENTS } from "./section-registry";
import type { SectionProps } from "./section-types";

/** Content is rendered only when present and the section is ready (or stale but still usable). */
export function hasRenderableContent(pkg: InterviewPackage, key: SectionKey): boolean {
  const status = pkg.sectionStates[key].status;
  return pkg.sections[key] !== undefined && (status === "ready" || status === "stale");
}

/**
 * One Run #10 section: bookmark marker + numbered heading are always in the DOM
 * (Ctrl+F / deep links work even while content is pending).
 */
export const PackageSection = memo(function PackageSection({
  pkg,
  def,
  anchorId,
  bookmark,
}: {
  pkg: InterviewPackage;
  def: SectionDefinition;
  anchorId: string;
  bookmark: string;
}) {
  const headingId = `${anchorId}-heading`;
  const status = pkg.sectionStates[def.key].status;
  const Comp = SECTION_COMPONENTS[def.key] as ComponentType<SectionProps<SectionKey>>;
  const data = pkg.sections[def.key];

  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      data-section={def.key}
      className="scroll-mt-8 border-b py-10 last:border-b-0"
    >
      <BookmarkMarker bookmark={bookmark} anchorId={anchorId} className="mb-2" />
      <div className="mb-6 flex flex-wrap items-start gap-x-3 gap-y-1">
        <h2
          id={headingId}
          data-anchor-heading
          className="text-xl font-semibold tracking-tight outline-none sm:text-2xl"
        >
          <span className="text-muted-foreground tabular-nums">{def.number}. </span>
          <BilingualText value={def.title} viClassName="mt-0.5 text-base font-normal sm:text-lg" />
        </h2>
        {status === "stale" && (
          <Badge variant="outline" className="mt-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
            Outdated — inputs changed
          </Badge>
        )}
      </div>
      {hasRenderableContent(pkg, def.key) ? (
        <Comp pkg={pkg} data={data as SectionProps<SectionKey>["data"]} />
      ) : (
        <SectionStatusPlaceholder pkg={pkg} sectionKey={def.key} />
      )}
    </section>
  );
});
