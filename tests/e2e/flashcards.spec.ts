import { expect, test } from "@playwright/test";
import { ISB_PATH, ISB_SLUG, resetProgress } from "./fixtures";

test.beforeEach(async ({ request }) => {
  await resetProgress(request);
});

test.afterAll(async ({ request }) => {
  await resetProgress(request);
});

test("flashcards: flip, navigate with arrow keys, mark known", async ({ page, request }) => {
  await page.goto(`${ISB_PATH}/flashcards`);
  await expect(page.getByRole("heading", { level: 1, name: "Flashcards" })).toBeVisible();

  const deck = page.getByTestId("flashcard-deck");
  const position = deck.getByTestId("deck-position");
  await expect(position).toHaveText(/^Card 1 of \d+$/);
  const total = Number((await position.textContent())?.match(/of (\d+)/)?.[1]);
  expect(total).toBeGreaterThan(2);

  const progress = deck.getByRole("progressbar", { name: "Deck position" });
  const flipButton = deck.getByRole("button", { name: /Show (answer|question)/ });
  await expect(deck.getByTestId("flashcard-front")).toBeVisible();
  await expect(flipButton).toHaveAttribute("aria-pressed", "false");
  const firstFront = await deck.getByTestId("flashcard-front").textContent();

  // Space flips to the back and back again.
  await page.keyboard.press("Space");
  await expect(deck.getByTestId("flashcard-back")).toBeVisible();
  await expect(deck.getByText("English answer")).toBeVisible();
  await expect(flipButton).toHaveAttribute("aria-pressed", "true");
  await expect(flipButton).toHaveText("Show question");
  await page.keyboard.press("Space");
  await expect(deck.getByTestId("flashcard-front")).toBeVisible();

  // Arrow keys move between cards; the position indicator follows.
  const value1 = await progress.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowRight");
  await expect(position).toHaveText(`Card 2 of ${total}`);
  await expect(deck.getByTestId("flashcard-front")).not.toHaveText(firstFront ?? "");
  await expect(progress).not.toHaveAttribute("aria-valuenow", value1 ?? "");
  await page.keyboard.press("ArrowLeft");
  await expect(position).toHaveText(`Card 1 of ${total}`);
  await expect(deck.getByTestId("flashcard-front")).toHaveText(firstFront ?? "");
  await page.keyboard.press("ArrowLeft"); // wraps to the last card
  await expect(position).toHaveText(`Card ${total} of ${total}`);
  await page.keyboard.press("ArrowRight");
  await expect(position).toHaveText(`Card 1 of ${total}`);

  // Mark known (K shortcut) — advances and updates the known counter.
  await expect(deck.getByText(`Known 0/${total}`)).toBeVisible();
  await page.keyboard.press("k");
  await expect(deck.getByText(`Known 1/${total}`)).toBeVisible();
  await expect(position).toHaveText(`Card 2 of ${total}`);

  // Mark known with the button.
  await deck.getByRole("button", { name: "Known", exact: true }).click();
  await expect(deck.getByText(`Known 2/${total}`)).toBeVisible();
  await expect(position).toHaveText(`Card 3 of ${total}`);
  await expect(deck.getByRole("button", { name: `Not known (${total - 2})` })).toBeVisible();

  // Going back shows the card as known.
  await deck.getByRole("button", { name: "Previous card" }).click();
  await expect(position).toHaveText(`Card 2 of ${total}`);
  await expect(deck.getByRole("button", { name: "Known", exact: true })).toHaveAttribute("aria-pressed", "true");

  // Persisted to the server progress (known cards + reviewed counter).
  await expect
    .poll(async () => {
      const res = await request.get(`/api/progress/${ISB_SLUG}`);
      const body = (await res.json()) as {
        progress: { flashcards: { known: string[]; reviewedCount: number } } | null;
      };
      return body.progress ? [body.progress.flashcards.known.length, body.progress.flashcards.reviewedCount] : null;
    })
    .toEqual([2, 1]);

  // The package progress panel reflects the known cards.
  await page.goto(ISB_PATH);
  const panel = page.getByTestId("progress-panel");
  await expect(panel.getByText("Cards known")).toBeVisible();
  await expect(panel.locator("dd", { hasText: `2/${total}` })).toBeVisible();
});
