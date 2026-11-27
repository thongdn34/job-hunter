"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";
import { isNavLinkActive, NAV_LINKS, navLabel } from "./nav-config";

/** Primary app navigation. Horizontal in the header, vertical in the mobile sheet. */
export function MainNav({
  orientation = "horizontal",
  className,
  onNavigate,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const language = useLanguage();
  const vertical = orientation === "vertical";
  return (
    <nav aria-label="Main" className={className}>
      <ul className={cn("flex gap-1", vertical ? "flex-col" : "items-center")}>
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isNavLinkActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span lang={language === "vi" ? "vi" : "en"}>{navLabel(label, language)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
