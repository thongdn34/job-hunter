import { describe, expect, it } from "vitest";
import { studiedPercent } from "./dashboard/StudyProgressStat";
import { activePackageSlug, isNavLinkActive, navLabel } from "./nav-config";

describe("isNavLinkActive", () => {
  it("matches the dashboard only exactly", () => {
    expect(isNavLinkActive("/", "/")).toBe(true);
    expect(isNavLinkActive("/", "/profile")).toBe(false);
  });

  it("matches nested routes for other links", () => {
    expect(isNavLinkActive("/settings", "/settings")).toBe(true);
    expect(isNavLinkActive("/settings", "/settings/ai")).toBe(true);
    expect(isNavLinkActive("/settings", "/settingsx")).toBe(false);
    expect(isNavLinkActive("/profile", null)).toBe(false);
  });
});

describe("activePackageSlug", () => {
  it("extracts the slug from package routes", () => {
    expect(activePackageSlug("/packages/isb-vietnam-senior-frontend-developer")).toBe(
      "isb-vietnam-senior-frontend-developer",
    );
    expect(activePackageSlug("/packages/isb/flashcards")).toBe("isb");
  });

  it("ignores the new-package route and other pages", () => {
    expect(activePackageSlug("/packages/new")).toBeNull();
    expect(activePackageSlug("/packages")).toBeNull();
    expect(activePackageSlug("/")).toBeNull();
    expect(activePackageSlug(null)).toBeNull();
  });
});

describe("navLabel", () => {
  it("uses Vietnamese only in vi mode", () => {
    const v = { en: "Dashboard", vi: "Tổng quan" };
    expect(navLabel(v, "vi")).toBe("Tổng quan");
    expect(navLabel(v, "en")).toBe("Dashboard");
    expect(navLabel(v, "bilingual")).toBe("Dashboard");
  });
});

describe("studiedPercent", () => {
  it("rounds and clamps", () => {
    expect(studiedPercent(1, 3)).toBe(33);
    expect(studiedPercent(5, 3)).toBe(100);
    expect(studiedPercent(0, 0)).toBe(0);
  });
});
