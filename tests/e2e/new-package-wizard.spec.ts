import { expect, test } from "@playwright/test";

const JD_TEXT = `Senior React Engineer — E2E Test Co

We are building a real-time analytics dashboard for logistics customers.

Responsibilities:
- Build and maintain React + TypeScript features in a Next.js application.
- Own frontend performance: rendering, bundle size and Core Web Vitals.
- Integrate WebSocket streams and REST APIs; write unit and end-to-end tests.

Requirements:
- 5+ years of frontend development with React and TypeScript.
- Experience with state management (Zustand or Redux) and data fetching (TanStack Query).
- Good English communication skills.`;

test.describe("new package wizard", () => {
  // Generation with the mock provider runs 16 sections; leave enough time for it.
  test.setTimeout(120_000);

  let createdSlug: string | null = null;

  test.afterEach(async ({ request }) => {
    if (!createdSlug) return;
    const res = await request.delete(`/api/packages/${createdSlug}`);
    expect([204, 404]).toContain(res.status());
    createdSlug = null;
  });

  test("manual paste with the mock provider generates all 16 sections", async ({ page, request }) => {
    const companyName = `E2E Test Co ${Date.now().toString(36)}`;

    await page.goto("/packages/new");
    await expect(page.getByRole("heading", { level: 1, name: "New Run #10 package" })).toBeVisible();

    // Step 1: job description (paste mode).
    await page.getByLabel("Company name").fill(companyName);
    await page.getByLabel(/Job title/).fill("Senior React Engineer");
    await page.getByRole("tab", { name: "Paste description" }).click();
    await page.getByRole("textbox", { name: "Job description" }).fill(JD_TEXT);
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: profile review.
    await expect(page.getByRole("heading", { level: 2, name: /Your profile/ })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: generate.
    await expect(page.getByRole("heading", { level: 2, name: /Generate/ })).toBeVisible();
    await expect(page.getByText(companyName)).toBeVisible();
    const generate = page.getByRole("button", { name: "Generate package" });
    await expect(generate).toBeEnabled();
    await generate.click();

    await page.waitForURL(/\/packages\/(?!new)[a-z0-9-]+$/);
    createdSlug = decodeURIComponent(new URL(page.url()).pathname.split("/").pop() ?? "");
    expect(createdSlug).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: "Senior React Engineer" })).toBeVisible();
    await expect(page.getByText(companyName).first()).toBeVisible();

    // The server finishes all 16 sections.
    await expect
      .poll(
        async () => {
          const res = await request.get(`/api/packages/${createdSlug}`);
          if (!res.ok()) return -1;
          const body = (await res.json()) as { package: { sectionStates: Record<string, { status: string }> } };
          return Object.values(body.package.sectionStates).filter((s) => s.status === "ready").length;
        },
        { timeout: 60_000, intervals: [1_000] },
      )
      .toBe(16);

    // The page picks the finished sections up through its polling + refresh.
    await expect(page.getByText("16/16 sections ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("section[data-section]")).toHaveCount(16);
  });
});
