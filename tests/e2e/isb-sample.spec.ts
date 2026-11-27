import { expect, test } from "@playwright/test";
import {
  ISB_PATH,
  ISB_STUDY_ITEM_COUNT,
  ISB_SLUG,
  Q01,
  Q13,
  Q20,
  SYSTEM_DESIGN_ANCHOR,
  itemHeader,
  openIsbPackage,
  resetProgress,
  studyItem,
} from "./fixtures";

// Instant scrolling makes "in view" assertions deterministic.
test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ request }) => {
  await resetProgress(request);
});

test.afterAll(async ({ request }) => {
  await resetProgress(request);
});

test.describe("ISB sample package", () => {
  test("opens the sample package from the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2, name: "Your packages" })).toBeVisible();

    await page.getByRole("link", { name: "Open the ISB Vietnam sample" }).click();

    await expect(page).toHaveURL(new RegExp(`${ISB_PATH}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Senior Front-End Developer" })).toBeVisible();
    await expect(page.getByText("Sample package", { exact: true })).toBeVisible();
    await expect(page.getByText("16/16 sections ready")).toBeVisible();
    // All 16 numbered section headings are rendered.
    await expect(page.locator("section[data-section]")).toHaveCount(16);
  });

  test("navigates to a bookmarked section from the table of contents", async ({ page }) => {
    await openIsbPackage(page);
    const toc = page.getByRole("navigation", { name: "On this page" });
    const tocLink = toc.locator(`a[href="#${SYSTEM_DESIGN_ANCHOR}"]`);
    await expect(tocLink).toHaveAccessibleName(/8\.\s*System Design/);

    await tocLink.click();

    await expect(page).toHaveURL(new RegExp(`#${SYSTEM_DESIGN_ANCHOR}$`));
    await expect(page.locator(`#${SYSTEM_DESIGN_ANCHOR}-heading`)).toBeInViewport();
    await expect(page.locator(`#${SYSTEM_DESIGN_ANCHOR}-heading`)).toBeFocused();
    // TEMP-DIAG
    await page.waitForTimeout(3000);
    console.log(
      "DIAG",
      JSON.stringify(
        await page.evaluate(() => ({
          scrollY: window.scrollY,
          h: window.innerHeight,
          maxScroll: document.documentElement.scrollHeight,
          toc: [...document.querySelectorAll('nav[aria-label="On this page"] a')].map((a) => [
            a.getAttribute("href"),
            a.getAttribute("aria-current"),
          ]),
          sections: [...document.querySelectorAll("section[data-section]")].map((el) => {
            const r = el.getBoundingClientRect();
            return [el.id, Math.round(r.top), Math.round(r.bottom)];
          }),
        })),
      ),
    );
    await expect(tocLink).toHaveAttribute("aria-current", "location");
    // The left sidebar highlights the same section.
    const sidebarLink = page
      .getByRole("navigation", { name: "Packages" })
      .locator(`a[href="${ISB_PATH}#${SYSTEM_DESIGN_ANCHOR}"]`);
    await expect(sidebarLink).toHaveAttribute("aria-current", "location");
  });

  test("deep link to a bookmark scrolls it into view and marks it active", async ({ page }) => {
    await openIsbPackage(page, `#${SYSTEM_DESIGN_ANCHOR}`);

    await expect(page.locator(`#${SYSTEM_DESIGN_ANCHOR}-heading`)).toBeInViewport();
    await expect(page.locator(`[data-bookmark="BOOKMARK_ISB_SYSTEM_DESIGN"]`)).toBeVisible();
    const tocLink = page
      .getByRole("navigation", { name: "On this page" })
      .locator(`a[href="#${SYSTEM_DESIGN_ANCHOR}"]`);
    await expect(tocLink).toHaveAttribute("aria-current", "location");
  });

  test("expands an interview question with the keyboard and the mouse", async ({ page }) => {
    await openIsbPackage(page);
    const header = itemHeader(page, Q01.id);
    const answer = studyItem(page, Q01.id).getByText(Q01.answerStart);

    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(header).toHaveAttribute("aria-controls", `item-${Q01.id}-panel`);
    await expect(answer).toHaveCount(0); // collapsed bodies are not rendered

    // Keyboard: Enter opens, Space closes.
    await header.focus();
    await page.keyboard.press("Enter");
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await expect(page.getByRole("group", { name: new RegExp(Q01.en.slice(0, 40)) })).toBeVisible();

    await page.keyboard.press("Space");
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();

    // Mouse.
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "false");
  });

  test("switches content language between EN, VI and bilingual", async ({ page }) => {
    await openIsbPackage(page);
    const languages = page.getByRole("radiogroup", { name: "Content language" });
    const item = studyItem(page, Q01.id);
    const en = item.getByText(Q01.en, { exact: true });
    const vi = item.getByText(Q01.vi, { exact: true });

    // Default: bilingual.
    await expect(languages.getByRole("radio", { name: "EN+VI, Bilingual" })).toHaveAttribute("aria-checked", "true");
    await expect(en).toBeVisible();
    await expect(vi).toBeVisible();
    await expect(vi).toHaveAttribute("lang", "vi");

    await languages.getByRole("radio", { name: "EN, English" }).click();
    await expect(languages.getByRole("radio", { name: "EN, English" })).toHaveAttribute("aria-checked", "true");
    await expect(en).toBeVisible();
    await expect(vi).toBeHidden();

    await languages.getByRole("radio", { name: "VI, Tiếng Việt" }).click();
    await expect(vi).toBeVisible();
    await expect(en).toBeHidden();

    await languages.getByRole("radio", { name: "EN+VI, Bilingual" }).click();
    await expect(en).toBeVisible();
    await expect(vi).toBeVisible();

    // Keyboard (radio group pattern): ArrowLeft from Bilingual selects Tiếng Việt.
    await languages.getByRole("radio", { name: "EN+VI, Bilingual" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(languages.getByRole("radio", { name: "VI, Tiếng Việt" })).toHaveAttribute("aria-checked", "true");
    await expect(en).toBeHidden();
  });

  test("global search finds text inside a collapsed answer and opens the question", async ({ page }) => {
    await openIsbPackage(page);
    const header = itemHeader(page, Q20.id);
    const answer = studyItem(page, Q20.id).getByText(Q20.answerPhrase);
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toHaveCount(0);

    const search = page.getByRole("combobox", { name: "Search questions, answers and sections" });
    await search.fill(Q20.searchQuery);
    const listbox = page.getByRole("listbox", { name: "Search results" });
    await expect(listbox).toBeVisible();
    const options = listbox.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText(Q20.en);
    await expect(options.first().locator("mark")).toHaveText(/tape looks dead/i);

    await options.first().click();

    await expect(listbox).toBeHidden();
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await expect(studyItem(page, Q20.id)).toBeInViewport();
    await expect(header).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`#item-${Q20.id}$`));
  });

  test("global search is keyboard operable (/ shortcut, arrows, Enter)", async ({ page }) => {
    await openIsbPackage(page);
    await page.locator("body").press("/");
    const search = page.getByRole("combobox", { name: "Search questions, answers and sections" });
    await expect(search).toBeFocused();
    await page.keyboard.type(Q20.searchQuery);
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(itemHeader(page, Q20.id)).toHaveAttribute("aria-expanded", "true");
    await expect(studyItem(page, Q20.id)).toBeInViewport();
  });

  test("deep link to a question auto-expands it", async ({ page }) => {
    await openIsbPackage(page, `#item-${Q13.id}`);
    const header = itemHeader(page, Q13.id);
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(studyItem(page, Q13.id).getByText(Q13.answerStart)).toBeVisible();
    await expect(studyItem(page, Q13.id)).toBeInViewport();
  });

  test("marks a question as studied and keeps it after reload", async ({ page, request }) => {
    await openIsbPackage(page);
    const panel = page.getByTestId("progress-panel");
    await expect(panel.getByText(`0 of ${ISB_STUDY_ITEM_COUNT}`)).toBeVisible();

    const item = studyItem(page, Q01.id);
    await itemHeader(page, Q01.id).click();
    const toggle = item.getByRole("button", { name: "Mark as studied" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();

    const studiedToggle = item.getByRole("button", { name: "Studied", exact: true });
    await expect(studiedToggle).toHaveAttribute("aria-pressed", "true");
    await expect(item.getByTestId("item-status")).toContainText("Studied");
    await expect(panel.getByText(`1 of ${ISB_STUDY_ITEM_COUNT}`)).toBeVisible();
    await expect(panel.getByText("2%")).toBeVisible();

    // The change is synced to the server (debounced PUT).
    await expect
      .poll(async () => {
        const res = await request.get(`/api/progress/${ISB_SLUG}`);
        const body = (await res.json()) as { progress: { studied: string[] } | null };
        return body.progress?.studied ?? [];
      })
      .toContain(Q01.id);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Senior Front-End Developer" })).toBeVisible();
    await expect(studyItem(page, Q01.id).getByTestId("item-status")).toContainText("Studied");
    await expect(page.getByTestId("progress-panel").getByText(`1 of ${ISB_STUDY_ITEM_COUNT}`)).toBeVisible();
    await itemHeader(page, Q01.id).click();
    await expect(studyItem(page, Q01.id).getByRole("button", { name: "Studied", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("studied state is restored from the server in a fresh browser context", async ({ browser, page }) => {
    await openIsbPackage(page);
    await itemHeader(page, Q01.id).click();
    await studyItem(page, Q01.id).getByRole("button", { name: "Mark as studied" }).click();
    await expect(page.getByTestId("progress-panel").getByText(`1 of ${ISB_STUDY_ITEM_COUNT}`)).toBeVisible();
    // Let the debounced sync flush, then open the package in a brand-new context (empty localStorage).
    await page.waitForTimeout(1500);
    await page.close();

    const context = await browser.newContext({ reducedMotion: "reduce", baseURL: test.info().project.use.baseURL });
    try {
      const fresh = await context.newPage();
      await openIsbPackage(fresh);
      await expect(studyItem(fresh, Q01.id).getByTestId("item-status")).toContainText("Studied");
      await expect(fresh.getByTestId("progress-panel").getByText(`1 of ${ISB_STUDY_ITEM_COUNT}`)).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
