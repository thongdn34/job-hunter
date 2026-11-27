import { expect, test } from "@playwright/test";
import { ISB_PATH } from "./fixtures";

test("mock interview: start a session, answer one question and get a score out of 10", async ({ page }) => {
  await page.goto(`${ISB_PATH}/mock`);
  await expect(page.getByRole("heading", { level: 1, name: /15\. Mock Interview/ })).toBeVisible();

  // Smallest session size keeps the smoke test short.
  await page.getByRole("group", { name: "Number of questions" }).getByRole("radio").first().check({ force: true });
  await page.getByRole("button", { name: /^Start mock interview \(\d+ questions?\)$/ }).click();

  await expect(page.getByText(/^Question 1 of \d+$/)).toBeVisible();
  await page
    .getByLabel("Your answer")
    .fill(
      "I would use a WebSocket for the market data channel because traffic is mostly server to client but the client " +
        "still subscribes and unsubscribes symbols. Trade-offs: proxies and load balancers need sticky sessions, so I " +
        "add heartbeats, reconnect with exponential backoff and resubscribe. For one-way streams SSE is simpler. " +
        "Failure cases: slow consumers, so I batch updates per animation frame. Example: a live order book.",
    );
  await page.getByRole("button", { name: "Submit answer" }).click();

  const evaluation = page.getByRole("region", { name: "Evaluation" });
  await expect(evaluation).toBeVisible({ timeout: 30_000 });
  await expect(evaluation.getByRole("heading", { name: "Score" })).toBeFocused();
  await expect(evaluation).toContainText(/\d+(\.\d)?\/10/);
  await expect(evaluation.getByRole("button", { name: /Next question|Finish & see summary/ })).toBeVisible();
});
