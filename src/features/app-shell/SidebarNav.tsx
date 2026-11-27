"use client";

import { memo, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sectionAnchorId } from "@/domain/package/bookmarks";
import type { PackageSummary } from "@/domain/package/schema";
import { SECTIONS, type SectionDefinition } from "@/domain/package/sections";
import { useIsActiveAnchor } from "@/features/package-view/active-section-store";
import { scrollToAnchor } from "@/features/package-view/navigation";
import { useLanguage } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";
import { activePackageSlug, navLabel } from "./nav-config";

export interface SidebarNavProps {
  packages: PackageSummary[];
  /**
   * Called after a link is activated. When `anchorId` is set the link targets the
   * current page and the caller is responsible for scrolling (e.g. after closing a sheet).
   * Without this prop, in-page links scroll immediately.
   */
  onNavigate?: (anchorId?: string) => void;
}

/** Package list + numbered sections of the open package. Used by the desktop sidebar and the mobile sheet. */
export function SidebarNav({ packages, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const activeSlug = activePackageSlug(pathname);
  const active = packages.find((p) => p.slug === activeSlug) ?? null;

  return (
    <nav aria-label="Packages" className="flex flex-col gap-6 text-sm">
      <div>
        <h2 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">Packages</h2>
        {packages.length === 0 ? (
          <p className="text-muted-foreground px-2 text-xs">
            No packages yet.{" "}
            <Link href="/packages/new" className="underline underline-offset-2" onClick={() => onNavigate?.()}>
              Create one
            </Link>
          </p>
        ) : (
          <ul className="space-y-0.5">
            {packages.map((p) => {
              const current = p.slug === activeSlug;
              return (
                <li key={p.slug}>
                  <Link
                    href={`/packages/${p.slug}`}
                    aria-current={current && pathname === `/packages/${p.slug}` ? "page" : undefined}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "hover:bg-muted focus-visible:ring-ring flex items-start gap-2 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2",
                      current && "bg-muted",
                    )}
                  >
                    <FolderOpen className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{p.companyName}</span>
                        {p.isSample && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                            Sample
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">{p.jobTitle}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active && (
        <div>
          <h2 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">
            <span className="sr-only">{active.companyName} </span>Sections
          </h2>
          <ol className="space-y-0.5">
            {SECTIONS.map((def) => (
              <SectionLink
                key={def.key}
                def={def}
                slug={active.slug}
                anchorId={sectionAnchorId(active.companyCode, def.key)}
                onNavigate={onNavigate}
              />
            ))}
          </ol>
        </div>
      )}
    </nav>
  );
}

const SectionLink = memo(function SectionLink({
  def,
  slug,
  anchorId,
  onNavigate,
}: {
  def: SectionDefinition;
  slug: string;
  anchorId: string;
  onNavigate?: (anchorId?: string) => void;
}) {
  const language = useLanguage();
  const isActive = useIsActiveAnchor(anchorId);
  const href = `/packages/${slug}#${anchorId}`;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (window.location.pathname !== `/packages/${slug}`) {
      onNavigate?.();
      return; // Cross-page: Next navigates; PackageView handles the fragment on mount.
    }
    event.preventDefault();
    if (onNavigate) onNavigate(anchorId);
    else scrollToAnchor(anchorId);
  };

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "location" : undefined}
        className={cn(
          "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex items-baseline gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2",
          isActive && "bg-muted text-foreground font-medium",
        )}
      >
        <span className="w-5 shrink-0 text-right text-xs tabular-nums" aria-hidden>
          {def.number}.
        </span>
        <span className="min-w-0 truncate" lang={language === "vi" ? "vi" : "en"}>
          <span className="sr-only">{def.number}. </span>
          {navLabel(def.title, language)}
        </span>
      </Link>
    </li>
  );
});
