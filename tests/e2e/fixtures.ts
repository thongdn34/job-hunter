import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/** Seeded ISB sample package (see src/content/samples/isb/meta.ts). */
export const ISB_SLUG = "isb-vietnam-senior-frontend-developer";
export const ISB_PATH = `/packages/${ISB_SLUG}`;
export const ISB_EXPORT_BASENAME = "isb-senior-front-end-developer-run10";
/** Study items in the ISB sample (50 questions + 5 system design + coding + behavioral). */
export const ISB_STUDY_ITEM_COUNT = 65;

export const Q01 = {
  id: "isb-q01",
  en: "WebSocket, Server-Sent Events or long polling for a real-time trading dashboard: how do you choose?",
  vi: "Với một dashboard trading real-time, bạn chọn WebSocket, Server-Sent Events hay long polling như thế nào?",
  answerStart: "I'd decide on three things: which direction the traffic flows",
};

/** "tape looks dead" appears only inside the collapsed English answer of Q20 (not in any title). */
export const Q20 = {
  id: "isb-q20",
  en: "What is a stale closure in React hooks? Walk through a WebSocket callback example and explain how you would fix it.",
  answerPhrase: "The tape looks dead",
  searchQuery: '"tape looks dead"',
};

export const Q13 = {
  id: "isb-q13",
  answerStart: "For 100k rows the rule is simple: never put 100k rows in the DOM.",
};

export const SYSTEM_DESIGN_ANCHOR = "bookmark-isb-system-design";

/** Accordion item wrapper of a study item (`<div id="item-…" data-item-id="…">`). */
export function studyItem(page: Page, id: string): Locator {
  return page.locator(`[data-item-id="${id}"]`);
}

/** Disclosure button of a study item (the only button inside its heading). */
export function itemHeader(page: Page, id: string): Locator {
  return studyItem(page, id).getByRole("heading").getByRole("button");
}

/** Resets the server copy of the sample's study progress (fresh contexts pull it on load). */
export async function resetProgress(request: APIRequestContext, slug = ISB_SLUG): Promise<void> {
  const res = await request.put(`/api/progress/${slug}`, {
    data: {
      studied: [],
      favorites: [],
      completedTopics: [],
      flashcards: { known: [], review: [], reviewedCount: 0 },
      studyPlanTasks: [],
      projectChecklist: [],
      updatedAt: new Date().toISOString(),
    },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * Waits until React has hydrated the page. Server-rendered content is visible long before the event
 * handlers exist (the sample page is ~2.4 MB of HTML, so on a slow CI runner hydration takes
 * seconds); keys and clicks sent earlier are silently lost.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[role="radiogroup"]');
      return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber$"));
    },
    undefined,
    { timeout: 45_000 },
  );
}

/** Opens the sample package and waits until the client is interactive (hydrated). */
export async function openIsbPackage(page: Page, hash = ""): Promise<void> {
  await page.goto(`${ISB_PATH}${hash}`);
  await expect(page.getByRole("heading", { level: 1, name: "Senior Front-End Developer" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Content language" })).toBeVisible();
  await waitForHydration(page);
}
