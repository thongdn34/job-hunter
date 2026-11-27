import type { LucideIcon } from "lucide-react";
import { FilePlus2, LayoutDashboard, Settings, UserRound } from "lucide-react";
import type { Bilingual, LanguageMode } from "@/domain/common/schema";

export interface NavLink {
  href: string;
  label: Bilingual;
  icon: LucideIcon;
}

/** Primary navigation shown in the header (desktop) and the mobile sheet. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: { en: "Dashboard", vi: "Tổng quan" }, icon: LayoutDashboard },
  { href: "/packages/new", label: { en: "New package", vi: "Gói mới" }, icon: FilePlus2 },
  { href: "/profile", label: { en: "Profile", vi: "Hồ sơ" }, icon: UserRound },
  { href: "/settings", label: { en: "Settings", vi: "Cài đặt" }, icon: Settings },
];

/** "/" only matches exactly; other links match their subtree. "/packages/new" never marks a package page active. */
export function isNavLinkActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Extracts the package slug from "/packages/<slug>[/...]" (excluding "/packages/new"). */
export function activePackageSlug(pathname: string | null): string | null {
  const match = pathname?.match(/^\/packages\/([a-z0-9-]+)(?:\/|$)/);
  if (!match || match[1] === "new") return null;
  return match[1];
}

/** Compact single-language label for narrow navigation (bilingual mode shows English). */
export function navLabel(value: Bilingual, language: LanguageMode): string {
  return language === "vi" ? value.vi : value.en;
}
