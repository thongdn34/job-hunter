import { expect, test } from "@playwright/test";
import { ISB_PATH, SYSTEM_DESIGN_ANCHOR, openIsbPackage } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });

test("mobile: navigation sheet opens and the language switch stays visible", async ({ page }) => {
  await openIsbPackage(page);

  const languages = page.getByRole("radiogroup", { name: "Content language" });
  await expect(languages).toBeVisible();
  await expect(languages.getByRole("radio", { name: "EN, English" })).toBeVisible();
  await expect(languages.getByRole("radio", { name: "VI, Tiếng Việt" })).toBeVisible();
  // Desktop sidebars are hidden at this width.
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();

  // No horizontal page scroll.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Open navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Job Hunter" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("navigation", { name: "Packages" })).toBeVisible();

  const sectionLink = sheet.locator(`a[href="${ISB_PATH}#${SYSTEM_DESIGN_ANCHOR}"]`);
  await expect(sectionLink).toBeVisible();
  await sectionLink.click();

  await expect(sheet).toBeHidden();
  await expect(page.locator(`#${SYSTEM_DESIGN_ANCHOR}-heading`)).toBeInViewport();

  // Language switch works on mobile.
  await languages.getByRole("radio", { name: "EN, English" }).click();
  await expect(languages.getByRole("radio", { name: "EN, English" })).toHaveAttribute("aria-checked", "true");
});
