import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { ISB_EXPORT_BASENAME, Q20, openIsbPackage } from "./fixtures";

async function openExportDialog(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export package" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("16 of 16 ready sections selected.")).toBeVisible();
  return dialog;
}

async function download(page: Page, formatLabel: RegExp) {
  const dialog = await openExportDialog(page);
  await dialog.getByRole("radio", { name: formatLabel }).check();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Download" }).click();
  const file = await downloadPromise;
  await expect(dialog).toBeHidden();
  const path = await file.path();
  return { filename: file.suggestedFilename(), content: await readFile(path, "utf8") };
}

test.describe("export", () => {
  test.beforeEach(async ({ page }) => {
    await openIsbPackage(page);
  });

  test("downloads Markdown with collapsed answers and bookmarks", async ({ page }) => {
    const { filename, content } = await download(page, /Markdown/);
    expect(filename).toBe(`${ISB_EXPORT_BASENAME}.md`);
    expect(content).toContain("BOOKMARK_ISB_BILINGUAL");
    // Answer text that is collapsed in the app is included in the export.
    expect(content).toContain(Q20.answerPhrase);
    expect(content).toContain(Q20.en);
  });

  test("downloads schema-shaped JSON with all 16 sections", async ({ page }) => {
    const { filename, content } = await download(page, /JSON/);
    expect(filename).toBe(`${ISB_EXPORT_BASENAME}.json`);
    const parsed = JSON.parse(content) as { meta: { slug: string }; sections: Record<string, unknown> };
    expect(parsed.meta.slug).toBe("isb-vietnam-senior-frontend-developer");
    expect(Object.keys(parsed.sections)).toHaveLength(16);
  });

  test("downloads a standalone HTML file with accordions", async ({ page }) => {
    const { filename, content } = await download(page, /Standalone HTML/);
    expect(filename).toBe(`${ISB_EXPORT_BASENAME}.html`);
    expect(content).toMatch(/^<!doctype html>/i);
    expect(content).toContain("<details");
    expect(content).toContain("BOOKMARK_ISB_BILINGUAL");
    expect(content).toContain(Q20.answerPhrase);
  });

  test("opens the print view in a new tab", async ({ page, context }) => {
    // Keep the auto-print dialog from blocking the headless browser.
    await context.addInitScript(() => {
      window.print = () => {
        (window as unknown as { __printed?: boolean }).__printed = true;
      };
    });
    const dialog = await openExportDialog(page);
    await dialog.getByRole("radio", { name: /PDF \(print\)/ }).check();
    const popupPromise = page.waitForEvent("popup");
    await dialog.getByRole("link", { name: /Open print view/ }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    await expect(popup).toHaveURL(/\/print\/isb-vietnam-senior-frontend-developer\?/);
    await expect(popup).toHaveTitle(/ISB Vietnam — Senior Front-End Developer \(print\)/);
    await expect(popup.getByText("BOOKMARK_ISB_BILINGUAL").first()).toBeVisible();
    // Everything is expanded in the print view, including answers collapsed in the app.
    await expect(popup.getByText(Q20.answerPhrase).first()).toBeVisible();
    // The print view prints from an effect after hydration, which is slow for this page on CI.
    await expect
      .poll(() => popup.evaluate(() => (window as unknown as { __printed?: boolean }).__printed === true), {
        timeout: 30_000,
      })
      .toBe(true);
  });
});
