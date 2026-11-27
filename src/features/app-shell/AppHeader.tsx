"use client";

import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import type { PackageSummary } from "@/domain/package/schema";
import { LanguageSwitch } from "./LanguageSwitch";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

/** Sticky top bar. The language switch stays visible at every breakpoint. */
export function AppHeader({ packages }: { packages: PackageSummary[] }) {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 h-14 border-b backdrop-blur">
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">
        <MobileNav packages={packages} />
        <Link
          href="/"
          className="focus-visible:ring-ring flex shrink-0 items-center gap-2 rounded-md px-1 font-semibold outline-none focus-visible:ring-2"
        >
          <BriefcaseBusiness className="text-primary size-5" aria-hidden />
          <span className="hidden sm:inline">Job Hunter</span>
          <span className="sr-only sm:hidden">Job Hunter</span>
        </Link>
        <MainNav className="ml-2 hidden md:block" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
