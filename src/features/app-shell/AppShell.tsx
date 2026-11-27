import type { ReactNode } from "react";
import type { PackageSummary } from "@/domain/package/schema";
import { AppHeader } from "./AppHeader";
import { SidebarNav } from "./SidebarNav";

/**
 * Server-compatible application frame: skip link, sticky header (brand, nav, language,
 * theme, mobile menu), desktop left sidebar (packages + sections of the open package)
 * and the main landmark. Interactive parts are client components.
 */
export function AppShell({ packages, children }: { packages: PackageSummary[]; children: ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppHeader packages={packages} />
      <div className="flex">
        <aside
          aria-label="Sidebar"
          className="bg-sidebar/40 sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r px-2 py-4 lg:block"
        >
          <SidebarNav packages={packages} />
        </aside>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
